import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  AppSettings,
  Claim,
  Client,
  Contract,
  DocumentItem,
  Factory,
  Carrier,
  Inventory,
  Meta,
  Notification,
  Order,
  Product,
  Reservation,
  Specification,
  User,
} from './types';

// ── Метаданные и настройки ──
export const useMeta = () =>
  useQuery({ queryKey: ['meta'], queryFn: async () => (await api.get<Meta>('/meta')).data, staleTime: Infinity });

export const useSettings = () =>
  useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get<AppSettings>('/settings')).data, staleTime: 60_000 });

// ── Заявки ──
export interface OrderFilters {
  status?: string;
  priority?: string;
  factoryId?: string;
  carrierId?: string;
  clientId?: string;
  search?: string;
}

export const useOrders = (filters: OrderFilters = {}) =>
  useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => (await api.get<Order[]>('/orders', { params: filters })).data,
  });

export const useOrder = (id?: string) =>
  useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await api.get<Order>(`/orders/${id}`)).data,
    enabled: !!id,
  });

function useOrderInvalidator() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ['orders'] });
    qc.invalidateQueries({ queryKey: ['order', id] });
    qc.invalidateQueries({ queryKey: ['analytics'] });
    qc.invalidateQueries({ queryKey: ['production'] });
  };
}

export const useCreateOrder = () => {
  const invalidate = useOrderInvalidator();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post<Order>('/orders', payload)).data,
    onSuccess: () => invalidate(),
  });
};

export const useTransition = () => {
  const invalidate = useOrderInvalidator();
  return useMutation({
    mutationFn: async (vars: { id: string; to: string; note?: string; reason?: string }) =>
      (await api.post<Order>(`/orders/${vars.id}/transition`, { to: vars.to, note: vars.note, reason: vars.reason })).data,
    onSuccess: (_d, v) => invalidate(v.id),
  });
};

export const useCreditCheck = () => {
  const invalidate = useOrderInvalidator();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<Order>(`/orders/${id}/credit-check`)).data,
    onSuccess: (_d, id) => invalidate(id),
  });
};

export const useUpdatePayment = () => {
  const invalidate = useOrderInvalidator();
  return useMutation({
    mutationFn: async (vars: { id: string; status: string }) =>
      (await api.post<Order>(`/orders/${vars.id}/payment`, { status: vars.status })).data,
    onSuccess: (_d, v) => invalidate(v.id),
  });
};

export const useToProduction = () => {
  const invalidate = useOrderInvalidator();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/orders/${id}/to-production`)).data,
    onSuccess: (_d, id) => invalidate(id),
  });
};

export const useUpdateOrder = () => {
  const invalidate = useOrderInvalidator();
  return useMutation({
    mutationFn: async (vars: { id: string; data: Record<string, unknown> }) =>
      (await api.patch<Order>(`/orders/${vars.id}`, vars.data)).data,
    onSuccess: (_d, v) => invalidate(v.id),
  });
};

// ── Уведомления ──
export const useNotifications = () =>
  useQuery({ queryKey: ['notifications'], queryFn: async () => (await api.get<Notification[]>('/notifications')).data });

export const useUnreadCount = () =>
  useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => (await api.get<{ count: number }>('/notifications/unread-count')).data.count,
    refetchInterval: 30_000,
  });

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

// ── Справочники ──
export const useProducts = () =>
  useQuery({ queryKey: ['products'], queryFn: async () => (await api.get<Product[]>('/products')).data });

export const useClients = (opts?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['clients'],
    queryFn: async () => (await api.get<Client[]>('/clients')).data,
    enabled: opts?.enabled ?? true,
  });

export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<User[]>('/users')).data });

export const useFactories = () =>
  useQuery({ queryKey: ['factories'], queryFn: async () => (await api.get<Factory[]>('/refs/factories')).data });

export const useCarriers = () =>
  useQuery({ queryKey: ['carriers'], queryFn: async () => (await api.get<Carrier[]>('/refs/carriers')).data });

export const useInventory = () =>
  useQuery({ queryKey: ['inventory'], queryFn: async () => (await api.get<Inventory[]>('/inventory')).data });

export const useReservations = () =>
  useQuery({ queryKey: ['reservations'], queryFn: async () => (await api.get<Reservation[]>('/reservations')).data });

export const useDeleteOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/orders/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
};

export const useDeleteClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/clients/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
};

export const useUpdateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; data: Record<string, unknown> }) =>
      (await api.patch(`/clients/${vars.id}`, vars.data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
};

// ── Производство ──
export const useProductionPlan = (year: number, month: number) =>
  useQuery({
    queryKey: ['production', 'plan', year, month],
    queryFn: async () => (await api.get(`/production/plan`, { params: { year, month } })).data,
  });

export const usePlanItemUpdate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string } & Record<string, unknown>) => {
      const { id, ...data } = vars;
      return (await api.patch(`/production/items/${id}`, data)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

// ── Спецификации / договоры ──
export const useSpecifications = (orderId?: string) =>
  useQuery({
    queryKey: ['specifications', orderId ?? 'all'],
    queryFn: async () => (await api.get<Specification[]>('/specifications', { params: orderId ? { orderId } : {} })).data,
  });

export const useSignSpec = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/specifications/${id}/sign`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['specifications'] });
      qc.invalidateQueries({ queryKey: ['order'] });
    },
  });
};

export const useCreateSpec = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post('/specifications', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['specifications'] });
      qc.invalidateQueries({ queryKey: ['order'] });
    },
  });
};

export const useContracts = (orderId?: string) =>
  useQuery({
    queryKey: ['contracts', orderId ?? 'all'],
    queryFn: async () => (await api.get<Contract[]>('/contracts', { params: orderId ? { orderId } : {} })).data,
  });

export const useCreateContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { orderId: string; number: string; fileUrl?: string }) =>
      (await api.post('/contracts', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['order'] });
    },
  });
};

export const useSignContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/contracts/${id}/sign`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['order'] });
    },
  });
};

// ── Документы ──
export const useDocuments = (orderId?: string) =>
  useQuery({
    queryKey: ['documents', orderId],
    queryFn: async () => (await api.get<DocumentItem[]>('/documents', { params: orderId ? { orderId } : {} })).data,
    enabled: orderId !== undefined,
  });

export const useUploadDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { orderId: string; type: string; file: File; name?: string }) => {
      const fd = new FormData();
      fd.append('file', vars.file);
      fd.append('orderId', vars.orderId);
      fd.append('type', vars.type);
      if (vars.name) fd.append('name', vars.name);
      return (await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['order'] });
    },
  });
};

// ── Рекламации ──
export const useClaims = (orderId?: string) =>
  useQuery({
    queryKey: ['claims', orderId ?? 'all'],
    queryFn: async () => (await api.get<Claim[]>('/claims', { params: orderId ? { orderId } : {} })).data,
  });

export const useCreateClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { orderId: string; description: string }) => (await api.post('/claims', vars)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['claims'] });
      qc.invalidateQueries({ queryKey: ['order'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useUpdateClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status?: string; resolution?: string }) =>
      (await api.patch(`/claims/${vars.id}`, { status: vars.status, resolution: vars.resolution })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  });
};

// ── Аналитика ──
export const useAnalyticsSummary = () =>
  useQuery({ queryKey: ['analytics', 'summary'], queryFn: async () => (await api.get('/analytics/summary')).data });

export const useFunnel = () =>
  useQuery({ queryKey: ['analytics', 'funnel'], queryFn: async () => (await api.get('/analytics/funnel')).data });

export const useReceivables = () =>
  useQuery({ queryKey: ['analytics', 'receivables'], queryFn: async () => (await api.get('/analytics/receivables')).data });
