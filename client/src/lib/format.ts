import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { boxes, pallets } from './packaging';

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

const numRu = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n || 0);

export function fmtM2(m2: number): string {
  return `${numRu(m2)} м²`;
}

/** Объём в м² (базовая единица). */
export function fmtVolume(qty: number, _unit?: string): string {
  return fmtM2(qty);
}

/** Полная упаковка: «X м² · Y кор. · Z под.» по формату и сорту. */
export function fmtPack(m2: number, format: string, grade = 'A'): string {
  return `${fmtM2(m2)} · ${boxes(m2, format, grade)} кор. · ${pallets(m2, format, grade)} под.`;
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
