import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Boxes, Plus, Minus, FileSpreadsheet } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState, Modal, Field } from '../components/ui';
import { useInventory } from '../lib/queries';
import { api, apiError } from '../lib/api';
import { toast } from '../components/toast';
import { fmtM2 } from '../lib/format';
import { FORMAT_LABELS, GRADE_LABELS } from '../lib/packaging';
import { useAuth } from '../lib/store';
import { cn } from '../lib/cn';
import type { Inventory } from '../lib/types';

const GRADE_CLASS: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-300',
  B: 'bg-sky-500/15 text-sky-300',
  C: 'bg-amber-500/15 text-amber-300',
  BRAK: 'bg-rose-500/15 text-rose-300',
};

export default function InventoryPage() {
  const user = useAuth((s) => s.user)!;
  const canEdit = user.role === 'WAREHOUSE' || user.role === 'ADMIN' || user.role === 'FACTORY';
  const qc = useQueryClient();
  const { data: inventory = [], isLoading } = useInventory();
  const [adjust, setAdjust] = useState<Inventory | null>(null);
  const [delta, setDelta] = useState(0);

  if (isLoading) return <PageLoader />;

  const apply = async () => {
    if (!adjust || delta === 0) return;
    try {
      await api.post('/inventory/adjust', { productId: adjust.productId, grade: adjust.grade, delta });
      toast.success('Остаток обновлён');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setAdjust(null);
      setDelta(0);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const exportExcel = async () => {
    try {
      const res = await api.get('/inventory/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ostatki-sklada.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Файл выгружен');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <Page>
      <PageHeader
        title="Остатки на складе"
        subtitle="Запасы и резервы по товарам и сортам (м² · коробки · поддоны)"
        actions={
          <button onClick={exportExcel} className="btn-soft">
            <FileSpreadsheet size={16} /> Выгрузить в Excel
          </button>
        }
      />

      {inventory.length === 0 ? (
        <EmptyState title="Нет данных по остаткам" hint="Добавьте номенклатуру в справочниках" icon={<Boxes size={28} />} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-2">
                  <th className="px-4 py-3 font-medium">Номенклатура</th>
                  <th className="px-4 py-3 font-medium">Формат</th>
                  <th className="px-4 py-3 font-medium">Коллекция</th>
                  <th className="px-4 py-3 font-medium">Цвет</th>
                  <th className="px-4 py-3 font-medium">Поверхность</th>
                  <th className="px-4 py-3 font-medium">Сорт</th>
                  <th className="px-4 py-3 text-right font-medium">Остаток, м²</th>
                  <th className="px-4 py-3 text-right font-medium">Резерв</th>
                  <th className="px-4 py-3 text-right font-medium">Свободно</th>
                  <th className="px-4 py-3 text-right font-medium">Коробки</th>
                  <th className="px-4 py-3 text-right font-medium">Поддоны</th>
                  {canEdit && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inventory.map((inv) => {
                  const free = inv.free ?? inv.quantity - inv.reserved;
                  return (
                    <tr key={inv.id} className="transition hover:bg-panel-2/30">
                      <td className="px-4 py-3 text-slate-200">{inv.product?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{FORMAT_LABELS[inv.product?.format ?? ''] ?? inv.product?.format}</td>
                      <td className="px-4 py-3 text-muted">{inv.product?.collection ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{inv.product?.color ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{inv.product?.surface ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('chip text-[11px] font-semibold', GRADE_CLASS[inv.grade] ?? 'bg-slate-500/15 text-muted')}>
                          {GRADE_LABELS[inv.grade] ?? inv.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-100">{fmtM2(inv.quantity)}</td>
                      <td className="px-4 py-3 text-right text-amber-300">{fmtM2(inv.reserved)}</td>
                      <td className={cn('px-4 py-3 text-right font-semibold', free > 0 ? 'text-emerald-300' : 'text-rose-300')}>{fmtM2(free)}</td>
                      <td className="px-4 py-3 text-right text-muted">{inv.boxes ?? 0}</td>
                      <td className="px-4 py-3 text-right text-muted">{inv.pallets ?? 0}</td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { setAdjust(inv); setDelta(0); }} className="btn-soft px-2.5 py-1 text-xs">Изменить</button>
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

      <Modal
        open={!!adjust}
        onClose={() => setAdjust(null)}
        title={`Корректировка: ${adjust?.product?.name ?? ''} · ${GRADE_LABELS[adjust?.grade ?? 'A']}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setAdjust(null)}>Отмена</button>
            <button className="btn-primary" onClick={apply} disabled={delta === 0}>Применить</button>
          </>
        }
      >
        <Field label="Изменение м² (+ приход / − расход)">
          <div className="flex items-center gap-2">
            <button className="btn-soft px-3" onClick={() => setDelta((d) => d - 1)}><Minus size={16} /></button>
            <input className="input text-center" type="number" step="0.01" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
            <button className="btn-soft px-3" onClick={() => setDelta((d) => d + 1)}><Plus size={16} /></button>
          </div>
        </Field>
        <p className="mt-2 text-xs text-muted-2">
          Текущий остаток: {fmtM2(adjust?.quantity ?? 0)} → новый: {fmtM2((adjust?.quantity ?? 0) + delta)}
        </p>
      </Modal>
    </Page>
  );
}
