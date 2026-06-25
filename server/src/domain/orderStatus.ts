// Этапы (статусы) заявки и их метаданные. Используется и канбаном, и валидацией.
import type { Role } from './roles';

export const ORDER_STATUSES = [
  'NEW',
  'CREDIT_CHECK',
  'REJECTED',
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
  'CLAIM',
  'POSTPAYMENT',
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
  NEW:              { key: 'NEW',              label: 'Новая заявка',           color: '#4C8DFF', terminal: false, hint: 'Клиент создал заявку' },
  CREDIT_CHECK:     { key: 'CREDIT_CHECK',     label: 'Проверка дебиторки',     color: '#22B8CF', terminal: false, hint: 'Проверка долга клиента' },
  REJECTED:         { key: 'REJECTED',         label: 'Отклонено',              color: '#FF5A5F', terminal: true,  hint: 'Заявка отклонена (с причиной)' },
  SPEC_PREPARATION: { key: 'SPEC_PREPARATION', label: 'Согласование',           color: '#7C6CF6', terminal: false, hint: 'Менеджер готовит спецификацию' },
  SIGNING:          { key: 'SIGNING',          label: 'На подписании',          color: '#9B72FF', terminal: false, hint: 'Подписи менеджера и клиента' },
  AWAITING_PAYMENT: { key: 'AWAITING_PAYMENT', label: 'Ждём оплату',            color: '#FFB020', terminal: false, hint: 'Ожидание поступления аванса' },
  DOCS_CONFIRMED:   { key: 'DOCS_CONFIRMED',   label: 'Документы подтверждены', color: '#12B886', terminal: false, hint: 'Оплата получена / постоплата одобрена' },
  RESERVATION:      { key: 'RESERVATION',      label: 'Резервирование',         color: '#4DABF7', terminal: false, hint: 'Товар закрепляется за заявкой' },
  PRODUCTION:       { key: 'PRODUCTION',       label: 'На заводе',              color: '#FF922B', terminal: false, hint: 'Заявка в плане производства' },
  READY:            { key: 'READY',            label: 'Готово',                 color: '#94D82D', terminal: false, hint: 'Продукт готов, на складе' },
  SHIPMENT:         { key: 'SHIPMENT',         label: 'Отгрузка',               color: '#E64AC9', terminal: false, hint: 'Менеджер закрепляет ТТН и УПД' },
  DELIVERY:         { key: 'DELIVERY',         label: 'Доставка',               color: '#37B24D', terminal: false, hint: 'Товар передаётся клиенту' },
  AWAITING_DOCS:    { key: 'AWAITING_DOCS',    label: 'Ожидание документов',    color: '#FAB005', terminal: false, hint: 'Менеджер ждёт акт от клиента' },
  CLAIM:            { key: 'CLAIM',            label: 'Рекламация',             color: '#FA5252', terminal: false, hint: 'Разбор претензии / замена' },
  POSTPAYMENT:      { key: 'POSTPAYMENT',      label: 'Постоплата',             color: '#845EF7', terminal: false, hint: 'Счёт выставлен, ожидание оплаты' },
  CLOSED:           { key: 'CLOSED',           label: 'Закрыто',                color: '#37B24D', terminal: true,  hint: 'Сделка закрыта в CRM' },
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

/** Колонки канбана, релевантные роли (в порядке цикла). */
export function kanbanStatusesForRole(role: Role): OrderStatus[] {
  switch (role) {
    case 'FACTORY':
      return ['RESERVATION', 'PRODUCTION', 'READY'];
    case 'WAREHOUSE':
      return ['DOCS_CONFIRMED', 'RESERVATION', 'PRODUCTION', 'READY', 'SHIPMENT'];
    case 'LOGIST':
      return ['READY', 'SHIPMENT', 'DELIVERY'];
    case 'ACCOUNTANT':
      return ['CREDIT_CHECK', 'AWAITING_PAYMENT', 'REJECTED', 'POSTPAYMENT', 'DOCS_CONFIRMED'];
    case 'MANAGER':
    case 'ADMIN':
    default:
      return [...ORDER_STATUSES];
  }
}
