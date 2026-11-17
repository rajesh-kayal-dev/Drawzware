import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import * as aiRepo from '../src/repositories/ai.repository.js';
import type { IAiConversation } from '../src/models/ai-conversation.model.js';
import type { IAiMessage } from '../src/models/ai-message.model.js';
import { AiConversationDetailResponseSchema, AiConversationListResponseSchema, AiUsageResponseSchema } from '@drawzware/contracts';

const app = createApp();
const secret = 'drawzware-ai-phase1-test-secret';
const alice = 'user-alice';
const bob = 'user-bob';
const conversationId = '9c1f22df-545d-4c07-938d-13f13668b016';
const messageId = '246b580f-9668-4ca9-a9d7-15da2109309a';
const now = new Date('2026-11-17T00:00:00.000Z');

const auth = (userId: string) => `Bearer ${jwt.sign({ sub: userId, email: `${userId}@example.com` }, secret)}`;

const conversation: IAiConversation = {
  _id: conversationId,
  ownerId: alice,
  title: 'Payment service diagram',
  createdAt: now,
  updatedAt: now,
};
const message: IAiMessage = {
  _id: messageId,
  conversationId,
  ownerId: alice,
  role: 'user',
  text: 'Draw a payment service',
  model: 'advanced',
  createdAt: now,
  updatedAt: now,
};

describe('Drawz AI Phase 1 authenticated read routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = secret;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects anonymous access to every AI route', async () => {
    for (const path of ['/api/ai/usage', '/api/ai/conversations', `/api/ai/conversations/${conversationId}`]) {
      const response = await request(app).get(path);
      expect(response.status).toBe(401);
    }
  });

  it('returns the account allowances without creating a usage record', async () => {
    vi.spyOn(aiRepo, 'findAiUsage').mockResolvedValue(null);
    const response = await request(app).get('/api/ai/usage').set('Authorization', auth(alice));
    expect(response.status).toBe(200);
    expect(AiUsageResponseSchema.parse(response.body)).toEqual({
      basic: { limit: 5, used: 0, reserved: 0, remaining: 5 },
      advanced: { limit: 3, used: 0, reserved: 0, remaining: 3 },
      totalRemaining: 8,
    });
    expect(aiRepo.findAiUsage).toHaveBeenCalledWith(alice);
  });

  it('lists only the authenticated user’s conversations and validates pagination', async () => {
    const list = vi.spyOn(aiRepo, 'listAiConversations').mockImplementation(async (ownerId) => ownerId === alice ? [conversation] : []);
    const own = await request(app).get('/api/ai/conversations?limit=1&offset=0').set('Authorization', auth(alice));
    expect(own.status).toBe(200);
    expect(AiConversationListResponseSchema.parse(own.body).items.map((item) => item.id)).toEqual([conversationId]);
    expect(list).toHaveBeenCalledWith(alice, { limit: 1, offset: 0 });

    const other = await request(app).get('/api/ai/conversations').set('Authorization', auth(bob));
    expect(other.status).toBe(200);
    expect(other.body.items).toEqual([]);

    const invalid = await request(app).get('/api/ai/conversations?limit=1000').set('Authorization', auth(alice));
    expect(invalid.status).toBe(400);
  });

  it('loads messages only after checking conversation ownership', async () => {
    vi.spyOn(aiRepo, 'findAiConversation').mockImplementation(async (id, ownerId) => id === conversationId && ownerId === alice ? conversation : null);
    const messages = vi.spyOn(aiRepo, 'listAiMessages').mockResolvedValue([message]);

    const foreign = await request(app).get(`/api/ai/conversations/${conversationId}`).set('Authorization', auth(bob));
    expect(foreign.status).toBe(404);
    expect(messages).not.toHaveBeenCalled();

    const own = await request(app).get(`/api/ai/conversations/${conversationId}`).set('Authorization', auth(alice));
    expect(own.status).toBe(200);
    const detail = AiConversationDetailResponseSchema.parse(own.body);
    expect(detail.conversation.id).toBe(conversationId);
    expect(detail.messages[0].text).toBe(message.text);
    expect(messages).toHaveBeenCalledWith(conversationId, alice, { limit: 20, offset: 0 });
  });
});
