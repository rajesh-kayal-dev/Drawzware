import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUserDoc, findUserDocByEmail } from '../repositories/user.repository.js';
import type { IUser } from '../models/user.model.js';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  user: UserSummary;
  token: string;
}

function mapUser(user: IUser): UserSummary {
  return { id: user._id, name: user.name, email: user.email };
}

function isDuplicateKeyError(err: unknown): boolean {
  if (typeof err === 'object' && err !== null) {
    const error = err as { code?: number; message?: string };
    return error.code === 11000 || (typeof error.message === 'string' && error.message.includes('E11000'));
  }
  return false;
}

export function generateToken(user: { id: string; email: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '7d' });
}

export async function registerUser(data: { name: string; email: string; password: string }): Promise<AuthResult> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const existingUser = await findUserDocByEmail(normalizedEmail);

  if (existingUser) {
    throw new Error('Email already registered');
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  try {
    const created = await createUserDoc({
      name: data.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const user = mapUser(created);
    const token = generateToken(user);
    return { user, token };
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new Error('Email already registered');
    }
    throw err;
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const userDoc = await findUserDocByEmail(normalizedEmail, true);

  const isMatch = userDoc && userDoc.password && (await bcrypt.compare(password, userDoc.password));

  if (!userDoc || !isMatch) {
    throw new Error('Invalid email or password');
  }

  const user = mapUser(userDoc);
  const token = generateToken(user);
  return { user, token };
}
