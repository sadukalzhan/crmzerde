import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-3 flex items-center gap-2">
          <span className="rule-gold" />
          <span className="h-1 w-1 rotate-45 bg-accent/70" />
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">{children}</div>;
}
