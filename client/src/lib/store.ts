import { create } from 'zustand';
import { api, setToken } from './api';
import { disconnectSocket } from './socket';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  setUser: (user: User) => void;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
  phone?: string;
  bin?: string;
  address?: string;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  init: async () => {
    try {
      const { data } = await api.get<User>('/auth/me');
      set({ user: data, loading: false });
    } catch {
      setToken(null);
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    setToken(data.token);
    set({ user: data.user });
    return data.user;
  },

  register: async (payload) => {
    const { data } = await api.post<{ token: string; user: User }>('/auth/register', payload);
    setToken(data.token);
    set({ user: data.user });
    return data.user;
  },

  logout: () => {
    setToken(null);
    disconnectSocket();
    set({ user: null });
  },

  setUser: (user) => set({ user }),
}));
