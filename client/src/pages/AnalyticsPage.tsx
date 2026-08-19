import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState } from '../components/ui';
import { useFunnel, useAnalyticsSummary, useMeta } from '../lib/queries';
import type { OrderStatus } from '../lib/types';

const PRIORITY_COLORS: Record<string, string> = { HIGH: '#FF5A5F', MEDIUM: '#FFB020', LOW: '#5C6678' };
const PRIORITY_LABELS: Record<string, string> = { HIGH: 'Высокий', MEDIUM: 'Средний', LOW: 'Низкий' };

export default function AnalyticsPage() {
  const { data: meta } = useMeta();
  const { data: funnel = [], isLoading } = useFunnel();
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
      <PageHeader title="Аналитика" subtitle="Воронка по этапам и приоритеты" />

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

    </Page>
  );
}
