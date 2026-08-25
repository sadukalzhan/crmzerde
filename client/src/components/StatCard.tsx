import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Карточка показателя в стиле Nocturn: золотая засечка по верхнему краю,
 * иконка в цветной плитке, крупное значение.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'accent',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'accent' | 'green' | 'amber' | 'rose' | 'sky';
}) {
  const tones: Record<string, string> = {
    accent: 'text-accent bg-accent/12 border-accent/25',
    green: 'text-emerald-300 bg-emerald-500/12 border-emerald-500/25',
    amber: 'text-amber-300 bg-amber-500/12 border-amber-500/25',
    rose: 'text-rose-300 bg-rose-500/12 border-rose-500/25',
    sky: 'text-sky-300 bg-sky-500/12 border-sky-500/25',
  };
  return (
    <div className="card-kpi p-4">
      <div className="flex items-center gap-2.5">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border', tones[tone])}>
          <Icon size={16} />
        </div>
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{label}</div>
      </div>
      <div className="mt-3 text-[28px] font-bold leading-none tracking-tight text-white">{value}</div>
    </div>
  );
}
