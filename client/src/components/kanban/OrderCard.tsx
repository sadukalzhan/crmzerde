import { Factory, MapPin, Calendar, Wallet, Truck } from 'lucide-react';
import { useMeta } from '../../lib/queries';
import { fmtDate, fmtM2 } from '../../lib/format';
import { boxes, pallets } from '../../lib/packaging';
import { PriorityDot, ProductionPriorityBadge } from '../badges';
import type { Order } from '../../lib/types';

export function OrderCard({ order, onClick }: { order: Order; onClick?: () => void }) {
  const { data: meta } = useMeta();
  const first = order.items?.[0];
  const productName = first?.product?.name ?? 'Без номенклатуры';
  const extra = (order.items?.length ?? 0) - 1;
  const fmt = first?.product?.format ?? '60x60';
  const grade = first?.grade ?? 'A';
  const boxCount = boxes(order.quantity, fmt, grade);
  const palletCount = pallets(order.quantity, fmt, grade);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-border bg-card p-3 transition hover:border-accent/50 hover:shadow-glow"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-white">#{order.number}</span>
        <PriorityDot priority={order.priority} />
      </div>

      <div className="mb-1 line-clamp-2 text-sm font-medium text-slate-100">
        {productName}
        {extra > 0 && <span className="text-muted-2"> +{extra}</span>}
      </div>

      <div className="mb-2 text-xs font-semibold text-accent">
        {fmtM2(order.quantity)}
        <span className="ml-1 font-normal text-muted-2">· {boxCount} кор. · {palletCount} под.</span>
      </div>

      <div className="space-y-1 text-[11px] text-muted">
        {order.selfPickup && (
          <div className="flex items-center gap-1.5 text-accent">
            <Truck size={12} /> <span>Самовывоз</span>
          </div>
        )}
        {order.shipFrom && (
          <div className="flex items-center gap-1.5">
            <Factory size={12} className="text-muted-2" />
            <span>{order.shipFrom}</span>
          </div>
        )}
        {order.route && (
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-muted-2" />
            <span className="truncate">{order.route}</span>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2">
        <span className="flex items-center gap-1 text-[11px] text-muted-2">
          <Calendar size={12} /> {fmtDate(order.createdAt)}
        </span>
        <span className="flex items-center gap-1.5">
          <ProductionPriorityBadge value={order.productionPriority} />
          <span className="flex items-center gap-1 text-[10px] text-muted-2" title="Условие оплаты">
            <Wallet size={11} />
            {meta?.paymentTermLabels?.[order.paymentTerm] ?? order.paymentTerm}
          </span>
        </span>
      </div>
    </div>
  );
}
