import { DiagramModel } from '../models/diagram.model';
import { DiagramSnapshotModel } from '../models/diagram-snapshot.model';
import {
  DiagramMetadata,
  DiagramType,
  Project,
} from '@drawzware/contracts';

export const createDiagram = async (
  workspaceId: string,
  title: string,
  diagramType: DiagramType,
  createdBy: string,
  initialProjectState?: Project
): Promise<DiagramMetadata> => {
  const diagram = await DiagramModel.create({
    workspaceId,
    title,
    diagramType,
    createdBy,
  });

  if (initialProjectState) {
    await DiagramSnapshotModel.create({
      diagramId: diagram._id,
      state: initialProjectState,
      version: 1,
    });
  }

  return {
    id: diagram._id,
    workspaceId: diagram.workspaceId,
    title: diagram.title,
    diagramType: diagram.diagramType,
    createdBy: diagram.createdBy,
    createdAt: diagram.createdAt.toISOString(),
    updatedAt: diagram.updatedAt.toISOString(),
  };
};

export const findDiagramById = async (id: string): Promise<DiagramMetadata | null> => {
  const diagram = await DiagramModel.findById(id);
  if (!diagram) return null;

  return {
    id: diagram._id,
    workspaceId: diagram.workspaceId,
    title: diagram.title,
    diagramType: diagram.diagramType,
    createdBy: diagram.createdBy,
    createdAt: diagram.createdAt.toISOString(),
    updatedAt: diagram.updatedAt.toISOString(),
  };
};

export const listDiagramsInWorkspace = async (
  workspaceId: string
): Promise<DiagramMetadata[]> => {
  const diagrams = await DiagramModel.find({ workspaceId }).sort({ updatedAt: -1 });

  return diagrams.map((d) => ({
    id: d._id,
    workspaceId: d.workspaceId,
    title: d.title,
    diagramType: d.diagramType,
    createdBy: d.createdBy,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));
};

export const updateDiagramMetadata = async (
  id: string,
  updates: { title?: string; diagramType?: DiagramType }
): Promise<DiagramMetadata | null> => {
  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.diagramType !== undefined) updateData.diagramType = updates.diagramType;

  if (Object.keys(updateData).length === 0) {
    return findDiagramById(id);
  }

  const diagram = await DiagramModel.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true }
  );

  if (!diagram) return null;

  return {
    id: diagram._id,
    workspaceId: diagram.workspaceId,
    title: diagram.title,
    diagramType: diagram.diagramType,
    createdBy: diagram.createdBy,
    createdAt: diagram.createdAt.toISOString(),
    updatedAt: diagram.updatedAt.toISOString(),
  };
};

export const getDiagramSnapshot = async (diagramId: string): Promise<Project | null> => {
  const snapshot = await DiagramSnapshotModel.findOne({ diagramId });
  if (!snapshot) return null;
  return snapshot.state;
};
