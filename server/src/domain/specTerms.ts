// Условия спецификации фиксированы регламентом завода: отгрузка только
// самовывозом и в пределах 30 календарных дней. Менеджер выбирает лишь
// условие оплаты, поэтому эти строки не вводятся вручную.
export const DELIVERY_TERMS = 'Самовывоз';
export const SHIPMENT_TERMS = 'до 30 календарных дней';

export const SPEC_PAYMENT_TERMS = ['PREPAYMENT', 'POSTPAYMENT'] as const;
export type SpecPaymentTerm = (typeof SPEC_PAYMENT_TERMS)[number];

export const SPEC_PAYMENT_LABELS: Record<string, string> = {
  PREPAYMENT: '100% предварительная оплата',
  POSTPAYMENT: 'постоплата',
};
