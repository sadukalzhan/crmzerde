import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error';
import { transitionOrder } from '../orders/orders.service';

const router = Router();
router.use(authenticate);

// План производства за месяц (приоритет 1 — аванс, выше приоритета 2).
router.get(
  '/plan',
  requireRole('FACTORY', 'MANAGER', 'WAREHOUSE'),
  asyncHandler(async (req, res) => {
    const now = new Date();
    const year = parseInt((req.query.year as string) ?? String(now.getFullYear()), 10);
    const month = parseInt((req.query.month as string) ?? String(now.getMonth() + 1), 10);

    const plan = await prisma.productionPlan.findUnique({
      where: { year_month: { year, month } },
      include: {
        items: {
          include: {
            order: { include: { client: { select: { companyName: true } }, items: { include: { product: true } } } },
          },
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    res.json(plan ?? { year, month, items: [] });
  }),
);

// Доступные периоды плана.
router.get(
  '/plans',
  requireRole('FACTORY', 'MANAGER', 'WAREHOUSE'),
  asyncHandler(async (_req, res) => {
    res.json(await prisma.productionPlan.findMany({ orderBy: [{ year: 'desc' }, { month: 'desc' }] }));
  }),
);

// Смена статуса позиции плана: PLANNED → IN_PRODUCTION → PRODUCED → TRANSFERRED.
router.post(
  '/items/:id/status',
  requireRole('FACTORY'),
  validateBody(z.object({ status: z.enum(['PLANNED', 'IN_PRODUCTION', 'PRODUCED', 'TRANSFERRED']) })),
  asyncHandler(async (req, res) => {
    const item = await prisma.productionPlanItem.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
      include: { order: true },
    });

    // «Передано на склад» → заявка готова (PRODUCTION → READY).
    if (req.body.status === 'TRANSFERRED' && item.order.status === 'PRODUCTION') {
      await transitionOrder(item.orderId, { to: 'READY', note: 'Передано на склад' }, req.user!);
    }
    res.json(item);
  }),
);

export default router;
