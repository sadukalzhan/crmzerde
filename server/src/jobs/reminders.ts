// Авто-напоминания менеджеру: акт от клиента не получен в срок.
import { prisma } from '../lib/prisma';
import { notify } from '../lib/notify';
import { ACT_REMINDER_DAYS } from '../domain/businessRules';

export async function checkActReminders(): Promise<void> {
  const threshold = new Date(Date.now() - ACT_REMINDER_DAYS * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: { status: 'AWAITING_DOCS', updatedAt: { lt: threshold } },
    include: { documents: true },
  });

  for (const order of orders) {
    const hasAct = order.documents.some((d) => d.type === 'ACT');
    if (hasAct || !order.managerId) continue;
    await notify({
      userId: order.managerId,
      type: 'DOC_OVERDUE',
      title: `Не получен акт по заявке #${order.number}`,
      body: `Прошло более ${ACT_REMINDER_DAYS} дн. с доставки`,
      orderId: order.id,
    });
  }
}

export function startReminderJobs(): void {
  // Один прогон при старте + раз в 12 часов.
  setTimeout(() => void checkActReminders().catch(console.error), 10_000);
  setInterval(() => void checkActReminders().catch(console.error), 12 * 60 * 60 * 1000);
}
