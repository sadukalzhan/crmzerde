// Расчёт упаковки: из объёма в м² + формат + сорт → коробки и поддоны.
// Базовая единица хранения — м². Коробки/поддоны считаются автоматически.

export const FORMATS = ['60x60', '120x60'] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<string, string> = {
  '60x60': '60×60',
  '120x60': '120×60',
};

export const GRADES = ['A', 'B', 'C', 'BRAK'] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_LABELS: Record<string, string> = {
  A: 'A сорт',
  B: 'B сорт',
  C: 'C сорт',
  BRAK: 'Брак',
};

// Часто используемые поверхности (свободный ввод, это лишь подсказки).
export const SURFACES = ['Матовая', 'Полированная', 'Лаппатированная', 'Структурированная', 'Сатинированная'];

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

const noBox = (grade: string) => grade === 'C' || grade === 'BRAK';

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
export function isGrade(v: unknown): v is Grade {
  return typeof v === 'string' && (GRADES as readonly string[]).includes(v);
}
