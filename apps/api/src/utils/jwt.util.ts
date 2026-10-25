import jwt from 'jsonwebtoken';
import type { JwtUserPayload } from '../types/auth.types.js';

export const JWT_ALGORITHM = 'HS256' as const;

export function generateToken(
  user: { id: string; email: string; isEmailVerified?: boolean; tokenVersion?: number },
  expiresIn: string | number = '15m'
): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      isEmailVerified: Boolean(user.isEmailVerified),
      tokenVersion: user.tokenVersion ?? 0,
    },
    secret,
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    }
  );
}

export function verifyToken(token: string, secret: string): JwtUserPayload {
  return jwt.verify(token, secret, {
    algorithms: [JWT_ALGORITHM],
  }) as JwtUserPayload;
}
