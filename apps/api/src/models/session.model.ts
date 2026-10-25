import mongoose, { Model } from 'mongoose';
import crypto from 'node:crypto';

export interface ISession {
  _id: string;
  userId: string;
  refreshTokenHash: string;
  previousRefreshTokenHash?: string;
  familyId: string;
  userAgent?: string;
  ipAddress?: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    previousRefreshTokenHash: {
      type: String,
      index: true,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
    _id: false,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.refreshTokenHash;
        delete ret.previousRefreshTokenHash;
        return ret;
      },
    },
  }
);

export const SessionModel: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>('Session', sessionSchema);
