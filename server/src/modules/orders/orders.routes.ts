import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error';
import * as service from './orders.service';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  clientId: z.string().optional(),
  managerId: z.string().optional(),
  factoryId: z.string().optional(),
  carrierId: z.string().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  paymentTerm: z.enum(['PREPAYMENT', 'POSTPAYMENT']).optional(),
  shipFrom: z.string().optional(),
  shipTo: z.string().optional(),
  desiredDate: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().positive(),
        unit: z.enum(['PALLET', 'M2']).optional(),
        pricePerUnit: z.number().nonnegative().optional(),
      }),
    )
    .min(1, 'Добавьте хотя бы одну позицию'),
});

const transitionSchema = z.object({
  to: z.string(),
  note: z.string().optional(),
  reason: z.string().optional(),
});

const paymentSchema = z.object({
  status: z.enum(['UNPAID', 'PARTIAL', 'PAID', 'POSTPAY_APPROVED']),
});

const updateSchema = z.object({
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  managerId: z.string().nullable().optional(),
  factoryId: z.string().nullable().optional(),
  carrierId: z.string().nullable().optional(),
  shipFrom: z.string().optional(),
  shipTo: z.string().optional(),
  desiredDate: z.string().nullable().optional(),
});

// Список заявок (с учётом роли и фильтров)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const f = req.query as Record<string, string | undefined>;
    const orders = await service.listOrders(req.user!, {
      status: f.status,
      priority: f.priority,
      factoryId: f.factoryId,
      carrierId: f.carrierId,
      clientId: f.clientId,
      search: f.search,
    });
    res.json(orders);
  }),
);

// Детали заявки
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await service.getOrder(req.params.id, req.user!));
  }),
);

// Доступность на складе
router.get(
  '/:id/availability',
  requireRole('WAREHOUSE', 'MANAGER'),
  asyncHandler(async (req, res) => {
    res.json(await service.availabilityFor(req.params.id));
  }),
);

// Создание заявки (клиент — от своего имени; менеджер/админ — за любого клиента)
router.post(
  '/',
  requireRole('CLIENT', 'MANAGER'),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createOrder(req.body, req.user!));
  }),
);

// Универсальный переход (drag-and-drop)
router.post(
  '/:id/transition',
  validateBody(transitionSchema),
  asyncHandler(async (req, res) => {
    res.json(await service.transitionOrder(req.params.id, req.body, req.user!));
  }),
);

// Проверка дебиторки (авторазвилка)
router.post(
  '/:id/credit-check',
  requireRole('MANAGER', 'ACCOUNTANT'),
  asyncHandler(async (req, res) => {
    res.json(await service.runCreditCheck(req.params.id, req.user!));
  }),
);

// Постановка в план производства
router.post(
  '/:id/to-production',
  requireRole('MANAGER', 'WAREHOUSE', 'FACTORY'),
  asyncHandler(async (req, res) => {
    res.json(await service.addToProductionPlan(req.params.id, req.user!));
  }),
);

// Обновление статуса оплаты (бухгалтер)
router.post(
  '/:id/payment',
  requireRole('ACCOUNTANT', 'MANAGER'),
  validateBody(paymentSchema),
  asyncHandler(async (req, res) => {
    res.json(await service.updatePayment(req.params.id, req.body.status, req.user!));
  }),
);

// Обновление полей заявки
router.patch(
  '/:id',
  requireRole('MANAGER'),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const { prisma } = await import('../../lib/prisma');
    const data: Record<string, unknown> = { ...req.body };
    if (req.body.desiredDate !== undefined) {
      data.desiredDate = req.body.desiredDate ? new Date(req.body.desiredDate) : null;
    }
    await prisma.order.update({ where: { id: req.params.id }, data });
    res.json(await service.getOrder(req.params.id, req.user!));
  }),
);

export default router;
