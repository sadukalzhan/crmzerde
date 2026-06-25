import { useState } from 'react';
import { MessageCircle, X, Send, LifeBuoy } from 'lucide-react';

// Плавающая кнопка чата/поддержки (демо).
export function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 animate-fade-in overflow-hidden rounded-2xl border border-border bg-panel shadow-card">
          <div className="flex items-center gap-2 bg-gradient-to-r from-accent to-accent-hover px-4 py-3 text-white">
            <LifeBuoy size={18} />
            <div className="flex-1">
              <div className="text-sm font-semibold">Поддержка «Зерде Керамика»</div>
              <div className="text-[11px] opacity-80">Обычно отвечаем за 5 минут</div>
            </div>
            <button onClick={() => setOpen(false)} className="opacity-80 hover:opacity-100">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3 p-4">
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-panel-2 px-3 py-2 text-sm text-slate-200">
              Здравствуйте! Чем можем помочь по вашей заявке?
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-border p-3">
            <input className="input" placeholder="Сообщение…" />
            <button className="btn-primary px-3 py-2"><Send size={16} /></button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-glow transition hover:bg-accent-hover hover:scale-105"
        title="Поддержка"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}
