import { Router } from 'express';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { attachment } from '../../lib/download';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler, badRequest } from '../../middleware/error';
import { upload, deleteFile } from '../../lib/storage';
import { boxes, pallets, FORMAT_LABELS, isFormat } from '../../domain/packaging';

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
  requireRole('WAREHOUSE', 'MANAGER', 'SALES_HEAD'),
  asyncHandler(async (_req, res) => {
    res.json(await loadStock());
  }),
);

// Выгрузка остатков в Excel.
router.get(
  '/export',
  requireRole('WAREHOUSE', 'MANAGER', 'SALES_HEAD'),
  asyncHandler(async (_req, res) => {
    const stock = await loadStock();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Остатки склада');
    ws.columns = [
      { header: 'Номенклатура', key: 'name', width: 32 },
      { header: 'Формат', key: 'format', width: 10 },
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
        grade: s.grade,
        quantity: s.quantity,
        reserved: s.reserved,
        free: s.free,
        boxes: s.boxes,
        pallets: s.pallets,
      });
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', attachment('Остатки склада.xlsx'));
    await wb.xlsx.write(res);
    res.end();
  }),
);

// Шаблон для заливки актуальных остатков (только админ). Колонки те же, что
// понимает импорт, и в том же порядке, что выгружает 1С. Строки — фактические
// пары «товар + сорт»: сорта свободные («A, R3, 0»), поэтому перечислить их
// заранее нельзя, можно только показать уже известные.
router.get(
  '/template',
  requireRole('ADMIN'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.inventory.findMany({
      include: { product: true },
      orderBy: [{ product: { name: 'asc' } }, { grade: 'asc' }],
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Остатки');
    ws.columns = [
      { header: 'формат', key: 'format', width: 12 },
      { header: 'Сорт', key: 'grade', width: 18 },
      { header: 'Номенклатура', key: 'name', width: 38 },
      { header: 'Итого', key: 'quantity', width: 14 },
    ];
    ws.getRow(1).font = { bold: true };

    if (rows.length) {
      for (const r of rows) {
        ws.addRow({
          format: FORMAT_LABELS[r.product.format] ?? r.product.format,
          grade: r.grade,
          name: r.product.name,
          quantity: r.quantity,
        });
      }
    } else {
      // Пустая база: показываем пример строки, чтобы формат был очевиден.
      ws.addRow({ format: '60x60', grade: 'A, R3, 0', name: 'ALANDA Grey 60x60', quantity: 0 });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', attachment('Шаблон остатков.xlsx'));
    await wb.xlsx.write(res);
    res.end();
  }),
);

router.post(
  '/import',
  requireRole('ADMIN'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('Файл не передан');
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(req.file.path);
      const ws = wb.worksheets[0];
      if (!ws) throw badRequest('В файле нет листов');

      // Выгрузка 1С начинается не с первой строки — ищем строку заголовков
      // в начале листа по обязательной колонке «Номенклатура».
      let headerRow = 0;
      let idx: Record<string, number> = {};
      for (let r = 1; r <= Math.min(ws.rowCount, 20); r++) {
        const map: Record<string, number> = {};
        ws.getRow(r).eachCell({ includeEmpty: false }, (cell, col) => {
          const key = String(cell.value ?? '').toLowerCase().trim();
          if (key) map[key] = col;
        });
        if (Object.keys(map).some((k) => k.includes('номенклатура') || k.includes('товар'))) {
          headerRow = r;
          idx = map;
          break;
        }
      }
      if (!headerRow) throw badRequest('Не найдена строка заголовков с колонкой «Номенклатура»');

      const findCol = (...names: string[]) => {
        for (const n of names) for (const k of Object.keys(idx)) if (k.includes(n)) return idx[k];
        return null;
      };
      const nameCol = findCol('номенклатура', 'название', 'товар');
      const gradeCol = findCol('сорт', 'grade');
      const formatCol = findCol('формат', 'размер', 'format');
      const qtyCol = findCol('итого', 'остаток', 'кол-во', 'quantity', 'qty');
      if (!nameCol || !qtyCol) throw badRequest('Не найдены колонки «Номенклатура» и «Итого»');

      const products = await prisma.product.findMany();
      const byName = new Map(products.map((p) => [p.name.toLowerCase().trim(), p]));

      let updated = 0;
      let created = 0;
      let createdProducts = 0;
      let skipped = 0;
      const errors: string[] = [];
      // Один товар приходит несколькими строками (по сорту), поэтому обнуляем
      // только те строки склада, которые встретились в файле.
      const seen = new Set<string>();

      for (let r = headerRow + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const name = String(row.getCell(nameCol).value ?? '').trim();
        if (!name) continue;

        const qtyRaw = row.getCell(qtyCol).value;
        // В выгрузке встречаются формулы — берём посчитанный результат.
        const qtyValue =
          qtyRaw && typeof qtyRaw === 'object' && 'result' in qtyRaw
            ? (qtyRaw as { result?: unknown }).result
            : qtyRaw;
        const qty = Number(qtyValue ?? 0);
        if (!Number.isFinite(qty)) {
          skipped++;
          errors.push(`Не число в остатке: «${name}»`);
          continue;
        }

        const rawFormat = formatCol
          ? String(row.getCell(formatCol).value ?? '').replace(/[х×*]/gi, 'x').replace(/\s/g, '')
          : '';
        const format = isFormat(rawFormat) ? rawFormat : '60x60';
        // Сорт из 1С — свободная строка вида «A, R3, 0». Сохраняем как есть.
        const grade = gradeCol ? String(row.getCell(gradeCol).value ?? '').trim() || 'A' : 'A';

        let product = byName.get(name.toLowerCase());
        if (!product) {
          // Номенклатура приходит вместе с остатками — заводим недостающие,
          // иначе пришлось бы грузить два файла подряд.
          product = await prisma.product.create({ data: { name, format, unit: 'M2' } });
          byName.set(name.toLowerCase(), product);
          createdProducts++;
        }

        const key = `${product.id}::${grade}`;
        seen.add(key);
        const existing = await prisma.inventory.findUnique({
          where: { productId_grade: { productId: product.id, grade } },
        });
        if (existing) {
          await prisma.inventory.update({ where: { id: existing.id }, data: { quantity: qty } });
          updated++;
        } else {
          await prisma.inventory.create({
            data: { productId: product.id, grade, quantity: qty, reserved: 0, unit: 'M2' },
          });
          created++;
        }
      }

      res.json({ updated, created, createdProducts, skipped, errors: errors.slice(0, 20) });
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
  requireRole('WAREHOUSE'),
  validateBody(z.object({ productId: z.string(), grade: z.string().default('A'), delta: z.number() })),
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
