import {
  createDiagramDoc,
  createDiagramSnapshotDoc,
  findDiagramDocById,
  findDiagramDocsByWorkspace,
  updateDiagramDoc,
  findDiagramSnapshotDoc,
} from '../repositories/diagram.repository.js';
import { IDiagram } from '../models/diagram.model.js';
import { DiagramMetadata, DiagramType, Project } from '@drawzware/contracts';

function toIso(d: Date | string | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function mapDiagramMetadata(diagram: IDiagram): DiagramMetadata {
  return {
    id: diagram._id,
    workspaceId: diagram.workspaceId,
    title: diagram.title,
    diagramType: diagram.diagramType || 'architecture',
    createdBy: diagram.createdBy,
    createdAt: toIso(diagram.createdAt),
    updatedAt: toIso(diagram.updatedAt),
  };
}

export const createDiagram = async (workspaceId: string, title: string, diagramType: DiagramType, createdBy: string, initialProjectState?: Project): Promise<DiagramMetadata> => {
  const diagram = await createDiagramDoc({ workspaceId, title, diagramType, createdBy });

  if (initialProjectState) {
    await createDiagramSnapshotDoc(diagram._id, initialProjectState, 1);
  }

  return mapDiagramMetadata(diagram);
};

export const findDiagramById = async (id: string): Promise<DiagramMetadata | null> => {
  const diagram = await findDiagramDocById(id);
  return diagram ? mapDiagramMetadata(diagram) : null;
};

export const listDiagramsInWorkspace = async (workspaceId: string): Promise<DiagramMetadata[]> => {
  const diagrams = await findDiagramDocsByWorkspace(workspaceId);
  return diagrams.map(mapDiagramMetadata);
};

export const updateDiagramMetadata = async (id: string, updates: { title?: string; diagramType?: DiagramType }): Promise<DiagramMetadata | null> => {
  if (updates.title === undefined && updates.diagramType === undefined) {
    return findDiagramById(id);
  }

  const diagram = await updateDiagramDoc(id, updates);
  return diagram ? mapDiagramMetadata(diagram) : null;
};

export const getDiagramSnapshot = async (diagramId: string): Promise<Project | null> => {
  const snapshot = await findDiagramSnapshotDoc(diagramId);
  return snapshot ? snapshot.state : null;
};
