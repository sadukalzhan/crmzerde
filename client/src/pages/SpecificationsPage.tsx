import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, X, FileText } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState } from '../components/ui';
import { useSpecifications, useContracts, useSignSpec, useSignContract } from '../lib/queries';
import { fmtDate, fmtMoney } from '../lib/format';
import { toast } from '../components/toast';
import { useAuth } from '../lib/store';
import { cn } from '../lib/cn';

function SignChip({ label, signed }: { label: string; signed: boolean }) {
  return (
    <span className={cn('chip text-[11px]', signed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-muted')}>
      {signed ? <CheckCircle2 size={12} /> : <X size={12} />} {label}
    </span>
  );
}

export default function SpecificationsPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user)!;
  const canSign = user.role === 'MANAGER' || user.role === 'ADMIN';
  const [tab, setTab] = useState<'specs' | 'contracts'>('specs');

  const { data: specs = [], isLoading: l1 } = useSpecifications();
  const { data: contracts = [], isLoading: l2 } = useContracts();
  const signSpec = useSignSpec();
  const signContract = useSignContract();

  if (l1 || l2) return <PageLoader />;

  return (
    <Page>
      <PageHeader title="Спецификации и договоры" subtitle="Статусы подписей по сделкам" />

      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-panel p-1">
        {[
          { k: 'specs', label: `Спецификации (${specs.length})` },
          { k: 'contracts', label: `Договоры (${contracts.length})` },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as typeof tab)}
            className={cn('flex-1 rounded-md px-3 py-2 text-sm font-medium transition', tab === t.k ? 'bg-accent text-white' : 'text-muted hover:text-white')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'specs' ? (
        specs.length === 0 ? (
          <EmptyState title="Спецификаций нет" icon={<FileText size={28} />} />
        ) : (
          <div className="card divide-y divide-border">
            {specs.map((sp) => (
              <div key={sp.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <button onClick={() => sp.order && navigate(`/orders`)} className="text-sm font-bold text-white">{sp.number}</button>
                <span className="text-sm text-muted">{sp.order?.client?.companyName} · #{sp.order?.number}</span>
                <span className="text-sm font-medium text-slate-200">{fmtMoney(sp.total)}</span>
                <span className="ml-auto flex items-center gap-2">
                  <SignChip label="Менеджер" signed={sp.managerSigned} />
                  <SignChip label="Клиент" signed={sp.clientSigned} />
                  {canSign && !sp.managerSigned && (
                    <button onClick={() => signSpec.mutate(sp.id, { onSuccess: () => toast.success('Подписано') })} className="btn-primary px-2.5 py-1 text-xs">
                      Подписать
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )
      ) : contracts.length === 0 ? (
        <EmptyState title="Договоров нет" icon={<FileText size={28} />} />
      ) : (
        <div className="card divide-y divide-border">
          {contracts.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="text-sm font-bold text-white">{c.number}</span>
              <span className="text-sm text-muted">{c.order?.client?.companyName} · #{c.order?.number}</span>
              <span className="ml-auto flex items-center gap-2">
                <SignChip label="Менеджер" signed={c.managerSigned} />
                <SignChip label="Клиент" signed={c.clientSigned} />
                {canSign && !c.managerSigned && (
                  <button onClick={() => signContract.mutate(c.id, { onSuccess: () => toast.success('Подписано') })} className="btn-primary px-2.5 py-1 text-xs">
                    Подписать
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
