import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { Field } from '../components/ui';
import { api, apiError } from '../lib/api';
import { toast } from '../components/toast';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      toast.success('Пароль изменён, войдите заново');
      navigate('/login');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Новый пароль" subtitle="Введите токен и новый пароль">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Токен сброса">
          <input className="input" value={token} onChange={(e) => setToken(e.target.value)} required />
        </Field>
        <Field label="Новый пароль">
          <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
        </Field>
        <button className="btn-primary w-full" disabled={loading}>
          <KeyRound size={18} /> {loading ? 'Сохранение…' : 'Сменить пароль'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/login" className="font-medium text-accent hover:underline">← Вернуться ко входу</Link>
      </p>
    </AuthShell>
  );
}
