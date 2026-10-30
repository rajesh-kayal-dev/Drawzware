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

export const upsertWorkspaceMemberDoc = async (
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
  userEmail?: string,
  diagramId?: string
): Promise<IWorkspaceMember> => {
  const existing = await WorkspaceMemberModel.findOne({ workspaceId, userId });
  let allowedDiagramIds = existing?.allowedDiagramIds;
  if (diagramId && role !== 'owner') {
    const set = new Set(allowedDiagramIds || []);
    set.add(diagramId);
    allowedDiagramIds = Array.from(set);
  }
  const member = await WorkspaceMemberModel.findOneAndUpdate(
    { workspaceId, userId },
    { $set: { role, userEmail, ...(allowedDiagramIds ? { allowedDiagramIds } : {}) } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return member!;
};

export const findWorkspaceMemberByEmailDoc = async (
  workspaceId: string,
  userEmail: string
): Promise<IWorkspaceMember | null> => {
  return await WorkspaceMemberModel.findOne({
    workspaceId,
    userEmail: userEmail.toLowerCase().trim(),
  });
};


