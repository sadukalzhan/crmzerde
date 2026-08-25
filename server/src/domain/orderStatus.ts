// Этапы (статусы) заявки и их метаданные. Используется и канбаном, и валидацией.
import type { Role } from './roles';

// Процесс заявки: новая → резерв → согласование → отгрузка → завершено.
// Отклонение возможно до согласования.
export const ORDER_STATUSES = [
  'NEW',
  'REJECTED',
  'RESERVATION',
  'SPEC_PREPARATION',
  'SHIPMENT',
  'CLOSED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface StatusMeta {
  key: OrderStatus;
  label: string;
  /** HEX цветной полосы колонки канбана */
  color: string;
  /** Терминальный статус (карточку нельзя двигать дальше) */
  terminal: boolean;
  /** Короткое описание этапа для подсказок/трекера клиента */
  hint: string;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  NEW:              { key: 'NEW',              label: 'Новая заявка',  color: '#A855F7', terminal: false, hint: 'Продукция и количество зафиксированы' },
  REJECTED:         { key: 'REJECTED',         label: 'Отклонено',     color: '#F43F5E', terminal: true,  hint: 'Заявка отклонена (с причиной)' },
  RESERVATION:      { key: 'RESERVATION',      label: 'Резерв',        color: '#22D3EE', terminal: false, hint: 'Товар закреплён за заявкой' },
  SPEC_PREPARATION: { key: 'SPEC_PREPARATION', label: 'Согласование',  color: '#EC4899', terminal: false, hint: 'Условия оплаты, цены и двусторонняя спецификация' },
  SHIPMENT:         { key: 'SHIPMENT',         label: 'Отгрузка',      color: '#F59E0B', terminal: false, hint: 'Менеджер загружает отгрузочные документы' },
  CLOSED:           { key: 'CLOSED',           label: 'Завершено',     color: '#2DD4BF', terminal: true,  hint: 'Заявка закрыта' },
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

/** Колонки канбана, релевантные роли (в порядке цикла). */
export function kanbanStatusesForRole(_role: Role): OrderStatus[] {
  // Цепочка короткая — показываем её целиком всем ролям.
  return [...ORDER_STATUSES];
}
