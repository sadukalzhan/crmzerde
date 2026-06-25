import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ChatWidget } from './ChatWidget';
import { ToastContainer } from './toast';
import { useRealtime } from '../lib/useRealtime';
import { cn } from '../lib/cn';

export function Layout() {
  useRealtime();
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Десктоп-сайдбар */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Мобильный drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className={cn('absolute left-0 top-0 h-full animate-slide-in')}>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setDrawer(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <ChatWidget />
      <ToastContainer />
    </div>
  );
}
