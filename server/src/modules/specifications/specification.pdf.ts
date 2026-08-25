// Печатная форма спецификации: шапка, таблица позиций, итог прописью,
// условия и два блока реквизитов (продавец постоянный, дилер — из его карточки).
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { sellerLines, SELLER } from '../../domain/company';
import { amountInWords } from '../../domain/numberToWords';
import { FORMAT_LABELS } from '../../domain/packaging';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const longDate = (d: Date) => `«${d.getDate()}» ${MONTHS[d.getMonth()]} ${d.getFullYear()} г.`;
const shortDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} г.`;

const num = (v: number, digits = 2) =>
  v.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const CURRENCY_LABEL: Record<string, string> = { KZT: 'тенге', RUB: 'рублях' };

export interface SpecPdfInput {
  number: string;
  contractNumber?: string | null;
  contractDate?: Date | null;
  city: string;
  issuedAt: Date;
  currency: string;
  includesVat: boolean;
  deliveryTerms?: string | null;
  shipmentTerms?: string | null;
  paymentTerms?: string | null;
  total: number;
  items: {
    name: string;
    format: string;
    toneCaliber?: string | null;
    quantity: number;
    pallets: number;
    boxes: number;
    price: number;
    sum: number;
  }[];
  dealer: {
    companyName: string;
    bin?: string | null;
    address?: string | null;
    actualAddress?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
    bik?: string | null;
    vatCert?: string | null;
    kbe?: string | null;
    director?: string | null;
    email?: string | null;
    phone?: string | null;
  };
}

/** Реквизиты дилера строками — пропускаем незаполненные поля. */
function dealerLines(d: SpecPdfInput['dealer']): string[] {
  return [
    d.companyName,
    d.bin && `БИН/ИИН: ${d.bin}`,
    d.vatCert && `Свидетельство НДС: ${d.vatCert}`,
    d.kbe && `Кбе: ${d.kbe}`,
    d.bankAccount && `Счёт: ${d.bankAccount}`,
    d.bik && `БИК: ${d.bik}`,
    d.bankName && `Банк: ${d.bankName}`,
    d.address && `Юридический адрес: ${d.address}`,
    d.actualAddress && `Фактический адрес: ${d.actualAddress}`,
    d.phone && `Телефон: ${d.phone}`,
    d.email && `Email: ${d.email}`,
  ].filter((x): x is string => Boolean(x));
}

const HEAD = [
  'Размер, см',
  'Номенклатура',
  'тон/калибр',
  'кол-во паллет',
  'кол-во коробок',
  'кол-во м²',
  'цена за 1м²',
  'сумма',
];

export function buildSpecificationPdf(s: SpecPdfInput): TDocumentDefinitions {
  const currencyWord = CURRENCY_LABEL[s.currency] ?? 'тенге';

  const body: Content[][] = [
    HEAD.map((h) => ({ text: h, style: 'th' })),
    ...s.items.map((i) => [
      { text: FORMAT_LABELS[i.format] ?? i.format, style: 'td' },
      { text: i.name, style: 'tdLeft' },
      { text: i.toneCaliber ?? '', style: 'td' },
      { text: i.pallets ? String(i.pallets) : '', style: 'td' },
      { text: i.boxes ? String(i.boxes) : '', style: 'td' },
      { text: num(i.quantity, 3), style: 'td' },
      { text: num(i.price, 0), style: 'td' },
      { text: num(i.sum), style: 'td' },
    ]),
  ];

  const conditions: Content[] = [
    {
      text: `Общая сумма заказа, в ${currencyWord}: ${num(s.total)} (${amountInWords(s.total, s.currency)})`,
      bold: true,
      margin: [0, 8, 0, 4],
    },
  ];
  if (s.includesVat) conditions.push({ text: 'Сумма включает НДС' });
  if (s.deliveryTerms) conditions.push({ text: `Условия поставки: ${s.deliveryTerms}` });
  if (s.shipmentTerms) conditions.push({ text: `Сроки отгрузки: ${s.shipmentTerms}` });
  if (s.paymentTerms) conditions.push({ text: `Условия оплаты: ${s.paymentTerms}` });

  const contractLine = s.contractNumber
    ? `к договору №${s.contractNumber}${s.contractDate ? ` от ${longDate(s.contractDate)}` : ''}`
    : null;

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 28, 28, 28],
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    content: [
      { text: `Спецификация №${s.number}`, style: 'title' },
      ...(contractLine ? [{ text: contractLine, alignment: 'center' as const, margin: [0, 0, 0, 2] as [number, number, number, number] }] : []),
      {
        columns: [
          { text: s.city, width: '*' },
          { text: `От ${shortDate(s.issuedAt)}`, width: 'auto' },
        ],
        margin: [0, 4, 0, 8],
      },
      { text: `Продавец: ${SELLER.name}`, bold: true },
      { text: `Дилер: ${s.dealer.companyName}`, bold: true, margin: [0, 0, 0, 8] },
      {
        table: { headerRows: 1, widths: [46, '*', 58, 44, 48, 54, 48, 62], body },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
        },
      },
      ...conditions,
      {
        columns: [
          { width: '*', stack: [{ text: 'Продавец:', bold: true, margin: [0, 10, 0, 4] }, ...sellerLines().map((t) => ({ text: t, fontSize: 8 }))] },
          { width: '*', stack: [{ text: 'Дилер:', bold: true, margin: [0, 10, 0, 4] }, ...dealerLines(s.dealer).map((t) => ({ text: t, fontSize: 8 }))] },
        ],
        columnGap: 24,
      },
      {
        columns: [
          { width: '*', stack: [{ text: `Директор: ${SELLER.director}  ______________`, margin: [0, 14, 0, 0], fontSize: 8 }, { text: 'М.П.', fontSize: 8, margin: [0, 6, 0, 0] }] },
          { width: '*', stack: [{ text: `Директор: ${s.dealer.director ?? ''}  ______________`, margin: [0, 14, 0, 0], fontSize: 8 }, { text: 'М.П.', fontSize: 8, margin: [0, 6, 0, 0] }] },
        ],
        columnGap: 24,
      },
    ],
    styles: {
      title: { fontSize: 13, bold: true, alignment: 'center' },
      th: { bold: true, fontSize: 8, alignment: 'center', margin: [0, 3, 0, 3] },
      td: { fontSize: 8, alignment: 'center', margin: [0, 2, 0, 2] },
      tdLeft: { fontSize: 8, margin: [2, 2, 2, 2] },
    },
  };
}
