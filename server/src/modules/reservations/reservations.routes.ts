import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error';
import { setReservationConfirmed } from '../orders/orders.service';
import { boxes, pallets } from '../../domain/packaging';

const router = Router();
router.use(authenticate);

// Раздел резервов: кто, под какую заявку/клиента, какой товар и сорт зарезервировал.
router.get(
  '/',
  requireRole('WAREHOUSE', 'MANAGER', 'FACTORY', 'ACCOUNTANT'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.reservation.findMany({
      include: {
        product: true,
        createdBy: { select: { fullName: true, role: true } },
        order: {
          select: {
            number: true,
            status: true,
            client: { select: { companyName: true } },
            manager: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      rows.map((r) => ({
        ...r,
        boxes: boxes(r.quantity, r.product.format, r.grade),
        pallets: pallets(r.quantity, r.product.format, r.grade),
      })),
    );
  }),
);

// Регламент, п. 4: отметка «подтверждён под конкретную отгрузку». Такой резерв
// нельзя перебросить на другую заявку того же клиента.
router.patch(
  '/:id/confirm',
  requireRole('MANAGER', 'WAREHOUSE'),
  validateBody(z.object({ confirmed: z.boolean() })),
  asyncHandler(async (req, res) => {
    res.json(await setReservationConfirmed(req.params.id, req.body.confirmed));
  }),
);

export default router;
