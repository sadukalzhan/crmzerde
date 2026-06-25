// Создание уведомлений + realtime-доставка адресату.
import { prisma } from './prisma';
import { emitToUser, emitToRole } from './realtime';
import type { Role } from '../domain/roles';

interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  orderId?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  const notification = await prisma.notification.create({ data: input });
  emitToUser(input.userId, 'notification:new', notification);
}

/** Уведомить всех активных пользователей роли. */
export async function notifyRole(role: Role, input: Omit<NotifyInput, 'userId'>): Promise<void> {
  const users = await prisma.user.findMany({
    where: { role, isActive: true },
    select: { id: true },
  });
  await prisma.notification.createMany({
    data: users.map((u) => ({ ...input, userId: u.id })),
  });
  emitToRole(role, 'notification:new', { ...input, broadcast: true });
}
