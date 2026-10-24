import jwt from 'jsonwebtoken';
import type { JwtUserPayload } from '../types/auth.types.js';

export function generateToken(user: { id: string; email: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '7d' });
}

export function verifyToken(token: string, secret: string): JwtUserPayload {
  return jwt.verify(token, secret) as JwtUserPayload;
}
