import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Boxes, Plus, Minus } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState, Modal, Field } from '../components/ui';
import { useInventory } from '../lib/queries';
import { api, apiError } from '../lib/api';
import { toast } from '../components/toast';
import { fmtUnit } from '../lib/format';
import { useAuth } from '../lib/store';
import { cn } from '../lib/cn';
import type { Inventory } from '../lib/types';

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
      await api.post('/inventory/adjust', { productId: adjust.productId, delta });
      toast.success('Остаток обновлён');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setAdjust(null);
      setDelta(0);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <Page>
      <PageHeader title="Остатки на складе" subtitle="Запасы и резервы по номенклатуре" />

      {inventory.length === 0 ? (
        <EmptyState title="Нет данных по остаткам" icon={<Boxes size={28} />} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-2">
                  <th className="px-4 py-3 font-medium">Номенклатура</th>
                  <th className="px-4 py-3 font-medium">Коллекция</th>
                  <th className="px-4 py-3 font-medium">На складе</th>
                  <th className="px-4 py-3 font-medium">Резерв</th>
                  <th className="px-4 py-3 font-medium">Свободно</th>
                  {canEdit && <th className="px-4 py-3 font-medium" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inventory.map((inv) => {
                  const free = inv.free ?? inv.quantity - inv.reserved;
                  return (
                    <tr key={inv.id} className="transition hover:bg-panel-2/30">
                      <td className="px-4 py-3 text-slate-200">{inv.product?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{inv.product?.collection ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-100">{inv.quantity} {fmtUnit(inv.unit)}</td>
                      <td className="px-4 py-3 text-amber-300">{inv.reserved} {fmtUnit(inv.unit)}</td>
                      <td className={cn('px-4 py-3 font-semibold', free > 0 ? 'text-emerald-300' : 'text-rose-300')}>
                        {free} {fmtUnit(inv.unit)}
                      </td>
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
        title={`Корректировка: ${adjust?.product?.name ?? ''}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setAdjust(null)}>Отмена</button>
            <button className="btn-primary" onClick={apply} disabled={delta === 0}>Применить</button>
          </>
        }
      >
        <Field label="Изменение количества (+ приход / − расход)">
          <div className="flex items-center gap-2">
            <button className="btn-soft px-3" onClick={() => setDelta((d) => d - 1)}><Minus size={16} /></button>
            <input className="input text-center" type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
            <button className="btn-soft px-3" onClick={() => setDelta((d) => d + 1)}><Plus size={16} /></button>
          </div>
        </Field>
        <p className="mt-2 text-xs text-muted-2">
          Текущий остаток: {adjust?.quantity} → новый: {(adjust?.quantity ?? 0) + delta}
        </p>
      </Modal>
    </Page>
  );
}
