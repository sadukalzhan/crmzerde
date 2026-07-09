import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/error';
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

export default router;
