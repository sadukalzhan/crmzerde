import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Page, PageHeader } from '../../components/PageHeader';
import { PageLoader, EmptyState, Modal, Field } from '../../components/ui';
import { useFactories, useCarriers, useProducts } from '../../lib/queries';
import { api, apiError } from '../../lib/api';
import { toast } from '../../components/toast';
import { fmtMoney } from '../../lib/format';
import { FORMAT_LABELS } from '../../lib/packaging';
import { cn } from '../../lib/cn';

type Tab = 'factories' | 'carriers' | 'products';

export default function RefsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('factories');
  const [open, setOpen] = useState(false);

  const { data: factories = [], isLoading: l1 } = useFactories();
  const { data: carriers = [], isLoading: l2 } = useCarriers();
  const { data: products = [], isLoading: l3 } = useProducts();

  if (l1 || l2 || l3) return <PageLoader />;

  const tabs: { k: Tab; label: string; count: number }[] = [
    { k: 'factories', label: 'Заводы', count: factories.length },
    { k: 'carriers', label: 'Перевозчики', count: carriers.length },
    { k: 'products', label: 'Номенклатура', count: products.length },
  ];
  const invalidate = (key: string) => qc.invalidateQueries({ queryKey: [key] });

  return (
    <Page>
      <PageHeader
        title="Справочники"
        subtitle="Заводы, перевозчики и номенклатура"
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Добавить</button>}
      />

      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-panel p-1">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={cn('flex-1 rounded-md px-3 py-2 text-sm font-medium transition', tab === t.k ? 'bg-accent text-white' : 'text-muted hover:text-white')}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {tab === 'factories' && (
          factories.length === 0 ? <EmptyState title="Нет заводов" /> :
          <ul className="divide-y divide-border">
            {factories.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium text-slate-100">{f.name}</span>
                <span className="text-sm text-muted">{f.city}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === 'carriers' && (
          carriers.length === 0 ? <EmptyState title="Нет перевозчиков" /> :
          <ul className="divide-y divide-border">
            {carriers.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium text-slate-100">{c.name}</span>
                <span className="text-sm text-muted">{c.phone ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === 'products' && (
          products.length === 0 ? <EmptyState title="Нет номенклатуры" /> :
          <ul className="divide-y divide-border">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium text-slate-100">{p.name}</div>
                  <div className="text-xs text-muted">
                    {FORMAT_LABELS[p.format] ?? p.format}
                    {p.collection && ` · ${p.collection}`}
                    {p.color && ` · ${p.color}`}
                    {p.surface && ` · ${p.surface}`}
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-200">{fmtMoney(p.pricePerUnit)}/м²</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddModal tab={tab} open={open} onClose={() => setOpen(false)} onDone={(key) => { invalidate(key); setOpen(false); }} />
    </Page>
  );
}

function AddModal({ tab, open, onClose, onDone }: { tab: Tab; open: boolean; onClose: () => void; onDone: (key: string) => void }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    try {
      if (tab === 'factories') {
        await api.post('/refs/factories', { name: form.name, city: form.city });
        onDone('factories');
      } else if (tab === 'carriers') {
        await api.post('/refs/carriers', { name: form.name, phone: form.phone });
        onDone('carriers');
      } else {
        await api.post('/products', {
          name: form.name,
          format: form.format || '60x60',
          collection: form.collection || undefined,
          color: form.color || undefined,
          surface: form.surface || undefined,
          pricePerUnit: Number(form.price || 0),
        });
        onDone('products');
      }
      toast.success('Добавлено');
      setForm({});
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Новая запись" footer={<><button className="btn-ghost" onClick={onClose}>Отмена</button><button className="btn-primary" onClick={save}>Создать</button></>}>
      <div className="space-y-3">
        {tab === 'factories' && (
          <>
            <Field label="Название"><input className="input" value={form.name ?? ''} onChange={set('name')} /></Field>
            <Field label="Город"><input className="input" value={form.city ?? ''} onChange={set('city')} /></Field>
          </>
        )}
        {tab === 'carriers' && (
          <>
            <Field label="Название"><input className="input" value={form.name ?? ''} onChange={set('name')} /></Field>
            <Field label="Телефон"><input className="input" value={form.phone ?? ''} onChange={set('phone')} /></Field>
          </>
        )}
        {tab === 'products' && (
          <>
            <Field label="Название"><input className="input" value={form.name ?? ''} onChange={set('name')} placeholder="Cemento Ivory" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Формат">
                <select className="input" value={form.format ?? '60x60'} onChange={set('format')}>
                  <option value="60x60">60×60</option>
                  <option value="120x60">120×60</option>
                </select>
              </Field>
              <Field label="Коллекция"><input className="input" value={form.collection ?? ''} onChange={set('collection')} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Цвет"><input className="input" value={form.color ?? ''} onChange={set('color')} /></Field>
              <Field label="Поверхность (технология)"><input className="input" value={form.surface ?? ''} onChange={set('surface')} placeholder="Матовая" /></Field>
            </div>
            <Field label="Цена за м²"><input className="input" type="number" value={form.price ?? ''} onChange={set('price')} /></Field>
          </>
        )}
      </div>
    </Modal>
  );
}
