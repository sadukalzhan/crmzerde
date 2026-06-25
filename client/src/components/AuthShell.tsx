import type { ReactNode } from 'react';
import { Grid2x2 } from 'lucide-react';
import { useSettings } from '../lib/queries';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { data: settings } = useSettings();
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      {/* Декоративный фон */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-hover shadow-glow">
            <Grid2x2 size={24} className="text-white" />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{settings?.brandName ?? 'Зерде Керамика Актобе'}</div>
            <div className="text-xs text-muted-2">CRM керамогранитного завода</div>
          </div>
        </div>

        <div className="panel p-6 shadow-card">
          <h1 className="mb-1 text-xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mb-5 text-sm text-muted">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
