import crypto from 'node:crypto';
import {
  AI_REQUEST_LIMITS,
  AiModelSchema,
  type AiConversation,
  type AiConversationDetailResponse,
  type AiConversationListResponse,
  type AiMessage,
  type AiModel,
  type AiPageQuery,
  type AiUsageResponse,
} from '@drawzware/contracts';
import type { IAiConversation } from '../models/ai-conversation.model.js';
import type { IAiMessage } from '../models/ai-message.model.js';
import * as aiRepo from '../repositories/ai.repository.js';

export const AI_RESERVATION_TTL_MS = 5 * 60 * 1000;

function mapConversation(doc: IAiConversation): AiConversation {
  return { id: doc._id, title: doc.title, createdAt: doc.createdAt.toISOString(), updatedAt: doc.updatedAt.toISOString() };
}

function mapMessage(doc: IAiMessage): AiMessage {
  return { id: doc._id, conversationId: doc.conversationId, role: doc.role, text: doc.text, model: doc.model, createdAt: doc.createdAt.toISOString() };
}

export async function getAiUsage(userId: string): Promise<AiUsageResponse> {
  const usage = await aiRepo.findAiUsage(userId);
  const now = Date.now();
  const forModel = (model: AiModel) => {
    const limit = AI_REQUEST_LIMITS[model];
    const used = usage?.[`${model}Used`] ?? 0;
    const reserved = usage?.reservations.filter((item) => item.model === model && item.expiresAt.getTime() > now).length ?? 0;
    return { limit, used, reserved, remaining: Math.max(0, limit - used - reserved) };
  };
  const basic = forModel('basic');
  const advanced = forModel('advanced');
  return { basic, advanced, totalRemaining: basic.remaining + advanced.remaining };
}

export async function getAiConversations(ownerId: string, page: AiPageQuery): Promise<AiConversationListResponse> {
  const docs = await aiRepo.listAiConversations(ownerId, page);
  const hasMore = docs.length > page.limit;
  return {
    items: docs.slice(0, page.limit).map(mapConversation),
    hasMore,
    nextOffset: hasMore ? page.offset + page.limit : null,
  };
}

export async function getAiConversation(
  conversationId: string,
  ownerId: string,
  page: AiPageQuery
): Promise<AiConversationDetailResponse | null> {
  const conversation = await aiRepo.findAiConversation(conversationId, ownerId);
  if (!conversation) return null;
  const messages = await aiRepo.listAiMessages(conversationId, ownerId, page);
  const hasMore = messages.length > page.limit;
  return {
    conversation: mapConversation(conversation),
    messages: messages.slice(0, page.limit).map(mapMessage),
    hasMore,
    nextOffset: hasMore ? page.offset + page.limit : null,
  };
}

/** Internal history writes for later model routing; never accepts an owner ID from a client body. */
export async function createAiConversation(ownerId: string, title: string): Promise<AiConversation> {
  const normalizedTitle = title.trim();
  if (!normalizedTitle || normalizedTitle.length > 200) throw new Error('Invalid AI conversation title.');
  return mapConversation(await aiRepo.createAiConversationDoc(ownerId, normalizedTitle));
}

export async function appendAiMessage(input: {
  ownerId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  text: string;
  model?: AiModel;
}): Promise<AiMessage | null> {
  const conversation = await aiRepo.findAiConversation(input.conversationId, input.ownerId);
  if (!conversation) return null;
  const text = input.text.trim();
  if (!text || text.length > 50000) throw new Error('Invalid AI message text.');
  return mapMessage(await aiRepo.createAiMessageDoc({ ...input, text }));
}

export type BeginAiRequestResult =
  | { status: 'reserved' | 'in_progress' | 'completed' | 'failed' | 'limit_reached' | 'conflict'; requestId: string };

/** Internal API for Phase 2. No client endpoint can reserve or charge quota in Phase 1. */
export async function beginAiRequest(input: {
  userId: string;
  model: AiModel;
  idempotencyKey: string;
  requestFingerprint: string;
}): Promise<BeginAiRequestResult> {
  AiModelSchema.parse(input.model);
  if (!/^[\w-]{8,128}$/.test(input.idempotencyKey) || !/^[a-f0-9]{64}$/.test(input.requestFingerprint)) {
    throw new Error('Invalid AI request identity.');
  }
  const requestId = crypto.createHash('sha256').update(`${input.userId}\0${input.idempotencyKey}`).digest('hex');
  const request = await aiRepo.findOrCreateAiRequest({
    _id: requestId,
    userId: input.userId,
    model: input.model,
    requestFingerprint: input.requestFingerprint,
  });
  if (request.userId !== input.userId || request.model !== input.model || request.requestFingerprint !== input.requestFingerprint) {
    return { status: 'conflict', requestId };
  }
  if (request.status === 'completed' || request.status === 'failed') return { status: request.status, requestId };

  const now = new Date();
  await aiRepo.ensureAiUsage(input.userId);
  await aiRepo.removeExpiredAiReservations(input.userId, now);
  const reserved = await aiRepo.tryReserveAiUsage(
    input.userId,
    requestId,
    input.model,
    now,
    new Date(now.getTime() + AI_RESERVATION_TTL_MS)
  );
  if (reserved) {
    await aiRepo.setAiRequestStatus(requestId, input.userId, 'reserved');
    return { status: 'reserved', requestId };
  }

  const usage = await aiRepo.findAiUsage(input.userId);
  if (usage?.completedRequestIds.includes(requestId)) {
    await aiRepo.setAiRequestStatus(requestId, input.userId, 'completed');
    return { status: 'completed', requestId };
  }
  if (usage?.reservations.some((item) => item.requestId === requestId && item.expiresAt > now)) {
    return { status: 'in_progress', requestId };
  }
  return { status: 'limit_reached', requestId };
}

/** Charge only after a validated provider response has succeeded. */
export async function completeAiRequest(userId: string, requestId: string): Promise<'completed' | 'not_found' | 'not_reserved' | 'failed'> {
  const request = await aiRepo.findAiRequest(requestId, userId);
  if (!request) return 'not_found';
  if (request.status === 'failed') return 'failed';
  if (request.status === 'completed') return 'completed';
  const completed = await aiRepo.completeAiUsage(userId, requestId, request.model, new Date());
  if (completed) {
    await aiRepo.setAiRequestStatus(requestId, userId, 'completed');
    return 'completed';
  }
  const usage = await aiRepo.findAiUsage(userId);
  if (usage?.completedRequestIds.includes(requestId)) {
    await aiRepo.setAiRequestStatus(requestId, userId, 'completed');
    return 'completed';
  }
  return 'not_reserved';
}

/** A failed provider call releases its reservation and does not consume allowance. */
export async function failAiRequest(userId: string, requestId: string): Promise<'released' | 'completed' | 'not_found'> {
  const request = await aiRepo.findAiRequest(requestId, userId);
  if (!request) return 'not_found';
  if (request.status === 'completed') return 'completed';
  if (request.status === 'failed') return 'released';
  const released = await aiRepo.releaseAiUsage(userId, requestId);
  if (!released) {
    const usage = await aiRepo.findAiUsage(userId);
    if (usage?.completedRequestIds.includes(requestId)) {
      await aiRepo.setAiRequestStatus(requestId, userId, 'completed');
      return 'completed';
    }
  }
  await aiRepo.setAiRequestStatus(requestId, userId, 'failed');
  return 'released';
}
