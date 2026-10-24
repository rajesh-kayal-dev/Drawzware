import { WorkspaceMemberModel, IWorkspaceMember } from '../models/workspace-member.model.js';
import { WorkspaceRole } from '@drawzware/contracts';

export const createWorkspaceMemberDoc = async (data: { workspaceId: string; userId: string; role: WorkspaceRole; userEmail?: string }): Promise<IWorkspaceMember> => {
  return await WorkspaceMemberModel.create(data);
};

export const findWorkspaceMemberDoc = async (workspaceId: string, userId: string): Promise<IWorkspaceMember | null> => {
  return await WorkspaceMemberModel.findOne({ workspaceId, userId });
};

export const findWorkspaceMembersDocs = async (workspaceId: string): Promise<IWorkspaceMember[]> => {
  return await WorkspaceMemberModel.find({ workspaceId }).sort({ createdAt: 1 });
};

export const findWorkspaceMembershipsForUserDocs = async (userId: string): Promise<IWorkspaceMember[]> => {
  return await WorkspaceMemberModel.find({ userId });
};

export const upsertWorkspaceMemberDoc = async (workspaceId: string, userId: string, role: WorkspaceRole, userEmail?: string): Promise<IWorkspaceMember> => {
  const member = await WorkspaceMemberModel.findOneAndUpdate(
    { workspaceId, userId },
    { $set: { role, userEmail } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return member!;
};
