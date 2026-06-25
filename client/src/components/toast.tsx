import { create } from 'zustand';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/cn';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (type: ToastType, message: string) => void;
  remove: (id: number) => void;
}

let counter = 1;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (type, message) => {
    const id = counter++;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (m: string) => useToastStore.getState().push('success', m),
  error: (m: string) => useToastStore.getState().push('error', m),
  info: (m: string) => useToastStore.getState().push('info', m),
};

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const COLORS = {
  success: 'border-emerald-500/40 text-emerald-300',
  error: 'border-rose-500/40 text-rose-300',
  info: 'border-accent/40 text-accent',
};

export function ToastContainer() {
  const { toasts, remove } = useToastStore();
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex min-w-[280px] max-w-md items-start gap-3 rounded-xl border bg-panel/95 px-4 py-3 text-sm shadow-card backdrop-blur animate-fade-in',
              COLORS[t.type],
            )}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1 text-slate-200">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-muted hover:text-white">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
