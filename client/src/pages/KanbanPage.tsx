import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader } from '../components/ui';
import { Modal } from '../components/ui';
import { Field } from '../components/ui';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { useMeta, useOrders, useTransition, useFactories, useCarriers } from '../lib/queries';
import { kanbanStatusesForRole, boardStats } from '../lib/board';
import { useAuth } from '../lib/store';
import { apiError } from '../lib/api';
import { toast } from '../components/toast';
import { fmtMonth } from '../lib/format';
import type { Order, OrderStatus } from '../lib/types';

export default function KanbanPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user)!;
  const { data: meta } = useMeta();
  const { data: factories = [] } = useFactories();
  const { data: carriers = [] } = useCarriers();

  const [factoryId, setFactoryId] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const [priority, setPriority] = useState('');
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState<{ year: number; month: number } | null>(null);

  const { data: orders = [], isLoading } = useOrders({
    factoryId: factoryId || undefined,
    carrierId: carrierId || undefined,
    priority: priority || undefined,
  });
  const transition = useTransition();

  const [reject, setReject] = useState<{ order: Order } | null>(null);
  const [reason, setReason] = useState('');

  const filtered = useMemo(() => {
    if (!monthFilter) return orders;
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === monthFilter.year && d.getMonth() + 1 === monthFilter.month;
    });
  }, [orders, monthFilter]);

  const stats = boardStats(filtered);
  const columns = meta ? kanbanStatusesForRole(user.role, meta.orderStatuses) : [];

  if (isLoading || !meta) return <PageLoader />;

  const doMove = (orderId: string, to: OrderStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    if (to === 'REJECTED') {
      setReject({ order });
      setReason('');
      return;
    }
    transition.mutate(
      { id: orderId, to },
      {
        onSuccess: () => toast.success(`Заявка #${order.number} → ${meta.statusMeta[to].label}`),
        onError: (e) => toast.error(apiError(e, 'Переход недоступен')),
      },
    );
  };

  const confirmReject = () => {
    if (!reject) return;
    if (!reason.trim()) return toast.error('Укажите причину');
    transition.mutate(
      { id: reject.order.id, to: 'REJECTED', reason },
      {
        onSuccess: () => { toast.success(`Заявка #${reject.order.number} отклонена`); setReject(null); },
        onError: (e) => toast.error(apiError(e)),
      },
    );
  };

  const monthLabel = monthFilter ? fmtMonth(monthFilter.year, monthFilter.month) : 'Все месяцы';
  const shiftMonth = (delta: number) => {
    const base = monthFilter ?? { year: now.getFullYear(), month: now.getMonth() + 1 };
    const d = new Date(base.year, base.month - 1 + delta, 1);
    setMonthFilter({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  return (
    <Page>
      <PageHeader
        title="Рабочее место"
        subtitle="Канбан-доска заявок — перетаскивайте карточки между этапами"
        actions={
          <button onClick={() => navigate('/specifications')} className="btn-soft">
            <FileUp size={16} /> Загрузить спеки
          </button>
        }
      />

      {/* Фильтры */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Field label="Завод">
            <select className="input" value={factoryId} onChange={(e) => setFactoryId(e.target.value)}>
              <option value="">Все</option>
              {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="w-44">
          <Field label="Перевозчик">
            <select className="input" value={carrierId} onChange={(e) => setCarrierId(e.target.value)}>
              <option value="">Все</option>
              {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="w-40">
          <Field label="Приоритет">
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">Все</option>
              <option value="HIGH">Высокий</option>
              <option value="MEDIUM">Средний</option>
              <option value="LOW">Низкий</option>
            </select>
          </Field>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-panel p-1">
          <button onClick={() => shiftMonth(-1)} className="rounded p-1.5 text-muted hover:text-white"><ChevronLeft size={16} /></button>
          <button
            onClick={() => setMonthFilter(null)}
            className="min-w-[120px] px-2 text-center text-sm font-medium capitalize text-slate-200 hover:text-white"
            title="Сбросить фильтр месяца"
          >
            {monthLabel}
          </button>
          <button onClick={() => shiftMonth(1)} className="rounded p-1.5 text-muted hover:text-white"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Доска */}
      <KanbanBoard
        orders={filtered}
        statuses={columns}
        onMove={doMove}
        onCardClick={(o) => navigate(`/orders/${o.id}`)}
      />

      {/* Нижняя статистика */}
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Всего', value: stats.total },
          { label: 'В работе', value: stats.inWork },
          { label: 'Доставлено', value: stats.delivered },
          { label: 'Отклонено', value: stats.rejected },
        ].map((s) => (
          <div key={s.label} className="card flex items-center justify-between px-4 py-3">
            <span className="text-xs text-muted">{s.label}</span>
            <span className="text-lg font-bold text-white">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Модал отклонения */}
      <Modal
        open={!!reject}
        onClose={() => setReject(null)}
        title={`Отклонить заявку #${reject?.order.number}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setReject(null)}>Отмена</button>
            <button className="btn-primary !bg-rose-500 hover:!bg-rose-600" onClick={confirmReject}>Отклонить</button>
          </>
        }
      >
        <Field label="Причина отклонения">
          <textarea
            className="input min-h-[90px] resize-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: задолженность клиента, неверные реквизиты…"
          />
        </Field>
      </Modal>
    </Page>
  );
}
