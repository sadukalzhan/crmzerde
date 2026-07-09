import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error';
import { transitionOrder } from '../orders/orders.service';
import { boxes } from '../../domain/packaging';

const router = Router();
router.use(authenticate);

const planItemInclude = {
  order: {
    include: {
      client: { select: { companyName: true } },
      items: { include: { product: true } },
    },
  },
} satisfies Prisma.ProductionPlanItemInclude;

type PlanItemRow = Prisma.ProductionPlanItemGetPayload<{ include: typeof planItemInclude }>;

// Обогащаем позицию плана вычисляемыми колонками (формат, объёмы, коробки, итог).
function enrich(item: PlanItemRow) {
  const order = item.order;
  const first = order.items[0];
  const product = first?.product;
  const format = product?.format ?? '60x60';
  const grade = first?.grade ?? 'A';
  const orderedM2 = order.quantity;
  const total = item.gradeA + item.gradeB + item.gradeC + item.gradeBrak;
  return {
    ...item,
    customer: order.client?.companyName ?? '',
    orderNumber: order.number,
    format,
    collection: product?.collection ?? '',
    color: product?.color ?? '',
    surface: product?.surface ?? '',
    orderedM2,
    plannedM2: Math.round(orderedM2 * 1.1 * 100) / 100, // +10% на брак
    boxes: boxes(orderedM2, format, grade),
    total,
  };
}

// План производства за месяц.
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
        items: { include: planItemInclude, orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    if (!plan) return res.json({ year, month, items: [] });
    res.json({ ...plan, items: plan.items.map(enrich) });
  }),
);

router.get(
  '/plans',
  requireRole('FACTORY', 'MANAGER', 'WAREHOUSE'),
  asyncHandler(async (_req, res) => {
    res.json(await prisma.productionPlan.findMany({ orderBy: [{ year: 'desc' }, { month: 'desc' }] }));
  }),
);

// Полное редактирование позиции плана (завод): статус, даты, сорта, таможня, комментарии.
router.patch(
  '/items/:id',
  requireRole('FACTORY'),
  validateBody(
    z.object({
      status: z.enum(['PLANNED', 'IN_PRODUCTION', 'PRODUCED', 'TRANSFERRED']).optional(),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      customsDate: z.string().nullable().optional(),
      gradeA: z.number().nonnegative().optional(),
      gradeB: z.number().nonnegative().optional(),
      gradeC: z.number().nonnegative().optional(),
      gradeBrak: z.number().nonnegative().optional(),
      comments: z.string().nullable().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const data: Record<string, unknown> = { ...b };
    if (b.startDate !== undefined) data.startDate = b.startDate ? new Date(b.startDate) : null;
    if (b.endDate !== undefined) data.endDate = b.endDate ? new Date(b.endDate) : null;
    if (b.customsDate !== undefined) data.customsDate = b.customsDate ? new Date(b.customsDate) : null;

    const item = await prisma.productionPlanItem.update({ where: { id: req.params.id }, data, include: { order: true } });

    // «Передано на склад» → заявка готова (PRODUCTION → READY).
    if (b.status === 'TRANSFERRED' && item.order.status === 'PRODUCTION') {
      await transitionOrder(item.orderId, { to: 'READY', note: 'Передано на склад' }, req.user!);
    }

    const full = await prisma.productionPlanItem.findUniqueOrThrow({ where: { id: item.id }, include: planItemInclude });
    res.json(enrich(full));
  }),
);

export default router;
