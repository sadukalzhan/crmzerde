import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, FileSpreadsheet } from 'lucide-react';
import { Page, PageHeader } from '../../components/PageHeader';
import { PageLoader, EmptyState, Modal, Field } from '../../components/ui';
import { useCarriers, useProducts, useGrades } from '../../lib/queries';
import { api, apiError } from '../../lib/api';
import { toast } from '../../components/toast';
import { fmtMoney } from '../../lib/format';
import { FORMAT_LABELS } from '../../lib/packaging';
import { cn } from '../../lib/cn';

type Tab = 'products' | 'grades' | 'carriers';

export default function RefsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('products');
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Импорт активной вкладки из Excel — по образцу импорта остатков склада.
  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(`/refs/${tab}/import`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(
        `Импорт: добавлено ${data.created}, обновлено ${data.updated}` +
          (data.skipped ? `, пропущено ${data.skipped}` : ''),
      );
      if (data.errors?.length) toast.info(data.errors[0]);
      qc.invalidateQueries({ queryKey: [tab] });
      if (tab === 'products') qc.invalidateQueries({ queryKey: ['inventory'] });
    } catch (err) {
      toast.error(apiError(err));
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get(`/refs/${tab}/template`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tab}-shablon.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const { data: carriers = [], isLoading: l2 } = useCarriers();
  const { data: products = [], isLoading: l3 } = useProducts();
  const { data: grades = [], isLoading: l4 } = useGrades();

  if (l2 || l3 || l4) return <PageLoader />;

  const tabs: { k: Tab; label: string; count: number }[] = [
    { k: 'carriers', label: 'Перевозчики', count: carriers.length },
    { k: 'products', label: 'Номенклатура', count: products.length },
    { k: 'grades', label: 'Сорта', count: grades.length },
  ];
  const invalidate = (key: string) => qc.invalidateQueries({ queryKey: [key] });

  return (
    <Page>
      <PageHeader
        title="Справочники"
        subtitle="Номенклатура и перевозчики. Импорт из Excel — в активную вкладку"
        actions={
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onImport} />
            <button onClick={downloadTemplate} className="btn-soft">
              <FileSpreadsheet size={16} /> Шаблон
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn-soft">
              <Upload size={16} /> Импорт из Excel
            </button>
            <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Добавить</button>
          </div>
        }
      />

      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-panel p-1">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={cn('flex-1 rounded-md px-3 py-2 text-sm font-medium transition', tab === t.k ? 'bg-accent text-white' : 'text-muted hover:text-white')}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {tab === 'grades' && (
          grades.length === 0 ? <EmptyState title="Нет сортов" /> :
          <ul className="divide-y divide-border">
            {grades.map((g) => (
              <li key={g.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-medium text-slate-100">{g.label}</span>
                  <span className="ml-2 text-xs text-muted-2">код {g.code}</span>
                </div>
                {g.noBox && <span className="chip bg-amber-500/15 text-amber-300">без коробок</span>}
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
                  </div>
                </div>
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
      if (tab === 'grades') {
        await api.post('/refs/grades', {
          code: form.code,
          label: form.label || form.code,
          noBox: form.noBox === 'on',
        });
        onDone('grades');
      } else if (tab === 'carriers') {
        await api.post('/refs/carriers', { name: form.name, phone: form.phone });
        onDone('carriers');
      } else {
        await api.post('/products', {
          name: form.name,
          format: form.format || '60x60',
          collection: form.collection || undefined,
          color: form.color || undefined,
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
        {tab === 'grades' && (
          <>
            <Field label="Код сорта"><input className="input" value={form.code ?? ''} onChange={set('code')} placeholder="A1, R3, B12" /></Field>
            <Field label="Как показывать"><input className="input" value={form.label ?? ''} onChange={set('label')} placeholder="A1" /></Field>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={form.noBox === 'on'}
                onChange={(e) => setForm({ ...form, noBox: e.target.checked ? 'on' : '' })}
                className="h-4 w-4 accent-[#A855F7]"
              />
              Отгружается без коробок (как C и брак)
            </label>
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
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
