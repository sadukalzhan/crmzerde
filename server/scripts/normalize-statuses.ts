// Разовая нормализация данных под изменившийся набор статусов.
// Статус CREDIT_CHECK («Проверка дебиторки») удалён из модели, но в базе
// могли остаться заявки, застрявшие на этом этапе: для них не осталось бы
// ни одного разрешённого перехода, а карточка падала бы на поиске метаданных.
import { PrismaClient } from '@prisma/client';

const REMOVED: Record<string, string> = {
  CREDIT_CHECK: 'SPEC_PREPARATION',
};

(async () => {
  const prisma = new PrismaClient();
  try {
    for (const [from, to] of Object.entries(REMOVED)) {
      const { count } = await prisma.order.updateMany({
        where: { status: from },
        data: { status: to },
      });
      if (count > 0) console.log(`Статус ${from} → ${to}: перенесено заявок ${count}`);
    }
  } catch (err) {
    // Таблиц ещё нет (первый деплой) — нормализовать нечего.
    console.log('Нормализация статусов пропущена:', (err as Error).message);
  } finally {
    await prisma.$disconnect();
  }
})();
