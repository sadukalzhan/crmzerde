import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState } from '../components/ui';
import { useFunnel, useAnalyticsSummary, useMeta } from '../lib/queries';
import type { OrderStatus } from '../lib/types';


export default function AnalyticsPage() {
  const { data: meta } = useMeta();
  const { data: funnel = [], isLoading } = useFunnel();
  const { data: summary } = useAnalyticsSummary();

  if (isLoading || !meta || !summary) return <PageLoader />;

  const funnelData = (funnel as { status: OrderStatus; count: number }[]).filter((f) => f.count > 0);
  const maxCount = Math.max(1, ...funnelData.map((f) => f.count));

  return (
    <Page>
      <PageHeader title="Аналитика" subtitle="Воронка по этапам" />

      <div className="grid grid-cols-1 gap-5">
        {/* Воронка */}
        <div className="card p-5">
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

      </div>

    </Page>
  );
}
