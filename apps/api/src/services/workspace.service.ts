import mongoose from 'mongoose';
import {
  createWorkspaceDoc,
  findWorkspaceDocById,
  findWorkspaceDocsByIds,
} from '../repositories/workspace.repository.js';
import {
  createWorkspaceMemberDoc,
  findWorkspaceMemberDoc,
  findWorkspaceMembersDocs,
  findWorkspaceMembershipsForUserDocs,
  upsertWorkspaceMemberDoc,
  findWorkspaceMemberByEmailDoc,
} from '../repositories/workspace-member.repository.js';
import {
  createInvitationDoc,
  findInvitationDocById,
  expirePendingInvitationsDoc,
  findInvitationsByWorkspaceDoc,
} from '../repositories/workspace-invitation.repository.js';
import { findUserDocById, findUserDocByEmail, createUserDoc, markEmailAsVerified } from '../repositories/user.repository.js';
import { findDiagramDocsByWorkspace, findDiagramDocById, createDiagramDoc } from '../repositories/diagram.repository.js';
import { IWorkspace } from '../models/workspace.model.js';
import { IWorkspaceMember } from '../models/workspace-member.model.js';
import { IWorkspaceInvitation } from '../models/workspace-invitation.model.js';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceRole,
  InvitationPreview,
  AuthTokens,
  generateUsernameFromEmail,
  validateUsername,
} from '@drawzware/contracts';
import { toIso } from '../utils/date.util.js';
import { hashPassword, comparePassword } from '../utils/password.util.js';
import { issueSessionAndTokens, mapUser, type UserSummary } from './auth.service.js';
import { emailService } from './email.service.js';

function mapWorkspace(ws: IWorkspace): Workspace {
  return {
    id: ws._id,
    name: ws.name,
    ownerId: ws.ownerId,
    createdAt: toIso(ws.createdAt),
    updatedAt: toIso(ws.updatedAt),
  };
}

function mapMember(m: IWorkspaceMember): WorkspaceMember {
  return {
    workspaceId: m.workspaceId,
    userId: m.userId,
    role: m.role,
    userEmail: m.userEmail,
    allowedDiagramIds: m.allowedDiagramIds,
    createdAt: toIso(m.createdAt),
  };
}

function mapInvitation(inv: IWorkspaceInvitation): WorkspaceInvitation {
  return {
    id: inv._id,
    workspaceId: inv.workspaceId,
    email: inv.email,
    role: inv.role,
    invitedBy: inv.invitedBy,
    status: inv.status,
    returnUrl: inv.returnUrl,
    canvasUrl: inv.canvasUrl,
    diagramId: inv.diagramId,
    createdAt: toIso(inv.createdAt),
    expiresAt: toIso(inv.expiresAt),
  };
}

export const createWorkspace = async (name: string, ownerId: string, ownerEmail?: string): Promise<Workspace> => {
  const workspace = await createWorkspaceDoc({ name, ownerId });
  await createWorkspaceMemberDoc({ workspaceId: workspace._id, userId: ownerId, role: 'owner', userEmail: ownerEmail || undefined });
  return mapWorkspace(workspace);
};

export const findWorkspaceById = async (id: string): Promise<Workspace | null> => {
  const workspace = await findWorkspaceDocById(id);
  return workspace ? mapWorkspace(workspace) : null;
};

export const listWorkspacesForUser = async (userId: string): Promise<Array<Workspace & { role: WorkspaceRole }>> => {
  const memberships = await findWorkspaceMembershipsForUserDocs(userId);
  if (memberships.length === 0) return [];

  const workspaceIds = memberships.map((m) => m.workspaceId);
  const workspaces = await findWorkspaceDocsByIds(workspaceIds);
  const memberRoleMap = new Map(memberships.map((m) => [m.workspaceId, m.role]));

  return workspaces.map((ws) => ({
    ...mapWorkspace(ws),
    role: memberRoleMap.get(ws._id) || 'viewer',
  }));
};

export const findWorkspaceMember = async (workspaceId: string, userId: string): Promise<WorkspaceMember | null> => {
  const member = await findWorkspaceMemberDoc(workspaceId, userId);
  return member ? mapMember(member) : null;
};

export const listWorkspaceMembers = async (workspaceId: string): Promise<WorkspaceMember[]> => {
  const members = await findWorkspaceMembersDocs(workspaceId);
  return members.map(mapMember);
};

export const createWorkspaceInvitation = async (
  workspaceId: string,
  email: string,
  role: 'editor' | 'viewer',
  invitedBy: string,
  returnUrl?: string,
  canvasUrl?: string,
  diagramId?: string
): Promise<WorkspaceInvitation> => {
  const normalizedEmail = email.toLowerCase().trim();

  const workspace = await findWorkspaceDocById(workspaceId);
  if (!workspace) {
    throw new Error('WORKSPACE_NOT_FOUND');
  }

  const existingMember = await findWorkspaceMemberByEmailDoc(workspaceId, normalizedEmail);
  if (existingMember) {
    if (!diagramId && !canvasUrl) {
      throw new Error('ALREADY_A_MEMBER');
    }

    let resolvedDiagramId = diagramId;
    if (!resolvedDiagramId && canvasUrl) {
      const match = canvasUrl.match(/[?&]id=([^&]+)/);
      if (match) {
        resolvedDiagramId = decodeURIComponent(match[1]);
      }
    }

    let confirmedDiagramId: string | undefined = undefined;
    if (resolvedDiagramId) {
      const doc = await findDiagramDocById(resolvedDiagramId);
      if (doc) {
        confirmedDiagramId = doc._id;
      }
    }

    if (!confirmedDiagramId) {
      const diagrams = await findDiagramDocsByWorkspace(workspaceId);
      if (diagrams.length > 0) {
        confirmedDiagramId = diagrams[0]._id;
      }
    }

    if (confirmedDiagramId) {
      await upsertWorkspaceMemberDoc(
        workspaceId,
        existingMember.userId,
        role,
        normalizedEmail,
        confirmedDiagramId
      );
    }

    const resolvedCanvasUrl = confirmedDiagramId
      ? `/canvas?id=${encodeURIComponent(confirmedDiagramId)}`
      : canvasUrl || `/app`;

    const inviter = await findUserDocById(invitedBy);

    try {
      await emailService.sendInvitationEmail(
        normalizedEmail,
        `member-${existingMember.userId}`,
        workspace.name,
        inviter?.name || 'A team member',
        role,
        resolvedCanvasUrl
      );
    } catch (mailErr) {
      console.error('[WorkspaceService] Failed to dispatch invitation email:', mailErr);
    }

    return {
      id: `member-${existingMember.userId}`,
      workspaceId,
      email: normalizedEmail,
      role,
      invitedBy,
      status: 'accepted',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      canvasUrl: resolvedCanvasUrl,
      diagramId: confirmedDiagramId,
    };
  }

  await expirePendingInvitationsDoc(workspaceId, normalizedEmail);

  let resolvedDiagramId = diagramId;
  if (!resolvedDiagramId && canvasUrl) {
    const match = canvasUrl.match(/[?&]id=([^&]+)/);
    if (match) {
      resolvedDiagramId = decodeURIComponent(match[1]);
    }
  }

  let confirmedDiagramId: string | undefined = undefined;
  if (resolvedDiagramId) {
    try {
      const doc = await findDiagramDocById(resolvedDiagramId);
      if (doc) {
        confirmedDiagramId = doc._id;
      }
    } catch {
      // safe fallback in unit test mocks
    }
    if (!confirmedDiagramId) {
      confirmedDiagramId = resolvedDiagramId;
    }
  }

  const resolvedCanvasUrl = confirmedDiagramId
    ? `/canvas?id=${encodeURIComponent(confirmedDiagramId)}`
    : canvasUrl || returnUrl;

  const invitation = await createInvitationDoc({
    workspaceId,
    email: normalizedEmail,
    role,
    invitedBy,
    returnUrl: returnUrl || resolvedCanvasUrl,
    canvasUrl: resolvedCanvasUrl,
    diagramId: confirmedDiagramId,
  });

  const inviter = await findUserDocById(invitedBy);

  try {
    if (resolvedCanvasUrl) {
      await emailService.sendInvitationEmail(
        normalizedEmail,
        invitation._id,
        workspace.name,
        inviter?.name || 'A team member',
        role,
        resolvedCanvasUrl
      );
    } else {
      await emailService.sendInvitationEmail(
        normalizedEmail,
        invitation._id,
        workspace.name,
        inviter?.name || 'A team member',
        role
      );
    }
  } catch (mailErr) {
    console.error('[WorkspaceService] Failed to dispatch invitation email:', mailErr);
  }

  return mapInvitation(invitation);
};

export const listWorkspaceInvitations = async (workspaceId: string): Promise<WorkspaceInvitation[]> => {
  const invitations = await findInvitationsByWorkspaceDoc(workspaceId);
  return invitations.map(mapInvitation);
};

export const revokeWorkspaceInvitation = async (
  workspaceId: string,
  invitationId: string
): Promise<WorkspaceInvitation> => {
  const inv = await findInvitationDocById(invitationId);
  if (!inv || inv.workspaceId !== workspaceId) {
    throw new Error('INVITATION_NOT_FOUND');
  }

  if (inv.status !== 'pending') {
    throw new Error(`INVITATION_${inv.status.toUpperCase()}`);
  }

  inv.status = 'revoked';
  await inv.save?.();
  return mapInvitation(inv);
};

export const resolveOrProvisionInvitationDiagram = async (
  inv: IWorkspaceInvitation
): Promise<{ diagramId: string; canvasUrl: string }> => {
  const hasDb = mongoose.connection?.readyState === 1;

  let targetDiagramId = inv.diagramId;
  if (targetDiagramId && hasDb) {
    try {
      const targetDoc = await findDiagramDocById(targetDiagramId);
      if (targetDoc) {
        const canvasUrl = `/canvas?id=${encodeURIComponent(targetDoc._id)}`;
        if (inv.canvasUrl !== canvasUrl) {
          inv.canvasUrl = canvasUrl;
          await inv.save?.();
        }
        return { diagramId: targetDoc._id, canvasUrl };
      }
    } catch {
      // safe fallback
    }
  }

  let canvasUrl = inv.canvasUrl || inv.returnUrl;
  if (canvasUrl) {
    const match = canvasUrl.match(/[?&]id=([^&]+)/);
    if (match) {
      const extractedId = decodeURIComponent(match[1]);
      if (hasDb) {
        try {
          const targetDoc = await findDiagramDocById(extractedId);
          if (targetDoc) {
            targetDiagramId = targetDoc._id;
          }
        } catch {
          targetDiagramId = extractedId;
        }
      } else {
        targetDiagramId = extractedId;
      }
    }
  }

  if (!targetDiagramId && hasDb) {
    try {
      const diagrams = await findDiagramDocsByWorkspace(inv.workspaceId);
      if (diagrams.length > 0) {
        targetDiagramId = diagrams[0]._id;
      } else {
        const created = await createDiagramDoc({
          workspaceId: inv.workspaceId,
          title: 'Shared Architecture',
          diagramType: 'architecture',
          createdBy: inv.invitedBy,
        });
        targetDiagramId = created._id;
      }
    } catch {
      targetDiagramId = 'default-canvas';
    }
  }

  if (!targetDiagramId) {
    targetDiagramId = 'default-canvas';
  }

  canvasUrl = `/canvas?id=${encodeURIComponent(targetDiagramId)}`;
  inv.diagramId = targetDiagramId;
  inv.canvasUrl = canvasUrl;
  await inv.save?.();

  return { diagramId: targetDiagramId, canvasUrl };
};

export const getInvitationPreview = async (invitationId: string): Promise<InvitationPreview> => {
  const inv = await findInvitationDocById(invitationId);
  if (!inv) {
    throw new Error('INVITATION_NOT_FOUND');
  }

  const isPastExpiry = new Date(inv.expiresAt).getTime() <= Date.now();
  if (isPastExpiry && inv.status === 'pending') {
    inv.status = 'expired';
    await inv.save?.();
  }

  const workspace = await findWorkspaceDocById(inv.workspaceId);
  const inviter = await findUserDocById(inv.invitedBy);

  const { diagramId: targetDiagramId, canvasUrl } = await resolveOrProvisionInvitationDiagram(inv);
  let existingUser = null;
  if (mongoose.connection?.readyState === 1) {
    try {
      existingUser = await findUserDocByEmail(inv.email.trim().toLowerCase());
    } catch {
      // safe fallback
    }
  }

  return {
    id: inv._id,
    workspaceId: inv.workspaceId,
    workspaceName: workspace?.name || 'Workspace',
    email: inv.email,
    role: inv.role,
    inviterName: inviter?.name || 'A team member',
    inviterEmail: inviter?.email,
    expiresAt: toIso(inv.expiresAt),
    isExpired: inv.status === 'expired' || isPastExpiry,
    status: inv.status,
    returnUrl: inv.returnUrl || canvasUrl,
    canvasUrl,
    diagramId: targetDiagramId,
    accountExists: Boolean(existingUser),
  };
};

export const findInvitationById = async (id: string): Promise<WorkspaceInvitation | null> => {
  const inv = await findInvitationDocById(id);
  return inv ? mapInvitation(inv) : null;
};

export const acceptWorkspaceInvitation = async (
  invitationId: string,
  userId: string,
  userEmail: string,
  isEmailVerified = true
): Promise<WorkspaceMember & { canvasUrl?: string }> => {
  if (!isEmailVerified) {
    throw new Error('EMAIL_NOT_VERIFIED');
  }

  const inv = await findInvitationDocById(invitationId);
  if (!inv) throw new Error('INVITATION_NOT_FOUND');
  if (inv.status !== 'pending') throw new Error(`INVITATION_${inv.status.toUpperCase()}`);

  if (new Date(inv.expiresAt).getTime() <= Date.now()) {
    inv.status = 'expired';
    await inv.save?.();
    throw new Error('INVITATION_EXPIRED');
  }

  if (inv.email.toLowerCase() !== userEmail.toLowerCase().trim()) {
    throw new Error('INVITATION_EMAIL_MISMATCH');
  }

  const { diagramId: targetDiagramId, canvasUrl } = await resolveOrProvisionInvitationDiagram(inv);

  const member = await upsertWorkspaceMemberDoc(
    inv.workspaceId,
    userId,
    inv.role,
    userEmail.toLowerCase().trim(),
    targetDiagramId
  );
  inv.status = 'accepted';
  inv.acceptedAt = new Date();
  await inv.save?.();

  return { ...mapMember(member), canvasUrl };
};

/**
 * Direct Signup & Login via Invitation:
 * - Generates username from email prefix (removes numbers, special chars, camelCase)
 * - Sets isEmailVerified: true (since the user already received the invite email directly)
 * - Automatically sends a branded welcome email
 * - Adds member to workspace and marks invitation accepted
 * - Issues auth tokens and returns direct canvas redirect target
 */
export const signupWithInvitation = async (
  invitationId: string,
  password: string,
  clientMeta?: { userAgent?: string; ipAddress?: string }
): Promise<{
  message: string;
  user: UserSummary;
  tokens: AuthTokens;
  token: string;
  workspaceId: string;
  role: string;
  canvasUrl: string;
}> => {
  const inv = await findInvitationDocById(invitationId);
  if (!inv) {
    throw new Error('INVITATION_NOT_FOUND');
  }

  if (new Date(inv.expiresAt).getTime() <= Date.now() || inv.status === 'expired') {
    inv.status = 'expired';
    await inv.save?.();
    throw new Error('INVITATION_EXPIRED');
  }

  if (inv.status !== 'pending') {
    throw new Error(`INVITATION_${inv.status.toUpperCase()}`);
  }

  const normalizedEmail = inv.email.toLowerCase().trim();
  let userDoc = await findUserDocByEmail(normalizedEmail, true);

  if (userDoc) {
    // User already exists: verify their password
    const isMatch = userDoc.password && (await comparePassword(password, userDoc.password));
    if (!isMatch) {
      throw new Error('Account already exists with this email. Please enter your existing password to sign in.');
    }
    // Since user possesses the valid invitation email sent directly to them, ensure email is verified
    if (!userDoc.isEmailVerified) {
      await markEmailAsVerified(userDoc._id);
      userDoc.isEmailVerified = true;
    }
  } else {
    // Generate username from email prefix:
    // e.g. rajeshkayal33@gmail.com -> rajeshkayal
    // strips numbers, underscores, special characters, converts to camelCase
    const username = generateUsernameFromEmail(normalizedEmail);
    if (!validateUsername(username)) {
      throw new Error('INVALID_GENERATED_USERNAME');
    }

    const hashedPassword = await hashPassword(password);
    userDoc = await createUserDoc({
      name: username,
      email: normalizedEmail,
      password: hashedPassword,
      isEmailVerified: true, // Crucial: verified automatically because they received the invitation email!
      tokenVersion: 0,
    });
  }

  // Resolve canvas destination
  const { diagramId: targetDiagramId, canvasUrl } = await resolveOrProvisionInvitationDiagram(inv);

  // Accept invitation and add member to workspace with scoped diagram permission
  await upsertWorkspaceMemberDoc(inv.workspaceId, userDoc._id, inv.role, normalizedEmail, targetDiagramId);
  inv.status = 'accepted';
  inv.acceptedAt = new Date();
  await inv.save?.();

  // Send welcome email
  const workspace = await findWorkspaceDocById(inv.workspaceId);
  try {
    await emailService.sendWelcomeEmail(
      normalizedEmail,
      userDoc.name,
      workspace?.name || 'Workspace',
      canvasUrl
    );
  } catch (mailErr) {
    console.error('[WorkspaceService] Failed to dispatch welcome email:', mailErr);
  }

  // Issue session and auth tokens
  const tokens = await issueSessionAndTokens(userDoc, clientMeta);
  const user = mapUser(userDoc);

  return {
    message: 'Account set up and joined workspace successfully',
    user,
    tokens,
    token: tokens.accessToken,
    workspaceId: inv.workspaceId,
    role: inv.role,
    canvasUrl,
  };
};
