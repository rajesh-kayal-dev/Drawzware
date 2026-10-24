import { WorkspaceModel, IWorkspace } from '../models/workspace.model.js';

export const createWorkspaceDoc = async (data: { name: string; ownerId: string }): Promise<IWorkspace> => {
  return await WorkspaceModel.create(data);
};

export const findWorkspaceDocById = async (id: string): Promise<IWorkspace | null> => {
  return await WorkspaceModel.findById(id);
};

export const findWorkspaceDocsByIds = async (ids: string[]): Promise<IWorkspace[]> => {
  return await WorkspaceModel.find({ _id: { $in: ids } }).sort({ createdAt: -1 });
};
