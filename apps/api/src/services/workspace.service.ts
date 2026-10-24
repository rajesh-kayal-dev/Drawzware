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
} from '../repositories/workspace-member.repository.js';
import {
  createInvitationDoc,
  findInvitationDocById,
  expirePendingInvitationsDoc,
} from '../repositories/workspace-invitation.repository.js';
import { IWorkspace } from '../models/workspace.model.js';
import { IWorkspaceMember } from '../models/workspace-member.model.js';
import { IWorkspaceInvitation } from '../models/workspace-invitation.model.js';
import { Workspace, WorkspaceMember, WorkspaceInvitation, WorkspaceRole } from '@drawzware/contracts';

function toIso(d: Date | string | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

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

export const createWorkspaceInvitation = async (workspaceId: string, email: string, role: 'editor' | 'viewer', invitedBy: string): Promise<WorkspaceInvitation> => {
  const normalizedEmail = email.toLowerCase().trim();
  await expirePendingInvitationsDoc(workspaceId, normalizedEmail);

  const invitation = await createInvitationDoc({
    workspaceId,
    email: normalizedEmail,
    role,
    invitedBy,
  });

  return mapInvitation(invitation);
};

export const findInvitationById = async (id: string): Promise<WorkspaceInvitation | null> => {
  const inv = await findInvitationDocById(id);
  return inv ? mapInvitation(inv) : null;
};

export const acceptWorkspaceInvitation = async (invitationId: string, userId: string, userEmail: string): Promise<WorkspaceMember> => {
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

  const member = await upsertWorkspaceMemberDoc(inv.workspaceId, userId, inv.role, userEmail);
  inv.status = 'accepted';
  inv.acceptedAt = new Date();
  await inv.save?.();

  return mapMember(member);
};
