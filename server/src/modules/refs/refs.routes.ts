import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error';

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

export default router;
