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
export const InvitationStatusSchema = z.enum(['pending', 'accepted', 'declined', 'expired', 'revoked']);
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
 * Input payload for saving or updating a diagram's canvas snapshot.
 * Accepts either `project` or `state` matching ProjectSchema.
 * Optional `clientVersion` enables optimistic concurrency conflict detection.
 */
export const SaveDiagramSnapshotInputSchema = z
  .object({
    project: ProjectSchema.optional(),
    state: ProjectSchema.optional(),
    clientVersion: z.number().int().positive().optional(),
  })
  .refine((data) => data.project !== undefined || data.state !== undefined, {
    message: "Either 'project' or 'state' must be provided matching ProjectSchema",
  });
export type SaveDiagramSnapshotInput = z.infer<typeof SaveDiagramSnapshotInputSchema>;

/**
 * Canonical response payload when returning a diagram snapshot.
 */
export const DiagramSnapshotResponseSchema = z.object({
  diagramId: z.string(),
  version: z.number().int().positive(),
  state: ProjectSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DiagramSnapshotResponse = z.infer<typeof DiagramSnapshotResponseSchema>;

/**
 * Concurrency conflict response payload when a stale clientVersion is supplied.
 */
export const DiagramSnapshotConflictErrorSchema = z.object({
  error: z.literal('VERSION_CONFLICT'),
  message: z.string(),
  currentVersion: z.number().int().positive(),
  currentSnapshot: ProjectSchema.optional(),
});
export type DiagramSnapshotConflictError = z.infer<typeof DiagramSnapshotConflictErrorSchema>;

/**
 * Real-time collaborator presence representation.
 */
export const UserPresenceSchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  color: z.string().optional(),
  cursor: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .nullable()
    .optional(),
  selectedNodeIds: z.array(z.string()).default([]),
  lastActiveAt: z.string().optional(),
});
export type UserPresence = z.infer<typeof UserPresenceSchema>;

/**
 * Collab WebSocket protocol message types
 */
export const CollabClientMessageTypeSchema = z.enum([
  'join_room',
  'leave_room',
  'sync_step_1',
  'sync_step_2',
  'sync_update',
  'presence_update',
  'cursor_move',
]);
export type CollabClientMessageType = z.infer<typeof CollabClientMessageTypeSchema>;

export const CollabClientMessageSchema = z.object({
  type: CollabClientMessageTypeSchema,
  diagramId: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
});
export type CollabClientMessage = z.infer<typeof CollabClientMessageSchema>;

export const CollabServerMessageTypeSchema = z.enum([
  'room_joined',
  'sync_step_1',
  'sync_step_2',
  'sync_update',
  'presence_batch',
  'user_joined',
  'user_left',
  'permission_revoked',
  'error',
]);
export type CollabServerMessageType = z.infer<typeof CollabServerMessageTypeSchema>;

export const CollabServerMessageSchema = z.object({
  type: CollabServerMessageTypeSchema,
  diagramId: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
});
export type CollabServerMessage = z.infer<typeof CollabServerMessageSchema>;

/**
 * Authenticated User representation extracted from verified JWT claims
 */
export interface AuthenticatedUser {
  id: string;
  email?: string;
  isEmailVerified?: boolean;
  tokenVersion?: number;
  appMetadata?: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
}

/**
 * Authentication and Session Schemas
 */
export const RegisterInputSchema = z.object({
  name: z.string({ message: 'Name is required' }).trim().min(1, 'Name is required').max(100),
  email: z.string({ message: 'Valid email is required' }).trim().email('Valid email is required').toLowerCase(),
  password: z.string({ message: 'Password must be at least 6 characters' }).min(6, 'Password must be at least 6 characters'),
  returnUrl: z.string().optional(),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string({ message: 'Valid email is required' }).trim().email('Valid email is required').toLowerCase(),
  password: z.string({ message: 'Password is required' }).min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const VerifyEmailInputSchema = z.object({
  token: z.string().trim().min(1, 'Verification token is required'),
});
export type VerifyEmailInput = z.infer<typeof VerifyEmailInputSchema>;

export const ResendVerificationInputSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  returnUrl: z.string().optional(),
});
export type ResendVerificationInput = z.infer<typeof ResendVerificationInputSchema>;

export const ForgotPasswordInputSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  returnUrl: z.string().optional(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;

export const ResetPasswordInputSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;

export const RefreshTokenInputSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required'),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenInputSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const InvitationPreviewSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  workspaceName: z.string(),
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']),
  inviterName: z.string(),
  inviterEmail: z.string().email().optional(),
  expiresAt: z.string(),
  isExpired: z.boolean(),
  status: InvitationStatusSchema,
});
export type InvitationPreview = z.infer<typeof InvitationPreviewSchema>;

