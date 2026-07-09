import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, PackagePlus } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { Field } from '../components/ui';
import { useProducts, useClients, useFactories, useCarriers, useCreateOrder } from '../lib/queries';
import { fmtMoney, fmtM2 } from '../lib/format';
import { boxes, pallets, GRADES, GRADE_LABELS } from '../lib/packaging';
import { apiError } from '../lib/api';
import { toast } from '../components/toast';
import { useAuth } from '../lib/store';

interface ItemRow { productId: string; quantity: number; grade: string }

export default function OrderFormPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user)!;
  const isClient = user.role === 'CLIENT';

  const { data: products = [] } = useProducts();
  const { data: clients = [] } = useClients({ enabled: !isClient });
  const { data: factories = [] } = useFactories();
  const { data: carriers = [] } = useCarriers();
  const createOrder = useCreateOrder();

  const [clientId, setClientId] = useState('');
  const [factoryId, setFactoryId] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const [selfPickup, setSelfPickup] = useState(false);
  const [priority, setPriority] = useState('MEDIUM');
  const [paymentTerm, setPaymentTerm] = useState('PREPAYMENT');
  const [shipTo, setShipTo] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [rows, setRows] = useState<ItemRow[]>([{ productId: '', quantity: 1, grade: 'A' }]);

  const setRow = (i: number, patch: Partial<ItemRow>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const total = rows.reduce((s, r) => {
    const p = products.find((x) => x.id === r.productId);
    return s + (p ? p.pricePerUnit * r.quantity : 0);
  }, 0);
  const factoryCity = factories.find((f) => f.id === factoryId)?.city;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const items = rows
      .filter((r) => r.productId && r.quantity > 0)
      .map((r) => {
        const p = products.find((x) => x.id === r.productId)!;
        return { productId: r.productId, quantity: r.quantity, grade: r.grade, pricePerUnit: p.pricePerUnit };
      });
    if (items.length === 0) return toast.error('Добавьте хотя бы одну позицию');
    if (!isClient && !clientId) return toast.error('Выберите клиента');

    createOrder.mutate(
      {
        clientId: isClient ? undefined : clientId,
        factoryId: factoryId || undefined,
        carrierId: selfPickup ? undefined : carrierId || undefined,
        selfPickup,
        priority,
        paymentTerm,
        shipFrom: factoryCity,
        shipTo: shipTo || undefined,
        desiredDate: desiredDate || undefined,
        items,
      },
      {
        onSuccess: (order) => {
          toast.success(`Заявка #${order.number} создана`);
          navigate(isClient ? '/my-orders' : `/orders/${order.id}`);
        },
        onError: (err) => toast.error(apiError(err)),
      },
    );
  };

  return (
    <Page>
      <PageHeader title="Новая заявка" subtitle="Заполните данные заявки на поставку керамогранита" />

      <form onSubmit={submit} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Позиции */}
          <div className="card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><PackagePlus size={16} /> Номенклатура</h3>
            <div className="mb-2 flex gap-2 px-1 text-[11px] uppercase text-muted-2">
              <span className="flex-1">Товар</span>
              <span className="w-28">Сорт</span>
              <span className="w-24">Объём, м²</span>
              {rows.length > 1 && <span className="w-9" />}
            </div>
            <div className="space-y-3">
              {rows.map((r, i) => {
                const p = products.find((x) => x.id === r.productId);
                const b = p ? boxes(r.quantity, p.format, r.grade) : 0;
                const pl = p ? pallets(r.quantity, p.format, r.grade) : 0;
                return (
                  <div key={i} className="rounded-lg border border-border bg-bg-elevated p-3">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <select className="input" value={r.productId} onChange={(e) => setRow(i, { productId: e.target.value })}>
                          <option value="">Выберите товар…</option>
                          {products.map((op) => (
                            <option key={op.id} value={op.id}>{op.name} ({op.format?.replace('x', '×')}) — {fmtMoney(op.pricePerUnit)}/м²</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-28">
                        <select className="input" value={r.grade} onChange={(e) => setRow(i, { grade: e.target.value })}>
                          {GRADES.map((g) => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
                        </select>
                      </div>
                      <div className="w-24">
                        <input className="input" type="number" min={0} step="0.01" value={r.quantity} onChange={(e) => setRow(i, { quantity: Number(e.target.value) })} placeholder="м²" />
                      </div>
                      {rows.length > 1 && (
                        <button type="button" className="btn-ghost px-2 py-2" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    {p && (
                      <div className="mt-2 text-xs text-muted">
                        {fmtM2(r.quantity)} · <span className="font-medium text-accent">{b} кор.</span> · <span className="font-medium text-accent">{pl} под.</span>
                      </div>
                    )}
                  </div>
                );
              })}
              <button type="button" className="btn-soft text-xs" onClick={() => setRows((rs) => [...rs, { productId: '', quantity: 1, grade: 'A' }])}>
                <Plus size={14} /> Добавить позицию
              </button>
            </div>
            <div className="mt-4 flex justify-end border-t border-border pt-3 text-sm">
              <span className="text-muted">Ориентировочная сумма:&nbsp;</span>
              <span className="font-bold text-white">{fmtMoney(total)}</span>
            </div>
          </div>

          {/* Доставка */}
          <div className="card p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Доставка</h3>
            <label className="mb-4 flex w-fit items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-slate-200">
              <input type="checkbox" checked={selfPickup} onChange={(e) => setSelfPickup(e.target.checked)} className="h-4 w-4 accent-[#7C6CF6]" />
              Самовывоз (без перевозчика)
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Завод-отгрузка">
                <select className="input" value={factoryId} onChange={(e) => setFactoryId(e.target.value)}>
                  <option value="">Не выбран</option>
                  {factories.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.city})</option>)}
                </select>
              </Field>
              <Field label="Перевозчик">
                <select
                  className="input disabled:opacity-50"
                  value={selfPickup ? '' : carrierId}
                  onChange={(e) => setCarrierId(e.target.value)}
                  disabled={selfPickup}
                >
                  <option value="">{selfPickup ? 'Самовывоз' : 'Не выбран'}</option>
                  {!selfPickup && carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Адрес доставки">
                <input className="input" value={shipTo} onChange={(e) => setShipTo(e.target.value)} placeholder="Город, адрес" />
              </Field>
              <Field label="Желаемая дата">
                <input className="input" type="date" value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        {/* Параметры */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Параметры</h3>
            <div className="space-y-4">
              {!isClient && (
                <Field label="Клиент">
                  <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                    <option value="">Выберите клиента…</option>
                    {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Условие оплаты">
                <select className="input" value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)}>
                  <option value="PREPAYMENT">Аванс</option>
                  <option value="POSTPAYMENT">Постоплата</option>
                </select>
              </Field>
              <Field label="Приоритет">
                <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="HIGH">Высокий</option>
                  <option value="MEDIUM">Средний</option>
                  <option value="LOW">Низкий</option>
                </select>
              </Field>
            </div>
            <button className="btn-primary mt-5 w-full" disabled={createOrder.isPending}>
              {createOrder.isPending ? 'Создание…' : 'Создать заявку'}
            </button>
          </div>
        </div>
      </form>
    </Page>
  );
}
