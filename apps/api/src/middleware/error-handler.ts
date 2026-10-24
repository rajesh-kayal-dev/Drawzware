import type { Request, Response, NextFunction } from 'express';

export function serverError(res: Response, message: string, err?: unknown) {
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message,
    details: err instanceof Error ? err.message : undefined,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('[API Error]:', err);
  serverError(res, 'An unexpected internal server error occurred.', err);
};
