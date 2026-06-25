import { useState } from 'react';
import { KeyRound, Mail, Phone, User as UserIcon } from 'lucide-react';
import { Page, PageHeader } from '../components/PageHeader';
import { Field, Avatar } from '../components/ui';
import { RoleBadge } from '../components/badges';
import { api, apiError } from '../lib/api';
import { toast } from '../components/toast';
import { useAuth } from '../lib/store';

export default function ProfilePage() {
  const user = useAuth((s) => s.user)!;
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [loading, setLoading] = useState(false);

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Пароль изменён');
      setCurrent(''); setNew('');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <PageHeader title="Профиль" subtitle="Учётные данные и безопасность" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-4">
            <Avatar name={user.fullName} size={56} />
            <div>
              <div className="text-lg font-bold text-white">{user.fullName}</div>
              <div className="mt-1"><RoleBadge role={user.role} /></div>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-muted"><Mail size={16} /> <span className="text-slate-200">{user.email}</span></div>
            {user.phone && <div className="flex items-center gap-3 text-muted"><Phone size={16} /> <span className="text-slate-200">{user.phone}</span></div>}
            {user.clientProfile && (
              <div className="flex items-center gap-3 text-muted"><UserIcon size={16} /> <span className="text-slate-200">{user.clientProfile.companyName}</span></div>
            )}
          </dl>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><KeyRound size={16} /> Смена пароля</h3>
          <form onSubmit={change} className="space-y-4">
            <Field label="Текущий пароль">
              <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
            </Field>
            <Field label="Новый пароль">
              <input className="input" type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} required minLength={6} />
            </Field>
            <button className="btn-primary" disabled={loading}>{loading ? 'Сохранение…' : 'Изменить пароль'}</button>
          </form>
        </div>
      </div>
    </Page>
  );
}
