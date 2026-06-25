import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, KeyRound, Power } from 'lucide-react';
import { Page, PageHeader } from '../../components/PageHeader';
import { PageLoader, EmptyState, Modal, Field } from '../../components/ui';
import { RoleBadge } from '../../components/badges';
import { useUsers, useMeta } from '../../lib/queries';
import { api, apiError } from '../../lib/api';
import { toast } from '../../components/toast';
import { fmtDate } from '../../lib/format';
import type { Role, User } from '../../lib/types';

export default function UsersPage() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useUsers();
  const { data: meta } = useMeta();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);

  if (isLoading || !meta) return <PageLoader />;
  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const toggleActive = async (u: User) => {
    try {
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
      invalidate();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <Page>
      <PageHeader
        title="Пользователи"
        subtitle="Управление сотрудниками и ролями"
        actions={<button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Добавить сотрудника</button>}
      />

      {users.length === 0 ? (
        <EmptyState title="Нет пользователей" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-2">
                  <th className="px-4 py-3 font-medium">ФИО</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Роль</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Создан</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="transition hover:bg-panel-2/30">
                    <td className="px-4 py-3 font-medium text-slate-100">{u.fullName}</td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="hidden px-4 py-3 text-muted md:table-cell">{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`chip ${u.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-muted'}`}>
                        {u.isActive ? 'Активен' : 'Отключён'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setResetUser(u)} className="rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-white" title="Сбросить пароль"><KeyRound size={15} /></button>
                        <button onClick={() => toggleActive(u)} className="rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-white" title="Вкл/выкл"><Power size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} roles={meta.roles} roleLabel={(r) => meta.roleMeta[r].label} onDone={() => { invalidate(); setCreateOpen(false); }} />
      <ResetModal key={resetUser?.id ?? 'none'} user={resetUser} onClose={() => setResetUser(null)} />
    </Page>
  );
}

function CreateUserModal({ open, onClose, onDone, roles, roleLabel }: { open: boolean; onClose: () => void; onDone: () => void; roles: Role[]; roleLabel: (r: Role) => string }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'MANAGER' as Role, phone: '' });
  const save = async () => {
    try {
      await api.post('/users', form);
      toast.success('Сотрудник добавлен');
      onDone();
      setForm({ fullName: '', email: '', password: '', role: 'MANAGER', phone: '' });
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Новый сотрудник" footer={<><button className="btn-ghost" onClick={onClose}>Отмена</button><button className="btn-primary" onClick={save}>Создать</button></>}>
      <div className="space-y-3">
        <Field label="ФИО"><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Телефон"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Роль">
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {roles.filter((r) => r !== 'CLIENT').map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </Field>
          <Field label="Пароль"><input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function ResetModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [pwd, setPwd] = useState('');
  const save = async () => {
    if (!user) return;
    try {
      await api.post(`/users/${user.id}/reset-password`, { newPassword: pwd });
      toast.success('Пароль сброшен');
      onClose();
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  return (
    <Modal open={!!user} onClose={onClose} title={`Сброс пароля: ${user?.fullName ?? ''}`} footer={<><button className="btn-ghost" onClick={onClose}>Отмена</button><button className="btn-primary" onClick={save} disabled={pwd.length < 6}>Сохранить</button></>}>
      <Field label="Новый пароль"><input className="input" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Минимум 6 символов" /></Field>
    </Modal>
  );
}
