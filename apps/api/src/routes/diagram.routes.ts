import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { requireWorkspaceRole } from "../middleware/workspace-auth.js";
import {
  listDiagramsHandler,
  createDiagramHandler,
  importDiagramHandler,
  getDiagramHandler,
  updateDiagramHandler,
  getDiagramSnapshotHandler,
  saveDiagramSnapshotHandler,
} from "../controllers/diagram.controller.js";
import {
  CreateDiagramInputSchema,
  UpdateDiagramInputSchema,
  ImportDiagramInputSchema,
  SaveDiagramSnapshotInputSchema,
} from "@drawzware/contracts";

const router = Router();

router.get("/workspaces/:workspaceId/diagrams", requireAuth, requireWorkspaceRole("viewer"), listDiagramsHandler);
router.post("/workspaces/:workspaceId/diagrams", requireAuth, requireWorkspaceRole("editor"), validateBody(CreateDiagramInputSchema), createDiagramHandler);
router.post("/workspaces/:workspaceId/diagrams/import", requireAuth, requireWorkspaceRole("editor"), validateBody(ImportDiagramInputSchema), importDiagramHandler);
router.get("/diagrams/:diagramId", requireAuth, getDiagramHandler);
router.patch("/diagrams/:diagramId", requireAuth, validateBody(UpdateDiagramInputSchema), updateDiagramHandler);
router.get("/diagrams/:diagramId/snapshot", requireAuth, getDiagramSnapshotHandler);
router.put("/diagrams/:diagramId/snapshot", requireAuth, validateBody(SaveDiagramSnapshotInputSchema), saveDiagramSnapshotHandler);
router.get("/workspaces/:workspaceId/diagrams/:diagramId/snapshot", requireAuth, getDiagramSnapshotHandler);
router.put("/workspaces/:workspaceId/diagrams/:diagramId/snapshot", requireAuth, validateBody(SaveDiagramSnapshotInputSchema), saveDiagramSnapshotHandler);

export const diagramRoutes = router;
