// Применяет сид один раз на версию. Если Setting.seedVersion уже равен EXPECTED —
// пропускает (данные не трогает). Иначе выполняет сброс-сид (prisma/seed.ts).
// Позволяет один раз пересоздать базу на Render при смене модели данных.
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const EXPECTED = '2';

(async () => {
  const prisma = new PrismaClient();
  let current: string | null = null;
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'seedVersion' } });
    current = row?.value ?? null;
  } catch {
    current = null; // таблиц ещё нет
  }
  await prisma.$disconnect();

  if (current === EXPECTED) {
    console.log(`Сид версии ${EXPECTED} уже применён — пропуск.`);
    return;
  }
  console.log(`Применяю сид (версия ${current ?? 'нет'} → ${EXPECTED})…`);
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
})();
