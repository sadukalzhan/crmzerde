import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader } from '../components/ui';
import { useOrders } from '../lib/queries';
import { fmtMonth } from '../lib/format';
import { cn } from '../lib/cn';
import type { Order } from '../lib/types';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface DayEvent { type: 'production' | 'delivery'; order: Order }

export default function CalendarPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const { data: orders = [], isLoading } = useOrders();

  const events = useMemo(() => {
    const map: Record<number, DayEvent[]> = {};
    const add = (date: string | null | undefined, type: DayEvent['type'], order: Order) => {
      if (!date) return;
      const d = new Date(date);
      if (d.getFullYear() === period.year && d.getMonth() + 1 === period.month) {
        const day = d.getDate();
        (map[day] ??= []).push({ type, order });
      }
    };
    for (const o of orders) {
      add(o.productionStartDate, 'production', o);
      add(o.desiredDate, 'delivery', o);
    }
    return map;
  }, [orders, period]);

  if (isLoading) return <PageLoader />;

  const first = new Date(period.year, period.month - 1, 1);
  const startOffset = (first.getDay() + 6) % 7; // Пн = 0
  const daysInMonth = new Date(period.year, period.month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (d: number) => {
    const dt = new Date(period.year, period.month - 1 + d, 1);
    setPeriod({ year: dt.getFullYear(), month: dt.getMonth() + 1 });
  };
  const isToday = (day: number) =>
    now.getFullYear() === period.year && now.getMonth() + 1 === period.month && now.getDate() === day;

  return (
    <Page>
      <PageHeader
        title="Календарь"
        subtitle="План производства и отгрузок по датам"
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border bg-panel p-1">
            <button onClick={() => shift(-1)} className="rounded p-1.5 text-muted hover:text-white"><ChevronLeft size={16} /></button>
            <span className="min-w-[140px] text-center text-sm font-medium capitalize text-slate-200">{fmtMonth(period.year, period.month)}</span>
            <button onClick={() => shift(1)} className="rounded p-1.5 text-muted hover:text-white"><ChevronRight size={16} /></button>
          </div>
        }
      />

      <div className="mb-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-400" /> Запуск в производство</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Желаемая доставка</span>
      </div>

      <div className="card overflow-hidden p-3">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-center text-xs font-medium text-muted-2">{w}</div>
          ))}
          {cells.map((day, i) => (
            <div
              key={i}
              className={cn(
                'min-h-[92px] rounded-lg border p-2',
                day ? 'border-border bg-bg-elevated/50' : 'border-transparent',
                day && isToday(day) && 'ring-1 ring-accent',
              )}
            >
              {day && (
                <>
                  <div className={cn('mb-1 text-xs font-semibold', isToday(day) ? 'text-accent' : 'text-muted')}>{day}</div>
                  <div className="space-y-1">
                    {(events[day] ?? []).slice(0, 3).map((e, idx) => (
                      <button
                        key={idx}
                        onClick={() => navigate(`/orders/${e.order.id}`)}
                        className={cn(
                          'flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium',
                          e.type === 'production' ? 'bg-orange-500/15 text-orange-300' : 'bg-emerald-500/15 text-emerald-300',
                        )}
                      >
                        #{e.order.number}
                      </button>
                    ))}
                    {(events[day]?.length ?? 0) > 3 && <div className="text-[10px] text-muted-2">+{events[day].length - 3}</div>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
