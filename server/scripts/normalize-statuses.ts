// Разовая нормализация данных под изменившиеся справочные наборы:
// статусы заявок и роли пользователей.
// Статус CREDIT_CHECK («Проверка дебиторки») удалён из модели, но в базе
// могли остаться заявки, застрявшие на этом этапе: для них не осталось бы
// ни одного разрешённого перехода, а карточка падала бы на поиске метаданных.
import { PrismaClient } from '@prisma/client';

const REMOVED_STATUSES: Record<string, string> = {
  CREDIT_CHECK: 'SPEC_PREPARATION',
};

// Роли завода, логиста и бухгалтера упразднены. Учётки не удаляем, а переводим
// в ближайшую действующую роль — иначе у пользователя останется роль, которой
// нет в модели, и интерфейс не сможет её отрисовать.
const REMOVED_ROLES: Record<string, string> = {
  FACTORY: 'WAREHOUSE',
  LOGIST: 'MANAGER',
  ACCOUNTANT: 'SALES_HEAD',
};

(async () => {
  const prisma = new PrismaClient();
  try {
    for (const [from, to] of Object.entries(REMOVED_STATUSES)) {
      const { count } = await prisma.order.updateMany({
        where: { status: from },
        data: { status: to },
      });
      if (count > 0) console.log(`Статус ${from} → ${to}: перенесено заявок ${count}`);
    }

    for (const [from, to] of Object.entries(REMOVED_ROLES)) {
      const { count } = await prisma.user.updateMany({
        where: { role: from },
        data: { role: to },
      });
      if (count > 0) console.log(`Роль ${from} → ${to}: переведено пользователей ${count}`);
    }
  } catch (err) {
    // Таблиц ещё нет (первый деплой) — нормализовать нечего.
    console.log('Нормализация пропущена:', (err as Error).message);
  } finally {
    await prisma.$disconnect();
  }
})();
