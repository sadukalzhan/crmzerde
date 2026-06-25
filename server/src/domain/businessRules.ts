// Ключевые бизнес-правила производства и приоритезации.

/**
 * Правило 15-го числа: дата запуска в производство.
 * Заявка оформлена до 15-го (включительно) → план на СЛЕДУЮЩИЙ месяц.
 * После 15-го → на ПОСЛЕСЛЕДУЮЩИЙ месяц.
 * Возвращает первое число планового месяца.
 */
export function productionStartDate(orderDate: Date): Date {
  const day = orderDate.getDate();
  const monthsAhead = day <= 15 ? 1 : 2;
  return new Date(orderDate.getFullYear(), orderDate.getMonth() + monthsAhead, 1);
}

/** Год/месяц планового месяца производства (month: 1..12). */
export function productionPlanPeriod(orderDate: Date): { year: number; month: number } {
  const d = productionStartDate(orderDate);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * Приоритезация производства:
 * аванс уплачен → Приоритет 1 (первая очередь); постоплата → Приоритет 2.
 */
export function productionPriority(paymentTerm: string, paymentStatus: string): 1 | 2 {
  return paymentTerm === 'PREPAYMENT' && paymentStatus === 'PAID' ? 1 : 2;
}

export const PAYMENT_TERMS = ['PREPAYMENT', 'POSTPAYMENT'] as const;
export const PAYMENT_STATUSES = ['UNPAID', 'PARTIAL', 'PAID', 'POSTPAY_APPROVED'] as const;
export const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;

export const PAYMENT_TERM_LABELS: Record<string, string> = {
  PREPAYMENT: 'Аванс',
  POSTPAYMENT: 'Постоплата',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: 'Не оплачено',
  PARTIAL: 'Частично',
  PAID: 'Оплачено',
  POSTPAY_APPROVED: 'Постоплата одобрена',
};

export const PRIORITY_LABELS: Record<string, string> = {
  HIGH: 'Высокий',
  MEDIUM: 'Средний',
  LOW: 'Низкий',
};

/** Срок ожидания акта от клиента (дней), после которого менеджеру шлётся напоминание. */
export const ACT_REMINDER_DAYS = 3;
