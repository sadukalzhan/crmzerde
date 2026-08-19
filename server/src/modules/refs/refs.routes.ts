import { Router } from 'express';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler, badRequest } from '../../middleware/error';
import { upload, deleteFile } from '../../lib/storage';
import { GRADES, isFormat } from '../../domain/packaging';

const router = Router();
router.use(authenticate);

// ── Заводы ──
router.get(
  '/factories',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.factory.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }));
  }),
);

router.post(
  '/factories',
  requireRole('ADMIN'),
  validateBody(z.object({ name: z.string().min(2), city: z.string().min(2) })),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.factory.create({ data: req.body }));
  }),
);

router.patch(
  '/factories/:id',
  requireRole('ADMIN'),
  validateBody(z.object({ name: z.string().optional(), city: z.string().optional(), isActive: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    res.json(await prisma.factory.update({ where: { id: req.params.id }, data: req.body }));
  }),
);

// ── Перевозчики ──
router.get(
  '/carriers',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.carrier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }));
  }),
);

router.post(
  '/carriers',
  requireRole('ADMIN'),
  validateBody(z.object({ name: z.string().min(2), phone: z.string().optional() })),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.carrier.create({ data: req.body }));
  }),
);

router.patch(
  '/carriers/:id',
  requireRole('ADMIN'),
  validateBody(z.object({ name: z.string().optional(), phone: z.string().nullable().optional(), isActive: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    res.json(await prisma.carrier.update({ where: { id: req.params.id }, data: req.body }));
  }),
);

// ── Импорт справочников из Excel ─────────────────────────────────────────────
// По образцу импорта остатков: колонки ищутся по заголовкам первой строки,
// порядок не важен. Запись с уже существующим названием обновляется, а не
// дублируется, поэтому файл можно заливать повторно.

type RefKind = 'products' | 'factories' | 'carriers';

/** Индекс колонок по заголовку первой строки. */
function columnIndex(ws: ExcelJS.Worksheet) {
  const idx: Record<string, number> = {};
  ws.getRow(1).eachCell((cell, col) => {
    idx[String(cell.value ?? '').toLowerCase().trim()] = col;
  });
  return (...names: string[]): number | null => {
    for (const n of names) for (const k of Object.keys(idx)) if (k.includes(n)) return idx[k];
    return null;
  };
}

const cellText = (row: ExcelJS.Row, col: number | null): string =>
  col ? String(row.getCell(col).value ?? '').trim() : '';

/** Шаблон с нужными заголовками — чтобы не угадывать формат файла. */
const TEMPLATE_COLUMNS: Record<RefKind, { header: string; width: number }[]> = {
  products: [
    { header: 'Номенклатура', width: 32 },
    { header: 'Формат', width: 12 },
    { header: 'Коллекция', width: 18 },
    { header: 'Цвет', width: 14 },
    { header: 'Поверхность', width: 18 },
    { header: 'Цена за м²', width: 14 },
  ],
  factories: [
    { header: 'Название', width: 28 },
    { header: 'Город', width: 20 },
  ],
  carriers: [
    { header: 'Название', width: 28 },
    { header: 'Телефон', width: 20 },
  ],
};

const TEMPLATE_FILES: Record<RefKind, string> = {
  products: 'nomenklatura-shablon.xlsx',
  factories: 'zavody-shablon.xlsx',
  carriers: 'perevozchiki-shablon.xlsx',
};

router.get(
  '/:kind/template',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const kind = req.params.kind as RefKind;
    const columns = TEMPLATE_COLUMNS[kind];
    if (!columns) throw badRequest('Неизвестный справочник');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Шаблон');
    ws.columns = columns.map((c) => ({ header: c.header, width: c.width }));
    ws.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${TEMPLATE_FILES[kind]}"`);
    await wb.xlsx.write(res);
    res.end();
  }),
);

router.post(
  '/:kind/import',
  requireRole('ADMIN'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const kind = req.params.kind as RefKind;
    if (!TEMPLATE_COLUMNS[kind]) throw badRequest('Неизвестный справочник');
    if (!req.file) throw badRequest('Файл не передан');

    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(req.file.path);
      const ws = wb.worksheets[0];
      if (!ws) throw badRequest('В файле нет листов');

      const findCol = columnIndex(ws);
      const nameCol = findCol('номенклатура', 'название', 'наименование', 'name', 'товар');
      if (!nameCol) throw badRequest('Не найдена колонка с названием');

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      if (kind === 'products') {
        const formatCol = findCol('формат', 'format');
        const collectionCol = findCol('коллекц', 'collection');
        const colorCol = findCol('цвет', 'color');
        const surfaceCol = findCol('поверхн', 'технолог', 'surface');
        const priceCol = findCol('цена', 'price');

        for (let r = 2; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const name = cellText(row, nameCol);
          if (!name) continue;

          const rawFormat = cellText(row, formatCol).replace(/[х×*]/gi, 'x').replace(/\s/g, '');
          const format = isFormat(rawFormat) ? rawFormat : '60x60';
          const price = Number(row.getCell(priceCol ?? 0).value ?? 0);
          const data = {
            format,
            collection: cellText(row, collectionCol) || null,
            color: cellText(row, colorCol) || null,
            surface: cellText(row, surfaceCol) || null,
            pricePerUnit: Number.isFinite(price) ? price : 0,
          };

          const existing = await prisma.product.findFirst({ where: { name } });
          if (existing) {
            await prisma.product.update({ where: { id: existing.id }, data: { ...data, isActive: true } });
            updated++;
          } else {
            await prisma.product.create({
              data: {
                name,
                ...data,
                unit: 'M2',
                // Строка склада на каждый сорт с нулевым остатком — как при
                // создании товара вручную, иначе импорт остатков не найдёт пару.
                inventory: { create: GRADES.map((grade) => ({ grade, quantity: 0, reserved: 0, unit: 'M2' })) },
              },
            });
            created++;
          }
        }
      } else if (kind === 'factories') {
        const cityCol = findCol('город', 'city');
        for (let r = 2; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const name = cellText(row, nameCol);
          if (!name) continue;
          const city = cellText(row, cityCol);
          if (!city) {
            skipped++;
            errors.push(`Не указан город: «${name}»`);
            continue;
          }
          const existing = await prisma.factory.findFirst({ where: { name } });
          if (existing) {
            await prisma.factory.update({ where: { id: existing.id }, data: { city, isActive: true } });
            updated++;
          } else {
            await prisma.factory.create({ data: { name, city } });
            created++;
          }
        }
      } else {
        const phoneCol = findCol('телефон', 'phone');
        for (let r = 2; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const name = cellText(row, nameCol);
          if (!name) continue;
          const phone = cellText(row, phoneCol) || null;
          const existing = await prisma.carrier.findFirst({ where: { name } });
          if (existing) {
            await prisma.carrier.update({ where: { id: existing.id }, data: { phone, isActive: true } });
            updated++;
          } else {
            await prisma.carrier.create({ data: { name, phone } });
            created++;
          }
        }
      }

      res.json({ created, updated, skipped, errors: errors.slice(0, 20) });
    } finally {
      deleteFile(req.file.filename);
    }
  }),
);

export default router;
