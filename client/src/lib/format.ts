import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

/** Дата в формате ДД.ММ.ГГ */
export function fmtDate(date?: string | Date | null): string {
  if (!date) return '—';
  return dayjs(date).format('DD.MM.YY');
}

export function fmtDateTime(date?: string | Date | null): string {
  if (!date) return '—';
  return dayjs(date).format('DD.MM.YY HH:mm');
}

export function fmtMonth(year: number, month: number): string {
  return dayjs(new Date(year, month - 1, 1)).format('MMMM YYYY');
}

const CURRENCY_SYMBOL: Record<string, string> = { KZT: '₸', RUB: '₽', USD: '$' };

export function fmtMoney(value: number, currency = 'KZT'): string {
  const formatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value || 0);
  return `${formatted} ${CURRENCY_SYMBOL[currency] ?? currency}`;
}

const UNIT_SHORT: Record<string, string> = { PALLET: 'пал.', M2: 'м²' };
export function fmtUnit(unit: string): string {
  return UNIT_SHORT[unit] ?? unit;
}

export function fmtVolume(qty: number, unit: string): string {
  return `${qty} ${fmtUnit(unit)}`;
}

export function relativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  return fmtDate(date);
}
