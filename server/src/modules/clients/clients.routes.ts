import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler, conflict } from '../../middleware/error';

const router = Router();
router.use(authenticate);

// Справочник клиентов (сотрудникам). Менеджер видит своих + без менеджера.
router.get(
  '/',
  requireRole('MANAGER', 'ACCOUNTANT', 'WAREHOUSE', 'LOGIST', 'FACTORY'),
  asyncHandler(async (req, res) => {
    const where =
      req.user!.role === 'MANAGER'
        ? { OR: [{ managerId: req.user!.id }, { managerId: null }] }
        : {};
    const clients = await prisma.client.findMany({
      where,
      include: { manager: { select: { id: true, fullName: true } }, _count: { select: { orders: true } } },
      orderBy: { companyName: 'asc' },
    });
    res.json(clients);
  }),
);

router.get(
  '/:id',
  requireRole('MANAGER', 'ACCOUNTANT'),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.client.findUniqueOrThrow({
        where: { id: req.params.id },
        include: { manager: { select: { id: true, fullName: true } }, orders: true },
      }),
    );
  }),
);

router.post(
  '/',
  requireRole('MANAGER'),
  validateBody(
    z.object({
      companyName: z.string().min(2),
      contactName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      bin: z.string().optional(),
      address: z.string().optional(),
      managerId: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const data = { ...req.body, managerId: req.body.managerId ?? req.user!.id };
    res.status(201).json(await prisma.client.create({ data }));
  }),
);

router.patch(
  '/:id',
  requireRole('MANAGER', 'ACCOUNTANT'),
  validateBody(
    z.object({
      companyName: z.string().min(2).optional(),
      contactName: z.string().nullable().optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().nullable().optional(),
      bin: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      debt: z.number().nonnegative().optional(),
      creditBlocked: z.boolean().optional(),
      managerId: z.string().nullable().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    res.json(await prisma.client.update({ where: { id: req.params.id }, data: req.body }));
  }),
);

// Удаление клиента (админ). Блокируем, если у клиента есть заявки.
router.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const count = await prisma.order.count({ where: { clientId: req.params.id } });
    if (count > 0) throw conflict(`У клиента есть заявки (${count}) — сначала удалите их`);
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

// Разблокировка по долгу (бухгалтер): обнуляем долг и снимаем блок.
router.post(
  '/:id/unblock',
  requireRole('ACCOUNTANT'),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.client.update({
        where: { id: req.params.id },
        data: { debt: 0, creditBlocked: false },
      }),
    );
  }),
);

export default router;
