import { RefreshCw, Menu } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/store';
import { fmtDate } from '../lib/format';
import { NotificationsBell } from './NotificationsBell';
import { RoleBadge } from './badges';
import { cn } from '../lib/cn';

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [spinning, setSpinning] = useState(false);

  const refresh = () => {
    setSpinning(true);
    qc.invalidateQueries();
    setTimeout(() => setSpinning(false), 600);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg-elevated/80 px-4 backdrop-blur sm:px-6">
      <button onClick={onMenu} className="rounded-lg border border-border p-2 text-muted lg:hidden">
        <Menu size={18} />
      </button>

      <div className="flex-1" />

      <span className="hidden text-sm text-muted sm:block">{fmtDate(new Date())}</span>

      <button
        onClick={refresh}
        className="flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-sm text-muted transition hover:text-white"
      >
        <RefreshCw size={16} className={cn(spinning && 'animate-spin text-accent')} />
        <span className="hidden sm:inline">Обновить</span>
      </button>

      <NotificationsBell />

      {user && (
        <div className="hidden items-center gap-2.5 rounded-lg border border-border bg-panel py-1.5 pl-3 pr-2 md:flex">
          <span className="text-sm font-medium text-slate-100">{user.fullName}</span>
          <RoleBadge role={user.role} />
        </div>
      )}
    </header>
  );
}
