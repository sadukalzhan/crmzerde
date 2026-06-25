import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState } from '../components/ui';
import { StatusBadge, PriorityDot } from '../components/badges';
import { useMeta, useOrders } from '../lib/queries';
import { fmtDate, fmtVolume } from '../lib/format';
import { useAuth } from '../lib/store';

const PAGE_SIZE = 12;

export default function OrdersPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user)!;
  const { data: meta } = useMeta();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);

  const { data: orders = [], isLoading } = useOrders({
    search: search || undefined,
    status: status || undefined,
    priority: priority || undefined,
  });

  const paged = useMemo(() => orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [orders, page]);
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));

  if (isLoading || !meta) return <PageLoader />;

  return (
    <Page>
      <PageHeader
        title="Заявки"
        subtitle={`Найдено: ${orders.length}`}
        actions={
          user.role === 'MANAGER' || user.role === 'ADMIN' ? (
            <button onClick={() => navigate('/orders/new')} className="btn-primary">
              <Plus size={16} /> Новая заявка
            </button>
          ) : undefined
        }
      />

      {/* Фильтры */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
          <input
            className="input pl-9"
            placeholder="Поиск по номеру, клиенту, маршруту…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input w-48" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Все статусы</option>
          {meta.orderStatuses.map((s) => <option key={s} value={s}>{meta.statusMeta[s].label}</option>)}
        </select>
        <select className="input w-40" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
          <option value="">Все приоритеты</option>
          <option value="HIGH">Высокий</option>
          <option value="MEDIUM">Средний</option>
          <option value="LOW">Низкий</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <EmptyState title="Заявки не найдены" hint="Измените фильтры или создайте новую заявку" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-2">
                  <th className="px-4 py-3 font-medium">№</th>
                  <th className="px-4 py-3 font-medium">Клиент</th>
                  <th className="px-4 py-3 font-medium">Номенклатура</th>
                  <th className="px-4 py-3 font-medium">Объём</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Маршрут</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Дата</th>
                  <th className="px-4 py-3 font-medium">Приор.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/orders/${o.id}`)}
                    className="cursor-pointer transition hover:bg-panel-2/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-white">#{o.number}</td>
                    <td className="px-4 py-3 text-slate-200">{o.client.companyName}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-300">{o.items?.[0]?.product?.name ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtVolume(o.quantity, o.unit)}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-muted lg:table-cell">{o.route ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-muted sm:table-cell">{fmtDate(o.createdAt)}</td>
                    <td className="px-4 py-3"><PriorityDot priority={o.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
              <span className="text-muted">Стр. {page} из {totalPages}</span>
              <div className="flex gap-2">
                <button className="btn-ghost px-3 py-1.5" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Назад</button>
                <button className="btn-ghost px-3 py-1.5" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Вперёд</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
