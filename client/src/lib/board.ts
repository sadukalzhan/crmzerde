import type { OrderStatus, Role } from './types';

/** Колонки канбана, релевантные роли (зеркало server/src/domain/orderStatus.ts). */
export function kanbanStatusesForRole(role: Role, all: OrderStatus[]): OrderStatus[] {
  switch (role) {
    case 'WAREHOUSE':
      return ['DOCS_CONFIRMED', 'RESERVATION', 'PRODUCTION', 'READY', 'SHIPMENT'];
    default:
      return all;
  }
}

const DELIVERED: OrderStatus[] = ['DELIVERY', 'AWAITING_DOCS', 'CLOSED'];

export function boardStats(orders: { status: OrderStatus }[]) {
  const total = orders.length;
  const rejected = orders.filter((o) => o.status === 'REJECTED').length;
  const closed = orders.filter((o) => o.status === 'CLOSED').length;
  const delivered = orders.filter((o) => DELIVERED.includes(o.status)).length;
  const inWork = total - rejected - closed;
  return { total, inWork, delivered, rejected };
}
