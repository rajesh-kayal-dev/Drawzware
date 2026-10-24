import { Router, Request, Response } from 'express';
import { requireAuth } from './middleware/auth';
import { validateBody } from './middleware/validate';
import { requireWorkspaceRole } from './middleware/workspace-auth';
import { WorkspaceController } from './controllers/workspace.controller';
import { DiagramController } from './controllers/diagram.controller';
import {
  CreateWorkspaceInputSchema,
  CreateInvitationInputSchema,
  CreateDiagramInputSchema,
  UpdateDiagramInputSchema,
  ImportDiagramInputSchema,
} from '@drawzware/contracts';

export function createRouter(
  workspaceController = new WorkspaceController(),
  diagramController = new DiagramController()
): Router {
  const router = Router();
  const getWorkspaceRepo = () => workspaceController.workspaceRepo;

  // Health check endpoint
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'drawzware-api', timestamp: new Date().toISOString() });
  });

  // Current authenticated user info
  router.get('/me', requireAuth, (req: Request, res: Response) => {
    res.json({ user: req.user });
  });

  // ---------------------------------------------------------------------------
  // Workspaces
  // ---------------------------------------------------------------------------
  router.post(
    '/workspaces',
    requireAuth,
    validateBody(CreateWorkspaceInputSchema),
    workspaceController.createWorkspace
  );

  router.get(
    '/workspaces',
    requireAuth,
    workspaceController.listWorkspaces
  );

  router.get(
    '/workspaces/:workspaceId',
    requireAuth,
    requireWorkspaceRole('viewer', getWorkspaceRepo),
    workspaceController.getWorkspace
  );

  router.get(
    '/workspaces/:workspaceId/members',
    requireAuth,
    requireWorkspaceRole('viewer', getWorkspaceRepo),
    workspaceController.listMembers
  );

  // Workspace Invitations (Owner only)
  router.post(
    '/workspaces/:workspaceId/invitations',
    requireAuth,
    requireWorkspaceRole('owner', getWorkspaceRepo),
    validateBody(CreateInvitationInputSchema),
    workspaceController.createInvitation
  );

  // Accept Invitation (any authenticated user whose token email matches the invitation)
  router.post(
    '/invitations/:invitationId/accept',
    requireAuth,
    workspaceController.acceptInvitation
  );

  // ---------------------------------------------------------------------------
  // Diagrams
  // ---------------------------------------------------------------------------
  // List diagrams in workspace (viewer+)
  router.get(
    '/workspaces/:workspaceId/diagrams',
    requireAuth,
    requireWorkspaceRole('viewer', getWorkspaceRepo),
    diagramController.listDiagrams
  );

  // Create new diagram (editor+)
  router.post(
    '/workspaces/:workspaceId/diagrams',
    requireAuth,
    requireWorkspaceRole('editor', getWorkspaceRepo),
    validateBody(CreateDiagramInputSchema),
    diagramController.createDiagram
  );

  // Explicitly import existing local diagram (editor+)
  router.post(
    '/workspaces/:workspaceId/diagrams/import',
    requireAuth,
    requireWorkspaceRole('editor', getWorkspaceRepo),
    validateBody(ImportDiagramInputSchema),
    diagramController.importDiagram
  );

  // Get diagram metadata + initial snapshot (requires workspace membership)
  router.get(
    '/diagrams/:diagramId',
    requireAuth,
    diagramController.getDiagram
  );

  // Update diagram metadata (title/type) (requires editor+ in diagram's workspace)
  router.patch(
    '/diagrams/:diagramId',
    requireAuth,
    validateBody(UpdateDiagramInputSchema),
    diagramController.updateDiagram
  );

  return router;
}
