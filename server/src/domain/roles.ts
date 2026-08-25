// Роли пользователей и их метаданные. Источник правды для RBAC.

export const ROLES = [
  'ADMIN',
  'SALES_HEAD',
  'MANAGER',
  'WAREHOUSE',
  'CLIENT',
] as const;

export type Role = (typeof ROLES)[number];

export interface RoleMeta {
  key: Role;
  label: string;
  /** Цвет бейджа роли (tailwind-токен) */
  color: string;
  /** Роль сотрудника (true) или клиента (false) */
  staff: boolean;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  ADMIN: { key: 'ADMIN', label: 'Администратор', color: 'violet', staff: true },
  SALES_HEAD: { key: 'SALES_HEAD', label: 'Руководитель отдела продаж', color: 'amber', staff: true },
  MANAGER: { key: 'MANAGER', label: 'Менеджер', color: 'indigo', staff: true },
  WAREHOUSE: { key: 'WAREHOUSE', label: 'Склад', color: 'sky', staff: true },
  CLIENT: { key: 'CLIENT', label: 'Клиент', color: 'slate', staff: false },
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function isStaff(role: Role): boolean {
  return ROLE_META[role].staff;
}

/**
 * Руководитель отдела продаж контролирует исполнение заказов (приказ, п. 8-9),
 * поэтому обладает правами менеджера и видит заявки всех менеджеров.
 */
export function isSalesStaff(role: Role): boolean {
  return role === 'MANAGER' || role === 'SALES_HEAD' || role === 'ADMIN';
}
