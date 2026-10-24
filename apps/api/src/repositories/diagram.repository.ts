import { DiagramModel, IDiagram } from '../models/diagram.model.js';
import { DiagramSnapshotModel, IDiagramSnapshot } from '../models/diagram-snapshot.model.js';
import { DiagramType, Project } from '@drawzware/contracts';

export const createDiagramDoc = async (data: { workspaceId: string; title: string; diagramType: DiagramType; createdBy: string }): Promise<IDiagram> => {
  return await DiagramModel.create(data);
};

export const findDiagramDocById = async (id: string): Promise<IDiagram | null> => {
  return await DiagramModel.findById(id);
};

export const findDiagramDocsByWorkspace = async (workspaceId: string): Promise<IDiagram[]> => {
  return await DiagramModel.find({ workspaceId }).sort({ updatedAt: -1 });
};

export const updateDiagramDoc = async (id: string, updates: { title?: string; diagramType?: DiagramType }): Promise<IDiagram | null> => {
  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.diagramType !== undefined) updateData.diagramType = updates.diagramType;

  return await DiagramModel.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};

export const createDiagramSnapshotDoc = async (diagramId: string, state: Project, version = 1): Promise<IDiagramSnapshot> => {
  return await DiagramSnapshotModel.create({ diagramId, state, version });
};

export const findDiagramSnapshotDoc = async (diagramId: string): Promise<IDiagramSnapshot | null> => {
  return await DiagramSnapshotModel.findOne({ diagramId });
};
