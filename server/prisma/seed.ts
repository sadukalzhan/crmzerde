/* eslint-disable no-console */
// Чистый старт: настройки, учётки по ролям, справочник перевозчиков,
// 2-3 примерных товара (формат/коллекция/цвет), один клиент для тестовой
// клиентской учётки. Остатки нулевые — актуальные заливает админ из Excel.
// Демо-заявок нет.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SEED_VERSION } from './seed-version';

const prisma = new PrismaClient();
const hash = (p: string) => bcrypt.hashSync(p, 10);

// Версия сида — при её смене seed-if-needed один раз пересоздаёт базу.
export { SEED_VERSION } from './seed-version';

async function reset() {
  await prisma.notification.deleteMany();
  await prisma.orderHistory.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.productionPlanItem.deleteMany();
  await prisma.productionPlan.deleteMany();
  await prisma.document.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.specificationItem.deleteMany();
  await prisma.specification.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.carrier.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.setting.deleteMany();
}

async function main() {
  console.log('Очистка БД…');
  await reset();

  // Настройки
  await prisma.setting.createMany({
    data: [
      { key: 'brandName', value: 'Зерде Керамика Актобе' },
      { key: 'currency', value: 'KZT' },
      { key: 'dateFormat', value: 'DD.MM.YY' },
      { key: 'language', value: 'ru' },
      { key: 'seedVersion', value: SEED_VERSION },
    ],
  });

  // Пользователи (по одному на роль)
  console.log('Пользователи…');
  await prisma.user.create({ data: { fullName: 'Админ Системы', email: 'admin@crm.kz', passwordHash: hash('admin123'), role: 'ADMIN' } });
  const manager = await prisma.user.create({ data: { fullName: 'Данияр Менеджер', email: 'manager@crm.kz', passwordHash: hash('manager123'), role: 'MANAGER', phone: '+7 701 111 22 33' } });
  await prisma.user.create({ data: { fullName: 'Руководитель отдела продаж', email: 'head@crm.kz', passwordHash: hash('head123'), role: 'SALES_HEAD', phone: '+7 701 222 33 44' } });
  await prisma.user.create({ data: { fullName: 'Серик Складской', email: 'warehouse@crm.kz', passwordHash: hash('warehouse123'), role: 'WAREHOUSE' } });
  const clientUser = await prisma.user.create({ data: { fullName: 'Жанна (СтройКомплект)', email: 'client@crm.kz', passwordHash: hash('client123'), role: 'CLIENT', phone: '+7 707 555 44 33' } });

  // Справочники
  console.log('Справочники…');
  // Сорта: пишутся не только как «A»/«B», но и как «A1», «R3», «B12».
  await prisma.grade.createMany({
    data: [
      { code: 'A', label: 'A сорт', sortOrder: 1 },
      { code: 'A1', label: 'A1', sortOrder: 2 },
      { code: 'R3', label: 'R3', sortOrder: 3 },
      { code: 'B', label: 'B сорт', sortOrder: 4 },
      { code: 'B12', label: 'B12', sortOrder: 5 },
      { code: 'C', label: 'C сорт', noBox: true, sortOrder: 6 },
      { code: 'BRAK', label: 'Брак', noBox: true, sortOrder: 7 },
    ],
  });
  await prisma.carrier.createMany({
    data: [
      { name: 'КазТрансЛогистик', phone: '+7 727 300 10 10' },
      { name: 'ПЭК', phone: '+7 495 660 00 00' },
      { name: 'Almaty Cargo', phone: '+7 727 250 60 60' },
    ],
  });

  // Один клиент для тестовой клиентской учётки
  await prisma.client.create({
    data: {
      companyName: 'ТОО «СтройКомплект»',
      contactName: 'Жанна Сапарова',
      email: 'client@crm.kz',
      phone: '+7 707 555 44 33',
      bin: '050340001234',
      address: 'г. Алматы, ул. Райымбека 220',
      actualAddress: 'г. Алматы, ул. Райымбека 220',
      bankName: 'АО «Kaspi Bank»',
      bankAccount: 'KZ09722S000006638360',
      bik: 'CASPKZKA',
      kbe: '17',
      director: 'Сапарова Ж. К.',
      managerId: manager.id,
      userId: clientUser.id,
    },
  });

  // Примерные товары в новой модели + остатки по сортам (м²)
  console.log('Номенклатура…');
  // Остатки нулевые (админ заливает импортом), цен у номенклатуры нет —
  // цена появляется только в спецификации на этапе согласования.
  const GRADES = ['A', 'A1', 'R3', 'B', 'B12', 'C', 'BRAK'] as const;
  const products = [
    { name: 'Cemento Ivory', format: '60x60', collection: 'Cemento', color: 'Ivory' },
    { name: 'Marmo Statuario', format: '120x60', collection: 'Marmo', color: 'Белый' },
    { name: 'Concrete Grey', format: '60x60', collection: 'Concrete', color: 'Серый' },
  ];
  for (const p of products) {
    await prisma.product.create({
      data: {
        name: p.name,
        format: p.format,
        size: p.format.replace('x', '×'),
        collection: p.collection,
        color: p.color,
        unit: 'M2',
        inventory: {
          create: GRADES.map((grade) => ({ grade, quantity: 0, reserved: 0, unit: 'M2' })),
        },
      },
    });
  }

  console.log('\n✅ База очищена и подготовлена. Тестовые учётки:');
  console.log('  admin@crm.kz / admin123 · head@crm.kz / head123 · manager@crm.kz / manager123');
  console.log('  warehouse@crm.kz / warehouse123 · client@crm.kz / client123');
  console.log('  Остатки нулевые — залейте актуальные импортом из Excel.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
