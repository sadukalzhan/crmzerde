// Идемпотентный сид для деплоя: заполняет БД демо-данными только если она пустая
// (чтобы повторные деплои на Render не затирали данные).
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

(async () => {
  const prisma = new PrismaClient();
  let count = 0;
  try {
    count = await prisma.user.count();
  } catch {
    count = 0; // таблиц ещё нет
  }
  await prisma.$disconnect();

  if (count > 0) {
    console.log(`Сид пропущен: в БД уже ${count} пользователей.`);
    return;
  }
  console.log('БД пустая — запускаю сид демо-данными…');
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
})();
