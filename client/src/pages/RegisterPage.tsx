import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { Field } from '../components/ui';
import { useAuth } from '../lib/store';
import { apiError } from '../lib/api';
import { toast } from '../components/toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuth((s) => s.register);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', companyName: '', phone: '', bin: '', address: '' });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Аккаунт создан');
      navigate('/my-orders');
    } catch (err) {
      toast.error(apiError(err, 'Не удалось зарегистрироваться'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Регистрация клиента" subtitle="Создайте аккаунт, чтобы оформлять и отслеживать заявки">
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="ФИО / контактное лицо">
          <input className="input" value={form.fullName} onChange={set('fullName')} required />
        </Field>
        <Field label="Компания">
          <input className="input" value={form.companyName} onChange={set('companyName')} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={set('email')} required />
          </Field>
          <Field label="Телефон">
            <input className="input" value={form.phone} onChange={set('phone')} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="БИН/ИНН">
            <input className="input" value={form.bin} onChange={set('bin')} />
          </Field>
          <Field label="Пароль">
            <input className="input" type="password" value={form.password} onChange={set('password')} required minLength={6} />
          </Field>
        </div>
        <Field label="Адрес">
          <input className="input" value={form.address} onChange={set('address')} />
        </Field>
        <button className="btn-primary w-full" disabled={loading}>
          <UserPlus size={18} /> {loading ? 'Создание…' : 'Зарегистрироваться'}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">Войти</Link>
      </p>
    </AuthShell>
  );
}
