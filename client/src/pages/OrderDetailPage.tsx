import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, Download, PenLine, Plus, Trash2, Wallet,
  History as HistoryIcon, Building2, AlertTriangle, CheckCircle2, X, Pencil,
} from 'lucide-react';
import { Page } from '../components/PageHeader';
import { PageLoader, EmptyState, Modal, Field } from '../components/ui';
import { StatusBadge, RoleBadge } from '../components/badges';
import { StatusTracker } from '../components/StatusTracker';
import {
  useOrder, useMeta, useProducts, useTransition, useUpdatePayment,
  useAvailability, useReleaseReservation,
  useUploadDocument, useCreateSpec, useCreateContract, useSignContract,
  useUpdateOrder, useDeleteOrder, useUsers, useCarriers,
} from '../lib/queries';
import { api, apiError, fileHref } from '../lib/api';
import { toast } from '../components/toast';
import { fmtDate, fmtDateTime, fmtMoney, fmtM2 } from '../lib/format';
import { boxes, pallets } from '../lib/packaging';
import { useAuth } from '../lib/store';
import { cn } from '../lib/cn';
import { useQueryClient } from '@tanstack/react-query';
import type { AvailabilityLine, Order, OrderItem, OrderStatus } from '../lib/types';


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
  // Регламент, п. 2-5: проверка остатков и резервов доступна только сотрудникам.
  const { data: availability } = useAvailability(isStaff ? id : undefined);
  const releaseReservation = useReleaseReservation();
  const updatePayment = useUpdatePayment();
  const uploadDoc = useUploadDocument();
  const createSpec = useCreateSpec();
  const createContract = useCreateContract();
  const signContract = useSignContract();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const isAdmin = user.role === 'ADMIN';

  const fileRef = useRef<HTMLInputElement>(null);
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState('');
  const [specOpen, setSpecOpen] = useState(false);
  const [adminEdit, setAdminEdit] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  // Подпись = выложенный скан: скачал PDF, подписал с печатью, загрузил обратно.
  const specFileRef = useRef<HTMLInputElement>(null);
  const [signingSpecId, setSigningSpecId] = useState<string | null>(null);

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

  // Печатная форма спецификации приходит с сервера готовым PDF.
  const downloadSpecPdf = async (id: string, number: string) => {
    try {
      const res = await api.get(`/specifications/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Спецификация-${number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const uploadSignedSpec = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !signingSpecId) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/specifications/${signingSpecId}/upload-signed`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Подписанная спецификация выложена');
      qc.invalidateQueries();
    } catch (err) {
      toast.error(apiError(err));
    }
    setSigningSpecId(null);
    if (specFileRef.current) specFileRef.current.value = '';
  };

  const move = (to: OrderStatus) => {
    if (to === 'REJECTED') { setReject(true); setReason(''); return; }
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
      { orderId: order.id, file },
      {
        onSuccess: () => toast.success('Документ загружен'),
        onError: (err) => toast.error(apiError(err)),
      },
    );
    if (fileRef.current) fileRef.current.value = '';
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
                    <th className="py-2 pr-4 font-medium">Сорт</th>
                    <th className="py-2 pr-4 font-medium">Объём (м² · кор. · под.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {order.items.map((it) => {
                    const fmt = it.product?.format ?? '60x60';
                    return (
                      <tr key={it.id}>
                        <td className="py-2.5 pr-4 text-slate-200">{it.product?.name ?? '—'}</td>
                        <td className="py-2.5 pr-4 text-muted">{it.grade}</td>
                        <td className="py-2.5 pr-4 text-muted">
                          {fmtM2(it.quantity)} · {boxes(it.quantity, fmt, it.grade)} кор. · {pallets(it.quantity, fmt, it.grade)} под.
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Остатки и резервы — Регламент, п. 2-5 */}
          {isStaff && availability && (
            <Section
              title="Остатки и резервы по позициям"
              action={
                <span
                  className={cn(
                    'chip',
                    availability.status === 'FULL'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : availability.status === 'PARTIAL'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-rose-500/15 text-rose-300',
                  )}
                >
                  {availability.status === 'FULL'
                    ? 'Хватает полностью'
                    : availability.status === 'PARTIAL'
                      ? 'Частично'
                      : 'Нет наличия'}
                </span>
              }
            >
              <div className="space-y-3">
                {availability.lines.map((line: AvailabilityLine) => (
                  <div key={`${line.productId}-${line.grade}`} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-slate-100">{line.name}</div>
                        <div className="text-xs text-muted">{line.grade}</div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs">
                        <span className="text-muted">Нужно: <b className="text-slate-200">{fmtM2(line.needed)}</b></span>
                        {line.reserved > 0 && (
                          <span className="text-muted">В резерве: <b className="text-mint">{fmtM2(line.reserved)}</b></span>
                        )}
                        <span className="text-muted">Свободно: <b className="text-slate-200">{fmtM2(line.free)}</b></span>
                        {/* Нехватка показывается только когда она есть: свой резерв
                            её закрывает, и раньше зарезервированный товар выглядел
                            как недостача. */}
                        {line.shortage > 0 && (
                          <span className="text-rose-300">Нехватка: <b>{fmtM2(line.shortage)}</b></span>
                        )}
                      </div>
                    </div>

                    {line.reservedBy.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        <div className="text-xs uppercase text-muted-2">В резерве у других заявок</div>
                        {line.reservedBy.map((h) => (
                          <div key={h.reservationId} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="text-muted">
                              <b className="text-slate-200">{fmtM2(h.quantity)}</b> · заявка #{h.orderNumber} · {h.clientName}
                              {h.managerName && ` · ${h.managerName}`}
                              {h.confirmedForShipment && (
                                <span className="chip ml-2 bg-sky-500/15 text-sky-300">Подтверждён под отгрузку</span>
                              )}
                              {h.sameClient && !h.confirmedForShipment && (
                                <span className="chip ml-2 bg-emerald-500/15 text-emerald-300">Тот же клиент</span>
                              )}
                            </div>
                            {(user.role === 'MANAGER' || user.role === 'ADMIN' || user.role === 'WAREHOUSE') && (
                              h.releasable ? (
                                <button
                                  className="btn-soft px-2.5 py-1 text-xs"
                                  onClick={() =>
                                    releaseReservation.mutate(
                                      { orderId: order.id, reservationId: h.reservationId },
                                      {
                                        onSuccess: () => toast.success('Резерв снят и перенесён на эту заявку'),
                                        onError: (e) => toast.error(apiError(e)),
                                      },
                                    )
                                  }
                                >
                                  Забрать на эту заявку
                                </button>
                              ) : (
                                <button
                                  className="btn-ghost px-2.5 py-1 text-xs"
                                  onClick={() =>
                                    releaseReservation.mutate(
                                      { orderId: order.id, reservationId: h.reservationId, request: true },
                                      {
                                        onSuccess: () => toast.success('Запрос на снятие резерва отправлен'),
                                        onError: (e) => toast.error(apiError(e)),
                                      },
                                    )
                                  }
                                >
                                  Запросить снятие
                                </button>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Спецификации */}
          <Section
            title="Спецификации"
            action={
              user.role === 'MANAGER' || user.role === 'SALES_HEAD' || user.role === 'ADMIN' ? (
                <button onClick={() => setSpecOpen(true)} className="btn-soft px-3 py-1.5 text-xs"><Plus size={14} /> Создать</button>
              ) : undefined
            }
          >
            <input ref={specFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={uploadSignedSpec} />
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
                      <button
                        onClick={() => downloadSpecPdf(sp.id, sp.number)}
                        className="btn-soft px-2.5 py-1 text-xs"
                        title="Скачать печатную форму"
                      >
                        <Download size={13} /> PDF
                      </button>
                      {/* Обе стороны видят обе подписанные версии: клиент скачивает
                          файл продавца, продавец — вернувшийся файл клиента. */}
                      {sp.managerFileUrl && (
                        <a
                          href={fileHref(sp.managerFileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-soft px-2.5 py-1 text-xs"
                          title="Скан с подписью продавца"
                        >
                          <Download size={13} /> От продавца
                        </a>
                      )}
                      {sp.clientFileUrl && (
                        <a
                          href={fileHref(sp.clientFileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-soft px-2.5 py-1 text-xs"
                          title="Скан с подписью клиента"
                        >
                          <Download size={13} /> От клиента
                        </a>
                      )}
                      {(((user.role === 'MANAGER' || user.role === 'SALES_HEAD' || user.role === 'ADMIN') && !sp.managerSigned) ||
                        (user.role === 'CLIENT' && sp.managerSigned && !sp.clientSigned)) && (
                        <button
                          onClick={() => { setSigningSpecId(sp.id); specFileRef.current?.click(); }}
                          className="btn-primary px-2.5 py-1 text-xs"
                        >
                          <Upload size={13} /> Выложить подписанную
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
                {/* Тип документа не выбирается — на отгрузке просто выкладывают файлы. */}
                <input ref={fileRef} type="file" className="hidden" onChange={onUpload} />
                <button onClick={() => fileRef.current?.click()} className="btn-soft px-3 py-1.5 text-xs" disabled={uploadDoc.isPending}>
                  <Upload size={14} /> Загрузить
                </button>
              </div>
            }
          >
            {!order.documents?.length ? (
              <EmptyState title="Документов нет" hint="Отгрузочные документы" />
            ) : (
              <div className="space-y-2">
                {order.documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-elevated px-3 py-2.5">
                    <div className="flex items-center gap-2">
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
              {isAdmin && (
                <>
                  <div className="my-1 border-t border-border" />
                  <button onClick={() => setAdminEdit(true)} className="btn-soft w-full"><Pencil size={15} /> Редактировать (админ)</button>
                  <button onClick={() => setDelOpen(true)} className="btn-ghost w-full !text-rose-300 hover:!bg-rose-500/10"><Trash2 size={15} /> Удалить заявку</button>
                </>
              )}
            </div>
          </Section>

          {/* Оплата */}
          {(user.role === 'MANAGER' || user.role === 'SALES_HEAD' || user.role === 'ADMIN') && (
            <Section title="Оплата">
              {/* Условие оплаты менеджер выбирает на согласовании. При авансе
                  заявка не уйдёт в отгрузку, пока оплата не отмечена как полученная. */}
              <div className="mb-3">
                <label className="label">Условие оплаты</label>
                <select
                  className="input"
                  value={order.paymentTerm}
                  onChange={(e) =>
                    updateOrder.mutate(
                      { id: order.id, data: { paymentTerm: e.target.value } },
                      { onSuccess: () => toast.success('Условие оплаты обновлено'), onError: (err) => toast.error(apiError(err)) },
                    )
                  }
                >
                  <option value="PREPAYMENT">Аванс</option>
                  <option value="POSTPAYMENT">Постоплата</option>
                </select>
                {order.paymentTerm === 'PREPAYMENT' && order.paymentStatus !== 'PAID' && (
                  <p className="mt-2 text-xs text-amber-300">
                    Аванс не получен — отгрузка недоступна.
                  </p>
                )}
              </div>
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
              <Info label="Доставка" value={order.selfPickup ? 'Самовывоз' : order.carrier?.name ?? '—'} />
              <Info label="Желаемая дата" value={fmtDate(order.desiredDate)} />
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
              </dl>
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
        orderItems={order.items}
        onCreate={(payload) =>
          createSpec.mutate(
            { orderId: order.id, ...payload },
            { onSuccess: () => { toast.success('Спецификация создана'); setSpecOpen(false); }, onError: (e) => toast.error(apiError(e)) },
          )
        }
      />

      {/* Админ: удаление */}
      <Modal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title={`Удалить заявку #${order.number}?`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDelOpen(false)}>Отмена</button>
            <button
              className="btn-primary !bg-rose-500 hover:!bg-rose-600"
              onClick={() =>
                deleteOrder.mutate(order.id, {
                  onSuccess: () => { toast.success('Заявка удалена'); navigate('/orders'); },
                  onError: (e) => toast.error(apiError(e)),
                })
              }
            >
              Удалить
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Заявка и связанные данные (позиции, история, документы, план производства) будут удалены безвозвратно.
          Резервы по заявке вернутся в остаток.
        </p>
      </Modal>

      {/* Админ: редактирование */}
      {isAdmin && adminEdit && <AdminEditModal order={order} onClose={() => setAdminEdit(false)} />}
    </Page>
  );
}

function AdminEditModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const update = useUpdateOrder();
  const { data: users = [] } = useUsers();
  const { data: carriers = [] } = useCarriers();
  const managers = users.filter((u) => u.role === 'MANAGER' || u.role === 'SALES_HEAD');
  const [form, setForm] = useState({
    managerId: order.manager?.id ?? '',
    carrierId: order.carrier?.id ?? '',
    selfPickup: order.selfPickup,
    shipTo: order.shipTo ?? '',
    desiredDate: order.desiredDate ? order.desiredDate.slice(0, 10) : '',
  });

  const save = () =>
    update.mutate(
      {
        id: order.id,
        data: {
          managerId: form.managerId || null,
          carrierId: form.selfPickup ? null : form.carrierId || null,
          selfPickup: form.selfPickup,
          shipTo: form.shipTo || undefined,
          desiredDate: form.desiredDate || null,
        },
      },
      { onSuccess: () => { toast.success('Заявка обновлена'); onClose(); }, onError: (e) => toast.error(apiError(e)) },
    );

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`Редактирование заявки #${order.number}`}
      footer={<><button className="btn-ghost" onClick={onClose}>Отмена</button><button className="btn-primary" onClick={save}>Сохранить</button></>}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Менеджер">
          <select className="input" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
            <option value="">Не назначен</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
          </select>
        </Field>
        <Field label="Перевозчик">
          <select className="input disabled:opacity-50" value={form.selfPickup ? '' : form.carrierId} disabled={form.selfPickup} onChange={(e) => setForm({ ...form, carrierId: e.target.value })}>
            <option value="">{form.selfPickup ? 'Самовывоз' : 'Не выбран'}</option>
            {!form.selfPickup && carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Адрес доставки"><input className="input" value={form.shipTo} onChange={(e) => setForm({ ...form, shipTo: e.target.value })} /></Field>
        <Field label="Желаемая дата"><input className="input" type="date" value={form.desiredDate} onChange={(e) => setForm({ ...form, desiredDate: e.target.value })} /></Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" checked={form.selfPickup} onChange={(e) => setForm({ ...form, selfPickup: e.target.checked })} className="h-4 w-4 accent-[#7C6CF6]" />
        Самовывоз (без перевозчика)
      </label>
    </Modal>
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

interface SpecItemRow {
  productId: string;
  name: string;
  format: string;
  toneCaliber?: string;
  quantity: number;
  price: number;
  /** Сумму можно задать вручную — иначе количество × цена. */
  sum?: number;
}

function SpecModal({
  open, onClose, products, orderItems, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  products: { id: string; name: string; format?: string; inventory?: { grade: string }[] }[];
  orderItems: OrderItem[];
  onCreate: (p: Record<string, unknown>) => void;
}) {
  // Шапка и условия печатной формы — заполняются здесь, на согласовании.
  const [contractNumber, setContractNumber] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [currency, setCurrency] = useState('KZT');
  const [includesVat, setIncludesVat] = useState(true);
  // Поставка и сроки заданы регламентом — показываем, но не даём вводить.
  const [paymentTerms, setPaymentTerms] = useState('PREPAYMENT');
  // Номенклатуру, сорт и объём берём из заявки — они уже согласованы,
  // менеджеру остаётся проставить цены.
  const [rows, setRows] = useState<SpecItemRow[]>(
    orderItems.length
      ? orderItems.map((it) => ({
          productId: it.productId,
          name: it.product?.name ?? '',
          format: it.product?.format ?? '60x60',
          toneCaliber: it.grade,
          quantity: it.quantity,
          price: 0,
        }))
      : [{ productId: '', name: '', format: '60x60', toneCaliber: '', quantity: 1, price: 0 }],
  );

  /** Сорта, которые фактически лежат на складе по этому товару. */
  const gradesOf = (productId: string) =>
    (products.find((p) => p.id === productId)?.inventory ?? []).map((inv) => inv.grade);

  const setRow = (i: number, patch: Partial<SpecItemRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const total = rows.reduce((s, r) => s + (r.sum ?? r.quantity * r.price), 0);

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
            onClick={() =>
              onCreate({
                contractNumber: contractNumber || undefined,
                contractDate: contractDate || undefined,
                currency,
                includesVat,
                paymentTerms,
                items: rows.filter((r) => r.name && r.quantity > 0),
              })
            }
          >
            Создать
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Номер договора">
            <input className="input" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="KSN-0003" />
          </Field>
          <Field label="Дата договора">
            <input className="input" type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
          </Field>
          <Field label="Валюта">
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="KZT">Тенге</option>
              <option value="RUB">Рубли</option>
            </select>
          </Field>
        </div>

        <div className="space-y-2">
          <div className="hidden gap-2 text-[11px] uppercase text-muted-2 sm:flex">
            <span className="flex-1">Номенклатура</span>
            <span className="w-40">Сорт (тон/калибр)</span>
            <span className="w-20">Кол-во м²</span>
            <span className="w-24">Цена за м²</span>
            <span className="w-28">Сумма</span>
            <span className="w-9" />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1">
                <select
                  className="input"
                  value={r.productId}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    setRow(i, {
                      productId: e.target.value,
                      name: p?.name ?? '',
                      format: p?.format ?? '60x60',
                      toneCaliber: gradesOf(e.target.value)[0] ?? '',
                    });
                  }}
                >
                  <option value="">Выберите номенклатуру</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {/* Тон/калибр не пишется руками: это сорт со склада по этой позиции. */}
              <select
                className="input w-40"
                value={r.toneCaliber ?? ''}
                onChange={(e) => setRow(i, { toneCaliber: e.target.value })}
              >
                {gradesOf(r.productId).length === 0 && <option value="">— нет на складе —</option>}
                {gradesOf(r.productId).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <input
                className="input w-20"
                type="number"
                min={0}
                step="0.001"
                placeholder="0"
                value={r.quantity || ''}
                onChange={(e) => setRow(i, { quantity: Number(e.target.value) })}
              />
              {/* Пустая строка вместо нуля: иначе ввод дописывается к нулю — «0500». */}
              <input
                className="input w-24"
                type="number"
                min={0}
                placeholder="0"
                value={r.price || ''}
                onChange={(e) => setRow(i, { price: Number(e.target.value) })}
              />
              {/* Сумма считается автоматически, но её можно переписать вручную. */}
              <input
                className="input w-28"
                type="number"
                min={0}
                placeholder="0"
                value={r.sum ?? (Math.round(r.quantity * r.price * 100) / 100 || '')}
                onChange={(e) => setRow(i, { sum: Number(e.target.value) })}
              />
              <button className="btn-ghost px-2 py-2" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
            </div>
          ))}
          <button
            className="btn-soft text-xs"
            onClick={() => setRows((rs) => [...rs, { productId: '', name: '', format: '60x60', toneCaliber: '', quantity: 1, price: 0 }])}
          >
            <Plus size={14} /> Добавить позицию
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Условия поставки">
            <input className="input" value="Самовывоз" readOnly disabled />
          </Field>
          <Field label="Сроки отгрузки">
            <input className="input" value="до 30 календарных дней" readOnly disabled />
          </Field>
          <Field label="Условия оплаты">
            <select className="input" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
              <option value="PREPAYMENT">100% предварительная оплата</option>
              <option value="POSTPAYMENT">Постоплата</option>
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={includesVat} onChange={(e) => setIncludesVat(e.target.checked)} className="h-4 w-4 accent-[#A855F7]" />
          Сумма включает НДС
        </label>

        <div className="flex justify-end border-t border-border pt-3 text-sm">
          <span className="text-muted">Итого:&nbsp;</span>
          <span className="font-bold text-white">{fmtMoney(total, currency)}</span>
        </div>
      </div>
    </Modal>
  );
}
