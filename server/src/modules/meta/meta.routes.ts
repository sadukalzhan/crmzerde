import { Router } from 'express';
import { ROLE_META, ROLES } from '../../domain/roles';
import { ORDER_STATUSES, STATUS_META } from '../../domain/orderStatus';
import { TRANSITIONS } from '../../domain/transitions';
import {
  PAYMENT_TERM_LABELS,
  PAYMENT_STATUS_LABELS,
  PRIORITY_LABELS,
} from '../../domain/businessRules';
import {
  FORMATS,
  FORMAT_LABELS,
  FORMAT_SPECS,
  GRADES,
  GRADE_LABELS,
  SURFACES,
} from '../../domain/packaging';

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
    formats: FORMATS,
    formatLabels: FORMAT_LABELS,
    formatSpecs: FORMAT_SPECS,
    grades: GRADES,
    gradeLabels: GRADE_LABELS,
    surfaces: SURFACES,
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
