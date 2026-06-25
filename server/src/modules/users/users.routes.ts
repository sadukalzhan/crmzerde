import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/auth';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { asyncHandler, conflict } from '../../middleware/error';
import { ROLES } from '../../domain/roles';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

const select = { id: true, fullName: true, email: true, role: true, phone: true, isActive: true, createdAt: true };

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.user.findMany({ select, orderBy: { createdAt: 'asc' } }));
  }),
);

// Сотрудников создаёт только администратор (клиенты — самозапись).
router.post(
  '/',
  validateBody(
    z.object({
      fullName: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(ROLES),
      phone: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const exists = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (exists) throw conflict('Email уже занят');
    const user = await prisma.user.create({
      data: {
        fullName: req.body.fullName,
        email: req.body.email,
        role: req.body.role,
        phone: req.body.phone,
        passwordHash: await hashPassword(req.body.password),
      },
      select,
    });
    res.status(201).json(user);
  }),
);

router.patch(
  '/:id',
  validateBody(
    z.object({
      fullName: z.string().min(2).optional(),
      role: z.enum(ROLES).optional(),
      phone: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    res.json(await prisma.user.update({ where: { id: req.params.id }, data: req.body, select }));
  }),
);

router.post(
  '/:id/reset-password',
  validateBody(z.object({ newPassword: z.string().min(6) })),
  asyncHandler(async (req, res) => {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash: await hashPassword(req.body.newPassword) },
    });
    res.json({ ok: true });
  }),
);

export default router;
