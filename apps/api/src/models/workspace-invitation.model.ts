import mongoose, { Document, Model } from 'mongoose';
import crypto from 'node:crypto';
import { InvitationStatus } from '@drawzware/contracts';

export interface IWorkspaceInvitation {
  _id: string;
  workspaceId: string;
  email: string;
  role: 'editor' | 'viewer';
  invitedBy: string;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceInvitationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['editor', 'viewer'],
      default: 'editor',
    },
    invitedBy: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    acceptedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    _id: false,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const WorkspaceInvitationModel: Model<IWorkspaceInvitation> =
  mongoose.models.WorkspaceInvitation ||
  mongoose.model<IWorkspaceInvitation>('WorkspaceInvitation', workspaceInvitationSchema);
