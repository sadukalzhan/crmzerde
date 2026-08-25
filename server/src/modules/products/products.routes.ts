import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error';
import { emptyInventoryRows } from '../../lib/grades';

const router = Router();
router.use(authenticate);

// Номенклатуру видят все авторизованные (нужна при создании заявки).
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(
      await prisma.product.findMany({
        where: { isActive: true },
        include: { inventory: true },
        orderBy: { name: 'asc' },
      }),
    );
  }),
);

const productSchema = z.object({
  name: z.string().min(2),
  format: z.enum(['60x60', '120x60']).default('60x60'),
  size: z.string().optional(),
  collection: z.string().optional(),
  color: z.string().optional(),
});

router.post(
  '/',
  requireRole('ADMIN'),
  validateBody(productSchema),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.create({
      data: {
        ...req.body,
        unit: 'M2',
        // По строке склада на каждый сорт (A/B/C/BRAK), начальный остаток 0.
        inventory: { create: await emptyInventoryRows() },
      },
      include: { inventory: true },
    });
    res.status(201).json(product);
  }),
);

router.patch(
  '/:id',
  requireRole('ADMIN'),
  validateBody(productSchema.partial().extend({ isActive: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    res.json(await prisma.product.update({ where: { id: req.params.id }, data: req.body }));
  }),
);

router.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ok: true });
  }),
);

export default router;
