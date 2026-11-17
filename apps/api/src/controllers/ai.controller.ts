import type { Request, Response } from 'express';
import { z } from 'zod';
import { AiPageQuerySchema } from '@drawzware/contracts';
import { serverError } from '../middleware/error-handler.js';
import { getAiUsage, getAiConversations, getAiConversation } from '../services/ai.service.js';

function parsePage(req: Request, res: Response) {
  const parsed = AiPageQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', message: 'Limit must be 1–100 and offset must be 0–10000.' });
    return null;
  }
  return parsed.data;
}

export async function getAiUsageHandler(req: Request, res: Response) {
  try {
    return res.json(await getAiUsage(req.user!.id));
  } catch (error) {
    return serverError(res, 'Failed to load AI usage.', error);
  }
}

export async function listAiConversationsHandler(req: Request, res: Response) {
  const page = parsePage(req, res);
  if (!page) return;
  try {
    return res.json(await getAiConversations(req.user!.id, page));
  } catch (error) {
    return serverError(res, 'Failed to list AI conversations.', error);
  }
}

export async function getAiConversationHandler(req: Request, res: Response) {
  const page = parsePage(req, res);
  if (!page) return;
  if (!z.string().uuid().safeParse(req.params.conversationId).success) {
    return res.status(400).json({ error: 'INVALID_CONVERSATION_ID', message: 'Conversation ID must be a UUID.' });
  }
  try {
    const conversation = await getAiConversation(req.params.conversationId, req.user!.id, page);
    if (!conversation) return res.status(404).json({ error: 'NOT_FOUND', message: 'Conversation not found.' });
    return res.json(conversation);
  } catch (error) {
    return serverError(res, 'Failed to load AI conversation.', error);
  }
}
