import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/** Валидирует req.body по zod-схеме и подменяет его распарсенным значением. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) return next(result.error);
    // req.query доступен только для чтения в Express 5; кладём в locals.
    (req as Request & { validatedQuery?: T }).validatedQuery = result.data;
    next();
  };
}
