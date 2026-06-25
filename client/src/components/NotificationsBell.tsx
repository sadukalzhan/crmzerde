import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '../lib/queries';
import { relativeTime } from '../lib/format';
import { EmptyState } from './ui';
import { cn } from '../lib/cn';

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const { data: unread = 0 } = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-border bg-panel p-2 text-muted transition hover:text-white"
        title="Уведомления"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 animate-fade-in overflow-hidden rounded-xl border border-border bg-panel shadow-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-white">Уведомления</span>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <CheckCheck size={14} /> Прочитать все
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4"><EmptyState title="Нет уведомлений" /></div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate(n.id);
                    if (n.orderId) navigate(`/orders/${n.orderId}`);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full flex-col gap-0.5 border-b border-border/60 px-4 py-3 text-left transition hover:bg-panel-2',
                    !n.isRead && 'bg-accent-soft/40',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    <span className="text-sm font-medium text-slate-100">{n.title}</span>
                  </div>
                  {n.body && <span className="text-xs text-muted">{n.body}</span>}
                  <span className="text-[11px] text-muted-2">{relativeTime(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
