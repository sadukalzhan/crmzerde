// Сервис заявок: машина состояний, бизнес-правила, побочные эффекты переходов.
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { notify, notifyRole } from '../../lib/notify';
import { emitBoardChanged } from '../../lib/realtime';
import { ApiError, badRequest, forbidden, notFound } from '../../middleware/error';
import { canTransition } from '../../domain/transitions';
import { isOrderStatus, STATUS_META, type OrderStatus } from '../../domain/orderStatus';
import { productionPlanPeriod, productionPriority, productionStartDate } from '../../domain/businessRules';
import type { AuthUser } from '../../middleware/auth';

export const orderListInclude = {
  client: true,
  manager: { select: { id: true, fullName: true, email: true, role: true } },
  carrier: true,
  items: { include: { product: true } },
} satisfies Prisma.OrderInclude;

export const orderDetailInclude = {
  ...orderListInclude,
  specifications: { include: { items: true } },
  contracts: true,
  documents: { include: { uploadedBy: { select: { id: true, fullName: true } } } },
  reservations: { include: { product: true } },
  productionPlanItems: { include: { plan: true } },
  claims: { orderBy: { createdAt: 'desc' as const } },
  history: {
    include: { actor: { select: { id: true, fullName: true, role: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.OrderInclude;

async function nextOrderNumber(): Promise<number> {
  const last = await prisma.order.findFirst({ orderBy: { number: 'desc' }, select: { number: true } });
  return last ? last.number + 1 : 233;
}

function buildRoute(shipFrom?: string | null, shipTo?: string | null): string | null {
  if (shipFrom && shipTo) return `${shipFrom} → ${shipTo}`;
  return shipFrom ?? shipTo ?? null;
}

async function recordHistory(
  orderId: string,
  from: string | null,
  to: string,
  actorId: string | null,
  note?: string,
) {
  await prisma.orderHistory.create({ data: { orderId, fromStatus: from, toStatus: to, actorId, note } });
}

// ── Создание заявки ──────────────────────────────────────────────────────────

export interface CreateOrderInput {
  clientId?: string;
  managerId?: string;
  carrierId?: string;
  selfPickup?: boolean;
  priority?: string;
  paymentTerm?: string;
  shipFrom?: string;
  shipTo?: string;
  desiredDate?: string;
  items: { productId: string; quantity: number; grade?: string }[];
}

export async function createOrder(input: CreateOrderInput, actor: AuthUser) {
  let clientId = input.clientId;

  // Клиент создаёт заявку только от своего имени.
  if (actor.role === 'CLIENT') {
    const profile = await prisma.client.findUnique({ where: { userId: actor.id } });
    if (!profile) throw badRequest('Профиль клиента не найден');
    clientId = profile.id;
  }
  if (!clientId) throw badRequest('Не указан клиент');

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw notFound('Клиент не найден');
  if (!input.items?.length) throw badRequest('Добавьте хотя бы одну позицию');

  // Приоритет заявки выставляют только менеджеры. Клиент, даже если пришлёт
  // поле в запросе, получает средний приоритет по умолчанию.
  const priority = actor.role === 'CLIENT' ? 'MEDIUM' : input.priority ?? 'MEDIUM';

  const totalQty = input.items.reduce((s, i) => s + i.quantity, 0);
  const number = await nextOrderNumber();
  const selfPickup = input.selfPickup ?? false;

  const order = await prisma.order.create({
    data: {
      number,
      status: 'NEW',
      priority,
      paymentTerm: input.paymentTerm ?? 'PREPAYMENT',
      quantity: totalQty,
      unit: 'M2',
      selfPickup,
      shipFrom: input.shipFrom,
      shipTo: input.shipTo,
      route: buildRoute(input.shipFrom, input.shipTo),
      desiredDate: input.desiredDate ? new Date(input.desiredDate) : null,
      clientId,
      managerId: input.managerId ?? client.managerId ?? null,
      carrierId: selfPickup ? null : input.carrierId,
      items: {
        create: input.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unit: 'M2',
          grade: i.grade ?? 'A',
        })),
      },
    },
    include: orderDetailInclude,
  });

  await recordHistory(order.id, null, 'NEW', actor.id, 'Заявка создана');

  // Уведомления: всем менеджерам — новая заявка.
  await notifyRole('MANAGER', {
    type: 'NEW_ORDER',
    title: `Новая заявка #${number}`,
    body: `${client.companyName}`,
    orderId: order.id,
  });
  emitBoardChanged({ reason: 'created', orderId: order.id });

  return order;
}

// ── Доступность на складе ────────────────────────────────────────────────────

export async function availabilityFor(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { inventory: true } } } } },
  });
  if (!order) throw notFound('Заявка не найдена');

  // Регламент, п. 3-5: если позиции не хватает на свободном остатке, менеджер
  // должен видеть, в чьём она резерве — своего клиента (такой резерв можно
  // перебросить) или чужого партнёра (нужен запрос на снятие).
  const holders = await prisma.reservation.findMany({
    where: {
      orderId: { not: orderId },
      productId: { in: order.items.map((i) => i.productId) },
    },
    include: {
      order: {
        select: {
          id: true,
          number: true,
          clientId: true,
          client: { select: { companyName: true } },
          manager: { select: { id: true, fullName: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const lines = order.items.map((item) => {
    const inv = item.product.inventory.find((x) => x.grade === item.grade);
    const free = inv ? inv.quantity - inv.reserved : 0;
    const shortage = Math.max(0, item.quantity - free);

    const reservedBy = holders
      .filter((r) => r.productId === item.productId && r.grade === item.grade)
      .map((r) => ({
        reservationId: r.id,
        quantity: r.quantity,
        orderId: r.orderId,
        orderNumber: r.order.number,
        clientName: r.order.client.companyName,
        managerName: r.order.manager?.fullName ?? null,
        sameClient: r.order.clientId === order.clientId,
        confirmedForShipment: r.confirmedForShipment,
        // Резерв своего клиента, не подтверждённый под отгрузку, можно забрать
        // на эту заявку сразу (п. 4). Остальные — только через запрос (п. 5).
        releasable: r.order.clientId === order.clientId && !r.confirmedForShipment,
      }));

    return {
      productId: item.productId,
      grade: item.grade,
      name: item.product.name,
      needed: item.quantity,
      free,
      covered: Math.min(free, item.quantity),
      shortage,
      reservedBy,
    };
  });

  const totalShortage = lines.reduce((s, l) => s + l.shortage, 0);
  const totalNeeded = lines.reduce((s, l) => s + l.needed, 0);
  const status: 'FULL' | 'PARTIAL' | 'NONE' =
    totalShortage === 0 ? 'FULL' : totalShortage >= totalNeeded ? 'NONE' : 'PARTIAL';

  return { status, lines };
}

// ── Резервирование ───────────────────────────────────────────────────────────

/**
 * Резервирует то, что ещё не закрыто резервом по этой заявке, в пределах
 * свободного остатка. Считает от нехватки (нужно − уже зарезервировано),
 * поэтому безопасно вызывать повторно — на этапе резервирования и после
 * оприходования произведённой продукции (Регламент, п. 9).
 */
async function reserveOutstanding(orderId: string, actor: AuthUser): Promise<number> {
  const shortages = await orderShortages(orderId);
  let total = 0;
  await prisma.$transaction(async (tx) => {
    for (const s of shortages) {
      if (s.shortage <= 0) continue;
      const inv = await tx.inventory.findUnique({
        where: { productId_grade: { productId: s.productId, grade: s.grade } },
      });
      if (!inv) continue;
      const take = Math.min(inv.quantity - inv.reserved, s.shortage);
      if (take <= 0) continue;
      await tx.reservation.create({
        data: { orderId, productId: s.productId, grade: s.grade, quantity: take, createdById: actor.id },
      });
      await tx.inventory.update({ where: { id: inv.id }, data: { reserved: { increment: take } } });
      total += take;
    }
  });
  return total;
}

/** Нехватка по позициям заявки = нужно − зарезервировано (по резервам, а не по свободному остатку). */
async function orderShortages(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } }, reservations: true },
  });
  if (!order) throw notFound('Заявка не найдена');
  return order.items.map((item) => {
    const reserved = order.reservations
      .filter((r) => r.productId === item.productId && r.grade === item.grade)
      .reduce((s, r) => s + r.quantity, 0);
    return {
      item,
      productId: item.productId,
      grade: item.grade,
      name: item.product.name,
      needed: item.quantity,
      reserved,
      hadReservation: order.reservations.length > 0,
      shortage: Math.max(0, item.quantity - reserved),
    };
  });
}

/** Отгрузка: снимаем резерв и списываем остаток по всем позициям. */
async function consumeStockOnShipment(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, reservations: true } });
  if (!order) return;
  await prisma.$transaction(async (tx) => {
    // снять резервы
    for (const r of order.reservations) {
      const inv = await tx.inventory.findUnique({ where: { productId_grade: { productId: r.productId, grade: r.grade } } });
      if (inv) await tx.inventory.update({ where: { id: inv.id }, data: { reserved: Math.max(0, inv.reserved - r.quantity) } });
    }
    await tx.reservation.deleteMany({ where: { orderId } });
    // списать остаток по фактически отгруженным позициям
    for (const item of order.items) {
      const inv = await tx.inventory.findUnique({ where: { productId_grade: { productId: item.productId, grade: item.grade } } });
      if (inv) await tx.inventory.update({ where: { id: inv.id }, data: { quantity: Math.max(0, inv.quantity - item.quantity) } });
    }
  });
}

/** Удаление заявки (админ): освобождаем резервы, затем каскадно удаляем. */
export async function deleteOrder(orderId: string) {
  const reservations = await prisma.reservation.findMany({ where: { orderId } });
  await prisma.$transaction(async (tx) => {
    for (const r of reservations) {
      const inv = await tx.inventory.findUnique({ where: { productId_grade: { productId: r.productId, grade: r.grade } } });
      if (inv) await tx.inventory.update({ where: { id: inv.id }, data: { reserved: Math.max(0, inv.reserved - r.quantity) } });
    }
    await tx.order.delete({ where: { id: orderId } });
  });
  emitBoardChanged({ reason: 'deleted', orderId });
}

// ── Постановка в план производства (правило 15-го числа + приоритет) ──────────

export async function addToProductionPlan(orderId: string, actor: AuthUser) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound('Заявка не найдена');

  const { year, month } = productionPlanPeriod(order.createdAt);
  const startDate = productionStartDate(order.createdAt);
  const priority = productionPriority(order.paymentTerm, order.paymentStatus);

  const plan = await prisma.productionPlan.upsert({
    where: { year_month: { year, month } },
    create: { year, month },
    update: {},
  });

  // Ставим в план ВСЕ позиции заявки, которых не хватает на доступном остатке
  // (по каждому товару+сорту — свой объём производства = нехватка).
  const shortages = await orderShortages(orderId);
  let created = 0;
  for (const s of shortages) {
    // Если резервов не было (заявка идёт в производство без резерва) — производим весь объём позиции.
    const produceQty = s.shortage > 0 ? s.shortage : s.hadReservation ? 0 : s.needed;
    if (produceQty <= 0) continue;
    const existing = await prisma.productionPlanItem.findFirst({
      where: { orderId, planId: plan.id, orderItemId: s.item.id },
    });
    if (!existing) {
      await prisma.productionPlanItem.create({
        data: {
          planId: plan.id,
          orderId,
          orderItemId: s.item.id,
          grade: s.grade,
          quantity: produceQty,
          priority,
          status: 'PLANNED',
          startDate,
        },
      });
      created++;
    }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { productionStartDate: startDate, productionPriority: priority },
  });

  await notifyRole('WAREHOUSE', {
    type: 'PLAN_ADDED',
    title: `Новые позиции в плане: #${order.number}`,
    body: `Плановый месяц ${String(month).padStart(2, '0')}.${year}, позиций: ${created}, приоритет ${priority}`,
    orderId,
  });

  return { plan, priority, startDate, created };
}

// ── Универсальный переход по статусу (drag-and-drop канбана) ──────────────────

export interface TransitionInput {
  to: string;
  note?: string;
  reason?: string; // для REJECTED
}

export async function transitionOrder(orderId: string, input: TransitionInput, actor: AuthUser) {
  if (!isOrderStatus(input.to)) throw badRequest('Неизвестный статус');
  const to = input.to as OrderStatus;

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { client: true } });
  if (!order) throw notFound('Заявка не найдена');
  const from = order.status as OrderStatus;

  if (from === to) return getOrder(orderId, actor);

  if (!canTransition(actor.role, from, to)) {
    throw forbidden(`Переход «${from}» → «${to}» недоступен для вашей роли`);
  }

  const data: Prisma.OrderUpdateInput = { status: to };
  let note = input.note;


  // ── Побочные эффекты и guard'ы по целевому статусу ──
  switch (to) {
    case 'REJECTED': {
      if (!input.reason) throw badRequest('Укажите причину отклонения');
      data.rejectionReason = input.reason;
      note = `Отклонено: ${input.reason}`;
      break;
    }
    case 'RESERVATION': {
      const avail = await availabilityFor(orderId);
      await reserveOutstanding(orderId, actor);
      note = note ?? `Резерв: ${avail.status === 'FULL' ? 'полный' : avail.status === 'PARTIAL' ? 'частичный' : 'нет наличия'}`;
      break;
    }
    case 'SHIPMENT': {
      // Согласование закрыто двумя условиями.
      // 1) Двусторонняя спецификация: подписи менеджера и клиента.
      const signedSpec = await prisma.specification.findFirst({
        where: { orderId, managerSigned: true, clientSigned: true },
      });
      if (!signedSpec) {
        throw new ApiError(
          409,
          'Нет двусторонней спецификации — нужны подписи менеджера и клиента.',
        );
      }
      // 2) При авансе отгрузка возможна только после поступления оплаты.
      if (order.paymentTerm === 'PREPAYMENT' && order.paymentStatus !== 'PAID') {
        throw new ApiError(
          409,
          'Условие «Аванс»: отгрузка возможна только после получения оплаты.',
        );
      }
      // Отгрузка: снимаем резерв и списываем остаток.
      await consumeStockOnShipment(orderId);
      break;
    }
    case 'CLOSED': {
      // На отгрузке менеджер прикладывает документы — без них заявку не закрыть.
      const docs = await prisma.document.findMany({ where: { orderId } });
      if (docs.length === 0) {
        throw badRequest('Загрузите отгрузочные документы перед завершением заявки');
      }
      const openClaim = await prisma.claim.findFirst({
        where: { orderId, status: { in: ['OPEN', 'IN_REVIEW'] } },
      });
      if (openClaim) throw badRequest('Есть открытая рекламация — закрыть заявку нельзя');
      data.closedAt = new Date();
      data.closedBy = { connect: { id: actor.id } };
      break;
    }
  }

  await prisma.order.update({ where: { id: orderId }, data });
  await recordHistory(orderId, from, to, actor.id, note);
  const updated = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderDetailInclude });

  // Уведомить клиента о смене статуса его заявки — человекочитаемым текстом,
  // а не кодом статуса.
  if (order.client.userId) {
    await notify({
      userId: order.client.userId,
      type: 'STATUS_CHANGE',
      title: `Заявка #${order.number}: ${STATUS_META[to].label}`,
      body: STATUS_META[to].hint,
      orderId,
    });
  }
  emitBoardChanged({ reason: 'transition', orderId, from, to });

  return updated;
}

// ── Регламент, п. 4-5: работа с чужими резервами ─────────────────────────────

async function loadReservationForOrder(orderId: string, reservationId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound('Заявка не найдена');

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      product: true,
      order: {
        select: {
          id: true,
          number: true,
          clientId: true,
          managerId: true,
          client: { select: { companyName: true } },
        },
      },
    },
  });
  if (!reservation) throw notFound('Резерв не найден');
  if (reservation.orderId === orderId) throw badRequest('Это резерв текущей заявки');
  return { order, reservation };
}

/**
 * Снятие резерва, стоящего за тем же клиентом и не подтверждённого под
 * конкретную отгрузку, с переносом на текущую заявку (Регламент, п. 4).
 */
export async function releaseReservation(orderId: string, reservationId: string, actor: AuthUser) {
  const { order, reservation } = await loadReservationForOrder(orderId, reservationId);

  if (reservation.order.clientId !== order.clientId) {
    throw forbidden('Резерв стоит за другим партнёром — снять его можно только по согласованию (запросите снятие).');
  }
  if (reservation.confirmedForShipment) {
    throw new ApiError(409, 'Резерв подтверждён под конкретную отгрузку — снимать его нельзя.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.reservation.delete({ where: { id: reservation.id } });
    await tx.inventory.updateMany({
      where: { productId: reservation.productId, grade: reservation.grade },
      data: { reserved: { decrement: reservation.quantity } },
    });
  });

  const moved = await reserveOutstanding(orderId, actor);
  await recordHistory(
    orderId,
    order.status,
    order.status,
    actor.id,
    `Резерв ${reservation.quantity} м² «${reservation.product.name}» снят с заявки #${reservation.order.number} того же клиента`,
  );
  emitBoardChanged({ reason: 'reservation-released', orderId });
  return { released: reservation.quantity, reserved: moved };
}

/**
 * Запрос на снятие резерва, стоящего за другим партнёром (Регламент, п. 5).
 * Уходит менеджеру заявки-держателя; если менеджера нет — всем менеджерам.
 */
export async function requestReservationRelease(orderId: string, reservationId: string, actor: AuthUser) {
  const { order, reservation } = await loadReservationForOrder(orderId, reservationId);

  const title = `Запрос на снятие резерва: #${reservation.order.number}`;
  const body =
    `${reservation.quantity} м² «${reservation.product.name}» (${reservation.grade}) ` +
    `требуются под заявку #${order.number}. Держатель: ${reservation.order.client.companyName}.`;

  if (reservation.order.managerId) {
    await notify({ userId: reservation.order.managerId, type: 'GENERIC', title, body, orderId });
  } else {
    await notifyRole('MANAGER', { type: 'GENERIC', title, body, orderId });
  }

  await recordHistory(
    orderId,
    order.status,
    order.status,
    actor.id,
    `Запрошено снятие резерва с заявки #${reservation.order.number}`,
  );
  return { requested: true };
}

/** Пометить резерв подтверждённым под конкретную отгрузку (Регламент, п. 4). */
export async function setReservationConfirmed(reservationId: string, confirmed: boolean) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation) throw notFound('Резерв не найден');
  return prisma.reservation.update({
    where: { id: reservationId },
    data: { confirmedForShipment: confirmed },
  });
}

// ── Обновление статуса оплаты (бухгалтер) ────────────────────────────────────

export async function updatePayment(orderId: string, status: string, actor: AuthUser) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound('Заявка не найдена');

  const priority = productionPriority(order.paymentTerm, status);
  await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: status, productionPriority: priority } });
  await prisma.productionPlanItem.updateMany({ where: { orderId }, data: { priority } });
  await recordHistory(orderId, order.status, order.status, actor.id, `Оплата: ${status}`);
  emitBoardChanged({ reason: 'payment', orderId });
  return getOrder(orderId, actor);
}

// ── Чтение с учётом роли (клиент видит только свои заявки) ────────────────────

export async function listOrders(actor: AuthUser, filters: Record<string, string | undefined>) {
  const where: Prisma.OrderWhereInput = {};

  if (actor.role === 'CLIENT') {
    const profile = await prisma.client.findUnique({ where: { userId: actor.id } });
    where.clientId = profile?.id ?? '__none__';
  } else if (actor.role === 'MANAGER') {
    // Менеджер видит заявки своих клиентов + где он ответственный.
    where.OR = [{ managerId: actor.id }, { client: { managerId: actor.id } }];
  }

  if (filters.status && isOrderStatus(filters.status)) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.carrierId) where.carrierId = filters.carrierId;
  if (filters.clientId && actor.role !== 'CLIENT') where.clientId = filters.clientId;
  if (filters.search) {
    const num = parseInt(filters.search.replace('#', ''), 10);
    where.OR = [
      ...(where.OR ?? []),
      ...(Number.isNaN(num) ? [] : [{ number: num }]),
      { client: { companyName: { contains: filters.search } } },
      { route: { contains: filters.search } },
    ];
  }

  return prisma.order.findMany({ where, include: orderListInclude, orderBy: { number: 'desc' } });
}

export async function getOrder(orderId: string, actor: AuthUser) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderDetailInclude });
  if (!order) throw notFound('Заявка не найдена');

  if (actor.role === 'CLIENT') {
    const profile = await prisma.client.findUnique({ where: { userId: actor.id } });
    if (order.clientId !== profile?.id) throw forbidden('Доступ только к своим заявкам');
  }
  if (actor.role === 'MANAGER' && order.managerId !== actor.id && order.client.managerId !== actor.id) {
    // Менеджеры видят чужие заявки только для чтения общей доски — здесь разрешим чтение.
  }
  return order;
}
