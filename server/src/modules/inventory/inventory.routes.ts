import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error';

const router = Router();
router.use(authenticate);

// Остатки и резервы.
router.get(
  '/',
  requireRole('WAREHOUSE', 'MANAGER', 'FACTORY'),
  asyncHandler(async (_req, res) => {
    const items = await prisma.inventory.findMany({
      include: { product: true },
      orderBy: { product: { name: 'asc' } },
    });
    res.json(items.map((i) => ({ ...i, free: i.quantity - i.reserved })));
  }),
);

// Установить остаток.
router.patch(
  '/:id',
  requireRole('WAREHOUSE'),
  validateBody(z.object({ quantity: z.number().nonnegative() })),
  asyncHandler(async (req, res) => {
    res.json(await prisma.inventory.update({ where: { id: req.params.id }, data: { quantity: req.body.quantity } }));
  }),
);

// Скорректировать остаток (приход/расход).
router.post(
  '/adjust',
  requireRole('WAREHOUSE', 'FACTORY'),
  validateBody(z.object({ productId: z.string(), delta: z.number() })),
  asyncHandler(async (req, res) => {
    const inv = await prisma.inventory.upsert({
      where: { productId: req.body.productId },
      create: { productId: req.body.productId, quantity: Math.max(0, req.body.delta), reserved: 0 },
      update: { quantity: { increment: req.body.delta } },
    });
    res.json(inv);
  }),
);

export default router;
