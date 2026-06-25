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
  NEW: [T('CREDIT_CHECK', ['MANAGER', 'ACCOUNTANT'])],
  CREDIT_CHECK: [
    T('SPEC_PREPARATION', ['MANAGER']),
    T('REJECTED', ['MANAGER', 'ACCOUNTANT']),
  ],
  REJECTED: [T('CREDIT_CHECK', ['ACCOUNTANT'])], // разблокировка по долгу
  SPEC_PREPARATION: [T('SIGNING', ['MANAGER'])],
  SIGNING: [
    T('AWAITING_PAYMENT', ['MANAGER']), // аванс
    T('DOCS_CONFIRMED', ['MANAGER']), // постоплата одобрена
  ],
  AWAITING_PAYMENT: [T('DOCS_CONFIRMED', ['ACCOUNTANT', 'MANAGER'])],
  DOCS_CONFIRMED: [T('RESERVATION', ['WAREHOUSE', 'MANAGER'])],
  RESERVATION: [
    T('READY', ['WAREHOUSE']), // полное наличие
    T('PRODUCTION', ['WAREHOUSE', 'MANAGER']), // нет / частично → производство
    T('SHIPMENT', ['WAREHOUSE', 'MANAGER']), // зарезервировано полностью
  ],
  PRODUCTION: [T('READY', ['FACTORY'])],
  READY: [T('SHIPMENT', ['WAREHOUSE', 'MANAGER'])],
  SHIPMENT: [T('DELIVERY', ['LOGIST', 'MANAGER'])],
  DELIVERY: [T('AWAITING_DOCS', ['LOGIST', 'MANAGER'])],
  AWAITING_DOCS: [
    T('CLAIM', ['MANAGER', 'CLIENT']),
    T('POSTPAYMENT', ['MANAGER']),
    T('CLOSED', ['MANAGER']),
  ],
  CLAIM: [
    T('AWAITING_DOCS', ['MANAGER']), // возврат в цикл после разбора
    T('CLOSED', ['MANAGER']),
  ],
  POSTPAYMENT: [T('CLOSED', ['ACCOUNTANT', 'MANAGER'])],
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
