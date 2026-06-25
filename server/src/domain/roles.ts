// Роли пользователей и их метаданные. Источник правды для RBAC.

export const ROLES = [
  'ADMIN',
  'MANAGER',
  'FACTORY',
  'WAREHOUSE',
  'LOGIST',
  'ACCOUNTANT',
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
  MANAGER: { key: 'MANAGER', label: 'Менеджер', color: 'indigo', staff: true },
  FACTORY: { key: 'FACTORY', label: 'Завод', color: 'orange', staff: true },
  WAREHOUSE: { key: 'WAREHOUSE', label: 'Склад', color: 'sky', staff: true },
  LOGIST: { key: 'LOGIST', label: 'Логист', color: 'green', staff: true },
  ACCOUNTANT: { key: 'ACCOUNTANT', label: 'Бухгалтер', color: 'amber', staff: true },
  CLIENT: { key: 'CLIENT', label: 'Клиент', color: 'slate', staff: false },
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function isStaff(role: Role): boolean {
  return ROLE_META[role].staff;
}
