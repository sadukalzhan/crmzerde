import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { Field } from '../components/ui';
import { api, apiError } from '../lib/api';
import { toast } from '../components/toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setDevToken(data.devToken ?? null);
      toast.success('Если email существует, мы отправили инструкцию');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Восстановление пароля" subtitle="Укажите email — пришлём ссылку для сброса">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <button className="btn-primary w-full" disabled={loading}>
          <Mail size={18} /> {loading ? 'Отправка…' : 'Отправить ссылку'}
        </button>
      </form>

      {devToken && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <p className="mb-1 font-semibold">Демо-режим (без почтового сервиса):</p>
          <Link to={`/reset-password?token=${devToken}`} className="break-all underline">
            Перейти к сбросу пароля →
          </Link>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/login" className="font-medium text-accent hover:underline">← Вернуться ко входу</Link>
      </p>
    </AuthShell>
  );
}
