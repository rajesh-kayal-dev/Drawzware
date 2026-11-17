import mongoose, { type Model } from 'mongoose';
import type { AiModel } from '@drawzware/contracts';

export type AiRequestStatus = 'pending' | 'reserved' | 'completed' | 'failed';

export interface IAiRequest {
  _id: string; // SHA-256 of user ID + idempotency key; unique without a secondary index.
  userId: string;
  model: AiModel;
  requestFingerprint: string;
  conversationId?: string;
  status: AiRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const aiRequestSchema = new mongoose.Schema<IAiRequest>({
  _id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  model: { type: String, enum: ['basic', 'advanced'], required: true },
  requestFingerprint: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  conversationId: { type: String },
  status: { type: String, enum: ['pending', 'reserved', 'completed', 'failed'], required: true, default: 'pending' },
}, { timestamps: true, _id: false });

export const AiRequestModel: Model<IAiRequest> =
  mongoose.models.AiRequest || mongoose.model<IAiRequest>('AiRequest', aiRequestSchema);
