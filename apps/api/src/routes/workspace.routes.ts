import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { requireWorkspaceRole } from '../middleware/workspace-auth';
import {
  createWorkspaceHandler,
  listWorkspacesHandler,
  getWorkspaceHandler,
  listMembersHandler,
  createInvitationHandler,
  acceptInvitationHandler,
} from '../controllers/workspace.controller';
import {
  CreateWorkspaceInputSchema,
  CreateInvitationInputSchema,
} from '@drawzware/contracts';

const router = Router();

// Workspaces collection
router.post(
  '/',
  requireAuth,
  validateBody(CreateWorkspaceInputSchema),
  createWorkspaceHandler
);

router.get(
  '/',
  requireAuth,
  listWorkspacesHandler
);

// Individual workspace
router.get(
  '/:workspaceId',
  requireAuth,
  requireWorkspaceRole('viewer'),
  getWorkspaceHandler
);

router.get(
  '/:workspaceId/members',
  requireAuth,
  requireWorkspaceRole('viewer'),
  listMembersHandler
);

// Invitations
router.post(
  '/:workspaceId/invitations',
  requireAuth,
  requireWorkspaceRole('owner'),
  validateBody(CreateInvitationInputSchema),
  createInvitationHandler
);

export const workspaceRoutes = router;
export { acceptInvitationHandler };
