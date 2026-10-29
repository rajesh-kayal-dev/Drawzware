import { WorkspaceInvitationModel, IWorkspaceInvitation } from '../models/workspace-invitation.model.js';

export const createInvitationDoc = async (data: {
  workspaceId: string;
  email: string;
  role: 'editor' | 'viewer';
  invitedBy: string;
  returnUrl?: string;
  canvasUrl?: string;
  diagramId?: string;
  expiresAt?: Date;
}): Promise<IWorkspaceInvitation> => {
  return await WorkspaceInvitationModel.create({ ...data, status: 'pending' });
};

export const findInvitationDocById = async (id: string): Promise<IWorkspaceInvitation | null> => {
  return await WorkspaceInvitationModel.findById(id);
};

export const expirePendingInvitationsDoc = async (workspaceId: string, email: string): Promise<void> => {
  await WorkspaceInvitationModel.updateMany({ workspaceId, email, status: 'pending' }, { $set: { status: 'expired' } });
};

export const findInvitationsByWorkspaceDoc = async (workspaceId: string): Promise<IWorkspaceInvitation[]> => {
  return await WorkspaceInvitationModel.find({ workspaceId }).sort({ createdAt: -1 });
};

export const revokeInvitationDoc = async (
  invitationId: string,
  workspaceId: string
): Promise<IWorkspaceInvitation | null> => {
  return await WorkspaceInvitationModel.findOneAndUpdate(
    { _id: invitationId, workspaceId, status: 'pending' },
    { $set: { status: 'revoked' } },
    { new: true }
  );
};

