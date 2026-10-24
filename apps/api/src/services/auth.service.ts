import { createUserDoc, findUserDocByEmail } from '../repositories/user.repository.js';
import type { IUser } from '../models/user.model.js';
import type { UserSummary, AuthResult, RegisterInput } from '../types/auth.types.js';
import { generateToken } from '../utils/jwt.util.js';
import { hashPassword, comparePassword } from '../utils/password.util.js';
import { isDuplicateKeyError } from '../utils/error.util.js';

export type { UserSummary, AuthResult };
export { generateToken };

function mapUser(user: IUser): UserSummary {
  return { id: user._id, name: user.name, email: user.email };
}

export async function registerUser(data: RegisterInput): Promise<AuthResult> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const existingUser = await findUserDocByEmail(normalizedEmail);

  if (existingUser) {
    throw new Error('Email already registered');
  }

  const hashedPassword = await hashPassword(data.password);
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

  const isMatch = userDoc && userDoc.password && (await comparePassword(password, userDoc.password));

  if (!userDoc || !isMatch) {
    throw new Error('Invalid email or password');
  }

  const user = mapUser(userDoc);
  const token = generateToken(user);
  return { user, token };
}
