// Применяет сид один раз на версию. Если Setting.seedVersion уже равен ожидаемой
// версии — пропускает (данные не трогает). Иначе выполняет сброс-сид (prisma/seed.ts).
// Позволяет один раз пересоздать базу на Render при смене модели данных.
// Версия берётся из общего модуля: раньше она дублировалась здесь и разъезжалась
// с seed.ts, из-за чего сид молча не запускался.
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { SEED_VERSION as EXPECTED } from '../prisma/seed-version';

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
