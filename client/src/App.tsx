import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/store';
import { getToken } from './lib/api';
import { Spinner } from './components/ui';
import { Layout } from './components/Layout';
import { ClientLayout } from './components/ClientLayout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import KanbanPage from './pages/KanbanPage';
import OrdersPage from './pages/OrdersPage';
import OrderFormPage from './pages/OrderFormPage';
import OrderDetailPage from './pages/OrderDetailPage';
import SpecificationsPage from './pages/SpecificationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProductionPage from './pages/ProductionPage';
import InventoryPage from './pages/InventoryPage';
import ReservationsPage from './pages/ReservationsPage';
import CalendarPage from './pages/CalendarPage';
import ClientsPage from './pages/ClientsPage';
import ProfilePage from './pages/ProfilePage';
import MyOrdersPage from './pages/MyOrdersPage';
import UsersPage from './pages/admin/UsersPage';
import RefsPage from './pages/admin/RefsPage';
import SettingsPage from './pages/admin/SettingsPage';

function Splash() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export default function App() {
  const { user, loading, init } = useAuth();

  useEffect(() => {
    if (getToken()) void init();
    else useAuth.setState({ loading: false });
  }, [init]);

  if (loading) return <Splash />;

  // Не авторизован
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Клиент — упрощённый интерфейс
  if (user.role === 'CLIENT') {
    return (
      <Routes>
        <Route element={<ClientLayout />}>
          <Route path="/my-orders" element={<MyOrdersPage />} />
          <Route path="/create-order" element={<OrderFormPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/my-orders" replace />} />
        </Route>
      </Routes>
    );
  }

  // Сотрудники
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/board" element={<KanbanPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<OrderFormPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/specifications" element={<SpecificationsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/production" element={<ProductionPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/refs" element={<RefsPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
