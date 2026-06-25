import { NavLink, Outlet } from 'react-router-dom';
import { Grid2x2, Plus, ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '../lib/store';
import { useSettings } from '../lib/queries';
import { useRealtime } from '../lib/useRealtime';
import { NotificationsBell } from './NotificationsBell';
import { ChatWidget } from './ChatWidget';
import { ToastContainer } from './toast';
import { Avatar } from './ui';
import { cn } from '../lib/cn';

const links = [
  { to: '/my-orders', label: 'Мои заявки', icon: ClipboardList },
  { to: '/create-order', label: 'Создать заявку', icon: Plus },
];

export function ClientLayout() {
  useRealtime();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const { data: settings } = useSettings();

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg-elevated/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hover shadow-glow">
              <Grid2x2 size={18} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white">{settings?.brandName ?? 'Зерде Керамика Актобе'}</span>
          </div>

          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            {links.map((l) => {
              const Icon = l.icon;
              return (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                      isActive ? 'bg-accent-soft text-white' : 'text-muted hover:text-white',
                    )
                  }
                >
                  <Icon size={16} /> {l.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex-1" />
          <NotificationsBell />
          {user && (
            <NavLink to="/profile" className="flex items-center gap-2 rounded-lg border border-border bg-panel py-1.5 pl-2 pr-3">
              <Avatar name={user.fullName} size={28} />
              <span className="hidden text-sm font-medium text-slate-100 sm:block">{user.fullName}</span>
            </NavLink>
          )}
          <button onClick={logout} className="rounded-lg border border-border bg-panel p-2 text-muted hover:text-rose-300" title="Выйти">
            <LogOut size={18} />
          </button>
        </div>

        {/* Мобильная нижняя навигация */}
        <nav className="flex items-center gap-1 border-t border-border px-4 py-2 sm:hidden">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn('flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm', isActive ? 'bg-accent-soft text-white' : 'text-muted')
                }
              >
                <Icon size={16} /> {l.label}
              </NavLink>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <ChatWidget />
      <ToastContainer />
    </div>
  );
}
