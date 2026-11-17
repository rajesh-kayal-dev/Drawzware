import mongoose, { type Model } from 'mongoose';
import crypto from 'node:crypto';

export interface IAiConversation {
  _id: string;
  ownerId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiConversationSchema = new mongoose.Schema<IAiConversation>({
  _id: { type: String, default: () => crypto.randomUUID() },
  ownerId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
}, { timestamps: true, _id: false });

aiConversationSchema.index({ ownerId: 1, updatedAt: -1, _id: -1 });

export const AiConversationModel: Model<IAiConversation> =
  mongoose.models.AiConversation || mongoose.model<IAiConversation>('AiConversation', aiConversationSchema);
