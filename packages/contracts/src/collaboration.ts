import { z } from 'zod';
import { ProjectSchema } from './document';

/**
 * Workspace membership role hierarchy
 */
export const WorkspaceRoleSchema = z.enum(['owner', 'editor', 'viewer']);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;

/**
 * Numeric permissions weight for role comparisons:
 * owner: 3, editor: 2, viewer: 1
 */
export const WORKSPACE_ROLE_WEIGHTS: Record<WorkspaceRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

export function hasMinimumRole(userRole: WorkspaceRole, requiredRole: WorkspaceRole): boolean {
  return WORKSPACE_ROLE_WEIGHTS[userRole] >= WORKSPACE_ROLE_WEIGHTS[requiredRole];
}

/**
 * Workspace entity
 */
export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'Workspace name is required').max(100),
  ownerId: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const CreateWorkspaceInputSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required').max(100),
});
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInputSchema>;

/**
 * Workspace member representation
 */
export const WorkspaceMemberSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().min(1),
  role: WorkspaceRoleSchema,
  createdAt: z.string(),
  userEmail: z.string().email().optional(),
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

/**
 * Workspace invitations
 */
export const InvitationStatusSchema = z.enum(['pending', 'accepted', 'declined', 'expired']);
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;

export const WorkspaceInvitationSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']), // owner cannot be assigned via invitation directly
  invitedBy: z.string().min(1),
  status: InvitationStatusSchema,
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type WorkspaceInvitation = z.infer<typeof WorkspaceInvitationSchema>;

export const CreateInvitationInputSchema = z.object({
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']).default('editor'),
});
export type CreateInvitationInput = z.infer<typeof CreateInvitationInputSchema>;

/**
 * Diagram metadata entity
 */
export const DiagramTypeSchema = z.enum(['architecture', 'sequence', 'er']);
export type DiagramType = z.infer<typeof DiagramTypeSchema>;

export const DiagramMetadataSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string().trim().min(1, 'Diagram title is required').max(200),
  diagramType: DiagramTypeSchema,
  createdBy: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DiagramMetadata = z.infer<typeof DiagramMetadataSchema>;

export const CreateDiagramInputSchema = z.object({
  title: z.string().trim().min(1, 'Diagram title is required').max(200),
  diagramType: DiagramTypeSchema.default('architecture'),
});
export type CreateDiagramInput = z.infer<typeof CreateDiagramInputSchema>;

export const UpdateDiagramInputSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  diagramType: DiagramTypeSchema.optional(),
});
export type UpdateDiagramInput = z.infer<typeof UpdateDiagramInputSchema>;

/**
 * Explicit diagram import payload:
 * Accepts an existing local Drawzware project (matching ProjectSchema)
 * and safely imports it into the designated workspace without replacing local data.
 */
export const ImportDiagramInputSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  project: ProjectSchema,
});
export type ImportDiagramInput = z.infer<typeof ImportDiagramInputSchema>;

/**
 * Authenticated User representation extracted from verified JWT claims
 */
export interface AuthenticatedUser {
  id: string;
  email?: string;
  appMetadata?: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
}
