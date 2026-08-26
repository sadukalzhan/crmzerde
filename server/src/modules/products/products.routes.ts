import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error';

const router = Router();
router.use(authenticate);

// Номенклатуру видят все авторизованные (нужна при создании заявки).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { inventory: true },
      orderBy: { name: 'asc' },
    });

    // Клиенту складские объёмы не показываем — только то, какие сорта бывают:
    // без этого он выбирал бы сорт, видя наш остаток.
    if (req.user!.role === 'CLIENT') {
      res.json(
        products.map((p) => ({
          ...p,
          inventory: p.inventory.map((i) => ({ id: i.id, productId: i.productId, grade: i.grade })),
        })),
      );
      return;
    }

    res.json(products);
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
      // Строки склада не создаём заранее: сорта приходят вместе с остатками
      // из 1С, где у каждого товара свой набор («A, R3, 0», «B, 0» и т. д.).
      data: { ...req.body, unit: 'M2' },
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
