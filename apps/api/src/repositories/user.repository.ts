import { UserModel, IUser } from '../models/user.model.js';

export async function createUserDoc(data: {
  name: string;
  email: string;
  password: string;
  isEmailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  tokenVersion?: number;
}): Promise<IUser> {
  return UserModel.create(data);
}

export async function findUserDocByEmail(email: string, includePassword = false): Promise<IUser | null> {
  const query = UserModel.findOne({ email });
  if (includePassword) {
    query.select('+password');
  }
  return query.exec();
}

export async function findUserDocById(id: string): Promise<IUser | null> {
  return UserModel.findById(id).exec();
}

export async function setUserEmailVerificationToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<IUser | null> {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        emailVerificationToken: tokenHash,
        emailVerificationExpires: expiresAt,
      },
    },
    { new: true }
  ).exec();
}

export async function findUserByVerificationTokenHash(tokenHash: string): Promise<IUser | null> {
  return UserModel.findOne({
    emailVerificationToken: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  })
    .select('+emailVerificationToken +emailVerificationExpires')
    .exec();
}

export async function markEmailAsVerified(userId: string): Promise<IUser | null> {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: { isEmailVerified: true },
      $unset: {
        emailVerificationToken: 1,
        emailVerificationExpires: 1,
      },
    },
    { new: true }
  ).exec();
}

export async function setUserPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<IUser | null> {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        passwordResetToken: tokenHash,
        passwordResetExpires: expiresAt,
      },
    },
    { new: true }
  ).exec();
}

export async function findUserByPasswordResetTokenHash(tokenHash: string): Promise<IUser | null> {
  return UserModel.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  })
    .select('+passwordResetToken +passwordResetExpires')
    .exec();
}

export async function resetUserPassword(
  userId: string,
  hashedPassword: string
): Promise<IUser | null> {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: { password: hashedPassword },
      $inc: { tokenVersion: 1 },
      $unset: {
        passwordResetToken: 1,
        passwordResetExpires: 1,
      },
    },
    { new: true }
  ).exec();
}

export async function incrementUserTokenVersion(userId: string): Promise<number> {
  const updated = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { tokenVersion: 1 } },
    { new: true }
  ).exec();
  return updated?.tokenVersion ?? 0;
}

export async function updateUserDoc(
  userId: string,
  update: Partial<{ name: string }>
): Promise<IUser | null> {
  return UserModel.findByIdAndUpdate(userId, { $set: update }, { new: true }).exec();
}

