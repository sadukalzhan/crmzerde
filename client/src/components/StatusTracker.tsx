import { Check, X, AlertTriangle } from 'lucide-react';
import { useMeta } from '../lib/queries';
import { cn } from '../lib/cn';
import type { OrderStatus } from '../lib/types';

const MAIN_PATH: OrderStatus[] = [
  'NEW',
  'RESERVATION',
  'SPEC_PREPARATION',
  'SHIPMENT',
  'CLOSED',
];

export function StatusTracker({ status }: { status: OrderStatus }) {
  const { data: meta } = useMeta();
  if (!meta) return null;

  if (status === 'REJECTED') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-300">
        <X size={20} /> <span className="font-semibold">Заявка отклонена</span>
      </div>
    );
  }

  const currentIdx = MAIN_PATH.indexOf(status);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {MAIN_PATH.map((s, i) => {
          const done = i < currentIdx;
          const current = i === currentIdx;
          const info = meta.statusMeta[s];
          return (
            <div key={s} className="flex min-w-[78px] flex-1 flex-col items-center gap-1.5 text-center">
              <div className="flex w-full items-center">
                <div className={cn('h-0.5 flex-1', i === 0 ? 'opacity-0' : done || current ? 'bg-accent' : 'bg-border')} />
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition',
                    done && 'border-accent bg-accent text-white',
                    current && 'border-accent bg-accent/20 text-accent ring-4 ring-accent/15',
                    !done && !current && 'border-border bg-bg text-muted-2',
                  )}
                >
                  {done ? <Check size={14} /> : i + 1}
                </div>
                <div className={cn('h-0.5 flex-1', i === MAIN_PATH.length - 1 ? 'opacity-0' : done ? 'bg-accent' : 'bg-border')} />
              </div>
              <span className={cn('text-[10px] leading-tight', current ? 'font-semibold text-accent' : done ? 'text-slate-300' : 'text-muted-2')}>
                {info.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
