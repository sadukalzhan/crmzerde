// Машина состояний заявки: разрешённые переходы и роли, которые их выполняют.
// Проверяется на сервере при любом перемещении карточки/смене статуса.
import type { Role } from './roles';
import type { OrderStatus } from './orderStatus';

interface Transition {
  to: OrderStatus;
  roles: Role[]; // ADMIN добавляется автоматически
}

const T = (to: OrderStatus, roles: Role[]): Transition => ({ to, roles });

// Из какого статуса в какие можно перейти и кто имеет право.
export const TRANSITIONS: Record<OrderStatus, Transition[]> = {
  // Регламент, п. 1-2: заявка принята → менеджер сразу проверяет остатки и резервы.
  NEW: [
    T('SPEC_PREPARATION', ['MANAGER', 'SALES_HEAD']),
    T('REJECTED', ['MANAGER', 'SALES_HEAD']),
  ],
  REJECTED: [T('SPEC_PREPARATION', ['MANAGER'])], // возврат в работу
  SPEC_PREPARATION: [
    T('SIGNING', ['MANAGER', 'SALES_HEAD']),
    T('REJECTED', ['MANAGER', 'SALES_HEAD']),
  ],
  SIGNING: [
    T('AWAITING_PAYMENT', ['MANAGER', 'SALES_HEAD']), // аванс
    T('DOCS_CONFIRMED', ['MANAGER', 'SALES_HEAD']), // постоплата одобрена
  ],
  AWAITING_PAYMENT: [T('DOCS_CONFIRMED', ['MANAGER', 'SALES_HEAD'])],
  DOCS_CONFIRMED: [T('RESERVATION', ['WAREHOUSE', 'MANAGER', 'SALES_HEAD'])],
  RESERVATION: [
    T('READY', ['WAREHOUSE']), // полное наличие
    T('PRODUCTION', ['WAREHOUSE', 'MANAGER', 'SALES_HEAD']), // нет / частично → производство
    T('SHIPMENT', ['WAREHOUSE', 'MANAGER', 'SALES_HEAD']), // зарезервировано полностью
  ],
  PRODUCTION: [T('READY', ['WAREHOUSE', 'MANAGER', 'SALES_HEAD'])],
  READY: [T('SHIPMENT', ['WAREHOUSE', 'MANAGER', 'SALES_HEAD'])],
  SHIPMENT: [T('DELIVERY', ['MANAGER', 'SALES_HEAD'])],
  DELIVERY: [T('AWAITING_DOCS', ['MANAGER', 'SALES_HEAD'])],
  AWAITING_DOCS: [
    T('CLAIM', ['MANAGER', 'SALES_HEAD', 'CLIENT']),
    T('POSTPAYMENT', ['MANAGER', 'SALES_HEAD']),
    T('CLOSED', ['MANAGER', 'SALES_HEAD']),
  ],
  CLAIM: [
    T('AWAITING_DOCS', ['MANAGER', 'SALES_HEAD']), // возврат в цикл после разбора
    T('CLOSED', ['MANAGER', 'SALES_HEAD']),
  ],
  POSTPAYMENT: [T('CLOSED', ['MANAGER', 'SALES_HEAD'])],
  CLOSED: [],
};

export function allowedNextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from]?.map((t) => t.to) ?? [];
}

export function canTransition(role: Role, from: OrderStatus, to: OrderStatus): boolean {
  if (role === 'ADMIN') return allowedNextStatuses(from).includes(to);
  const tr = TRANSITIONS[from]?.find((t) => t.to === to);
  return !!tr && tr.roles.includes(role);
}
