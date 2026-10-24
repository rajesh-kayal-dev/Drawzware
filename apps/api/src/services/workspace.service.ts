import { WorkspaceModel } from '../models/workspace.model';
import { WorkspaceMemberModel } from '../models/workspace-member.model';
import { WorkspaceInvitationModel } from '../models/workspace-invitation.model';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceRole,
} from '@drawzware/contracts';

export const createWorkspace = async (
  name: string,
  ownerId: string,
  ownerEmail?: string
): Promise<Workspace> => {
  const workspace = await WorkspaceModel.create({
    name,
    ownerId,
  });

  await WorkspaceMemberModel.create({
    workspaceId: workspace._id,
    userId: ownerId,
    role: 'owner',
    userEmail: ownerEmail || undefined,
  });

  return {
    id: workspace._id,
    name: workspace.name,
    ownerId: workspace.ownerId,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
};

export const findWorkspaceById = async (id: string): Promise<Workspace | null> => {
  const workspace = await WorkspaceModel.findById(id);
  if (!workspace) return null;

  return {
    id: workspace._id,
    name: workspace.name,
    ownerId: workspace.ownerId,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
};

export const listWorkspacesForUser = async (
  userId: string
): Promise<Array<Workspace & { role: WorkspaceRole }>> => {
  const memberships = await WorkspaceMemberModel.find({ userId });
  if (memberships.length === 0) return [];

  const workspaceIds = memberships.map((m) => m.workspaceId);
  const workspaces = await WorkspaceModel.find({ _id: { $in: workspaceIds } }).sort({
    createdAt: -1,
  });

  const memberRoleMap = new Map(memberships.map((m) => [m.workspaceId, m.role]));

  return workspaces.map((ws) => ({
    id: ws._id,
    name: ws.name,
    ownerId: ws.ownerId,
    createdAt: ws.createdAt.toISOString(),
    updatedAt: ws.updatedAt.toISOString(),
    role: memberRoleMap.get(ws._id) || 'viewer',
  }));
};

export const findWorkspaceMember = async (
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember | null> => {
  const member = await WorkspaceMemberModel.findOne({ workspaceId, userId });
  if (!member) return null;

  return {
    workspaceId: member.workspaceId,
    userId: member.userId,
    role: member.role,
    userEmail: member.userEmail,
    createdAt: member.createdAt.toISOString(),
  };
};

export const listWorkspaceMembers = async (
  workspaceId: string
): Promise<WorkspaceMember[]> => {
  const members = await WorkspaceMemberModel.find({ workspaceId }).sort({ createdAt: 1 });

  return members.map((m) => ({
    workspaceId: m.workspaceId,
    userId: m.userId,
    role: m.role,
    userEmail: m.userEmail,
    createdAt: m.createdAt.toISOString(),
  }));
};

export const createWorkspaceInvitation = async (
  workspaceId: string,
  email: string,
  role: 'editor' | 'viewer',
  invitedBy: string
): Promise<WorkspaceInvitation> => {
  const normalizedEmail = email.toLowerCase().trim();

  // Expire any existing pending invitations for this email and workspace
  await WorkspaceInvitationModel.updateMany(
    { workspaceId, email: normalizedEmail, status: 'pending' },
    { $set: { status: 'expired' } }
  );

  const invitation = await WorkspaceInvitationModel.create({
    workspaceId,
    email: normalizedEmail,
    role,
    invitedBy,
    status: 'pending',
  });

  return {
    id: invitation._id,
    workspaceId: invitation.workspaceId,
    email: invitation.email,
    role: invitation.role,
    invitedBy: invitation.invitedBy,
    status: invitation.status,
    createdAt: invitation.createdAt.toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
  };
};

export const findInvitationById = async (id: string): Promise<WorkspaceInvitation | null> => {
  const inv = await WorkspaceInvitationModel.findById(id);
  if (!inv) return null;

  return {
    id: inv._id,
    workspaceId: inv.workspaceId,
    email: inv.email,
    role: inv.role,
    invitedBy: inv.invitedBy,
    status: inv.status,
    createdAt: inv.createdAt.toISOString(),
    expiresAt: inv.expiresAt.toISOString(),
  };
};

export const acceptWorkspaceInvitation = async (
  invitationId: string,
  userId: string,
  userEmail: string
): Promise<WorkspaceMember> => {
  const inv = await WorkspaceInvitationModel.findById(invitationId);
  if (!inv) {
    throw new Error('INVITATION_NOT_FOUND');
  }

  if (inv.status !== 'pending') {
    throw new Error(`INVITATION_${inv.status.toUpperCase()}`);
  }

  if (inv.expiresAt.getTime() <= Date.now()) {
    inv.status = 'expired';
    await inv.save();
    throw new Error('INVITATION_EXPIRED');
  }

  if (inv.email.toLowerCase() !== userEmail.toLowerCase().trim()) {
    throw new Error('INVITATION_EMAIL_MISMATCH');
  }

  // Update or insert workspace member
  const member = await WorkspaceMemberModel.findOneAndUpdate(
    { workspaceId: inv.workspaceId, userId },
    { $set: { role: inv.role, userEmail } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  inv.status = 'accepted';
  inv.acceptedAt = new Date();
  await inv.save();

  return {
    workspaceId: member.workspaceId,
    userId: member.userId,
    role: member.role,
    userEmail: member.userEmail,
    createdAt: member.createdAt.toISOString(),
  };
};
