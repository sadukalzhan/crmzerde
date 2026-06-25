import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

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
    accent: 'text-accent bg-accent/15',
    green: 'text-emerald-300 bg-emerald-500/15',
    amber: 'text-amber-300 bg-amber-500/15',
    rose: 'text-rose-300 bg-rose-500/15',
    sky: 'text-sky-300 bg-sky-500/15',
  };
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', tones[tone])}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}
