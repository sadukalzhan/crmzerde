import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Building2 } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState, Modal, Field } from '../components/ui';
import { useClients } from '../lib/queries';
import { api, apiError } from '../lib/api';
import { toast } from '../components/toast';
import { fmtMoney } from '../lib/format';
import { useAuth } from '../lib/store';
import type { Client } from '../lib/types';

export default function ClientsPage() {
  const user = useAuth((s) => s.user)!;
  const qc = useQueryClient();
  const { data: clients = [], isLoading } = useClients();
  const [createOpen, setCreateOpen] = useState(false);
  const [edit, setEdit] = useState<Client | null>(null);

  if (isLoading) return <PageLoader />;
  const canCreate = user.role === 'MANAGER' || user.role === 'ADMIN';
  const canEditDebt = user.role === 'ACCOUNTANT' || user.role === 'MANAGER' || user.role === 'ADMIN';

  return (
    <Page>
      <PageHeader
        title="Клиенты"
        subtitle={`Всего: ${clients.length}`}
        actions={canCreate ? <button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Новый клиент</button> : undefined}
      />

      {clients.length === 0 ? (
        <EmptyState title="Клиентов нет" icon={<Building2 size={28} />} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-2">
                  <th className="px-4 py-3 font-medium">Компания</th>
                  <th className="px-4 py-3 font-medium">Контакт</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Телефон</th>
                  <th className="px-4 py-3 font-medium">Заявок</th>
                  <th className="px-4 py-3 font-medium">Дебиторка</th>
                  {canEditDebt && <th className="px-4 py-3 font-medium" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => (
                  <tr key={c.id} className="transition hover:bg-panel-2/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{c.companyName}</div>
                      {c.creditBlocked && <span className="chip mt-1 bg-rose-500/15 text-rose-300">Заблокирован</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">{c.contactName ?? '—'}</td>
                    <td className="hidden px-4 py-3 text-muted md:table-cell">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{c._count?.orders ?? 0}</td>
                    <td className={`px-4 py-3 font-medium ${c.debt > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{fmtMoney(c.debt)}</td>
                    {canEditDebt && (
                      <td className="px-4 py-3 text-right">
                        <button className="btn-soft px-2.5 py-1 text-xs" onClick={() => setEdit(c)}>Дебиторка</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateClientModal open={createOpen} onClose={() => setCreateOpen(false)} onDone={() => { qc.invalidateQueries({ queryKey: ['clients'] }); setCreateOpen(false); }} />
      <DebtModal key={edit?.id ?? 'none'} client={edit} onClose={() => setEdit(null)} onDone={() => { qc.invalidateQueries({ queryKey: ['clients'] }); setEdit(null); }} />
    </Page>
  );
}

function CreateClientModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ companyName: '', contactName: '', email: '', phone: '', bin: '', address: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const save = async () => {
    try {
      await api.post('/clients', { ...form, email: form.email || undefined });
      toast.success('Клиент добавлен');
      onDone();
      setForm({ companyName: '', contactName: '', email: '', phone: '', bin: '', address: '' });
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Новый клиент" footer={<><button className="btn-ghost" onClick={onClose}>Отмена</button><button className="btn-primary" onClick={save}>Создать</button></>}>
      <div className="space-y-3">
        <Field label="Компания"><input className="input" value={form.companyName} onChange={set('companyName')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Контакт"><input className="input" value={form.contactName} onChange={set('contactName')} /></Field>
          <Field label="Телефон"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><input className="input" value={form.email} onChange={set('email')} /></Field>
          <Field label="БИН/ИНН"><input className="input" value={form.bin} onChange={set('bin')} /></Field>
        </div>
        <Field label="Адрес"><input className="input" value={form.address} onChange={set('address')} /></Field>
      </div>
    </Modal>
  );
}

function DebtModal({ client, onClose, onDone }: { client: Client | null; onClose: () => void; onDone: () => void }) {
  const [debt, setDebt] = useState(client?.debt ?? 0);
  const [blocked, setBlocked] = useState(client?.creditBlocked ?? false);
  const save = async () => {
    if (!client) return;
    try {
      await api.patch(`/clients/${client.id}`, { debt, creditBlocked: blocked });
      toast.success('Сохранено');
      onDone();
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  return (
    <Modal
      open={!!client}
      onClose={onClose}
      title={`Дебиторка: ${client?.companyName ?? ''}`}
      footer={<><button className="btn-ghost" onClick={onClose}>Отмена</button><button className="btn-primary" onClick={save}>Сохранить</button></>}
    >
      <div className="space-y-3">
        <Field label="Сумма долга"><input className="input" type="number" min={0} value={debt} onChange={(e) => setDebt(Number(e.target.value))} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} className="h-4 w-4 accent-[#7C6CF6]" />
          Заблокировать по задолженности
        </label>
      </div>
    </Modal>
  );
}
