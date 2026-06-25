/* eslint-disable no-console */
// Демо-данные: пользователи всех ролей, клиенты, номенклатура, ~18 заявок на разных этапах.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  productionPlanPeriod,
  productionPriority,
  productionStartDate,
} from '../src/domain/businessRules';

const prisma = new PrismaClient();

const hash = (p: string) => bcrypt.hashSync(p, 10);

// Главная «happy path» цепочка статусов (для генерации истории).
const MAIN_PATH = [
  'NEW',
  'CREDIT_CHECK',
  'SPEC_PREPARATION',
  'SIGNING',
  'AWAITING_PAYMENT',
  'DOCS_CONFIRMED',
  'RESERVATION',
  'PRODUCTION',
  'READY',
  'SHIPMENT',
  'DELIVERY',
  'AWAITING_DOCS',
  'POSTPAYMENT',
  'CLOSED',
];

function pathTo(status: string): string[] {
  if (status === 'REJECTED') return ['NEW', 'CREDIT_CHECK', 'REJECTED'];
  if (status === 'CLAIM') {
    const idx = MAIN_PATH.indexOf('AWAITING_DOCS');
    return [...MAIN_PATH.slice(0, idx + 1), 'CLAIM'];
  }
  const idx = MAIN_PATH.indexOf(status);
  return idx >= 0 ? MAIN_PATH.slice(0, idx + 1) : ['NEW', status];
}

async function reset() {
  // Удаляем в порядке зависимостей.
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

  // ── Настройки ──
  await prisma.setting.createMany({
    data: [
      { key: 'brandName', value: 'Зерде Керамика Актобе' },
      { key: 'currency', value: 'KZT' },
      { key: 'dateFormat', value: 'DD.MM.YY' },
      { key: 'language', value: 'ru' },
    ],
  });

  // ── Пользователи (по одному на роль) ──
  console.log('Пользователи…');
  const admin = await prisma.user.create({
    data: { fullName: 'Админ Системы', email: 'admin@crm.kz', passwordHash: hash('admin123'), role: 'ADMIN' },
  });
  const manager = await prisma.user.create({
    data: { fullName: 'Данияр Менеджер', email: 'manager@crm.kz', passwordHash: hash('manager123'), role: 'MANAGER', phone: '+7 701 111 22 33' },
  });
  await prisma.user.create({
    data: { fullName: 'Айгуль / Завод', email: 'factory@crm.kz', passwordHash: hash('factory123'), role: 'FACTORY' },
  });
  await prisma.user.create({
    data: { fullName: 'Серик Складской', email: 'warehouse@crm.kz', passwordHash: hash('warehouse123'), role: 'WAREHOUSE' },
  });
  await prisma.user.create({
    data: { fullName: 'Марат Логист', email: 'logist@crm.kz', passwordHash: hash('logist123'), role: 'LOGIST' },
  });
  await prisma.user.create({
    data: { fullName: 'Алия Бухгалтер', email: 'accountant@crm.kz', passwordHash: hash('accountant123'), role: 'ACCOUNTANT' },
  });
  const clientUser = await prisma.user.create({
    data: { fullName: 'Жанна (СтройКомплект)', email: 'client@crm.kz', passwordHash: hash('client123'), role: 'CLIENT', phone: '+7 707 555 44 33' },
  });

  // ── Справочники ──
  console.log('Справочники…');
  const [fAktobe, fAlmaty, fShymkent] = await Promise.all([
    prisma.factory.create({ data: { name: 'Завод «Актобе»', city: 'Актобе' } }),
    prisma.factory.create({ data: { name: 'Завод «Алматы»', city: 'Алматы' } }),
    prisma.factory.create({ data: { name: 'Завод «Шымкент»', city: 'Шымкент' } }),
  ]);
  const [carKTL, carPEK, carAlmaty] = await Promise.all([
    prisma.carrier.create({ data: { name: 'КазТрансЛогистик', phone: '+7 727 300 10 10' } }),
    prisma.carrier.create({ data: { name: 'ПЭК', phone: '+7 495 660 00 00' } }),
    prisma.carrier.create({ data: { name: 'Almaty Cargo', phone: '+7 727 250 60 60' } }),
  ]);

  // ── Номенклатура керамогранита ──
  console.log('Номенклатура…');
  const productsData = [
    { name: 'Cemento Ivory Carving 60×60', size: '60×60', collection: 'Cemento', pricePerUnit: 185000, stock: 60 },
    { name: 'Cemento Grafite 60×60', size: '60×60', collection: 'Cemento', pricePerUnit: 185000, stock: 40 },
    { name: 'Marmo Statuario 80×80', size: '80×80', collection: 'Marmo', pricePerUnit: 240000, stock: 18 },
    { name: 'Marmo Calacatta 60×120', size: '60×120', collection: 'Marmo', pricePerUnit: 320000, stock: 8 },
    { name: 'Concrete Grey 60×60', size: '60×60', collection: 'Concrete', pricePerUnit: 165000, stock: 75 },
    { name: 'Wood Oak 20×120', size: '20×120', collection: 'Wood', pricePerUnit: 210000, stock: 30 },
    { name: 'Terra Beige 60×60', size: '60×60', collection: 'Terra', pricePerUnit: 150000, stock: 0 },
    { name: 'Onyx Black 60×120', size: '60×120', collection: 'Onyx', pricePerUnit: 360000, stock: 5 },
  ];
  const products = [];
  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        size: p.size,
        collection: p.collection,
        unit: 'PALLET',
        pricePerUnit: p.pricePerUnit,
        inventory: { create: { quantity: p.stock, reserved: 0, unit: 'PALLET' } },
      },
    });
    products.push(product);
  }

  // ── Клиенты ──
  console.log('Клиенты…');
  const cStroyKomplekt = await prisma.client.create({
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
  const cKeramStroy = await prisma.client.create({
    data: { companyName: 'ООО «КерамСтрой»', contactName: 'Игорь Петров', phone: '+7 495 120 00 00', bin: '7701123456', address: 'г. Москва, Варшавское ш. 1', debt: 0, managerId: manager.id },
  });
  const cAhmetov = await prisma.client.create({
    data: { companyName: 'ИП Ахметов', contactName: 'Бауыржан Ахметов', phone: '+7 701 900 11 22', bin: '900101300123', address: 'г. Караганда, пр. Бухар-Жырау 50', debt: 450000, creditBlocked: true, managerId: manager.id },
  });
  const cAlmatyPlitka = await prisma.client.create({
    data: { companyName: 'ТОО «Алматы Плитка»', contactName: 'Дамир Ким', phone: '+7 727 222 33 44', bin: '060540005678', address: 'г. Алматы, пр. Сейфуллина 500', debt: 0, managerId: manager.id },
  });
  const cMasterFasad = await prisma.client.create({
    data: { companyName: 'ООО «Мастер Фасад»', contactName: 'Алексей Смирнов', phone: '+7 812 700 80 90', bin: '7802998877', address: 'г. Санкт-Петербург, Невский пр. 100', debt: 120000, managerId: manager.id },
  });

  const clients = [cStroyKomplekt, cKeramStroy, cAhmetov, cAlmatyPlitka, cMasterFasad];

  // ── Заявки ──
  console.log('Заявки…');
  let orderNo = 233;

  interface OrderSpec {
    status: string;
    clientIdx: number;
    productIdx: number;
    qty: number;
    priority: string;
    paymentTerm: string;
    paymentStatus?: string;
    factory: { id: string; city: string };
    carrier: { id: string };
    shipTo: string;
    createdDaysAgo: number;
  }

  const specs: OrderSpec[] = [
    { status: 'NEW', clientIdx: 0, productIdx: 0, qty: 22, priority: 'HIGH', paymentTerm: 'PREPAYMENT', factory: fAktobe, carrier: carKTL, shipTo: 'Москва-Бронницы', createdDaysAgo: 1 },
    { status: 'NEW', clientIdx: 1, productIdx: 4, qty: 15, priority: 'MEDIUM', paymentTerm: 'PREPAYMENT', factory: fShymkent, carrier: carPEK, shipTo: 'Москва', createdDaysAgo: 2 },
    { status: 'CREDIT_CHECK', clientIdx: 4, productIdx: 1, qty: 10, priority: 'MEDIUM', paymentTerm: 'POSTPAYMENT', factory: fAlmaty, carrier: carAlmaty, shipTo: 'Санкт-Петербург', createdDaysAgo: 3 },
    { status: 'REJECTED', clientIdx: 2, productIdx: 2, qty: 8, priority: 'LOW', paymentTerm: 'POSTPAYMENT', factory: fAlmaty, carrier: carKTL, shipTo: 'Караганда', createdDaysAgo: 4 },
    { status: 'SPEC_PREPARATION', clientIdx: 3, productIdx: 4, qty: 30, priority: 'MEDIUM', paymentTerm: 'PREPAYMENT', factory: fAlmaty, carrier: carAlmaty, shipTo: 'Алматы', createdDaysAgo: 5 },
    { status: 'SIGNING', clientIdx: 1, productIdx: 5, qty: 12, priority: 'HIGH', paymentTerm: 'PREPAYMENT', factory: fShymkent, carrier: carPEK, shipTo: 'Москва', createdDaysAgo: 6 },
    { status: 'AWAITING_PAYMENT', clientIdx: 3, productIdx: 0, qty: 18, priority: 'MEDIUM', paymentTerm: 'PREPAYMENT', paymentStatus: 'UNPAID', factory: fAktobe, carrier: carKTL, shipTo: 'Астана', createdDaysAgo: 7 },
    { status: 'DOCS_CONFIRMED', clientIdx: 0, productIdx: 4, qty: 25, priority: 'HIGH', paymentTerm: 'PREPAYMENT', paymentStatus: 'PAID', factory: fAktobe, carrier: carKTL, shipTo: 'Москва-Бронницы', createdDaysAgo: 8 },
    { status: 'RESERVATION', clientIdx: 1, productIdx: 1, qty: 14, priority: 'MEDIUM', paymentTerm: 'PREPAYMENT', paymentStatus: 'PAID', factory: fAlmaty, carrier: carPEK, shipTo: 'Москва', createdDaysAgo: 9 },
    { status: 'PRODUCTION', clientIdx: 3, productIdx: 6, qty: 20, priority: 'HIGH', paymentTerm: 'PREPAYMENT', paymentStatus: 'PAID', factory: fAlmaty, carrier: carAlmaty, shipTo: 'Алматы', createdDaysAgo: 10 },
    { status: 'PRODUCTION', clientIdx: 4, productIdx: 7, qty: 9, priority: 'MEDIUM', paymentTerm: 'POSTPAYMENT', paymentStatus: 'POSTPAY_APPROVED', factory: fShymkent, carrier: carKTL, shipTo: 'Санкт-Петербург', createdDaysAgo: 11 },
    { status: 'READY', clientIdx: 1, productIdx: 0, qty: 16, priority: 'MEDIUM', paymentTerm: 'PREPAYMENT', paymentStatus: 'PAID', factory: fAktobe, carrier: carPEK, shipTo: 'Москва', createdDaysAgo: 12 },
    { status: 'SHIPMENT', clientIdx: 0, productIdx: 0, qty: 22, priority: 'HIGH', paymentTerm: 'PREPAYMENT', paymentStatus: 'PAID', factory: fAktobe, carrier: carKTL, shipTo: 'Москва-Бронницы', createdDaysAgo: 14 },
    { status: 'DELIVERY', clientIdx: 3, productIdx: 4, qty: 28, priority: 'MEDIUM', paymentTerm: 'PREPAYMENT', paymentStatus: 'PAID', factory: fAlmaty, carrier: carAlmaty, shipTo: 'Алматы', createdDaysAgo: 16 },
    { status: 'AWAITING_DOCS', clientIdx: 1, productIdx: 5, qty: 11, priority: 'MEDIUM', paymentTerm: 'PREPAYMENT', paymentStatus: 'PAID', factory: fShymkent, carrier: carPEK, shipTo: 'Москва', createdDaysAgo: 22 },
    { status: 'CLAIM', clientIdx: 4, productIdx: 1, qty: 13, priority: 'HIGH', paymentTerm: 'PREPAYMENT', paymentStatus: 'PAID', factory: fAlmaty, carrier: carKTL, shipTo: 'Санкт-Петербург', createdDaysAgo: 24 },
    { status: 'POSTPAYMENT', clientIdx: 3, productIdx: 4, qty: 19, priority: 'MEDIUM', paymentTerm: 'POSTPAYMENT', paymentStatus: 'POSTPAY_APPROVED', factory: fAlmaty, carrier: carAlmaty, shipTo: 'Астана', createdDaysAgo: 28 },
    { status: 'CLOSED', clientIdx: 0, productIdx: 0, qty: 22, priority: 'MEDIUM', paymentTerm: 'PREPAYMENT', paymentStatus: 'PAID', factory: fAktobe, carrier: carKTL, shipTo: 'Москва-Бронницы', createdDaysAgo: 35 },
  ];

  const dayMs = 24 * 60 * 60 * 1000;
  const createdOrders: { id: string; number: number; status: string; createdAt: Date }[] = [];

  for (const s of specs) {
    const client = clients[s.clientIdx];
    const product = products[s.productIdx];
    const createdAt = new Date(Date.now() - s.createdDaysAgo * dayMs);
    const number = orderNo++;

    const order = await prisma.order.create({
      data: {
        number,
        status: s.status,
        priority: s.priority,
        paymentTerm: s.paymentTerm,
        paymentStatus: s.paymentStatus ?? 'UNPAID',
        productionPriority: productionPriority(s.paymentTerm, s.paymentStatus ?? 'UNPAID'),
        quantity: s.qty,
        unit: 'PALLET',
        shipFrom: s.factory.city,
        shipTo: s.shipTo,
        route: `${s.factory.city} → ${s.shipTo}`,
        desiredDate: new Date(createdAt.getTime() + 30 * dayMs),
        rejectionReason: s.status === 'REJECTED' ? `Задолженность клиента: ${client.debt.toLocaleString('ru-RU')}` : null,
        closedAt: s.status === 'CLOSED' ? new Date() : null,
        closedById: s.status === 'CLOSED' ? manager.id : null,
        createdAt,
        clientId: client.id,
        managerId: manager.id,
        factoryId: s.factory.id,
        carrierId: s.carrier.id,
        items: { create: [{ productId: product.id, quantity: s.qty, unit: 'PALLET', pricePerUnit: product.pricePerUnit }] },
      },
    });
    createdOrders.push({ id: order.id, number, status: s.status, createdAt });

    // История переходов.
    const chain = pathTo(s.status);
    let prev: string | null = null;
    const historyData = chain.map((st, i) => {
      const entry = {
        orderId: order.id,
        fromStatus: prev,
        toStatus: st,
        actorId: manager.id,
        note: st === 'REJECTED' ? order.rejectionReason : null,
        createdAt: new Date(createdAt.getTime() + i * 60 * 60 * 1000),
      };
      prev = st;
      return entry;
    });
    await prisma.orderHistory.createMany({ data: historyData });

    // Спецификация + договор для статусов начиная с SIGNING.
    if (MAIN_PATH.indexOf(s.status) >= MAIN_PATH.indexOf('SIGNING') || s.status === 'CLAIM') {
      const sum = s.qty * product.pricePerUnit;
      await prisma.specification.create({
        data: {
          orderId: order.id,
          number: `СП-${number}`,
          total: sum,
          managerSigned: true,
          managerSignedAt: new Date(createdAt.getTime() + 3 * dayMs),
          clientSigned: s.status !== 'SIGNING',
          clientSignedAt: s.status !== 'SIGNING' ? new Date(createdAt.getTime() + 4 * dayMs) : null,
          items: { create: [{ productId: product.id, name: product.name, quantity: s.qty, unit: 'PALLET', price: product.pricePerUnit, sum }] },
        },
      });
      await prisma.contract.create({
        data: {
          orderId: order.id,
          number: `ДГ-${number}`,
          managerSigned: true,
          clientSigned: s.status !== 'SIGNING',
          signedAt: s.status !== 'SIGNING' ? new Date(createdAt.getTime() + 4 * dayMs) : null,
        },
      });
    }

    // Документы ТТН/УПД для отгрузки и далее.
    if (['SHIPMENT', 'DELIVERY', 'AWAITING_DOCS', 'CLAIM', 'POSTPAYMENT', 'CLOSED'].includes(s.status)) {
      await prisma.document.createMany({
        data: [
          { orderId: order.id, type: 'TTN', name: `ТТН №${number}.pdf`, fileUrl: '/api/files/demo-ttn.pdf', uploadedById: manager.id },
          { orderId: order.id, type: 'UPD', name: `УПД №${number}.pdf`, fileUrl: '/api/files/demo-upd.pdf', uploadedById: manager.id },
        ],
      });
    }
    // Счёт для постоплаты, акт для закрытых.
    if (['POSTPAYMENT', 'CLOSED'].includes(s.status)) {
      await prisma.document.create({
        data: { orderId: order.id, type: 'INVOICE', name: `Счёт №${number}.pdf`, fileUrl: '/api/files/demo-invoice.pdf', uploadedById: manager.id },
      });
    }
    if (s.status === 'CLOSED') {
      await prisma.document.create({
        data: { orderId: order.id, type: 'ACT', name: `Акт №${number}.pdf`, fileUrl: '/api/files/demo-act.pdf', uploadedById: clientUser.id },
      });
    }

    // Резервы для статуса RESERVATION.
    if (s.status === 'RESERVATION') {
      await prisma.reservation.create({ data: { orderId: order.id, productId: product.id, quantity: s.qty } });
      await prisma.inventory.updateMany({ where: { productId: product.id }, data: { reserved: { increment: s.qty } } });
    }

    // Рекламация.
    if (s.status === 'CLAIM') {
      await prisma.claim.create({
        data: {
          orderId: order.id,
          clientId: client.id,
          description: 'Часть паллет повреждена при транспортировке, требуется замена 2 паллет.',
          status: 'IN_REVIEW',
          createdById: clientUser.id,
        },
      });
    }

    // «Просроченный» акт — состарим updatedAt, чтобы сработало напоминание.
    if (s.status === 'AWAITING_DOCS') {
      await prisma.order.update({ where: { id: order.id }, data: { updatedAt: new Date(Date.now() - 10 * dayMs) } });
    }
  }

  // ── План производства (правило 15-го числа) для заявок в производстве ──
  console.log('План производства…');
  for (const co of createdOrders.filter((o) => o.status === 'PRODUCTION')) {
    const { year, month } = productionPlanPeriod(co.createdAt);
    const startDate = productionStartDate(co.createdAt);
    const plan = await prisma.productionPlan.upsert({
      where: { year_month: { year, month } },
      create: { year, month },
      update: {},
    });
    const full = await prisma.order.findUnique({ where: { id: co.id } });
    await prisma.productionPlanItem.create({
      data: {
        planId: plan.id,
        orderId: co.id,
        priority: full!.productionPriority ?? 2,
        status: full!.productionPriority === 1 ? 'IN_PRODUCTION' : 'PLANNED',
        startDate,
      },
    });
    await prisma.order.update({ where: { id: co.id }, data: { productionStartDate: startDate } });
  }

  // ── Уведомления (примеры) ──
  console.log('Уведомления…');
  await prisma.notification.createMany({
    data: [
      { userId: manager.id, type: 'NEW_ORDER', title: 'Новая заявка #234', body: 'ООО «КерамСтрой»', isRead: false },
      { userId: manager.id, type: 'SIGNATURE', title: 'Клиент подписал спецификацию', body: 'Заявка #240', isRead: false },
      { userId: clientUser.id, type: 'STATUS_CHANGE', title: 'Заявка #245: статус «Отгрузка»', body: 'Ваш заказ передан перевозчику', isRead: false },
    ],
  });

  console.log('\n✅ Сид завершён. Тестовые учётки:');
  console.log('  admin@crm.kz / admin123');
  console.log('  manager@crm.kz / manager123');
  console.log('  factory@crm.kz / factory123');
  console.log('  warehouse@crm.kz / warehouse123');
  console.log('  logist@crm.kz / logist123');
  console.log('  accountant@crm.kz / accountant123');
  console.log('  client@crm.kz / client123\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
