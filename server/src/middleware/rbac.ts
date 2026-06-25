import type { Request, Response, NextFunction } from 'express';
import { forbidden, unauthorized } from './error';
import type { Role } from '../domain/roles';

/** Разрешает доступ только указанным ролям (ADMIN разрешён всегда). */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (req.user.role === 'ADMIN' || roles.includes(req.user.role)) {
      return next();
    }
    next(forbidden());
  };
}
