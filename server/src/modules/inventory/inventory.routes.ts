import { Router } from 'express';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error';
import { boxes, pallets, FORMAT_LABELS, GRADE_LABELS } from '../../domain/packaging';

const router = Router();
router.use(authenticate);

async function loadStock() {
  const items = await prisma.inventory.findMany({
    include: { product: true },
    orderBy: [{ product: { name: 'asc' } }, { grade: 'asc' }],
  });
  return items.map((i) => {
    const free = i.quantity - i.reserved;
    const fmt = i.product.format;
    return {
      ...i,
      free,
      boxes: boxes(i.quantity, fmt, i.grade),
      pallets: pallets(i.quantity, fmt, i.grade),
    };
  });
}

// Остатки и резервы по товарам и сортам (+ коробки/поддоны).
router.get(
  '/',
  requireRole('WAREHOUSE', 'MANAGER', 'FACTORY'),
  asyncHandler(async (_req, res) => {
    res.json(await loadStock());
  }),
);

// Выгрузка остатков в Excel.
router.get(
  '/export',
  requireRole('WAREHOUSE', 'MANAGER'),
  asyncHandler(async (_req, res) => {
    const stock = await loadStock();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Остатки склада');
    ws.columns = [
      { header: 'Номенклатура', key: 'name', width: 32 },
      { header: 'Формат', key: 'format', width: 10 },
      { header: 'Коллекция', key: 'collection', width: 16 },
      { header: 'Цвет', key: 'color', width: 14 },
      { header: 'Поверхность', key: 'surface', width: 16 },
      { header: 'Сорт', key: 'grade', width: 8 },
      { header: 'Остаток, м²', key: 'quantity', width: 12 },
      { header: 'Резерв, м²', key: 'reserved', width: 12 },
      { header: 'Свободно, м²', key: 'free', width: 12 },
      { header: 'Коробки', key: 'boxes', width: 10 },
      { header: 'Поддоны', key: 'pallets', width: 10 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const s of stock) {
      ws.addRow({
        name: s.product.name,
        format: FORMAT_LABELS[s.product.format] ?? s.product.format,
        collection: s.product.collection ?? '',
        color: s.product.color ?? '',
        surface: s.product.surface ?? '',
        grade: GRADE_LABELS[s.grade] ?? s.grade,
        quantity: s.quantity,
        reserved: s.reserved,
        free: s.free,
        boxes: s.boxes,
        pallets: s.pallets,
      });
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ostatki-sklada.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  }),
);

// Установить остаток (по строке склада).
router.patch(
  '/:id',
  requireRole('WAREHOUSE'),
  validateBody(z.object({ quantity: z.number().nonnegative() })),
  asyncHandler(async (req, res) => {
    res.json(await prisma.inventory.update({ where: { id: req.params.id }, data: { quantity: req.body.quantity } }));
  }),
);

// Скорректировать остаток (приход/расход) по товару и сорту.
router.post(
  '/adjust',
  requireRole('WAREHOUSE', 'FACTORY'),
  validateBody(z.object({ productId: z.string(), grade: z.enum(['A', 'B', 'C', 'BRAK']).default('A'), delta: z.number() })),
  asyncHandler(async (req, res) => {
    const { productId, grade, delta } = req.body;
    const inv = await prisma.inventory.upsert({
      where: { productId_grade: { productId, grade } },
      create: { productId, grade, quantity: Math.max(0, delta), reserved: 0, unit: 'M2' },
      update: { quantity: { increment: delta } },
    });
    res.json(inv);
  }),
);

export default router;
