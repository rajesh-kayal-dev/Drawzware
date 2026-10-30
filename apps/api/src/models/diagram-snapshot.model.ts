import mongoose, { Document, Model } from 'mongoose';
import { Project } from '@drawzware/contracts';

export interface IDiagramSnapshot extends Document {
  diagramId: string;
  state: Project;
  crdtState?: Buffer;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const diagramSnapshotSchema = new mongoose.Schema(
  {
    diagramId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    state: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    crdtState: {
      type: Buffer,
      required: false,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
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

export const DiagramSnapshotModel: Model<IDiagramSnapshot> =
  mongoose.models.DiagramSnapshot ||
  mongoose.model<IDiagramSnapshot>('DiagramSnapshot', diagramSnapshotSchema);
