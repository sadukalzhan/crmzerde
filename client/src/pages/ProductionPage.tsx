import { useState } from 'react';
import { ChevronLeft, ChevronRight, Factory, Info } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState } from '../components/ui';
import { useProductionPlan, usePlanItemStatus } from '../lib/queries';
import { fmtMonth, fmtVolume } from '../lib/format';
import { toast } from '../components/toast';
import { useAuth } from '../lib/store';
import { cn } from '../lib/cn';

const PROD_STATUS: Record<string, { label: string; cls: string }> = {
  PLANNED: { label: 'В плане', cls: 'bg-slate-500/15 text-muted' },
  IN_PRODUCTION: { label: 'В производстве', cls: 'bg-orange-500/15 text-orange-300' },
  PRODUCED: { label: 'Готово', cls: 'bg-lime-500/15 text-lime-300' },
  TRANSFERRED: { label: 'Передано на склад', cls: 'bg-emerald-500/15 text-emerald-300' },
};
const STATUS_FLOW = ['PLANNED', 'IN_PRODUCTION', 'PRODUCED', 'TRANSFERRED'];

interface PlanItem {
  id: string;
  priority: number;
  status: string;
  order: { number: number; client?: { companyName: string }; items?: { product?: { name: string }; quantity: number; unit: string }[]; quantity: number; unit: string };
}

export default function ProductionPage() {
  const user = useAuth((s) => s.user)!;
  const canEdit = user.role === 'FACTORY' || user.role === 'ADMIN';
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const { data: plan, isLoading } = useProductionPlan(period.year, period.month);
  const setStatus = usePlanItemStatus();

  const shift = (d: number) => {
    const dt = new Date(period.year, period.month - 1 + d, 1);
    setPeriod({ year: dt.getFullYear(), month: dt.getMonth() + 1 });
  };

  if (isLoading) return <PageLoader />;
  const items: PlanItem[] = plan?.items ?? [];
  const p1 = items.filter((i) => i.priority === 1);
  const p2 = items.filter((i) => i.priority !== 1);

  const renderItem = (item: PlanItem) => {
    const st = PROD_STATUS[item.status] ?? PROD_STATUS.PLANNED;
    const product = item.order.items?.[0]?.product?.name ?? '—';
    return (
      <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-elevated px-4 py-3">
        <span className="font-bold text-white">#{item.order.number}</span>
        <span className="flex-1 truncate text-sm text-slate-200">{product}</span>
        <span className="text-xs text-muted">{item.order.client?.companyName}</span>
        <span className="text-xs text-muted">{fmtVolume(item.order.quantity, item.order.unit)}</span>
        {canEdit ? (
          <select
            className="input h-8 w-44 py-1 text-xs"
            value={item.status}
            onChange={(e) => setStatus.mutate({ id: item.id, status: e.target.value }, { onSuccess: () => toast.success('Статус обновлён') })}
          >
            {STATUS_FLOW.map((s) => <option key={s} value={s}>{PROD_STATUS[s].label}</option>)}
          </select>
        ) : (
          <span className={cn('chip', st.cls)}>{st.label}</span>
        )}
      </div>
    );
  };

  return (
    <Page>
      <PageHeader
        title="План производства"
        subtitle="Заявки в производстве по плановым месяцам"
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border bg-panel p-1">
            <button onClick={() => shift(-1)} className="rounded p-1.5 text-muted hover:text-white"><ChevronLeft size={16} /></button>
            <span className="min-w-[140px] text-center text-sm font-medium capitalize text-slate-200">{fmtMonth(period.year, period.month)}</span>
            <button onClick={() => shift(1)} className="rounded p-1.5 text-muted hover:text-white"><ChevronRight size={16} /></button>
          </div>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-xs text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0 text-accent" />
        <span>
          Правило 15-го числа: заявки до 15-го попадают в план следующего месяца, после 15-го — послеследующего.
          Приоритет 1 (аванс) производится раньше Приоритета 2 (постоплата).
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState title="План на этот месяц пуст" icon={<Factory size={28} />} />
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <span className="chip bg-emerald-500/15 text-emerald-300">П1</span> Приоритет 1 — аванс ({p1.length})
            </h3>
            <div className="space-y-2">{p1.length ? p1.map(renderItem) : <p className="text-sm text-muted-2">Нет заявок</p>}</div>
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
              <span className="chip bg-slate-500/15 text-muted">П2</span> Приоритет 2 — постоплата ({p2.length})
            </h3>
            <div className="space-y-2">{p2.length ? p2.map(renderItem) : <p className="text-sm text-muted-2">Нет заявок</p>}</div>
          </div>
        </div>
      )}
    </Page>
  );
}
