import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState } from '../components/ui';
import { useFunnel, useReceivables, useAnalyticsSummary, useMeta } from '../lib/queries';
import { fmtMoney } from '../lib/format';
import type { OrderStatus } from '../lib/types';

const PRIORITY_COLORS: Record<string, string> = { HIGH: '#FF5A5F', MEDIUM: '#FFB020', LOW: '#5C6678' };
const PRIORITY_LABELS: Record<string, string> = { HIGH: 'Высокий', MEDIUM: 'Средний', LOW: 'Низкий' };

export default function AnalyticsPage() {
  const { data: meta } = useMeta();
  const { data: funnel = [], isLoading } = useFunnel();
  const { data: receivables } = useReceivables();
  const { data: summary } = useAnalyticsSummary();

  if (isLoading || !meta || !summary) return <PageLoader />;

  const funnelData = (funnel as { status: OrderStatus; count: number }[]).filter((f) => f.count > 0);
  const maxCount = Math.max(1, ...funnelData.map((f) => f.count));
  const priorityData = Object.entries(summary.byPriority ?? {}).map(([k, v]) => ({
    name: PRIORITY_LABELS[k] ?? k,
    value: v as number,
    color: PRIORITY_COLORS[k] ?? '#7C6CF6',
  }));

  return (
    <Page>
      <PageHeader title="Аналитика" subtitle="Воронка по этапам, приоритеты и дебиторка" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Воронка */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-white">Воронка по этапам</h3>
          {funnelData.length === 0 ? (
            <EmptyState title="Нет данных" />
          ) : (
            <div className="space-y-2.5">
              {funnelData.map((f) => {
                const info = meta.statusMeta[f.status];
                return (
                  <div key={f.status} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-xs text-muted">{info.label}</span>
                    <div className="h-7 flex-1 overflow-hidden rounded-md bg-bg-elevated">
                      <div
                        className="flex h-full items-center justify-end rounded-md px-2 text-[11px] font-bold text-white"
                        style={{ width: `${Math.max(8, (f.count / maxCount) * 100)}%`, backgroundColor: info.color }}
                      >
                        {f.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Приоритеты */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">По приоритету</h3>
          {priorityData.length === 0 ? (
            <EmptyState title="Нет данных" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {priorityData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#161A23', border: '1px solid #222838', borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Дебиторка */}
      <div className="mt-5 card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Дебиторская задолженность</h3>
          <span className="text-sm font-bold text-rose-300">{fmtMoney(receivables?.total ?? 0)}</span>
        </div>
        {!receivables?.clients?.length ? (
          <EmptyState title="Задолженностей нет" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-2">
                  <th className="py-2 pr-4 font-medium">Клиент</th>
                  <th className="py-2 pr-4 font-medium">Долг</th>
                  <th className="py-2 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {receivables.clients.map((c: { id: string; companyName: string; debt: number; creditBlocked: boolean }) => (
                  <tr key={c.id}>
                    <td className="py-2.5 pr-4 text-slate-200">{c.companyName}</td>
                    <td className="py-2.5 pr-4 font-medium text-rose-300">{fmtMoney(c.debt)}</td>
                    <td className="py-2.5">
                      {c.creditBlocked ? (
                        <span className="chip bg-rose-500/15 text-rose-300">Заблокирован</span>
                      ) : (
                        <span className="chip bg-amber-500/15 text-amber-300">Есть долг</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  );
}
