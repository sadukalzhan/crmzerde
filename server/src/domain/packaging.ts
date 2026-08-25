// Расчёт упаковки: из объёма в м² + формат + сорт → коробки и поддоны.
// Базовая единица хранения — м². Коробки/поддоны считаются автоматически.

export const FORMATS = ['60x60', '120x60'] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<string, string> = {
  '60x60': '60×60',
  '120x60': '120×60',
};

// Сорт — свободная строка из 1С: «A, R3, 0», «B, B4/BI, R3», «B, A4/N».
// Списка сортов в системе нет, но упаковка зависит от того, коробочный ли сорт.
interface FormatSpec {
  m2PerBox: number; // кв.м в одной коробке
  boxesPerPallet: number; // коробок на поддоне (сорт A/B)
  m2PerTile: number; // кв.м одной плитки
  maxTilesPerPallet: number; // макс. плиток на поддоне (C/Брак — без коробок)
}

export const FORMAT_SPECS: Record<string, FormatSpec> = {
  '60x60': { m2PerBox: 1.44, boxesPerPallet: 32, m2PerTile: 0.36, maxTilesPerPallet: 140 },
  '120x60': { m2PerBox: 1.44, boxesPerPallet: 30, m2PerTile: 0.72, maxTilesPerPallet: 70 },
};

/**
 * C и брак отгружаются без коробок — считаются плитками на поддоне.
 * Сорт распознаём по первой букве, потому что дальше идёт тон/калибр.
 */
const noBox = (grade: string) => {
  const head = grade.trim().split(/[,\s/]/)[0].toUpperCase();
  return head === 'C' || head === 'С' || head.startsWith('БРАК') || head === 'BRAK';
};

/** Кол-во коробок. На C и Брак коробки не используются → 0. Округление вверх. */
export function boxes(m2: number, format: string, grade: string): number {
  const spec = FORMAT_SPECS[format];
  if (!spec || m2 <= 0 || noBox(grade)) return 0;
  return Math.ceil(m2 / spec.m2PerBox);
}

/** Кол-во поддонов. Всегда округление вверх (частичный поддон = поддон). */
export function pallets(m2: number, format: string, grade: string): number {
  const spec = FORMAT_SPECS[format];
  if (!spec || m2 <= 0) return 0;
  if (noBox(grade)) {
    // C/Брак: считаем через плитки на поддоне
    return Math.ceil(m2 / spec.m2PerTile / spec.maxTilesPerPallet);
  }
  return Math.ceil(boxes(m2, format, grade) / spec.boxesPerPallet);
}

export interface Packaging {
  m2: number;
  boxes: number;
  pallets: number;
}

export function packaging(m2: number, format: string, grade = 'A'): Packaging {
  return { m2, boxes: boxes(m2, format, grade), pallets: pallets(m2, format, grade) };
}

export function isFormat(v: unknown): v is Format {
  return typeof v === 'string' && (FORMATS as readonly string[]).includes(v);
}
