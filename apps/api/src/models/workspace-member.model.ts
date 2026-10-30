import mongoose, { Model } from 'mongoose';
import { WorkspaceRole } from '@drawzware/contracts';

export interface IWorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  userEmail?: string;
  allowedDiagramIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const workspaceMemberSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['owner', 'editor', 'viewer'],
      default: 'editor',
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    allowedDiagramIds: {
      type: [String],
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index so user can only be added to a workspace once
workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export const WorkspaceMemberModel: Model<IWorkspaceMember> =
  mongoose.models.WorkspaceMember ||
  mongoose.model<IWorkspaceMember>('WorkspaceMember', workspaceMemberSchema);
