import mongoose, { type Model } from 'mongoose';
import crypto from 'node:crypto';
import type { AiModel } from '@drawzware/contracts';

export interface IAiMessage {
  _id: string;
  conversationId: string;
  ownerId: string;
  role: 'user' | 'assistant';
  text: string;
  model?: AiModel;
  createdAt: Date;
  updatedAt: Date;
}

const aiMessageSchema = new mongoose.Schema<IAiMessage>({
  _id: { type: String, default: () => crypto.randomUUID() },
  conversationId: { type: String, required: true, index: true },
  ownerId: { type: String, required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  text: { type: String, required: true, maxlength: 50000 },
  model: { type: String, enum: ['basic', 'advanced'] },
}, { timestamps: true, _id: false });

aiMessageSchema.index({ ownerId: 1, conversationId: 1, createdAt: 1, _id: 1 });

export const AiMessageModel: Model<IAiMessage> =
  mongoose.models.AiMessage || mongoose.model<IAiMessage>('AiMessage', aiMessageSchema);
