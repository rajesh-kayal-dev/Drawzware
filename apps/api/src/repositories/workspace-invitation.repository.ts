import { WorkspaceInvitationModel, IWorkspaceInvitation } from '../models/workspace-invitation.model.js';

export const createInvitationDoc = async (data: { workspaceId: string; email: string; role: 'editor' | 'viewer'; invitedBy: string }): Promise<IWorkspaceInvitation> => {
  return await WorkspaceInvitationModel.create({ ...data, status: 'pending' });
};

export const findInvitationDocById = async (id: string): Promise<IWorkspaceInvitation | null> => {
  return await WorkspaceInvitationModel.findById(id);
};

export const expirePendingInvitationsDoc = async (workspaceId: string, email: string): Promise<void> => {
  await WorkspaceInvitationModel.updateMany({ workspaceId, email, status: 'pending' }, { $set: { status: 'expired' } });
};
