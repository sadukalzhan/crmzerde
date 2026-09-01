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
  // Заявка принята: только продукция и количество.
  NEW: [
    T('RESERVATION', ['MANAGER', 'SALES_HEAD', 'WAREHOUSE']),
    T('REJECTED', ['MANAGER', 'SALES_HEAD']),
  ],
  REJECTED: [T('NEW', ['MANAGER', 'SALES_HEAD'])], // возврат в работу
  // Резерв под заявку. Дальше — согласование условий и цен.
  RESERVATION: [
    T('SPEC_PREPARATION', ['MANAGER', 'SALES_HEAD']),
    T('REJECTED', ['MANAGER', 'SALES_HEAD']),
  ],
  // Согласование: менеджер указывает условие оплаты и цены в спецификации.
  // Переход к отгрузке закрыт, пока нет двусторонней спецификации, а при
  // авансе — ещё и пока не получена оплата (проверки в orders.service).
  // Отклонить можно и отсюда: клиент вправе не подписать спецификацию, и без
  // этого перехода заявка зависла бы навсегда, удерживая товар в резерве.
  SPEC_PREPARATION: [
    T('SHIPMENT', ['MANAGER', 'SALES_HEAD', 'WAREHOUSE']),
    T('REJECTED', ['MANAGER', 'SALES_HEAD']),
  ],
  // Отгрузка: менеджер прикладывает документы, затем закрывает заявку.
  SHIPMENT: [T('CLOSED', ['MANAGER', 'SALES_HEAD'])],
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
