import { Router } from 'express';
import { ROLE_META, ROLES } from '../../domain/roles';
import { ORDER_STATUSES, STATUS_META } from '../../domain/orderStatus';
import { TRANSITIONS } from '../../domain/transitions';
import {
  PAYMENT_TERM_LABELS,
  PAYMENT_STATUS_LABELS,
  PRIORITY_LABELS,
} from '../../domain/businessRules';

const router = Router();

// Статические метаданные для UI (роли, статусы, переходы, словари).
router.get('/', (_req, res) => {
  res.json({
    roles: ROLES,
    roleMeta: ROLE_META,
    orderStatuses: ORDER_STATUSES,
    statusMeta: STATUS_META,
    transitions: TRANSITIONS,
    paymentTermLabels: PAYMENT_TERM_LABELS,
    paymentStatusLabels: PAYMENT_STATUS_LABELS,
    priorityLabels: PRIORITY_LABELS,
    documentTypes: {
      TTN: 'ТТН',
      UPD: 'УПД',
      ACT: 'Акт выполненных работ',
      INVOICE: 'Счёт',
      OTHER: 'Другое',
    },
  });
});

export default router;
