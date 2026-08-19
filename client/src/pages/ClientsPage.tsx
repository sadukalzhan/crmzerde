import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { PageLoader, EmptyState, Modal, Field } from '../components/ui';
import { useClients, useDeleteClient, useUpdateClient } from '../lib/queries';
import { api, apiError } from '../lib/api';
import { toast } from '../components/toast';
import { useAuth } from '../lib/store';
import type { Client } from '../lib/types';

export default function ClientsPage() {
  const user = useAuth((s) => s.user)!;
  const qc = useQueryClient();
  const { data: clients = [], isLoading } = useClients();
  const deleteClient = useDeleteClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [fullEdit, setFullEdit] = useState<Client | null>(null);
  const [del, setDel] = useState<Client | null>(null);

  if (isLoading) return <PageLoader />;
  const isAdmin = user.role === 'ADMIN';
  const canCreate = user.role === 'MANAGER' || user.role === 'ADMIN';
  const showActions = isAdmin;

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
                  {showActions && <th className="px-4 py-3 font-medium" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => (
                  <tr key={c.id} className="transition hover:bg-panel-2/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{c.companyName}</div>
                    </td>
                    <td className="px-4 py-3 text-muted">{c.contactName ?? '—'}</td>
                    <td className="hidden px-4 py-3 text-muted md:table-cell">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{c._count?.orders ?? 0}</td>
                    {showActions && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {isAdmin && (
                            <>
                              <button className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-white" title="Изменить" onClick={() => setFullEdit(c)}><Pencil size={15} /></button>
                              <button className="rounded-lg p-1.5 text-muted hover:bg-rose-500/10 hover:text-rose-300" title="Удалить" onClick={() => setDel(c)}><Trash2 size={15} /></button>
                            </>
                          )}
                        </div>
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
      {isAdmin && fullEdit && (
        <EditClientModal client={fullEdit} onClose={() => setFullEdit(null)} onDone={() => { qc.invalidateQueries({ queryKey: ['clients'] }); setFullEdit(null); }} />
      )}
      <Modal
        open={!!del}
        onClose={() => setDel(null)}
        title={`Удалить клиента «${del?.companyName ?? ''}»?`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDel(null)}>Отмена</button>
            <button
              className="btn-primary !bg-rose-500 hover:!bg-rose-600"
              onClick={() =>
                del && deleteClient.mutate(del.id, {
                  onSuccess: () => { toast.success('Клиент удалён'); setDel(null); },
                  onError: (e) => toast.error(apiError(e)),
                })
              }
            >
              Удалить
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">Клиент будет удалён. Если у клиента есть заявки — удаление заблокировано (сначала удалите заявки).</p>
      </Modal>
    </Page>
  );
}

function EditClientModal({ client, onClose, onDone }: { client: Client; onClose: () => void; onDone: () => void }) {
  const update = useUpdateClient();
  const [form, setForm] = useState({
    companyName: client.companyName,
    contactName: client.contactName ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    bin: client.bin ?? '',
    address: client.address ?? '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const save = () =>
    update.mutate(
      { id: client.id, data: { ...form, email: form.email || null, contactName: form.contactName || null } },
      { onSuccess: () => { toast.success('Клиент обновлён'); onDone(); }, onError: (e) => toast.error(apiError(e)) },
    );
  return (
    <Modal open onClose={onClose} title={`Изменить: ${client.companyName}`} footer={<><button className="btn-ghost" onClick={onClose}>Отмена</button><button className="btn-primary" onClick={save}>Сохранить</button></>}>
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

