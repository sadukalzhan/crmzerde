import { useMeta } from '../lib/queries';
import { cn, hexToRgba } from '../lib/cn';
import type { OrderStatus, Priority, Role } from '../lib/types';

export function StatusBadge({ status }: { status: OrderStatus | string }) {
  const { data: meta } = useMeta();
  const info = meta?.statusMeta?.[status as OrderStatus];
  const color = info?.color ?? '#7C6CF6';
  return (
    <span
      className="chip font-semibold"
      style={{ backgroundColor: hexToRgba(color, 0.16), color, boxShadow: `inset 0 0 0 1px ${hexToRgba(color, 0.3)}` }}
    >
      {info?.label ?? status}
    </span>
  );
}

const ROLE_CLASSES: Record<string, string> = {
  violet: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30',
  orange: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  sky: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  green: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  slate: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
};

export function RoleBadge({ role }: { role: Role }) {
  const { data: meta } = useMeta();
  const info = meta?.roleMeta?.[role];
  return (
    <span className={cn('chip font-semibold ring-1', ROLE_CLASSES[info?.color ?? 'slate'])}>
      {info?.label ?? role}
    </span>
  );
}

const PRIORITY_COLOR: Record<Priority, string> = {
  HIGH: '#FF5A5F',
  MEDIUM: '#FFB020',
  LOW: '#5C6678',
};

export function PriorityDot({ priority, withLabel }: { priority: Priority; withLabel?: boolean }) {
  const { data: meta } = useMeta();
  const color = PRIORITY_COLOR[priority];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${hexToRgba(color, 0.6)}` }} />
      {withLabel && <span className="text-xs text-muted">{meta?.priorityLabels?.[priority] ?? priority}</span>}
    </span>
  );
}

export function ProductionPriorityBadge({ value }: { value?: number | null }) {
  if (!value) return null;
  const isP1 = value === 1;
  return (
    <span
      className={cn(
        'chip text-[11px] font-semibold ring-1',
        isP1 ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' : 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
      )}
      title={isP1 ? 'Приоритет 1 — аванс (первая очередь)' : 'Приоритет 2 — постоплата'}
    >
      П{value}
    </span>
  );
}
