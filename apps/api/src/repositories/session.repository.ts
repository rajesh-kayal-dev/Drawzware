import { SessionModel, ISession } from '../models/session.model.js';

export async function createSessionDoc(data: {
  userId: string;
  refreshTokenHash: string;
  familyId: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}): Promise<ISession> {
  return SessionModel.create(data);
}

export async function findSessionByCurrentTokenHash(hash: string): Promise<ISession | null> {
  return SessionModel.findOne({ refreshTokenHash: hash }).exec();
}

export async function findSessionByPreviousTokenHash(hash: string): Promise<ISession | null> {
  return SessionModel.findOne({ previousRefreshTokenHash: hash }).exec();
}

export async function findSessionById(id: string): Promise<ISession | null> {
  return SessionModel.findById(id).exec();
}

export async function rotateSessionToken(
  sessionId: string,
  newHash: string,
  currentHash: string,
  expiresAt: Date,
  clientMeta?: { userAgent?: string; ipAddress?: string }
): Promise<ISession | null> {
  const updatePayload: Record<string, unknown> = {
    refreshTokenHash: newHash,
    previousRefreshTokenHash: currentHash,
    expiresAt,
  };
  if (clientMeta?.userAgent) updatePayload.userAgent = clientMeta.userAgent;
  if (clientMeta?.ipAddress) updatePayload.ipAddress = clientMeta.ipAddress;

  return SessionModel.findByIdAndUpdate(
    sessionId,
    updatePayload,
    { new: true }
  ).exec();
}

export async function revokeSessionFamily(familyId: string): Promise<number> {
  const result = await SessionModel.updateMany(
    { familyId },
    { $set: { isRevoked: true } }
  ).exec();
  return result.modifiedCount;
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await SessionModel.updateMany(
    { userId },
    { $set: { isRevoked: true } }
  ).exec();
  return result.modifiedCount;
}

export async function revokeSessionById(sessionId: string): Promise<boolean> {
  const result = await SessionModel.findByIdAndUpdate(
    sessionId,
    { $set: { isRevoked: true } },
    { new: true }
  ).exec();
  return Boolean(result);
}
