import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShieldCheck, Upload, Download, PenLine, Plus, Trash2, Wallet,
  History as HistoryIcon, Building2, AlertTriangle, CheckCircle2, X,
} from 'lucide-react';
import { Page } from '../components/PageHeader';
import { PageLoader, EmptyState, Modal, Field } from '../components/ui';
import { StatusBadge, PriorityDot, RoleBadge, ProductionPriorityBadge } from '../components/badges';
import { StatusTracker } from '../components/StatusTracker';
import {
  useOrder, useMeta, useProducts, useTransition, useCreditCheck, useUpdatePayment,
  useUploadDocument, useSignSpec, useCreateSpec, useCreateContract, useSignContract, useUpdateClaim,
  useCreateClaim,
} from '../lib/queries';
import { api, apiError, fileHref } from '../lib/api';
import { toast } from '../components/toast';
import { fmtDate, fmtDateTime, fmtMoney, fmtVolume } from '../lib/format';
import { useAuth } from '../lib/store';
import { useQueryClient } from '@tanstack/react-query';
import type { OrderStatus } from '../lib/types';

const DOC_TYPE_OPTIONS = ['TTN', 'UPD', 'ACT', 'INVOICE', 'OTHER'];

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user)!;
  const isStaff = user.role !== 'CLIENT';

  const { data: order, isLoading, isError } = useOrder(id);
  const { data: meta } = useMeta();
  const { data: products = [] } = useProducts();

  const transition = useTransition();
  const creditCheck = useCreditCheck();
  const updatePayment = useUpdatePayment();
  const uploadDoc = useUploadDocument();
  const signSpec = useSignSpec();
  const createSpec = useCreateSpec();
  const createContract = useCreateContract();
  const signContract = useSignContract();
  const updateClaim = useUpdateClaim();
  const createClaim = useCreateClaim();

  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState('TTN');
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState('');
  const [specOpen, setSpecOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimText, setClaimText] = useState('');

  if (isLoading || !meta) return <PageLoader />;
  if (isError || !order)
    return (
      <Page>
        <EmptyState title="Заявка недоступна" hint="Возможно, у вас нет прав на её просмотр" />
      </Page>
    );

  const allowed = (meta.transitions[order.status] ?? []).filter(
    (tr) => user.role === 'ADMIN' || tr.roles.includes(user.role),
  );
  const itemsTotal = order.items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);

  const move = (to: OrderStatus) => {
    if (to === 'REJECTED') { setReject(true); setReason(''); return; }
    if (to === 'CLAIM') { setClaimOpen(true); setClaimText(''); return; }
    transition.mutate(
      { id: order.id, to },
      {
        onSuccess: () => toast.success(`Статус → ${meta.statusMeta[to].label}`),
        onError: (e) => toast.error(apiError(e, 'Переход недоступен')),
      },
    );
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadDoc.mutate(
      { orderId: order.id, type: docType, file },
      {
        onSuccess: () => toast.success('Документ загружен'),
        onError: (err) => toast.error(apiError(err)),
      },
    );
    if (fileRef.current) fileRef.current.value = '';
  };

  const unblockClient = async () => {
    try {
      await api.post(`/clients/${order.client.id}/unblock`);
      toast.success('Клиент разблокирован, долг обнулён');
      qc.invalidateQueries();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const addContract = () => {
    const number = `ДГ-${order.number}`;
    createContract.mutate(
      { orderId: order.id, number },
      { onSuccess: () => toast.success('Договор создан'), onError: (e) => toast.error(apiError(e)) },
    );
  };

  return (
    <Page>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-muted hover:text-white">
        <ArrowLeft size={16} /> Назад
      </button>

      {/* Шапка */}
      <div className="card mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Заявка #{order.number}</h1>
              <StatusBadge status={order.status} />
              <PriorityDot priority={order.priority} withLabel />
              <ProductionPriorityBadge value={order.productionPriority} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {order.client.companyName}
              {order.route && <> · {order.route}</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="chip bg-panel-2 text-slate-300">
              <Wallet size={13} /> {meta.paymentTermLabels[order.paymentTerm]} · {meta.paymentStatusLabels[order.paymentStatus]}
            </span>
            <span className="chip bg-panel-2 text-slate-300">Создана {fmtDate(order.createdAt)}</span>
          </div>
        </div>

        {order.rejectionReason && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            <AlertTriangle size={16} /> Причина отклонения: {order.rejectionReason}
          </div>
        )}

        <div className="mt-5">
          <StatusTracker status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Основная колонка */}
        <div className="space-y-5 lg:col-span-2">
          {/* Позиции */}
          <Section title="Позиции заявки">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-2">
                    <th className="py-2 pr-4 font-medium">Номенклатура</th>
                    <th className="py-2 pr-4 font-medium">Кол-во</th>
                    {isStaff && <th className="py-2 pr-4 font-medium">Цена</th>}
                    {isStaff && <th className="py-2 font-medium">Сумма</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {order.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2.5 pr-4 text-slate-200">{it.product?.name ?? '—'}</td>
                      <td className="py-2.5 pr-4 text-muted">{fmtVolume(it.quantity, it.unit)}</td>
                      {isStaff && <td className="py-2.5 pr-4 text-muted">{fmtMoney(it.pricePerUnit)}</td>}
                      {isStaff && <td className="py-2.5 font-medium text-slate-200">{fmtMoney(it.quantity * it.pricePerUnit)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isStaff && (
              <div className="mt-3 flex justify-end border-t border-border pt-3 text-sm">
                <span className="text-muted">Итого:&nbsp;</span>
                <span className="font-bold text-white">{fmtMoney(itemsTotal)}</span>
              </div>
            )}
          </Section>

          {/* Спецификации */}
          <Section
            title="Спецификации"
            action={
              user.role === 'MANAGER' || user.role === 'ADMIN' ? (
                <button onClick={() => setSpecOpen(true)} className="btn-soft px-3 py-1.5 text-xs"><Plus size={14} /> Создать</button>
              ) : undefined
            }
          >
            {!order.specifications?.length ? (
              <EmptyState title="Нет спецификаций" />
            ) : (
              <div className="space-y-2">
                {order.specifications.map((sp) => (
                  <div key={sp.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-elevated px-3 py-2.5">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{sp.number}</div>
                      <div className="text-xs text-muted">{fmtMoney(sp.total)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <SignChip label="Менеджер" signed={sp.managerSigned} />
                      <SignChip label="Клиент" signed={sp.clientSigned} />
                      {((user.role === 'MANAGER' && !sp.managerSigned) || (user.role === 'CLIENT' && !sp.clientSigned)) && (
                        <button
                          onClick={() => signSpec.mutate(sp.id, { onSuccess: () => toast.success('Подписано') })}
                          className="btn-primary px-2.5 py-1 text-xs"
                        >
                          <PenLine size={13} /> Подписать
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Договоры */}
          <Section
            title="Договоры"
            action={
              user.role === 'MANAGER' || user.role === 'ADMIN' ? (
                <button onClick={addContract} className="btn-soft px-3 py-1.5 text-xs"><Plus size={14} /> Создать</button>
              ) : undefined
            }
          >
            {!order.contracts?.length ? (
              <EmptyState title="Нет договоров" />
            ) : (
              <div className="space-y-2">
                {order.contracts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-elevated px-3 py-2.5">
                    <div className="text-sm font-medium text-slate-100">{c.number}</div>
                    <div className="flex items-center gap-2">
                      <SignChip label="Менеджер" signed={c.managerSigned} />
                      <SignChip label="Клиент" signed={c.clientSigned} />
                      {((user.role === 'MANAGER' && !c.managerSigned) || (user.role === 'CLIENT' && !c.clientSigned)) && (
                        <button onClick={() => signContract.mutate(c.id, { onSuccess: () => toast.success('Подписано') })} className="btn-primary px-2.5 py-1 text-xs">
                          <PenLine size={13} /> Подписать
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Документы */}
          <Section
            title="Документы"
            action={
              <div className="flex items-center gap-2">
                <select className="input h-8 w-28 py-1 text-xs" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPE_OPTIONS.filter((t) => isStaff || t === 'ACT').map((t) => (
                    <option key={t} value={t}>{meta.documentTypes[t]}</option>
                  ))}
                </select>
                <input ref={fileRef} type="file" className="hidden" onChange={onUpload} />
                <button onClick={() => fileRef.current?.click()} className="btn-soft px-3 py-1.5 text-xs" disabled={uploadDoc.isPending}>
                  <Upload size={14} /> Загрузить
                </button>
              </div>
            }
          >
            {!order.documents?.length ? (
              <EmptyState title="Документов нет" hint="ТТН, УПД, акт, счёт" />
            ) : (
              <div className="space-y-2">
                {order.documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-elevated px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="chip bg-accent/15 text-accent">{meta.documentTypes[d.type] ?? d.type}</span>
                      <span className="text-sm text-slate-200">{d.name}</span>
                    </div>
                    <a href={fileHref(d.fileUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-accent hover:underline">
                      <Download size={14} /> Скачать
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Рекламации */}
          {!!order.claims?.length && (
            <Section title="Рекламации">
              <div className="space-y-2">
                {order.claims.map((cl) => (
                  <div key={cl.id} className="rounded-lg border border-border bg-bg-elevated p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="chip bg-rose-500/15 text-rose-300">{cl.status}</span>
                      <span className="text-xs text-muted-2">{fmtDate(cl.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-200">{cl.description}</p>
                    {(user.role === 'MANAGER' || user.role === 'ADMIN') && cl.status !== 'RESOLVED' && (
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => updateClaim.mutate({ id: cl.id, status: 'RESOLVED' }, { onSuccess: () => toast.success('Рекламация решена') })} className="btn-soft px-2.5 py-1 text-xs">
                          Решить
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* История */}
          <Section title="История переходов" icon={<HistoryIcon size={16} />}>
            {!order.history?.length ? (
              <EmptyState title="История пуста" />
            ) : (
              <ol className="relative space-y-3 border-l border-border pl-5">
                {order.history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-accent ring-4 ring-accent/15" />
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {h.fromStatus && <StatusBadge status={h.fromStatus} />}
                      <span className="text-muted-2">→</span>
                      <StatusBadge status={h.toStatus} />
                    </div>
                    <div className="mt-1 text-xs text-muted-2">
                      {fmtDateTime(h.createdAt)} {h.actor && <>· {h.actor.fullName}</>}
                      {h.note && <> · {h.note}</>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>

        {/* Сайдбар */}
        <div className="space-y-5">
          {/* Действия */}
          <Section title="Действия">
            <div className="space-y-2">
              {order.status === 'CREDIT_CHECK' && (user.role === 'MANAGER' || user.role === 'ACCOUNTANT' || user.role === 'ADMIN') && (
                <button
                  onClick={() => creditCheck.mutate(order.id, { onSuccess: () => toast.success('Дебиторка проверена'), onError: (e) => toast.error(apiError(e)) })}
                  className="btn-primary w-full"
                >
                  <ShieldCheck size={16} /> Проверить дебиторку
                </button>
              )}
              {allowed.length === 0 ? (
                <p className="text-sm text-muted-2">Нет доступных переходов для вашей роли на этом этапе.</p>
              ) : (
                allowed.map((tr) => (
                  <button
                    key={tr.to}
                    onClick={() => move(tr.to)}
                    className={tr.to === 'REJECTED' ? 'btn-ghost w-full !text-rose-300 hover:!bg-rose-500/10' : 'btn-soft w-full'}
                  >
                    {meta.statusMeta[tr.to].label}
                  </button>
                ))
              )}
              {user.role === 'CLIENT' && (
                <button
                  onClick={() => { setClaimOpen(true); setClaimText(''); }}
                  className="btn-ghost w-full !text-rose-300 hover:!bg-rose-500/10"
                >
                  <AlertTriangle size={16} /> Подать рекламацию
                </button>
              )}
            </div>
          </Section>

          {/* Оплата */}
          {(user.role === 'ACCOUNTANT' || user.role === 'MANAGER' || user.role === 'ADMIN') && (
            <Section title="Оплата">
              <PaymentControl
                current={order.paymentStatus}
                onApply={(status) =>
                  updatePayment.mutate({ id: order.id, status }, { onSuccess: () => toast.success('Оплата обновлена'), onError: (e) => toast.error(apiError(e)) })
                }
                labels={meta.paymentStatusLabels}
              />
            </Section>
          )}

          {/* Инфо */}
          <Section title="Информация">
            <dl className="space-y-2.5 text-sm">
              <Info label="Менеджер" value={order.manager?.fullName ?? '—'} />
              <Info label="Завод" value={order.factory?.name ?? '—'} />
              <Info label="Перевозчик" value={order.carrier?.name ?? '—'} />
              <Info label="Желаемая дата" value={fmtDate(order.desiredDate)} />
              <Info label="Запуск в произв." value={fmtDate(order.productionStartDate)} />
              {order.closedAt && <Info label="Закрыта" value={fmtDate(order.closedAt)} />}
            </dl>
          </Section>

          {/* Клиент */}
          {isStaff && (
            <Section title="Клиент" icon={<Building2 size={16} />}>
              <dl className="space-y-2.5 text-sm">
                <Info label="Компания" value={order.client.companyName} />
                <Info label="Контакт" value={order.client.contactName ?? '—'} />
                <Info label="Телефон" value={order.client.phone ?? '—'} />
                <Info label="Дебиторка" value={fmtMoney(order.client.debt)} />
              </dl>
              {order.client.creditBlocked && (
                <div className="mt-3">
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    <AlertTriangle size={14} /> Клиент заблокирован по долгу
                  </div>
                  {(user.role === 'ACCOUNTANT' || user.role === 'ADMIN') && (
                    <button onClick={unblockClient} className="btn-soft w-full text-xs">Разблокировать (обнулить долг)</button>
                  )}
                </div>
              )}
            </Section>
          )}
        </div>
      </div>

      {/* Модал отклонения */}
      <Modal
        open={reject}
        onClose={() => setReject(false)}
        title={`Отклонить заявку #${order.number}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setReject(false)}>Отмена</button>
            <button
              className="btn-primary !bg-rose-500 hover:!bg-rose-600"
              onClick={() =>
                reason.trim()
                  ? transition.mutate(
                      { id: order.id, to: 'REJECTED', reason },
                      { onSuccess: () => { toast.success('Отклонено'); setReject(false); }, onError: (e) => toast.error(apiError(e)) },
                    )
                  : toast.error('Укажите причину')
              }
            >
              Отклонить
            </button>
          </>
        }
      >
        <Field label="Причина отклонения">
          <textarea className="input min-h-[90px] resize-none" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </Modal>

      <SpecModal
        open={specOpen}
        onClose={() => setSpecOpen(false)}
        products={products}
        onCreate={(payload) =>
          createSpec.mutate(
            { orderId: order.id, ...payload },
            { onSuccess: () => { toast.success('Спецификация создана'); setSpecOpen(false); }, onError: (e) => toast.error(apiError(e)) },
          )
        }
        defaultNumber={`СП-${order.number}`}
      />

      {/* Модал рекламации */}
      <Modal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        title={`Рекламация по заявке #${order.number}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setClaimOpen(false)}>Отмена</button>
            <button
              className="btn-primary"
              onClick={() =>
                claimText.trim().length >= 5
                  ? createClaim.mutate(
                      { orderId: order.id, description: claimText },
                      { onSuccess: () => { toast.success('Рекламация отправлена'); setClaimOpen(false); }, onError: (e) => toast.error(apiError(e)) },
                    )
                  : toast.error('Опишите проблему подробнее')
              }
            >
              Отправить
            </button>
          </>
        }
      >
        <Field label="Опишите проблему">
          <textarea
            className="input min-h-[100px] resize-none"
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            placeholder="Например: повреждение части паллет при доставке…"
          />
        </Field>
      </Modal>
    </Page>
  );
}

// ── Вспомогательные компоненты ──

function Section({ title, children, action, icon }: { title: string; children: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">{icon}{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-slate-200">{value}</dd>
    </div>
  );
}

function SignChip({ label, signed }: { label: string; signed: boolean }) {
  return (
    <span className={`chip text-[11px] ${signed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-muted'}`}>
      {signed ? <CheckCircle2 size={12} /> : <X size={12} />} {label}
    </span>
  );
}

function PaymentControl({ current, onApply, labels }: { current: string; onApply: (s: string) => void; labels: Record<string, string> }) {
  const [val, setVal] = useState(current);
  return (
    <div className="space-y-2">
      <select className="input" value={val} onChange={(e) => setVal(e.target.value)}>
        {['UNPAID', 'PARTIAL', 'PAID', 'POSTPAY_APPROVED'].map((s) => (
          <option key={s} value={s}>{labels[s]}</option>
        ))}
      </select>
      <button className="btn-primary w-full" onClick={() => onApply(val)} disabled={val === current}>Применить</button>
    </div>
  );
}

interface SpecItemRow { productId: string; name: string; quantity: number; price: number }

function SpecModal({
  open, onClose, products, onCreate, defaultNumber,
}: {
  open: boolean;
  onClose: () => void;
  products: { id: string; name: string; pricePerUnit: number }[];
  onCreate: (p: { number: string; items: SpecItemRow[] }) => void;
  defaultNumber: string;
}) {
  const [number, setNumber] = useState(defaultNumber);
  const [rows, setRows] = useState<SpecItemRow[]>([{ productId: '', name: '', quantity: 1, price: 0 }]);

  const setRow = (i: number, patch: Partial<SpecItemRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const total = rows.reduce((s, r) => s + r.quantity * r.price, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Новая спецификация"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Отмена</button>
          <button
            className="btn-primary"
            onClick={() => onCreate({ number, items: rows.filter((r) => r.name && r.quantity > 0) })}
          >
            Создать
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Номер спецификации">
          <input className="input" value={number} onChange={(e) => setNumber(e.target.value)} />
        </Field>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <select
                  className="input"
                  value={r.productId}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    setRow(i, { productId: e.target.value, name: p?.name ?? '', price: p?.pricePerUnit ?? 0 });
                  }}
                >
                  <option value="">Выберите номенклатуру</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <input className="input w-20" type="number" min={1} value={r.quantity} onChange={(e) => setRow(i, { quantity: Number(e.target.value) })} />
              <input className="input w-28" type="number" min={0} value={r.price} onChange={(e) => setRow(i, { price: Number(e.target.value) })} />
              <button className="btn-ghost px-2 py-2" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
            </div>
          ))}
          <button className="btn-soft text-xs" onClick={() => setRows((rs) => [...rs, { productId: '', name: '', quantity: 1, price: 0 }])}>
            <Plus size={14} /> Добавить позицию
          </button>
        </div>
        <div className="flex justify-end border-t border-border pt-3 text-sm">
          <span className="text-muted">Итого:&nbsp;</span><span className="font-bold text-white">{fmtMoney(total)}</span>
        </div>
      </div>
    </Modal>
  );
}
