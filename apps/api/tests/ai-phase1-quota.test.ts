import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { AiRequestModel } from '../src/models/ai-request.model.js';
import { AiUsageModel } from '../src/models/ai-usage.model.js';
import { appendAiMessage, beginAiRequest, completeAiRequest, createAiConversation, failAiRequest, getAiConversation, getAiConversations, getAiUsage } from '../src/services/ai.service.js';

const databaseName = `drawzware_ai_phase1_test_${crypto.randomUUID().replace(/-/g, '')}`;
const uri = `mongodb://127.0.0.1:27017/${databaseName}`;
const fingerprint = crypto.createHash('sha256').update('prompt payload').digest('hex');
let mongoAvailable = false;

describe('Drawz AI Phase 1 atomic quota lifecycle (real MongoDB)', () => {
  beforeAll(async () => {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      await Promise.all([AiUsageModel.init(), AiRequestModel.init()]);
      mongoAvailable = true;
    } catch {
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
      console.warn('[AI quota suite] Local MongoDB unavailable; real atomic quota checks skipped.');
    }
  });

  afterAll(async () => {
    if (mongoAvailable) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  it('reserves at most five Basic and three Advanced requests under concurrency', async () => {
    if (!mongoAvailable) return;
    const userId = 'concurrent-user';
    const basic = await Promise.all(Array.from({ length: 12 }, (_, index) => beginAiRequest({
      userId, model: 'basic', idempotencyKey: `basic-${index}-key`, requestFingerprint: fingerprint,
    })));
    const advanced = await Promise.all(Array.from({ length: 8 }, (_, index) => beginAiRequest({
      userId, model: 'advanced', idempotencyKey: `advanced-${index}-key`, requestFingerprint: fingerprint,
    })));
    expect(basic.filter((result) => result.status === 'reserved')).toHaveLength(5);
    expect(advanced.filter((result) => result.status === 'reserved')).toHaveLength(3);
    expect((await getAiUsage(userId)).totalRemaining).toBe(0);

    const reserved = [...basic, ...advanced].filter((result) => result.status === 'reserved');
    expect(await Promise.all(reserved.map((result) => completeAiRequest(userId, result.requestId)))).toEqual(Array(8).fill('completed'));
    const usage = await getAiUsage(userId);
    expect(usage.basic.used).toBe(5);
    expect(usage.advanced.used).toBe(3);
    expect(usage.totalRemaining).toBe(0);
    expect(await completeAiRequest(userId, reserved[0].requestId)).toBe('completed');
    expect((await getAiUsage(userId)).basic.used).toBe(5);
  });

  it('treats concurrent retries of one key as one reservation and one charge', async () => {
    if (!mongoAvailable) return;
    const userId = 'retry-user';
    const input = { userId, model: 'basic' as const, idempotencyKey: 'same-request-key', requestFingerprint: fingerprint };
    const attempts = await Promise.all(Array.from({ length: 10 }, () => beginAiRequest(input)));
    expect(attempts.filter((result) => result.status === 'reserved')).toHaveLength(1);
    expect(attempts.filter((result) => result.status === 'in_progress')).toHaveLength(9);
    expect((await getAiUsage(userId)).basic.reserved).toBe(1);
    const requestId = attempts[0].requestId;
    const completions = await Promise.all(Array.from({ length: 5 }, () => completeAiRequest(userId, requestId)));
    expect(completions).toEqual(Array(5).fill('completed'));
    expect((await beginAiRequest(input)).status).toBe('completed');
    expect((await getAiUsage(userId)).basic.used).toBe(1);
    expect((await beginAiRequest({ ...input, model: 'advanced' })).status).toBe('conflict');
    expect((await beginAiRequest({ ...input, requestFingerprint: crypto.createHash('sha256').update('different prompt').digest('hex') })).status).toBe('conflict');

    // The usage ledger remains authoritative if the request status write was interrupted.
    await AiRequestModel.updateOne({ _id: requestId }, { $set: { status: 'pending' } });
    expect((await beginAiRequest(input)).status).toBe('completed');
    expect((await getAiUsage(userId)).basic.used).toBe(1);
  });

  it('releases failed reservations without charging and keeps their key terminal', async () => {
    if (!mongoAvailable) return;
    const userId = 'failed-user';
    const input = { userId, model: 'advanced' as const, idempotencyKey: 'failed-request-key', requestFingerprint: fingerprint };
    const started = await beginAiRequest(input);
    expect(started.status).toBe('reserved');
    expect(await failAiRequest(userId, started.requestId)).toBe('released');
    expect((await getAiUsage(userId)).advanced.remaining).toBe(3);
    expect((await beginAiRequest(input)).status).toBe('failed');
    expect((await beginAiRequest({ ...input, idempotencyKey: 'new-request-key' })).status).toBe('reserved');
  });

  it('reclaims an expired reservation without charging it', async () => {
    if (!mongoAvailable) return;
    const userId = 'expired-user';
    const started = await beginAiRequest({ userId, model: 'basic', idempotencyKey: 'expired-request-key', requestFingerprint: fingerprint });
    expect(started.status).toBe('reserved');
    await AiUsageModel.updateOne(
      { _id: userId, 'reservations.requestId': started.requestId },
      { $set: { 'reservations.$.expiresAt': new Date(0) } }
    );
    expect((await getAiUsage(userId)).basic.remaining).toBe(5);
    expect((await beginAiRequest({ userId, model: 'basic', idempotencyKey: 'fresh-request-key', requestFingerprint: fingerprint })).status).toBe('reserved');
    expect(await completeAiRequest(userId, started.requestId)).toBe('not_reserved');
    expect((await getAiUsage(userId)).basic.used).toBe(0);
  });

  it('persists conversations and messages with owner-scoped reads and writes', async () => {
    if (!mongoAvailable) return;
    const conversation = await createAiConversation('history-owner', '  Architecture notes  ');
    const message = await appendAiMessage({
      ownerId: 'history-owner',
      conversationId: conversation.id,
      role: 'user',
      text: 'Describe the services',
      model: 'basic',
    });
    expect(message?.conversationId).toBe(conversation.id);
    expect((await getAiConversations('history-owner', { limit: 20, offset: 0 })).items[0].title).toBe('Architecture notes');
    expect((await getAiConversation(conversation.id, 'history-owner', { limit: 20, offset: 0 }))?.messages[0].text).toBe('Describe the services');
    expect(await getAiConversation(conversation.id, 'other-user', { limit: 20, offset: 0 })).toBeNull();
    expect(await appendAiMessage({ ownerId: 'other-user', conversationId: conversation.id, role: 'user', text: 'Intrude' })).toBeNull();
  });
});
