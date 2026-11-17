import type { AiModel, AiPageQuery } from '@drawzware/contracts';
import { AI_REQUEST_LIMITS } from '@drawzware/contracts';
import { AiUsageModel, type IAiUsage } from '../models/ai-usage.model.js';
import { AiConversationModel, type IAiConversation } from '../models/ai-conversation.model.js';
import { AiMessageModel, type IAiMessage } from '../models/ai-message.model.js';
import { AiRequestModel, type AiRequestStatus, type IAiRequest } from '../models/ai-request.model.js';

export async function findAiUsage(userId: string): Promise<IAiUsage | null> {
  return AiUsageModel.findById(userId);
}

export async function ensureAiUsage(userId: string): Promise<void> {
  try {
    await AiUsageModel.updateOne(
      { _id: userId },
      { $setOnInsert: { basicUsed: 0, advancedUsed: 0, reservations: [], completedRequestIds: [] } },
      { upsert: true }
    );
  } catch (error) {
    // Concurrent first requests may both attempt the upsert. The _id index decides the winner.
    if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) throw error;
  }
}

export async function removeExpiredAiReservations(userId: string, now: Date): Promise<void> {
  await AiUsageModel.updateOne({ _id: userId }, { $pull: { reservations: { expiresAt: { $lte: now } } } });
}

export async function tryReserveAiUsage(
  userId: string,
  requestId: string,
  model: AiModel,
  now: Date,
  expiresAt: Date
): Promise<boolean> {
  const activeReservations = {
    $size: {
      $filter: {
        input: '$reservations',
        as: 'reservation',
        cond: { $and: [
          { $eq: ['$$reservation.model', model] },
          { $gt: ['$$reservation.expiresAt', now] },
        ] },
      },
    },
  };
  const updated = await AiUsageModel.findOneAndUpdate(
    {
      _id: userId,
      'reservations.requestId': { $ne: requestId },
      completedRequestIds: { $ne: requestId },
      $expr: { $lt: [{ $add: [`$${model}Used`, activeReservations] }, AI_REQUEST_LIMITS[model]] },
    },
    { $push: { reservations: { requestId, model, expiresAt } } },
    { new: true }
  );
  return updated !== null;
}

export async function completeAiUsage(userId: string, requestId: string, model: AiModel, now: Date): Promise<boolean> {
  const updated = await AiUsageModel.findOneAndUpdate(
    {
      _id: userId,
      reservations: { $elemMatch: { requestId, model, expiresAt: { $gt: now } } },
      completedRequestIds: { $ne: requestId },
    },
    {
      $pull: { reservations: { requestId } },
      $inc: { [`${model}Used`]: 1 },
      $addToSet: { completedRequestIds: requestId },
    },
    { new: true }
  );
  return updated !== null;
}

export async function releaseAiUsage(userId: string, requestId: string): Promise<boolean> {
  const updated = await AiUsageModel.findOneAndUpdate(
    { _id: userId, 'reservations.requestId': requestId, completedRequestIds: { $ne: requestId } },
    { $pull: { reservations: { requestId } } },
    { new: true }
  );
  return updated !== null;
}

export async function findOrCreateAiRequest(data: Pick<IAiRequest, '_id' | 'userId' | 'model' | 'requestFingerprint'>): Promise<IAiRequest> {
  try {
    const request = await AiRequestModel.findOneAndUpdate(
      { _id: data._id },
      { $setOnInsert: { ...data, status: 'pending' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (request) return request;
  } catch (error) {
    if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) throw error;
  }
  const existing = await AiRequestModel.findById(data._id);
  if (!existing) throw new Error('AI request could not be loaded after concurrent creation.');
  return existing;
}

export async function findAiRequest(requestId: string, userId: string): Promise<IAiRequest | null> {
  return AiRequestModel.findOne({ _id: requestId, userId });
}

export async function setAiRequestStatus(requestId: string, userId: string, status: AiRequestStatus): Promise<void> {
  await AiRequestModel.updateOne({ _id: requestId, userId }, { $set: { status } });
}

export async function listAiConversations(ownerId: string, page: AiPageQuery): Promise<IAiConversation[]> {
  return AiConversationModel.find({ ownerId })
    .sort({ updatedAt: -1, _id: -1 })
    .skip(page.offset)
    .limit(page.limit + 1);
}

export async function createAiConversationDoc(ownerId: string, title: string): Promise<IAiConversation> {
  return AiConversationModel.create({ ownerId, title });
}

export async function findAiConversation(conversationId: string, ownerId: string): Promise<IAiConversation | null> {
  return AiConversationModel.findOne({ _id: conversationId, ownerId });
}

export async function listAiMessages(conversationId: string, ownerId: string, page: AiPageQuery): Promise<IAiMessage[]> {
  return AiMessageModel.find({ conversationId, ownerId })
    .sort({ createdAt: 1, _id: 1 })
    .skip(page.offset)
    .limit(page.limit + 1);
}

export async function createAiMessageDoc(data: Pick<IAiMessage, 'conversationId' | 'ownerId' | 'role' | 'text' | 'model'>): Promise<IAiMessage> {
  return AiMessageModel.create(data);
}
