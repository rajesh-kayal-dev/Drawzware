import mongoose, { Model } from 'mongoose';
import crypto from 'node:crypto';

export interface IWorkspace {
  _id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
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
        return ret;
      },
    },
  }
);

export const WorkspaceModel: Model<IWorkspace> =
  mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspace', workspaceSchema);
