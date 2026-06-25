import { useNavigate } from 'react-router-dom';
import { Plus, Package } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState } from '../components/ui';
import { StatusBadge } from '../components/badges';
import { StatusTracker } from '../components/StatusTracker';
import { useOrders } from '../lib/queries';
import { fmtDate, fmtVolume } from '../lib/format';

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useOrders();

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Мои заявки"
        subtitle="Отслеживайте статус ваших заказов в реальном времени"
        actions={
          <button onClick={() => navigate('/create-order')} className="btn-primary">
            <Plus size={16} /> Создать заявку
          </button>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          title="У вас пока нет заявок"
          hint="Создайте первую заявку на поставку керамогранита"
          icon={<Package size={28} />}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="card cursor-pointer p-5 transition hover:border-accent/40" onClick={() => navigate(`/orders/${o.id}`)}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">Заявка #{o.number}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {o.items?.[0]?.product?.name ?? '—'} · {fmtVolume(o.quantity, o.unit)}
                    {o.route && <> · {o.route}</>}
                  </p>
                </div>
                <span className="text-xs text-muted-2">от {fmtDate(o.createdAt)}</span>
              </div>
              <StatusTracker status={o.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
