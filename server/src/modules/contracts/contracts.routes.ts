import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler, forbidden } from '../../middleware/error';

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
      await prisma.contract.findMany({
        where,
        include: { order: { select: { number: true, client: { select: { companyName: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }),
);

router.post(
  '/',
  requireRole('MANAGER'),
  validateBody(z.object({ orderId: z.string(), number: z.string(), fileUrl: z.string().optional() })),
  asyncHandler(async (req, res) => {
    res.status(201).json(
      await prisma.contract.create({
        data: { ...req.body, managerSigned: true },
      }),
    );
  }),
);

router.post(
  '/:id/sign',
  asyncHandler(async (req, res) => {
    const contract = await prisma.contract.findUniqueOrThrow({ where: { id: req.params.id }, include: { order: true } });
    const role = req.user!.role;
    const data: { managerSigned?: boolean; clientSigned?: boolean; signedAt?: Date } = {};

    if (role === 'MANAGER' || role === 'ADMIN') {
      data.managerSigned = true;
    } else if (role === 'CLIENT') {
      const profile = await prisma.client.findUnique({ where: { userId: req.user!.id } });
      if (contract.order.clientId !== profile?.id) throw forbidden();
      data.clientSigned = true;
    } else {
      throw forbidden();
    }
    const updated = await prisma.contract.findUniqueOrThrow({ where: { id: contract.id } });
    if ((data.managerSigned ?? updated.managerSigned) && (data.clientSigned ?? updated.clientSigned)) {
      data.signedAt = new Date();
    }
    res.json(await prisma.contract.update({ where: { id: contract.id }, data }));
  }),
);

export default router;
