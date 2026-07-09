import { Lock } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState } from '../components/ui';
import { StatusBadge } from '../components/badges';
import { useReservations } from '../lib/queries';
import { fmtM2, fmtDate } from '../lib/format';
import { FORMAT_LABELS, GRADE_LABELS } from '../lib/packaging';

export default function ReservationsPage() {
  const { data: reservations = [], isLoading } = useReservations();
  if (isLoading) return <PageLoader />;

  const total = reservations.reduce((s, r) => s + r.quantity, 0);

  return (
    <Page>
      <PageHeader
        title="Резервы"
        subtitle={`Активных резервов: ${reservations.length} · всего ${fmtM2(total)}`}
      />

      {reservations.length === 0 ? (
        <EmptyState
          title="Резервов нет"
          hint="Резерв создаётся при переводе заявки в «Резервирование» и снимается при отгрузке"
          icon={<Lock size={28} />}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-2">
                  <th className="px-4 py-3 font-medium">Заявка</th>
                  <th className="px-4 py-3 font-medium">Клиент</th>
                  <th className="px-4 py-3 font-medium">Менеджер</th>
                  <th className="px-4 py-3 font-medium">Зарезервировал</th>
                  <th className="px-4 py-3 font-medium">Товар</th>
                  <th className="px-4 py-3 font-medium">Формат</th>
                  <th className="px-4 py-3 font-medium">Сорт</th>
                  <th className="px-4 py-3 text-right font-medium">Объём, м²</th>
                  <th className="px-4 py-3 text-right font-medium">Кор.</th>
                  <th className="px-4 py-3 text-right font-medium">Под.</th>
                  <th className="px-4 py-3 font-medium">Статус заявки</th>
                  <th className="px-4 py-3 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reservations.map((r) => (
                  <tr key={r.id} className="transition hover:bg-panel-2/30">
                    <td className="px-4 py-3 font-bold text-white">#{r.order?.number}</td>
                    <td className="px-4 py-3 text-slate-200">{r.order?.client?.companyName ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{r.order?.manager?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{r.createdBy?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-200">{r.product?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{FORMAT_LABELS[r.product?.format ?? ''] ?? r.product?.format}</td>
                    <td className="px-4 py-3 text-muted">{GRADE_LABELS[r.grade] ?? r.grade}</td>
                    <td className="px-4 py-3 text-right font-medium text-amber-300">{fmtM2(r.quantity)}</td>
                    <td className="px-4 py-3 text-right text-muted">{r.boxes ?? 0}</td>
                    <td className="px-4 py-3 text-right text-muted">{r.pallets ?? 0}</td>
                    <td className="px-4 py-3">{r.order && <StatusBadge status={r.order.status} />}</td>
                    <td className="px-4 py-3 text-muted">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Page>
  );
}
