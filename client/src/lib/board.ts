import type { OrderStatus, Role } from './types';

/** Колонки канбана, релевантные роли (зеркало server/src/domain/orderStatus.ts). */
export function kanbanStatusesForRole(_role: Role, all: OrderStatus[]): OrderStatus[] {
  // Цепочка короткая — показываем её целиком всем ролям.
  return all;
}

const DELIVERED: OrderStatus[] = ['SHIPMENT', 'CLOSED'];

export function boardStats(orders: { status: OrderStatus }[]) {
  const total = orders.length;
  const rejected = orders.filter((o) => o.status === 'REJECTED').length;
  const closed = orders.filter((o) => o.status === 'CLOSED').length;
  const delivered = orders.filter((o) => DELIVERED.includes(o.status)).length;
  const inWork = total - rejected - closed;
  return { total, inWork, delivered, rejected };
}
