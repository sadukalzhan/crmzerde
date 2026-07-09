import { useState } from 'react';
import { ChevronLeft, ChevronRight, Factory, Info, Pencil } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState, Modal, Field } from '../components/ui';
import { useProductionPlan, usePlanItemUpdate } from '../lib/queries';
import { fmtMonth, fmtDate, fmtM2 } from '../lib/format';
import { FORMAT_LABELS } from '../lib/packaging';
import { toast } from '../components/toast';
import { apiError } from '../lib/api';
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
  startDate: string | null;
  endDate: string | null;
  customsDate: string | null;
  comments: string | null;
  gradeA: number;
  gradeB: number;
  gradeC: number;
  gradeBrak: number;
  total: number;
  customer: string;
  orderNumber: number;
  format: string;
  collection: string;
  color: string;
  surface: string;
  orderedM2: number;
  plannedM2: number;
  boxes: number;
}

const toInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export default function ProductionPage() {
  const user = useAuth((s) => s.user)!;
  const canEdit = user.role === 'FACTORY' || user.role === 'ADMIN';
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const { data: plan, isLoading } = useProductionPlan(period.year, period.month);
  const [edit, setEdit] = useState<PlanItem | null>(null);

  const shift = (d: number) => {
    const dt = new Date(period.year, period.month - 1 + d, 1);
    setPeriod({ year: dt.getFullYear(), month: dt.getMonth() + 1 });
  };

  if (isLoading) return <PageLoader />;
  const items: PlanItem[] = plan?.items ?? [];

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
          Правило 15-го числа: заявки до 15-го — план следующего месяца, после — послеследующего.
          Приоритет 1 (аванс) производится раньше Приоритета 2 (постоплата). «Объём с учётом брака» = заказной × 1,1.
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState title="План на этот месяц пуст" icon={<Factory size={28} />} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-2">
                  <th className="px-3 py-3 font-medium">Заявка</th>
                  <th className="px-3 py-3 font-medium">Заказчик</th>
                  <th className="px-3 py-3 font-medium">Дата начала</th>
                  <th className="px-3 py-3 font-medium">Формат</th>
                  <th className="px-3 py-3 text-right font-medium">Упаковка (кор.)</th>
                  <th className="px-3 py-3 font-medium">Коллекция</th>
                  <th className="px-3 py-3 font-medium">Цвет</th>
                  <th className="px-3 py-3 text-right font-medium">Заказной, м²</th>
                  <th className="px-3 py-3 text-right font-medium">С браком +10%</th>
                  <th className="px-3 py-3 font-medium">Технология</th>
                  <th className="px-3 py-3 font-medium">Дата оконч.</th>
                  <th className="px-3 py-3 font-medium">Статус</th>
                  <th className="px-3 py-3 text-right font-medium">А сорт</th>
                  <th className="px-3 py-3 text-right font-medium">В сорт</th>
                  <th className="px-3 py-3 text-right font-medium">С сорт</th>
                  <th className="px-3 py-3 text-right font-medium">Брак</th>
                  <th className="px-3 py-3 text-right font-medium">Общий</th>
                  <th className="px-3 py-3 font-medium">Таможня</th>
                  <th className="px-3 py-3 font-medium">Комментарии</th>
                  {canEdit && <th className="px-3 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((it) => {
                  const st = PROD_STATUS[it.status] ?? PROD_STATUS.PLANNED;
                  return (
                    <tr key={it.id} className="transition hover:bg-panel-2/30">
                      <td className="px-3 py-2.5 font-bold text-white">
                        #{it.orderNumber}
                        <span className={cn('ml-1 rounded px-1 text-[10px]', it.priority === 1 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-muted')}>П{it.priority}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-200">{it.customer || '—'}</td>
                      <td className="px-3 py-2.5 text-muted">{fmtDate(it.startDate)}</td>
                      <td className="px-3 py-2.5 text-muted">{FORMAT_LABELS[it.format] ?? it.format}</td>
                      <td className="px-3 py-2.5 text-right text-muted">{it.boxes}</td>
                      <td className="px-3 py-2.5 text-muted">{it.collection || '—'}</td>
                      <td className="px-3 py-2.5 text-muted">{it.color || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-slate-200">{fmtM2(it.orderedM2)}</td>
                      <td className="px-3 py-2.5 text-right text-accent">{fmtM2(it.plannedM2)}</td>
                      <td className="px-3 py-2.5 text-muted">{it.surface || '—'}</td>
                      <td className="px-3 py-2.5 text-muted">{fmtDate(it.endDate)}</td>
                      <td className="px-3 py-2.5"><span className={cn('chip text-[11px]', st.cls)}>{st.label}</span></td>
                      <td className="px-3 py-2.5 text-right text-emerald-300">{it.gradeA || 0}</td>
                      <td className="px-3 py-2.5 text-right text-sky-300">{it.gradeB || 0}</td>
                      <td className="px-3 py-2.5 text-right text-amber-300">{it.gradeC || 0}</td>
                      <td className="px-3 py-2.5 text-right text-rose-300">{it.gradeBrak || 0}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-white">{it.total || 0}</td>
                      <td className="px-3 py-2.5 text-muted">{fmtDate(it.customsDate)}</td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 text-muted" title={it.comments ?? ''}>{it.comments || '—'}</td>
                      {canEdit && (
                        <td className="px-3 py-2.5">
                          <button onClick={() => setEdit(it)} className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-white"><Pencil size={15} /></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EditModal key={edit?.id ?? 'none'} item={edit} onClose={() => setEdit(null)} statusFlow={STATUS_FLOW} statusLabels={PROD_STATUS} toInput={toInput} />
    </Page>
  );
}

function EditModal({
  item,
  onClose,
  statusFlow,
  statusLabels,
  toInput,
}: {
  item: PlanItem | null;
  onClose: () => void;
  statusFlow: string[];
  statusLabels: Record<string, { label: string }>;
  toInput: (iso: string | null) => string;
}) {
  const update = usePlanItemUpdate();
  const [form, setForm] = useState({
    status: item?.status ?? 'PLANNED',
    startDate: toInput(item?.startDate ?? null),
    endDate: toInput(item?.endDate ?? null),
    customsDate: toInput(item?.customsDate ?? null),
    gradeA: item?.gradeA ?? 0,
    gradeB: item?.gradeB ?? 0,
    gradeC: item?.gradeC ?? 0,
    gradeBrak: item?.gradeBrak ?? 0,
    comments: item?.comments ?? '',
  });
  const num = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: Number(e.target.value) });

  const save = () => {
    if (!item) return;
    update.mutate(
      { id: item.id, ...form },
      { onSuccess: () => { toast.success('Позиция плана обновлена'); onClose(); }, onError: (e) => toast.error(apiError(e)) },
    );
  };

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      wide
      title={`Заявка #${item?.orderNumber} · производство`}
      footer={<><button className="btn-ghost" onClick={onClose}>Отмена</button><button className="btn-primary" onClick={save}>Сохранить</button></>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Статус">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {statusFlow.map((s) => <option key={s} value={s}>{statusLabels[s].label}</option>)}
            </select>
          </Field>
          <Field label="Дата начала"><input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
          <Field label="Дата окончания"><input className="input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="А сорт, м²"><input className="input" type="number" min={0} value={form.gradeA} onChange={num('gradeA')} /></Field>
          <Field label="В сорт, м²"><input className="input" type="number" min={0} value={form.gradeB} onChange={num('gradeB')} /></Field>
          <Field label="С сорт, м²"><input className="input" type="number" min={0} value={form.gradeC} onChange={num('gradeC')} /></Field>
          <Field label="Брак, м²"><input className="input" type="number" min={0} value={form.gradeBrak} onChange={num('gradeBrak')} /></Field>
        </div>
        <div className="text-right text-sm text-muted">
          Общий выпуск: <span className="font-semibold text-white">{fmtM2(form.gradeA + form.gradeB + form.gradeC + form.gradeBrak)}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Таможенная очистка"><input className="input" type="date" value={form.customsDate} onChange={(e) => setForm({ ...form, customsDate: e.target.value })} /></Field>
        </div>
        <Field label="Комментарии с производства">
          <textarea className="input min-h-[70px] resize-none" value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
