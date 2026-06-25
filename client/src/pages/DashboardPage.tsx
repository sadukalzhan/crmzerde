import { useNavigate } from 'react-router-dom';
import { ClipboardList, Loader, Truck, XCircle, Factory } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Page, PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { PageLoader, EmptyState } from '../components/ui';
import { StatusBadge, PriorityDot } from '../components/badges';
import { useAnalyticsSummary, useMeta, useOrders } from '../lib/queries';
import { fmtDate, fmtVolume } from '../lib/format';
import { useAuth } from '../lib/store';
import type { OrderStatus } from '../lib/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const { data: summary, isLoading } = useAnalyticsSummary();
  const { data: meta } = useMeta();
  const { data: orders = [] } = useOrders();

  if (isLoading || !summary || !meta) return <PageLoader />;

  const chartData = (meta.orderStatuses as OrderStatus[])
    .map((s) => ({ status: s, label: meta.statusMeta[s].label, count: summary.byStatus[s] ?? 0, color: meta.statusMeta[s].color }))
    .filter((d) => d.count > 0);

  const recent = [...orders].sort((a, b) => b.number - a.number).slice(0, 6);

  return (
    <Page>
      <PageHeader title={`Здравствуйте, ${user?.fullName.split(' ')[0]}`} subtitle="Сводка по заявкам и производству" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Всего заявок" value={summary.total} icon={ClipboardList} tone="accent" />
        <StatCard label="В работе" value={summary.inWork} icon={Loader} tone="sky" />
        <StatCard label="Доставлено" value={summary.delivered} icon={Truck} tone="green" />
        <StatCard label="Отклонено" value={summary.rejected} icon={XCircle} tone="rose" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Распределение по этапам */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-white">Заявки по этапам</h3>
          {chartData.length === 0 ? (
            <EmptyState title="Нет данных" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8A93A6' }} interval={0} angle={-35} textAnchor="end" height={90} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8A93A6' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(124,108,246,0.08)' }}
                  contentStyle={{ background: '#161A23', border: '1px solid #222838', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((d) => (
                    <Cell key={d.status} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* План производства */}
        <div className="card flex flex-col p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">План производства</h3>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
              <Factory size={28} />
            </div>
            <div className="text-4xl font-bold text-white">{summary.plannedThisMonth}</div>
            <div className="text-sm text-muted">заявок в плане на текущий месяц</div>
            <button onClick={() => navigate('/production')} className="btn-soft mt-2">Открыть план</button>
          </div>
        </div>
      </div>

      {/* Последние заявки */}
      <div className="mt-5 card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Последние заявки</h3>
          <button onClick={() => navigate('/orders')} className="text-xs text-accent hover:underline">Все заявки →</button>
        </div>
        <div className="divide-y divide-border">
          {recent.map((o) => (
            <button
              key={o.id}
              onClick={() => navigate(`/orders/${o.id}`)}
              className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-panel-2/40"
            >
              <PriorityDot priority={o.priority} />
              <span className="w-14 font-bold text-white">#{o.number}</span>
              <span className="flex-1 truncate text-sm text-slate-200">{o.items?.[0]?.product?.name ?? '—'}</span>
              <span className="hidden text-xs text-muted sm:block">{fmtVolume(o.quantity, o.unit)}</span>
              <span className="hidden text-xs text-muted md:block">{fmtDate(o.createdAt)}</span>
              <StatusBadge status={o.status} />
            </button>
          ))}
        </div>
      </div>
    </Page>
  );
}
