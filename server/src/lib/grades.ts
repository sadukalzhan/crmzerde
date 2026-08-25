// Активные сорта берём из справочника; если он ещё не наполнен — из базового
// списка в packaging, чтобы система оставалась рабочей на пустой базе.
import { prisma } from './prisma';
import { GRADES, GRADE_LABELS } from '../domain/packaging';

export async function activeGradeCodes(): Promise<string[]> {
  const rows = await prisma.grade.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    select: { code: true },
  });
  return rows.length ? rows.map((r) => r.code) : [...GRADES];
}

export async function gradeLabels(): Promise<Record<string, string>> {
  const rows = await prisma.grade.findMany({ select: { code: true, label: true } });
  if (!rows.length) return { ...GRADE_LABELS };
  return Object.fromEntries(rows.map((r) => [r.code, r.label]));
}

/** Пустые строки склада на каждый сорт — создаются вместе с товаром. */
export async function emptyInventoryRows() {
  const codes = await activeGradeCodes();
  return codes.map((grade) => ({ grade, quantity: 0, reserved: 0, unit: 'M2' }));
}
