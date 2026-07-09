/* eslint-disable no-console */
// Чистый старт: настройки, учётки по ролям, справочники (заводы/перевозчики),
// 2-3 примерных товара (новая модель: формат/цвет/поверхность + остатки по сортам),
// один клиент для тестовой клиентской учётки. Демо-заявок нет.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const hash = (p: string) => bcrypt.hashSync(p, 10);

// Версия сида — при её смене seed-if-needed один раз пересоздаёт базу.
export const SEED_VERSION = '2';

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
  await prisma.factory.deleteMany();
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
  await prisma.user.create({ data: { fullName: 'Айгуль / Завод', email: 'factory@crm.kz', passwordHash: hash('factory123'), role: 'FACTORY' } });
  await prisma.user.create({ data: { fullName: 'Серик Складской', email: 'warehouse@crm.kz', passwordHash: hash('warehouse123'), role: 'WAREHOUSE' } });
  await prisma.user.create({ data: { fullName: 'Марат Логист', email: 'logist@crm.kz', passwordHash: hash('logist123'), role: 'LOGIST' } });
  await prisma.user.create({ data: { fullName: 'Алия Бухгалтер', email: 'accountant@crm.kz', passwordHash: hash('accountant123'), role: 'ACCOUNTANT' } });
  const clientUser = await prisma.user.create({ data: { fullName: 'Жанна (СтройКомплект)', email: 'client@crm.kz', passwordHash: hash('client123'), role: 'CLIENT', phone: '+7 707 555 44 33' } });

  // Справочники
  console.log('Справочники…');
  await prisma.factory.createMany({
    data: [
      { name: 'Завод «Актобе»', city: 'Актобе' },
      { name: 'Завод «Алматы»', city: 'Алматы' },
      { name: 'Завод «Шымкент»', city: 'Шымкент' },
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
      debt: 0,
      managerId: manager.id,
      userId: clientUser.id,
    },
  });

  // Примерные товары в новой модели + остатки по сортам (м²)
  console.log('Номенклатура…');
  const products = [
    { name: 'Cemento Ivory', format: '60x60', collection: 'Cemento', color: 'Ivory', surface: 'Матовая', price: 6500, stock: { A: 500, B: 120, C: 40, BRAK: 15 } },
    { name: 'Marmo Statuario', format: '120x60', collection: 'Marmo', color: 'Белый', surface: 'Полированная', price: 9000, stock: { A: 300, B: 80, C: 20, BRAK: 10 } },
    { name: 'Concrete Grey', format: '60x60', collection: 'Concrete', color: 'Серый', surface: 'Структурированная', price: 5500, stock: { A: 200, B: 50, C: 10, BRAK: 5 } },
  ];
  for (const p of products) {
    await prisma.product.create({
      data: {
        name: p.name,
        format: p.format,
        size: p.format.replace('x', '×'),
        collection: p.collection,
        color: p.color,
        surface: p.surface,
        unit: 'M2',
        pricePerUnit: p.price,
        inventory: {
          create: (Object.entries(p.stock) as [string, number][]).map(([grade, qty]) => ({
            grade,
            quantity: qty,
            reserved: 0,
            unit: 'M2',
          })),
        },
      },
    });
  }

  console.log('\n✅ База очищена и подготовлена. Тестовые учётки:');
  console.log('  admin@crm.kz / admin123 · manager@crm.kz / manager123 · factory@crm.kz / factory123');
  console.log('  warehouse@crm.kz / warehouse123 · logist@crm.kz / logist123 · accountant@crm.kz / accountant123');
  console.log('  client@crm.kz / client123\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
