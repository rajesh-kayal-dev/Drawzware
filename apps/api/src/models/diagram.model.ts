import mongoose, { Model } from 'mongoose';
import crypto from 'node:crypto';
import { DiagramType } from '@drawzware/contracts';

export interface IDiagram {
  _id: string;
  workspaceId: string;
  title: string;
  diagramType: DiagramType;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const diagramSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    diagramType: {
      type: String,
      required: true,
      enum: ['architecture', 'sequence', 'er'],
      default: 'architecture',
    },
    createdBy: {
      type: String,
      required: true,
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

export const DiagramModel: Model<IDiagram> =
  mongoose.models.Diagram || mongoose.model<IDiagram>('Diagram', diagramSchema);
