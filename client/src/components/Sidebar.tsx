import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../lib/store';
import { useSettings, useOrders } from '../lib/queries';
import { navSectionsForRole } from './nav';
import { t } from '../lib/i18n';
import { cn } from '../lib/cn';
import { Avatar } from './ui';
import { RoleBadge } from './badges';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const { data: settings } = useSettings();
  const { data: newOrders } = useOrders({ status: 'NEW' });

  if (!user) return null;
  const sections = navSectionsForRole(user.role);
  const newCount = newOrders?.length ?? 0;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-bg-elevated">
      {/* Бренд */}
      <div className="px-3 pb-3 pt-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-panel px-3 py-2.5">
          <Logo size={36} />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold text-white">
              {settings?.brandName ?? 'Зерде Керамика Актобе'}
            </div>
            <div className="truncate text-[11px] text-muted-2">Керамогранит</div>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {sections.map((section) => (
          <div key={section.key} className="mb-5">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-2">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                        isActive
                          ? 'bg-gold text-white shadow-[0_6px_18px_rgba(192,97,245,0.28)]'
                          : 'text-muted hover:bg-panel-2 hover:text-slate-100',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={17} className={cn(isActive ? 'text-white' : 'text-muted-2 group-hover:text-slate-300')} />
                        <span className="flex-1">{t(item.labelKey)}</span>
                        {item.newBadge && newCount > 0 && (
                          <span
                            className={cn(
                              'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                              isActive ? 'bg-white/20 text-white' : 'bg-accent-soft text-accent',
                            )}
                          >
                            {newCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Профиль */}
      <div className="border-t border-border p-3">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-panel-2"
        >
          <Avatar name={user.fullName} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{user.fullName}</div>
            <div className="mt-0.5"><RoleBadge role={user.role} /></div>
          </div>
        </NavLink>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut size={18} />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
