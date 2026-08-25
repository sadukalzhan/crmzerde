// Зеркало server/src/domain/packaging.ts — расчёт коробок/поддонов из м².

export const FORMATS = ['60x60', '120x60'] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<string, string> = {
  '60x60': '60×60',
  '120x60': '120×60',
};

// Базовый набор сортов; фактический список ведётся в справочнике.
export const GRADES = ['A', 'A1', 'R3', 'B', 'B12', 'C', 'BRAK'] as const;

export const GRADE_LABELS: Record<string, string> = {
  A: 'A сорт',
  A1: 'A1',
  R3: 'R3',
  B: 'B сорт',
  B12: 'B12',
  C: 'C сорт',
  BRAK: 'Брак',
};


interface FormatSpec {
  m2PerBox: number;
  boxesPerPallet: number;
  m2PerTile: number;
  maxTilesPerPallet: number;
}

export const FORMAT_SPECS: Record<string, FormatSpec> = {
  '60x60': { m2PerBox: 1.44, boxesPerPallet: 32, m2PerTile: 0.36, maxTilesPerPallet: 140 },
  '120x60': { m2PerBox: 1.44, boxesPerPallet: 30, m2PerTile: 0.72, maxTilesPerPallet: 70 },
};

const noBox = (grade: string) => grade === 'C' || grade === 'BRAK';

export function boxes(m2: number, format: string, grade = 'A'): number {
  const spec = FORMAT_SPECS[format];
  if (!spec || m2 <= 0 || noBox(grade)) return 0;
  return Math.ceil(m2 / spec.m2PerBox);
}

export function pallets(m2: number, format: string, grade = 'A'): number {
  const spec = FORMAT_SPECS[format];
  if (!spec || m2 <= 0) return 0;
  if (noBox(grade)) return Math.ceil(m2 / spec.m2PerTile / spec.maxTilesPerPallet);
  return Math.ceil(boxes(m2, format, grade) / spec.boxesPerPallet);
}

export function packaging(m2: number, format: string, grade = 'A') {
  return { m2, boxes: boxes(m2, format, grade), pallets: pallets(m2, format, grade) };
}
