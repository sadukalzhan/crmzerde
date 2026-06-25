import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth';
import { unauthorized } from './error';
import type { Role } from '../domain/roles';

export interface AuthUser {
  id: string;
  role: Role;
  email: string;
}

// Расширяем Express.Request полем user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Извлекает и проверяет JWT из заголовка Authorization: Bearer <token>. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized());
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    next(unauthorized('Сессия истекла или токен недействителен'));
  }
}
