import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { OrderCard } from './OrderCard';
import { EmptyState } from '../ui';
import { useMeta } from '../../lib/queries';
import { cn } from '../../lib/cn';
import type { Order, OrderStatus } from '../../lib/types';

interface Props {
  orders: Order[];
  statuses: OrderStatus[];
  onMove: (orderId: string, to: OrderStatus) => void;
  onCardClick: (order: Order) => void;
  /** Запрет перетаскивания (например, для роли без прав) */
  readOnly?: boolean;
}

function DraggableCard({ order, onClick, disabled }: { order: Order; onClick: () => void; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { status: order.status },
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(isDragging && 'opacity-40')}
      {...listeners}
      {...attributes}
    >
      <OrderCard order={order} onClick={onClick} />
    </div>
  );
}

function Column({
  status,
  orders,
  onCardClick,
  readOnly,
}: {
  status: OrderStatus;
  orders: Order[];
  onCardClick: (o: Order) => void;
  readOnly?: boolean;
}) {
  const { data: meta } = useMeta();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const info = meta?.statusMeta?.[status];
  const color = info?.color ?? '#7C6CF6';

  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      {/* Цветная полоса + заголовок */}
      <div className="rounded-t-xl border-x border-t border-border" style={{ borderTop: `3px solid ${color}` }}>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-semibold text-slate-100">{info?.label ?? status}</span>
          <span className="rounded-full bg-panel-2 px-2 py-0.5 text-xs font-bold text-muted">{orders.length}</span>
        </div>
      </div>

      {/* Дроп-зона */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[120px] flex-1 flex-col gap-2.5 rounded-b-xl border-x border-b border-border bg-bg-elevated/40 p-2.5 transition',
          isOver && 'bg-accent-soft ring-1 ring-inset ring-accent/40',
        )}
      >
        {orders.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-6">
            <span className="text-xs text-muted-2">Пусто</span>
          </div>
        ) : (
          orders.map((o) => <DraggableCard key={o.id} order={o} onClick={() => onCardClick(o)} disabled={readOnly} />)
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ orders, statuses, onMove, onCardClick, readOnly }: Props) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStatus = (status: OrderStatus) => orders.filter((o) => o.status === status);

  const onDragStart = (e: DragStartEvent) => {
    setActiveOrder(orders.find((o) => o.id === e.active.id) ?? null);
  };
  const onDragEnd = (e: DragEndEvent) => {
    setActiveOrder(null);
    const { active, over } = e;
    if (!over) return;
    const from = active.data.current?.status as OrderStatus | undefined;
    const to = over.id as OrderStatus;
    if (from && from !== to) onMove(String(active.id), to);
  };

  if (statuses.length === 0) {
    return <EmptyState title="Нет колонок для вашей роли" />;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {statuses.map((status) => (
          <Column key={status} status={status} orders={byStatus(status)} onCardClick={onCardClick} readOnly={readOnly} />
        ))}
      </div>
      <DragOverlay>{activeOrder ? <div className="w-[256px] rotate-2"><OrderCard order={activeOrder} /></div> : null}</DragOverlay>
    </DndContext>
  );
}
