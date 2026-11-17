import { z } from 'zod';

export const AiModelSchema = z.enum(['basic', 'advanced']);
export type AiModel = z.infer<typeof AiModelSchema>;

/** One-time per-account MVP allowances. */
export const AI_REQUEST_LIMITS: Record<AiModel, number> = {
  basic: 5,
  advanced: 3,
};

const ModelUsageSchema = z.object({
  limit: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
});

export const AiUsageResponseSchema = z.object({
  basic: ModelUsageSchema,
  advanced: ModelUsageSchema,
  totalRemaining: z.number().int().nonnegative(),
});
export type AiUsageResponse = z.infer<typeof AiUsageResponseSchema>;

export const AiConversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AiConversation = z.infer<typeof AiConversationSchema>;

export const AiMessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  text: z.string(),
  model: AiModelSchema.optional(),
  createdAt: z.string().datetime(),
});
export type AiMessage = z.infer<typeof AiMessageSchema>;

export const AiPageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});
export type AiPageQuery = z.infer<typeof AiPageQuerySchema>;

export const AiConversationListResponseSchema = z.object({
  items: z.array(AiConversationSchema),
  hasMore: z.boolean(),
  nextOffset: z.number().int().nonnegative().nullable(),
});
export type AiConversationListResponse = z.infer<typeof AiConversationListResponseSchema>;

export const AiConversationDetailResponseSchema = z.object({
  conversation: AiConversationSchema,
  messages: z.array(AiMessageSchema),
  hasMore: z.boolean(),
  nextOffset: z.number().int().nonnegative().nullable(),
});
export type AiConversationDetailResponse = z.infer<typeof AiConversationDetailResponseSchema>;
