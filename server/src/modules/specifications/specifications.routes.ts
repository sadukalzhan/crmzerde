import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler, forbidden } from '../../middleware/error';
import { notify } from '../../lib/notify';

const router = Router();
router.use(authenticate);

async function assertOrderAccess(orderId: string, userId: string, role: string) {
  if (role === 'CLIENT') {
    const profile = await prisma.client.findUnique({ where: { userId } });
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.clientId !== profile?.id) throw forbidden();
  }
}

// Список спецификаций (по заявке или все — для раздела «Спецификации»).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orderId = req.query.orderId as string | undefined;
    if (orderId) await assertOrderAccess(orderId, req.user!.id, req.user!.role);

    const where = orderId
      ? { orderId }
      : req.user!.role === 'CLIENT'
        ? { order: { client: { userId: req.user!.id } } }
        : {};

    res.json(
      await prisma.specification.findMany({
        where,
        include: { items: true, order: { select: { number: true, status: true, client: { select: { companyName: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }),
);

router.post(
  '/',
  requireRole('MANAGER'),
  validateBody(
    z.object({
      orderId: z.string(),
      number: z.string(),
      fileUrl: z.string().optional(),
      items: z
        .array(
          z.object({
            productId: z.string().optional(),
            name: z.string(),
            quantity: z.number().positive(),
            unit: z.enum(['PALLET', 'M2']).default('PALLET'),
            price: z.number().nonnegative(),
          }),
        )
        .min(1),
    }),
  ),
  asyncHandler(async (req, res) => {
    const items = req.body.items.map((i: { quantity: number; price: number }) => ({
      ...i,
      sum: i.quantity * i.price,
    }));
    const total = items.reduce((s: number, i: { sum: number }) => s + i.sum, 0);
    const spec = await prisma.specification.create({
      data: {
        orderId: req.body.orderId,
        number: req.body.number,
        fileUrl: req.body.fileUrl,
        total,
        managerSigned: true,
        managerSignedAt: new Date(),
        items: { create: items },
      },
      include: { items: true },
    });

    // Уведомить клиента — нужна подпись.
    const order = await prisma.order.findUnique({ where: { id: req.body.orderId }, include: { client: true } });
    if (order?.client.userId) {
      await notify({
        userId: order.client.userId,
        type: 'SIGNATURE',
        title: `Спецификация по заявке #${order.number}`,
        body: 'Требуется ваша подпись',
        orderId: order.id,
      });
    }
    res.status(201).json(spec);
  }),
);

// Подпись: менеджер или клиент (по своей заявке).
router.post(
  '/:id/sign',
  asyncHandler(async (req, res) => {
    const spec = await prisma.specification.findUniqueOrThrow({ where: { id: req.params.id }, include: { order: true } });
    const role = req.user!.role;

    const data: { managerSigned?: boolean; managerSignedAt?: Date; clientSigned?: boolean; clientSignedAt?: Date } = {};
    if (role === 'MANAGER' || role === 'ADMIN') {
      data.managerSigned = true;
      data.managerSignedAt = new Date();
    } else if (role === 'CLIENT') {
      await assertOrderAccess(spec.orderId, req.user!.id, role);
      data.clientSigned = true;
      data.clientSignedAt = new Date();
      // Уведомить менеджера о подписи клиента.
      if (spec.order.managerId) {
        await notify({
          userId: spec.order.managerId,
          type: 'SIGNATURE',
          title: `Клиент подписал спецификацию #${spec.number}`,
          orderId: spec.orderId,
        });
      }
    } else {
      throw forbidden();
    }
    res.json(await prisma.specification.update({ where: { id: spec.id }, data, include: { items: true } }));
  }),
);

export default router;
