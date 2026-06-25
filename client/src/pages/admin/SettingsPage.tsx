import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Page, PageHeader } from '../../components/PageHeader';
import { PageLoader, Field } from '../../components/ui';
import { useSettings } from '../../lib/queries';
import { api, apiError } from '../../lib/api';
import { toast } from '../../components/toast';
import type { AppSettings } from '../../lib/types';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useSettings();
  const [form, setForm] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

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
      <PageHeader title="Настройки" subtitle="Бренд, валюта и локализация" />

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
    </Page>
  );
}
