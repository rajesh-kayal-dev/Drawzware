import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getAiUsageHandler,
  listAiConversationsHandler,
  getAiConversationHandler,
} from '../controllers/ai.controller.js';

const router = Router();

router.get('/usage', requireAuth, getAiUsageHandler);
router.get('/conversations', requireAuth, listAiConversationsHandler);
router.get('/conversations/:conversationId', requireAuth, getAiConversationHandler);

export const aiRoutes = router;
