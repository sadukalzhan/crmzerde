// Зеркало server/src/domain/packaging.ts — расчёт коробок/поддонов из м².

export const FORMATS = ['60x60', '120x60'] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<string, string> = {
  '60x60': '60×60',
  '120x60': '120×60',
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

/**
 * Упаковка считается как при отгрузке: сначала набираются полные поддоны,
 * остаток едет отдельными коробками. Поэтому 2,8 м² — это 0 поддонов и
 * 2 коробки, а 936 м² — 20 поддонов и 10 коробок сверху, а не 21 поддон.
 */
function split(m2: number, format: string, grade: string): { pallets: number; boxes: number } {
  const spec = FORMAT_SPECS[format];
  if (!spec || m2 <= 0) return { pallets: 0, boxes: 0 };

  if (noBox(grade)) {
    // C и брак едут без коробок — только поддонами, остаток тоже занимает поддон.
    return { pallets: Math.ceil(m2 / spec.m2PerTile / spec.maxTilesPerPallet), boxes: 0 };
  }

  const totalBoxes = Math.ceil(m2 / spec.m2PerBox);
  const fullPallets = Math.floor(totalBoxes / spec.boxesPerPallet);
  return { pallets: fullPallets, boxes: totalBoxes - fullPallets * spec.boxesPerPallet };
}

/** Коробки сверх полных поддонов. На C и браке коробок нет. */
export function boxes(m2: number, format: string, grade: string): number {
  return split(m2, format, grade).boxes;
}

/** Полные поддоны. */
export function pallets(m2: number, format: string, grade: string): number {
  return split(m2, format, grade).pallets;
}

export function packaging(m2: number, format: string, grade = 'A') {
  return { m2, boxes: boxes(m2, format, grade), pallets: pallets(m2, format, grade) };
}
