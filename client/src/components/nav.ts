import {
  LayoutDashboard,
  KanbanSquare,
  ClipboardList,
  FileText,
  BarChart3,
  Boxes,
  Lock,
  Calendar,
  Users,
  UserCog,
  Settings,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '../lib/types';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  roles: Role[];
  /** Показывать бейдж с числом новых заявок */
  newBadge?: boolean;
}

export interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}

const STAFF: Role[] = ['ADMIN', 'SALES_HEAD', 'MANAGER', 'WAREHOUSE'];
const SALES: Role[] = ['ADMIN', 'SALES_HEAD', 'MANAGER'];

// План производства временно скрыт: процесс сложный, вернём отдельной задачей.
// Страница и её эндпоинты остались в коде — достаточно вернуть пункт сюда.
export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'workspace',
    label: 'Рабочая область',
    items: [
      { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, roles: STAFF },
      { to: '/board', labelKey: 'nav.board', icon: KanbanSquare, roles: STAFF, newBadge: true },
      { to: '/orders', labelKey: 'nav.orders', icon: ClipboardList, roles: STAFF },
      { to: '/clients', labelKey: 'nav.clients', icon: Building2, roles: SALES },
    ],
  },
  {
    key: 'operations',
    label: 'Склад и сделки',
    items: [
      { to: '/inventory', labelKey: 'nav.inventory', icon: Boxes, roles: STAFF },
      { to: '/reservations', labelKey: 'nav.reservations', icon: Lock, roles: STAFF },
      { to: '/specifications', labelKey: 'nav.specifications', icon: FileText, roles: SALES },
      { to: '/calendar', labelKey: 'nav.calendar', icon: Calendar, roles: STAFF },
    ],
  },
  {
    key: 'intelligence',
    label: 'Аналитика',
    items: [
      { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart3, roles: STAFF },
      { to: '/admin/users', labelKey: 'nav.users', icon: Users, roles: ['ADMIN'] },
      { to: '/admin/refs', labelKey: 'nav.refs', icon: UserCog, roles: ['ADMIN'] },
      { to: '/admin/settings', labelKey: 'nav.settings', icon: Settings, roles: ['ADMIN'] },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

/** Разделы с пунктами, доступными роли (пустые разделы отбрасываются). */
export function navSectionsForRole(role: Role): NavSection[] {
  return NAV_SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => i.roles.includes(role)) })).filter(
    (s) => s.items.length > 0,
  );
}

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
