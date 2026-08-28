import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Page, PageHeader } from '../../components/PageHeader';
import { PageLoader, Field } from '../../components/ui';
import { useSettings, useClients, useUsers } from '../../lib/queries';
import { api, apiError } from '../../lib/api';
import { toast } from '../../components/toast';
import type { AppSettings } from '../../lib/types';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useSettings();
  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers();
  const [form, setForm] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  // Закреплять можно за менеджерами и руководителем отдела продаж.
  const managers = users.filter((u) => u.role === 'MANAGER' || u.role === 'SALES_HEAD');

  if (isLoading || !form) return <PageLoader />;

  const save = async () => {
    try {
      await api.patch('/settings', form);
      toast.success('Настройки сохранены');
      qc.invalidateQueries({ queryKey: ['settings'] });
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <Page>
      <PageHeader title="Настройки" subtitle="Бренд, локализация и закрепление контрагентов" />

      <div className="card max-w-xl p-6">
        <div className="space-y-4">
          <Field label="Название бренда">
            <input className="input" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Валюта">
              <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="KZT">Тенге (₸)</option>
                <option value="RUB">Рубли (₽)</option>
                <option value="USD">Доллары ($)</option>
              </select>
            </Field>
            <Field label="Язык">
              <select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                <option value="ru">Русский</option>
                <option value="en">English</option>
                <option value="kz">Қазақша</option>
              </select>
            </Field>
          </div>
          <Field label="Формат даты">
            <input className="input" value={form.dateFormat} onChange={(e) => setForm({ ...form, dateFormat: e.target.value })} />
          </Field>
          <button className="btn-primary" onClick={save}><Save size={16} /> Сохранить</button>
        </div>
      </div>

      {/* Закрепление контрагентов за менеджерами */}
      <div className="card mt-5 p-6">
        <h3 className="text-sm font-semibold text-white">Контрагенты и менеджеры</h3>
        <p className="mt-1 text-xs text-muted">
          Менеджер видит заявки и карточки только тех контрагентов, что закреплены за ним.
          Незакреплённый контрагент не виден никому, кроме руководителя и админа.
        </p>

        {clients.length === 0 ? (
          <p className="mt-4 text-sm text-muted-2">Контрагентов пока нет.</p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {clients.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-100">{c.companyName}</div>
                  <div className="text-xs text-muted-2">
                    {c.contactName ?? '—'} · заявок: {c._count?.orders ?? 0}
                  </div>
                </div>
                <select
                  className="input w-56"
                  value={c.managerId ?? ''}
                  onChange={async (e) => {
                    try {
                      await api.patch(`/clients/${c.id}`, { managerId: e.target.value || null });
                      toast.success('Закрепление обновлено');
                      qc.invalidateQueries({ queryKey: ['clients'] });
                    } catch (err) {
                      toast.error(apiError(err));
                    }
                  }}
                >
                  <option value="">Не закреплён</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

    </Page>
  );
}
