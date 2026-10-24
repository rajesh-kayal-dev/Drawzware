import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { requireWorkspaceRole } from '../middleware/workspace-auth';
import {
  listDiagramsHandler,
  createDiagramHandler,
  importDiagramHandler,
  getDiagramHandler,
  updateDiagramHandler,
} from '../controllers/diagram.controller';
import {
  CreateDiagramInputSchema,
  UpdateDiagramInputSchema,
  ImportDiagramInputSchema,
} from '@drawzware/contracts';

const router = Router();

// Diagrams in workspace
router.get(
  '/workspaces/:workspaceId/diagrams',
  requireAuth,
  requireWorkspaceRole('viewer'),
  listDiagramsHandler
);

router.post(
  '/workspaces/:workspaceId/diagrams',
  requireAuth,
  requireWorkspaceRole('editor'),
  validateBody(CreateDiagramInputSchema),
  createDiagramHandler
);

router.post(
  '/workspaces/:workspaceId/diagrams/import',
  requireAuth,
  requireWorkspaceRole('editor'),
  validateBody(ImportDiagramInputSchema),
  importDiagramHandler
);

// Individual diagram
router.get(
  '/diagrams/:diagramId',
  requireAuth,
  getDiagramHandler
);

router.patch(
  '/diagrams/:diagramId',
  requireAuth,
  validateBody(UpdateDiagramInputSchema),
  updateDiagramHandler
);

export const diagramRoutes = router;
