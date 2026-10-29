import { Router } from "express";
import { requireAuth, requireVerifiedEmail } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { requireWorkspaceRole } from "../middleware/workspace-auth.js";
import {
  createWorkspaceHandler,
  listWorkspacesHandler,
  getWorkspaceHandler,
  listMembersHandler,
  createInvitationHandler,
  listInvitationsHandler,
  revokeInvitationHandler,
  getInvitationPreviewHandler,
  acceptInvitationHandler,
  invitationSignupHandler,
} from "../controllers/workspace.controller.js";
import { CreateWorkspaceInputSchema, CreateInvitationInputSchema } from "@drawzware/contracts";

const router = Router();

router.post("/", requireAuth, requireVerifiedEmail, validateBody(CreateWorkspaceInputSchema), createWorkspaceHandler);
router.get("/", requireAuth, listWorkspacesHandler);
router.get("/:workspaceId", requireAuth, requireWorkspaceRole("viewer"), getWorkspaceHandler);
router.get("/:workspaceId/members", requireAuth, requireWorkspaceRole("viewer"), listMembersHandler);

// Workspace invitations (owner-controlled)
router.post(
  "/:workspaceId/invitations",
  requireAuth,
  requireVerifiedEmail,
  requireWorkspaceRole("owner"),
  validateBody(CreateInvitationInputSchema),
  createInvitationHandler
);
router.get("/:workspaceId/invitations", requireAuth, requireWorkspaceRole("owner"), listInvitationsHandler);
router.post("/:workspaceId/invitations/:invitationId/revoke", requireAuth, requireWorkspaceRole("owner"), revokeInvitationHandler);
router.delete("/:workspaceId/invitations/:invitationId", requireAuth, requireWorkspaceRole("owner"), revokeInvitationHandler);

export const workspaceRoutes = router;
export { acceptInvitationHandler, getInvitationPreviewHandler, invitationSignupHandler };
