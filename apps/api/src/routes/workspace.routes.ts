import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { requireWorkspaceRole } from "../middleware/workspace-auth.js";
import {
  createWorkspaceHandler,
  listWorkspacesHandler,
  getWorkspaceHandler,
  listMembersHandler,
  createInvitationHandler,
  acceptInvitationHandler,
} from "../controllers/workspace.controller.js";
import { CreateWorkspaceInputSchema, CreateInvitationInputSchema } from "@drawzware/contracts";

const router = Router();

router.post("/", requireAuth, validateBody(CreateWorkspaceInputSchema), createWorkspaceHandler);
router.get("/", requireAuth, listWorkspacesHandler);
router.get("/:workspaceId", requireAuth, requireWorkspaceRole("viewer"), getWorkspaceHandler);
router.get("/:workspaceId/members", requireAuth, requireWorkspaceRole("viewer"), listMembersHandler);
router.post("/:workspaceId/invitations", requireAuth, requireWorkspaceRole("owner"), validateBody(CreateInvitationInputSchema), createInvitationHandler);

export const workspaceRoutes = router;
export { acceptInvitationHandler };
