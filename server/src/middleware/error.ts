import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (msg: string) => new ApiError(400, msg);
export const unauthorized = (msg = 'Не авторизован') => new ApiError(401, msg);
export const forbidden = (msg = 'Недостаточно прав') => new ApiError(403, msg);
export const notFound = (msg = 'Не найдено') => new ApiError(404, msg);
export const conflict = (msg: string) => new ApiError(409, msg);

/** Оборачивает async-хендлеры, чтобы ошибки попадали в errorHandler. */
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Ошибка валидации',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Prisma "not found"
  const code = (err as { code?: string })?.code;
  if (code === 'P2025') {
    res.status(404).json({ error: 'Запись не найдена' });
    return;
  }
  if (code === 'P2002') {
    res.status(409).json({ error: 'Нарушение уникальности (запись уже существует)' });
    return;
  }
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}
