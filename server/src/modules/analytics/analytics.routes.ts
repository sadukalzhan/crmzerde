import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/error';
import { ORDER_STATUSES } from '../../domain/orderStatus';

const router = Router();
router.use(authenticate, requireRole('MANAGER', 'ACCOUNTANT', 'FACTORY', 'WAREHOUSE', 'LOGIST'));

// Сводка для дашборда.
router.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const grouped = await prisma.order.groupBy({ by: ['status'], _count: { _all: true } });
    const byStatus: Record<string, number> = {};
    for (const s of ORDER_STATUSES) byStatus[s] = 0;
    grouped.forEach((g) => (byStatus[g.status] = g._count._all));

    const total = grouped.reduce((s, g) => s + g._count._all, 0);
    const delivered = (byStatus.DELIVERY ?? 0) + (byStatus.AWAITING_DOCS ?? 0) + (byStatus.CLOSED ?? 0);
    const rejected = byStatus.REJECTED ?? 0;
    const inWork = total - rejected - (byStatus.CLOSED ?? 0);

    const byPriority = await prisma.order.groupBy({ by: ['priority'], _count: { _all: true } });

    const now = new Date();
    const plan = await prisma.productionPlan.findUnique({
      where: { year_month: { year: now.getFullYear(), month: now.getMonth() + 1 } },
      include: { _count: { select: { items: true } } },
    });

    res.json({
      total,
      inWork,
      delivered,
      rejected,
      byStatus,
      byPriority: Object.fromEntries(byPriority.map((p) => [p.priority, p._count._all])),
      plannedThisMonth: plan?._count.items ?? 0,
    });
  }),
);

// Воронка по этапам.
router.get(
  '/funnel',
  asyncHandler(async (_req, res) => {
    const grouped = await prisma.order.groupBy({ by: ['status'], _count: { _all: true } });
    const map = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
    res.json(ORDER_STATUSES.map((s) => ({ status: s, count: map[s] ?? 0 })));
  }),
);

// Дебиторка.
router.get(
  '/receivables',
  asyncHandler(async (_req, res) => {
    const clients = await prisma.client.findMany({
      where: { debt: { gt: 0 } },
      select: { id: true, companyName: true, debt: true, creditBlocked: true },
      orderBy: { debt: 'desc' },
    });
    const total = clients.reduce((s, c) => s + c.debt, 0);
    res.json({ total, clients });
  }),
);

export default router;
