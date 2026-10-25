import crypto from 'node:crypto';
import {
  createUserDoc,
  findUserDocByEmail,
  findUserDocById,
  setUserEmailVerificationToken,
  findUserByVerificationTokenHash,
  markEmailAsVerified,
  setUserPasswordResetToken,
  findUserByPasswordResetTokenHash,
  resetUserPassword,
  incrementUserTokenVersion,
} from '../repositories/user.repository.js';
import {
  createSessionDoc,
  findSessionByCurrentTokenHash,
  findSessionByPreviousTokenHash,
  rotateSessionToken,
  revokeSessionFamily,
  revokeAllUserSessions,
  revokeSessionById,
} from '../repositories/session.repository.js';
import type { IUser } from '../models/user.model.js';
import type { UserSummary, AuthResult, AuthTokens, RegisterInput } from '../types/auth.types.js';
import { generateToken } from '../utils/jwt.util.js';
import { hashPassword, comparePassword } from '../utils/password.util.js';
import { isDuplicateKeyError } from '../utils/error.util.js';
import {
  generateSecureToken,
  hashToken,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from '../utils/token.util.js';
import { emailService } from './email.service.js';

export type { UserSummary, AuthResult, AuthTokens };
export { generateToken };

function mapUser(user: IUser): UserSummary {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    isEmailVerified: Boolean(user.isEmailVerified),
  };
}

async function issueSessionAndTokens(
  user: IUser,
  clientMeta?: { userAgent?: string; ipAddress?: string }
): Promise<AuthTokens> {
  const rawRefreshToken = generateSecureToken(40);
  const refreshTokenHash = hashToken(rawRefreshToken);
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await createSessionDoc({
    userId: user._id,
    refreshTokenHash,
    familyId,
    expiresAt,
    userAgent: clientMeta?.userAgent,
    ipAddress: clientMeta?.ipAddress,
  });

  const accessToken = generateToken(
    {
      id: user._id,
      email: user.email,
      isEmailVerified: Boolean(user.isEmailVerified),
      tokenVersion: user.tokenVersion ?? 0,
    },
    '15m'
  );

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: 900,
  };
}

export async function registerUser(
  data: RegisterInput & { returnUrl?: string },
  clientMeta?: { userAgent?: string; ipAddress?: string }
): Promise<AuthResult & { emailDelivery?: 'sent' | 'fallback' | 'failed' }> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const existingUser = await findUserDocByEmail(normalizedEmail);

  if (existingUser) {
    throw new Error('Email already registered');
  }

  const hashedPassword = await hashPassword(data.password);
  const rawVerificationToken = generateSecureToken(32);
  const emailVerificationToken = hashToken(rawVerificationToken);
  const emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  try {
    const created = await createUserDoc({
      name: data.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
      tokenVersion: 0,
    });

    let emailDelivery: 'sent' | 'fallback' | 'failed' = 'failed';
    try {
      const accepted = data.returnUrl
        ? await emailService.sendVerificationEmail(created.email, rawVerificationToken, data.returnUrl)
        : await emailService.sendVerificationEmail(created.email, rawVerificationToken);
      const lastResult = emailService.lastDeliveryResult;
      emailDelivery = accepted ? (lastResult?.mode === 'fallback' ? 'fallback' : 'sent') : 'failed';
    } catch (mailErr) {
      console.error('[AuthService] Failed to dispatch verification email:', mailErr);
      emailDelivery = 'failed';
    }

    const user = mapUser(created);
    const tokens = await issueSessionAndTokens(created, clientMeta);
    return { user, tokens, emailDelivery };
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new Error('Email already registered');
    }
    throw err;
  }
}

export async function loginUser(
  email: string,
  password: string,
  clientMeta?: { userAgent?: string; ipAddress?: string }
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const userDoc = await findUserDocByEmail(normalizedEmail, true);

  const isMatch = userDoc && userDoc.password && (await comparePassword(password, userDoc.password));

  if (!userDoc || !isMatch) {
    throw new Error('Invalid email or password');
  }

  const user = mapUser(userDoc);
  const tokens = await issueSessionAndTokens(userDoc, clientMeta);
  return { user, tokens };
}

export async function verifyEmail(rawToken: string): Promise<{
  success: boolean;
  message: string;
  user?: UserSummary;
  alreadyVerified?: boolean;
}> {
  const tokenHash = hashToken(rawToken.trim());
  const user = await findUserByVerificationTokenHash(tokenHash);

  if (!user) {
    throw new Error('INVALID_OR_EXPIRED_VERIFICATION_TOKEN');
  }

  if (user.isEmailVerified) {
    return {
      success: true,
      alreadyVerified: true,
      message: 'Email is already verified.',
      user: mapUser(user),
    };
  }

  await markEmailAsVerified(user._id);
  const updatedUser: UserSummary = {
    ...mapUser(user),
    isEmailVerified: true,
  };
  return { success: true, message: 'Email verified successfully.', user: updatedUser };
}

export async function resendVerification(
  email: string,
  returnUrl?: string
): Promise<{ success: boolean; message: string; emailDelivery?: 'sent' | 'fallback' | 'failed' }> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserDocByEmail(normalizedEmail);

  if (!user) {
    return { success: true, message: 'If an account exists with this email, a verification link has been sent.' };
  }

  if (user.isEmailVerified) {
    return { success: true, message: 'Email is already verified.' };
  }

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  await setUserEmailVerificationToken(user._id, tokenHash, expiresAt);
  let emailDelivery: 'sent' | 'fallback' | 'failed' = 'failed';
  try {
    const accepted = returnUrl
      ? await emailService.sendVerificationEmail(user.email, rawToken, returnUrl)
      : await emailService.sendVerificationEmail(user.email, rawToken);
    const lastResult = emailService.lastDeliveryResult;
    emailDelivery = accepted ? (lastResult?.mode === 'fallback' ? 'fallback' : 'sent') : 'failed';
  } catch (err) {
    console.error('[AuthService] Resend email dispatch failed:', err);
    emailDelivery = 'failed';
  }

  return {
    success: true,
    message: emailDelivery === 'failed'
      ? 'Unable to dispatch verification email at this moment. Please try again shortly.'
      : 'If an account exists with this email, a verification link has been sent.',
    emailDelivery,
  };
}

export async function forgotPassword(
  email: string,
  returnUrl?: string
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserDocByEmail(normalizedEmail);

  if (!user) {
    return { success: true, message: 'If an account exists with this email, a password reset link has been sent.' };
  }

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await setUserPasswordResetToken(user._id, tokenHash, expiresAt);
  try {
    if (returnUrl) {
      await emailService.sendPasswordResetEmail(user.email, rawToken, returnUrl);
    } else {
      await emailService.sendPasswordResetEmail(user.email, rawToken);
    }
  } catch (err) {
    console.error('[AuthService] Password reset dispatch failed:', err);
  }

  return { success: true, message: 'If an account exists with this email, a password reset link has been sent.' };
}

export async function resetPassword(
  rawToken: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const tokenHash = hashToken(rawToken.trim());
  const user = await findUserByPasswordResetTokenHash(tokenHash);

  if (!user) {
    throw new Error('INVALID_OR_EXPIRED_RESET_TOKEN');
  }

  const hashedPassword = await hashPassword(newPassword);
  await resetUserPassword(user._id, hashedPassword);
  await revokeAllUserSessions(user._id);

  return { success: true, message: 'Password reset successfully. Please log in with your new password.' };
}

export async function refreshSessionTokens(
  rawRefreshToken: string,
  clientMeta?: { userAgent?: string; ipAddress?: string }
): Promise<AuthTokens> {
  const currentHash = hashToken(rawRefreshToken.trim());

  // 1. REUSE DETECTION: check if this was a previously rotated token
  const previousSession = await findSessionByPreviousTokenHash(currentHash);
  if (previousSession) {
    await revokeSessionFamily(previousSession.familyId);
    await incrementUserTokenVersion(previousSession.userId);
    throw new Error('TOKEN_REUSE_DETECTED');
  }

  // 2. Lookup session by current token hash
  const session = await findSessionByCurrentTokenHash(currentHash);
  if (!session || session.isRevoked || session.expiresAt <= new Date()) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  // 3. Verify user exists
  const user = await findUserDocById(session.userId);
  if (!user) {
    await revokeSessionById(session._id);
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  // 4. Rotate refresh token atomically
  const newRawRefreshToken = generateSecureToken(40);
  const newHash = hashToken(newRawRefreshToken);
  const newExpiry = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const updatedSession = await rotateSessionToken(
    session._id,
    newHash,
    currentHash,
    newExpiry,
    ...(clientMeta ? [clientMeta] : [])
  );
  if (!updatedSession) {
    throw new Error('CONCURRENT_REFRESH_CONFLICT');
  }

  const accessToken = generateToken(
    {
      id: user._id,
      email: user.email,
      isEmailVerified: Boolean(user.isEmailVerified),
      tokenVersion: user.tokenVersion ?? 0,
    },
    '15m'
  );

  return {
    accessToken,
    refreshToken: newRawRefreshToken,
    expiresIn: 900,
  };
}

export async function logoutSession(rawRefreshToken?: string): Promise<{ success: boolean; message: string }> {
  if (rawRefreshToken) {
    const hash = hashToken(rawRefreshToken.trim());
    const session = await findSessionByCurrentTokenHash(hash);
    if (session) {
      await revokeSessionById(session._id);
    }
  }
  return { success: true, message: 'Logged out successfully.' };
}

export async function logoutAllSessions(userId: string): Promise<{ success: boolean; message: string }> {
  await revokeAllUserSessions(userId);
  await incrementUserTokenVersion(userId);
  return { success: true, message: 'Logged out from all devices successfully.' };
}

export async function getUserProfile(userId: string): Promise<UserSummary> {
  const user = await findUserDocById(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  return mapUser(user);
}
