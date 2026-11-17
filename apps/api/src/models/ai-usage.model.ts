import mongoose, { type Model } from 'mongoose';
import type { AiModel } from '@drawzware/contracts';

export interface AiReservation {
  requestId: string;
  model: AiModel;
  expiresAt: Date;
}

export interface IAiUsage {
  _id: string; // Authenticated user ID; MongoDB's primary key prevents duplicate usage records.
  basicUsed: number;
  advancedUsed: number;
  reservations: AiReservation[];
  completedRequestIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema = new mongoose.Schema<AiReservation>({
  requestId: { type: String, required: true },
  model: { type: String, enum: ['basic', 'advanced'], required: true },
  expiresAt: { type: Date, required: true },
}, { _id: false });

const aiUsageSchema = new mongoose.Schema<IAiUsage>({
  _id: { type: String, required: true },
  basicUsed: { type: Number, required: true, default: 0, min: 0 },
  advancedUsed: { type: Number, required: true, default: 0, min: 0 },
  reservations: { type: [reservationSchema], default: [] },
  completedRequestIds: { type: [String], default: [] },
}, { timestamps: true, _id: false });

export const AiUsageModel: Model<IAiUsage> =
  mongoose.models.AiUsage || mongoose.model<IAiUsage>('AiUsage', aiUsageSchema);
