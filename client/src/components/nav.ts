import {
  LayoutDashboard,
  KanbanSquare,
  ClipboardList,
  FileText,
  BarChart3,
  Factory,
  Boxes,
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

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'FACTORY', 'WAREHOUSE', 'LOGIST', 'ACCOUNTANT'] },
  { to: '/board', labelKey: 'nav.board', icon: KanbanSquare, roles: ['ADMIN', 'MANAGER', 'FACTORY', 'WAREHOUSE', 'LOGIST', 'ACCOUNTANT'], newBadge: true },
  { to: '/orders', labelKey: 'nav.orders', icon: ClipboardList, roles: ['ADMIN', 'MANAGER', 'FACTORY', 'WAREHOUSE', 'LOGIST', 'ACCOUNTANT'] },
  { to: '/specifications', labelKey: 'nav.specifications', icon: FileText, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart3, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'FACTORY', 'WAREHOUSE', 'LOGIST'] },
  { to: '/production', labelKey: 'nav.production', icon: Factory, roles: ['ADMIN', 'MANAGER', 'FACTORY', 'WAREHOUSE'] },
  { to: '/inventory', labelKey: 'nav.inventory', icon: Boxes, roles: ['ADMIN', 'MANAGER', 'FACTORY', 'WAREHOUSE'] },
  { to: '/calendar', labelKey: 'nav.calendar', icon: Calendar, roles: ['ADMIN', 'MANAGER', 'FACTORY', 'WAREHOUSE', 'LOGIST', 'ACCOUNTANT'] },
  { to: '/clients', labelKey: 'nav.clients', icon: Building2, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { to: '/admin/users', labelKey: 'nav.users', icon: Users, roles: ['ADMIN'] },
  { to: '/admin/refs', labelKey: 'nav.refs', icon: UserCog, roles: ['ADMIN'] },
  { to: '/admin/settings', labelKey: 'nav.settings', icon: Settings, roles: ['ADMIN'] },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
