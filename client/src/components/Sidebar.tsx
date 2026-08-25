import { NavLink } from 'react-router-dom';
import { LogOut, Grid2x2 } from 'lucide-react';
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
      <div className="px-5 pb-4 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent-soft">
            <Grid2x2 size={16} className="text-accent" />
          </div>
          <div className="truncate text-[15px] font-semibold tracking-tight text-slate-100">
            {settings?.brandName ?? 'Зерде Керамика Актобе'}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-accent/50 to-transparent" />
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-2">CRM платформа</span>
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
                          ? 'bg-accent-soft text-accent'
                          : 'text-muted hover:bg-panel-2 hover:text-slate-100',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-accent" />}
                        <Icon size={17} className={cn(isActive ? 'text-accent' : 'text-muted-2 group-hover:text-slate-300')} />
                        <span className="flex-1">{t(item.labelKey)}</span>
                        {item.newBadge && newCount > 0 && (
                          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-black">{newCount}</span>
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
