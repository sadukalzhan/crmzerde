import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error';

const router = Router();

export const DEFAULT_SETTINGS: Record<string, string> = {
  brandName: 'Зерде Керамика Актобе',
  currency: 'KZT', // KZT | RUB
  dateFormat: 'DD.MM.YY',
  language: 'ru',
};

// Публичные настройки (нужны на странице входа: бренд).
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.setting.findMany();
    const settings = { ...DEFAULT_SETTINGS };
    rows.forEach((r) => (settings[r.key] = r.value));
    res.json(settings);
  }),
);

router.patch(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validateBody(z.record(z.string(), z.string())),
  asyncHandler(async (req, res) => {
    const entries = Object.entries(req.body as Record<string, string>);
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } }),
      ),
    );
    const rows = await prisma.setting.findMany();
    const settings = { ...DEFAULT_SETTINGS };
    rows.forEach((r) => (settings[r.key] = r.value));
    res.json(settings);
  }),
);

export default router;
