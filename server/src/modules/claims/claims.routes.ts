import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler, forbidden } from '../../middleware/error';
import { notify } from '../../lib/notify';
import { transitionOrder } from '../orders/orders.service';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orderId = req.query.orderId as string | undefined;
    const where = orderId
      ? { orderId }
      : req.user!.role === 'CLIENT'
        ? { order: { client: { userId: req.user!.id } } }
        : {};
    res.json(
      await prisma.claim.findMany({
        where,
        include: { order: { select: { number: true, client: { select: { companyName: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }),
);

// Подать рекламацию (клиент по своей заявке или менеджер).
router.post(
  '/',
  requireRole('CLIENT', 'MANAGER'),
  validateBody(z.object({ orderId: z.string(), description: z.string().min(5) })),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: req.body.orderId }, include: { client: true } });

    if (req.user!.role === 'CLIENT') {
      const profile = await prisma.client.findUnique({ where: { userId: req.user!.id } });
      if (order.clientId !== profile?.id) throw forbidden();
    }

    const claim = await prisma.claim.create({
      data: {
        orderId: order.id,
        clientId: order.clientId,
        description: req.body.description,
        status: 'OPEN',
        createdById: req.user!.id,
      },
    });

    // Если заявка на этапе ожидания документов — переводим в «Рекламация».
    if (order.status === 'AWAITING_DOCS') {
      try {
        await transitionOrder(order.id, { to: 'CLAIM', note: 'Открыта рекламация' }, req.user!);
      } catch {
        /* переход недоступен — оставляем статус как есть */
      }
    }

    if (order.managerId) {
      await notify({
        userId: order.managerId,
        type: 'CLAIM',
        title: `Рекламация по заявке #${order.number}`,
        body: req.body.description.slice(0, 120),
        orderId: order.id,
      });
    }
    res.status(201).json(claim);
  }),
);

// Разбор рекламации (менеджер).
router.patch(
  '/:id',
  requireRole('MANAGER'),
  validateBody(
    z.object({
      status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED']).optional(),
      resolution: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    res.json(await prisma.claim.update({ where: { id: req.params.id }, data: req.body }));
  }),
);

export default router;
