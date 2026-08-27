import { useMemo, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Boxes, Plus, Minus, FileSpreadsheet, Upload, Search, X } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState, Modal, Field } from '../components/ui';
import { useInventory } from '../lib/queries';
import { api, apiError } from '../lib/api';
import { toast } from '../components/toast';
import { fmtM2 } from '../lib/format';
import { FORMAT_LABELS } from '../lib/packaging';
import { useAuth } from '../lib/store';
import { cn } from '../lib/cn';
import type { Inventory } from '../lib/types';

// Сорт — свободная строка («A, R3, 0»), поэтому цвет берём по первой букве.
const GRADE_CLASS: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-300',
  B: 'bg-sky-500/15 text-sky-300',
  C: 'bg-amber-500/15 text-amber-300',
  Б: 'bg-rose-500/15 text-rose-300',
};
const gradeClass = (grade: string) =>
  GRADE_CLASS[grade.trim().charAt(0).toUpperCase()] ?? 'bg-slate-500/15 text-muted';

export default function InventoryPage() {
  const user = useAuth((s) => s.user)!;
  const canEdit = user.role === 'WAREHOUSE' || user.role === 'ADMIN';
  const qc = useQueryClient();
  // Актуальные остатки заливает только админ (шаблон + импорт).
  const canImport = user.role === 'ADMIN';
  const { data: inventory = [], isLoading } = useInventory();
  // Строк несколько сотен, поэтому поиск и фильтры обязательны.
  const [search, setSearch] = useState('');
  const [format, setFormat] = useState('');
  const [grade, setGrade] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);
  const [adjust, setAdjust] = useState<Inventory | null>(null);
  const [delta, setDelta] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Сорта и форматы для выпадающих списков — из того, что реально есть на складе.
  const formats = useMemo(
    () => [...new Set(inventory.map((i) => i.product?.format).filter(Boolean))].sort() as string[],
    [inventory],
  );
  // Сортов из 1С сотни («A, R3, 0», «A, B4/BI, R3»…), списком по ним не выбрать.
  // Фильтруем по классу сорта — первой букве; точный тон/калибр ищется поиском.
  const gradeGroups = useMemo(
    () => [...new Set(inventory.map((i) => i.grade.trim().charAt(0).toUpperCase()))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'ru')),
    [inventory],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory.filter((i) => {
      const free = i.free ?? i.quantity - i.reserved;
      if (q && !`${i.product?.name ?? ''} ${i.grade}`.toLowerCase().includes(q)) return false;
      if (format && i.product?.format !== format) return false;
      if (grade && i.grade.trim().charAt(0).toUpperCase() !== grade) return false;
      if (onlyFree && free <= 0) return false;
      return true;
    });
  }, [inventory, search, format, grade, onlyFree]);

  const totals = useMemo(
    () => ({
      quantity: filtered.reduce((s, i) => s + i.quantity, 0),
      free: filtered.reduce((s, i) => s + (i.free ?? i.quantity - i.reserved), 0),
    }),
    [filtered],
  );

  const resetFilters = () => { setSearch(''); setFormat(''); setGrade(''); setOnlyFree(false); };
  const filtersOn = Boolean(search || format || grade || onlyFree);

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/inventory/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Импорт: обновлено ${data.updated}${data.skipped ? `, пропущено ${data.skipped}` : ''}`);
      if (data.errors?.length) toast.info(data.errors[0]);
      qc.invalidateQueries({ queryKey: ['inventory'] });
    } catch (err) {
      toast.error(apiError(err));
    }
    if (fileRef.current) fileRef.current.value = '';
  };

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

  // Шаблон уже содержит всю номенклатуру построчно по сортам — админу
  // остаётся проставить фактические остатки и залить файл обратно.
  const downloadTemplate = async () => {
    try {
      const res = await api.get('/inventory/template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ostatki-shablon.xlsx';
      a.click();
      URL.revokeObjectURL(url);
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
          <div className="flex flex-wrap gap-2">
            {canImport && (
              <>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onImport} />
                <button onClick={downloadTemplate} className="btn-soft">
                  <FileSpreadsheet size={16} /> Шаблон остатков
                </button>
                <button onClick={() => fileRef.current?.click()} className="btn-soft">
                  <Upload size={16} /> Импорт из Excel
                </button>
              </>
            )}
            <button onClick={exportExcel} className="btn-soft">
              <FileSpreadsheet size={16} /> Выгрузить в Excel
            </button>
          </div>
        }
      />

      {/* Поиск и фильтры */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
          <input
            className="input pl-9"
            placeholder="Поиск по номенклатуре или сорту, например «ANGARA» или «R3»…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-36" value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="">Все форматы</option>
          {formats.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f] ?? f}</option>)}
        </select>
        <select className="input w-40" value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">Все сорта</option>
          {gradeGroups.map((g) => <option key={g} value={g}>Сорт {g}</option>)}
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={onlyFree}
            onChange={(e) => setOnlyFree(e.target.checked)}
            className="h-4 w-4 accent-[#A855F7]"
          />
          Только свободные
        </label>
        {filtersOn && (
          <button onClick={resetFilters} className="btn-ghost px-3 py-2 text-xs">
            <X size={14} /> Сбросить
          </button>
        )}
      </div>

      {/* Итог по отфильтрованному — чтобы видеть объём выборки, а не всего склада */}
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted">
        <span>Строк: <b className="text-slate-200">{filtered.length}</b> из {inventory.length}</span>
        <span>Остаток: <b className="text-slate-200">{fmtM2(totals.quantity)}</b></span>
        <span>Свободно: <b className="text-mint">{fmtM2(totals.free)}</b></span>
      </div>

      {inventory.length === 0 ? (
        <EmptyState title="Нет данных по остаткам" hint="Загрузите остатки импортом из 1С" icon={<Boxes size={28} />} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Ничего не найдено" hint="Измените поиск или сбросьте фильтры" icon={<Search size={28} />} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-2">
                  <th className="px-4 py-3 font-medium">Номенклатура</th>
                  <th className="px-4 py-3 font-medium">Формат</th>
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
                {filtered.map((inv) => {
                  const free = inv.free ?? inv.quantity - inv.reserved;
                  return (
                    <tr key={inv.id} className="transition hover:bg-panel-2/30">
                      <td className="px-4 py-3 text-slate-200">{inv.product?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{FORMAT_LABELS[inv.product?.format ?? ''] ?? inv.product?.format}</td>
                      <td className="px-4 py-3">
                        <span className={cn('chip text-[11px] font-semibold', gradeClass(inv.grade))}>
                          {inv.grade}
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
        title={`Корректировка: ${adjust?.product?.name ?? ''} · ${adjust?.grade ?? ''}`}
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
