import { Router } from 'express';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler, badRequest } from '../../middleware/error';
import { upload, deleteFile } from '../../lib/storage';
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

// Импорт остатков из Excel (данные из 1С). Столбцы: Номенклатура, Сорт, Остаток м².
// Товар ищется по названию, сорт — по метке/ключу; количество устанавливается абсолютно.
const GRADE_REV: Record<string, string> = {
  'a сорт': 'A', 'b сорт': 'B', 'c сорт': 'C', брак: 'BRAK',
  a: 'A', b: 'B', c: 'C', brak: 'BRAK',
};

router.post(
  '/import',
  requireRole('WAREHOUSE', 'ADMIN'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('Файл не передан');
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(req.file.path);
      const ws = wb.worksheets[0];
      if (!ws) throw badRequest('В файле нет листов');

      // Индексируем колонки по заголовкам (порядок не важен).
      const idx: Record<string, number> = {};
      ws.getRow(1).eachCell((cell, col) => {
        idx[String(cell.value ?? '').toLowerCase().trim()] = col;
      });
      const findCol = (...names: string[]) => {
        for (const n of names) for (const k of Object.keys(idx)) if (k.includes(n)) return idx[k];
        return null;
      };
      const nameCol = findCol('номенклатура', 'название', 'name', 'товар');
      const gradeCol = findCol('сорт', 'grade');
      const qtyCol = findCol('остаток', 'кол-во', 'quantity', 'м²', 'qty');
      if (!nameCol || !qtyCol) throw badRequest('Не найдены колонки «Номенклатура» и «Остаток»');

      const products = await prisma.product.findMany();
      const byName = new Map(products.map((p) => [p.name.toLowerCase().trim(), p]));

      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];
      for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const name = String(row.getCell(nameCol).value ?? '').trim();
        if (!name) continue;
        const product = byName.get(name.toLowerCase());
        if (!product) {
          skipped++;
          errors.push(`Товар не найден: «${name}»`);
          continue;
        }
        const gradeRaw = gradeCol ? String(row.getCell(gradeCol).value ?? 'A').toLowerCase().trim() : 'a';
        const grade = GRADE_REV[gradeRaw] ?? (['A', 'B', 'C', 'BRAK'].includes(gradeRaw.toUpperCase()) ? gradeRaw.toUpperCase() : 'A');
        const qty = Number(row.getCell(qtyCol).value ?? 0);
        if (Number.isNaN(qty)) {
          skipped++;
          continue;
        }
        await prisma.inventory.upsert({
          where: { productId_grade: { productId: product.id, grade } },
          create: { productId: product.id, grade, quantity: qty, reserved: 0, unit: 'M2' },
          update: { quantity: qty },
        });
        updated++;
      }
      res.json({ updated, skipped, errors: errors.slice(0, 20) });
    } finally {
      deleteFile(req.file.filename);
    }
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
