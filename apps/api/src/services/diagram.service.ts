import {
  createDiagramDoc,
  createDiagramSnapshotDoc,
  findDiagramDocById,
  findDiagramDocsByWorkspace,
  updateDiagramDoc,
  findDiagramSnapshotDoc,
  saveDiagramSnapshotDoc,
} from '../repositories/diagram.repository.js';
import { IDiagram } from '../models/diagram.model.js';
import { DiagramMetadata, DiagramType, Project } from '@drawzware/contracts';
import { toIso } from '../utils/date.util.js';

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

export interface DiagramSnapshotMeta {
  diagramId: string;
  version: number;
  state: Project;
  createdAt: string;
  updatedAt: string;
}

export const getDiagramSnapshotWithMeta = async (
  diagramId: string
): Promise<DiagramSnapshotMeta | null> => {
  const snapshot = await findDiagramSnapshotDoc(diagramId);
  if (!snapshot) return null;
  return {
    diagramId: snapshot.diagramId,
    version: snapshot.version,
    state: snapshot.state,
    createdAt: toIso(snapshot.createdAt),
    updatedAt: toIso(snapshot.updatedAt),
  };
};

export interface SaveSnapshotServiceResult {
  success: boolean;
  conflict?: boolean;
  currentVersion?: number;
  currentSnapshot?: Project;
  snapshot?: DiagramSnapshotMeta;
}

export const saveDiagramSnapshot = async (
  diagramId: string,
  state: Project,
  clientVersion?: number
): Promise<SaveSnapshotServiceResult> => {
  const result = await saveDiagramSnapshotDoc(diagramId, state, clientVersion);
  if (!result.success || !result.snapshot) {
    return {
      success: false,
      conflict: result.conflict,
      currentVersion: result.currentVersion,
      currentSnapshot: result.currentSnapshot,
    };
  }

  return {
    success: true,
    snapshot: {
      diagramId: result.snapshot.diagramId,
      version: result.snapshot.version,
      state: result.snapshot.state,
      createdAt: toIso(result.snapshot.createdAt),
      updatedAt: toIso(result.snapshot.updatedAt),
    },
  };
};
