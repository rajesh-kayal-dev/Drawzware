import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticatedUser } from '@drawzware/contracts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Supabase JWT payload structure
 */
interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  exp?: number;
  [key: string]: unknown;
}

/**
 * Middleware that validates the Supabase JWT Bearer token on incoming requests.
 * Extracts user ID, email, and metadata, attaching `req.user`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing or malformed Authorization header. Bearer token required.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // If a JWT secret is configured, verify signature strictly.
    // In local development or mock test environments without secret set, decode claims safely.
    let payload: SupabaseJwtPayload;
    if (config.supabaseJwtSecret) {
      payload = jwt.verify(token, config.supabaseJwtSecret) as SupabaseJwtPayload;
    } else {
      payload = jwt.decode(token) as SupabaseJwtPayload;
      if (!payload || !payload.sub) {
        res.status(401).json({
          error: 'INVALID_TOKEN',
          message: 'Malformed or invalid authentication token claims.',
        });
        return;
      }
    }

    if (!payload.sub) {
      res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Token subject (user ID) is missing.',
      });
      return;
    }

    // Check expiration if present
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired.',
      });
      return;
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      appMetadata: payload.app_metadata,
      userMetadata: payload.user_metadata,
    };

    next();
  } catch (err: unknown) {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Failed to verify authentication token.',
      details: err instanceof Error ? err.message : undefined,
    });
  }
}
