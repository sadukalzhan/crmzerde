import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword, signToken, randomToken } from '../../lib/auth';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { asyncHandler, badRequest, conflict, unauthorized } from '../../middleware/error';

const router = Router();

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6, 'Минимум 6 символов'),
  companyName: z.string().min(2),
  phone: z.string().optional(),
  bin: z.string().optional(),
  address: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(u: { id: string; fullName: string; email: string; role: string; phone: string | null }) {
  return { id: u.id, fullName: u.fullName, email: u.email, role: u.role, phone: u.phone };
}

// Самостоятельная регистрация — только для клиентов.
router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { fullName, email, password, companyName, phone, bin, address } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw conflict('Пользователь с таким email уже существует');

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash: await hashPassword(password),
        role: 'CLIENT',
        phone,
        clientProfile: { create: { companyName, contactName: fullName, email, phone, bin, address } },
      },
    });

    const token = signToken({ sub: user.id, role: 'CLIENT', email });
    res.status(201).json({ token, user: publicUser(user) });
  }),
);

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw unauthorized('Неверный email или пароль');
    }
    if (!user.isActive) throw unauthorized('Учётная запись отключена');

    const token = signToken({ sub: user.id, role: user.role as never, email: user.email });
    res.json({ token, user: publicUser(user) });
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { clientProfile: true },
    });
    if (!user) throw unauthorized();
    res.json({ ...publicUser(user), clientProfile: user.clientProfile });
  }),
);

router.post(
  '/change-password',
  authenticate,
  validateBody(z.object({ currentPassword: z.string(), newPassword: z.string().min(6) })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await verifyPassword(req.body.currentPassword, user.passwordHash))) {
      throw badRequest('Текущий пароль неверен');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(req.body.newPassword) },
    });
    res.json({ ok: true });
  }),
);

// Восстановление пароля. В dev нет почтового сервиса — токен возвращается в ответе
// (в production здесь отправляется письмо со ссылкой).
router.post(
  '/forgot-password',
  validateBody(z.object({ email: z.string().email() })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user) {
      // Не раскрываем существование учётки.
      res.json({ ok: true });
      return;
    }
    const token = randomToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 1000 * 60 * 60) },
    });
    res.json({ ok: true, devToken: token, devNote: 'В production токен отправляется на email' });
  }),
);

router.post(
  '/reset-password',
  validateBody(z.object({ token: z.string(), newPassword: z.string().min(6) })),
  asyncHandler(async (req, res) => {
    const record = await prisma.passwordResetToken.findUnique({ where: { token: req.body.token } });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw badRequest('Токен недействителен или истёк');
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await hashPassword(req.body.newPassword) },
      }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    ]);
    res.json({ ok: true });
  }),
);

export default router;
