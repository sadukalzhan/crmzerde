import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { Field } from '../components/ui';
import { useAuth } from '../lib/store';
import { apiError } from '../lib/api';
import { toast } from '../components/toast';
import type { Role } from '../lib/types';

const DEMO: { label: string; email: string; pass: string }[] = [
  { label: 'Админ', email: 'admin@crm.kz', pass: 'admin123' },
  { label: 'Менеджер', email: 'manager@crm.kz', pass: 'manager123' },
  { label: 'Завод', email: 'factory@crm.kz', pass: 'factory123' },
  { label: 'Склад', email: 'warehouse@crm.kz', pass: 'warehouse123' },
  { label: 'Логист', email: 'logist@crm.kz', pass: 'logist123' },
  { label: 'Бухгалтер', email: 'accountant@crm.kz', pass: 'accountant123' },
  { label: 'Клиент', email: 'client@crm.kz', pass: 'client123' },
];

export function homeForRole(role: Role): string {
  return role === 'CLIENT' ? '/my-orders' : '/dashboard';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('manager@crm.kz');
  const [password, setPassword] = useState('manager123');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Добро пожаловать, ${user.fullName.split(' ')[0]}!`);
      navigate(homeForRole(user.role));
    } catch (err) {
      toast.error(apiError(err, 'Не удалось войти'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Вход" subtitle="Войдите в систему управления заявками">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label="Пароль">
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-accent hover:underline">Забыли пароль?</Link>
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          <LogIn size={18} /> {loading ? 'Вход…' : 'Войти'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-2">
        <div className="h-px flex-1 bg-border" /> демо-доступ <div className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DEMO.map((d) => (
          <button
            key={d.email}
            onClick={() => { setEmail(d.email); setPassword(d.pass); }}
            className="rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 text-xs text-muted transition hover:border-accent/50 hover:text-white"
          >
            {d.label}
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Нет аккаунта?{' '}
        <Link to="/register" className="font-medium text-accent hover:underline">Регистрация клиента</Link>
      </p>
    </AuthShell>
  );
}
