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

export const touchDiagramDoc = async (id: string): Promise<IDiagram | null> => {
  return await DiagramModel.findByIdAndUpdate(id, { $set: { updatedAt: new Date() } }, { new: true });
};

export const createDiagramSnapshotDoc = async (
  diagramId: string,
  state: Project,
  version = 1,
  crdtState?: Buffer
): Promise<IDiagramSnapshot> => {
  const payload: Record<string, unknown> = { diagramId, state, version };
  if (crdtState) payload.crdtState = crdtState;
  return await DiagramSnapshotModel.create(payload);
};

export const findDiagramSnapshotDoc = async (diagramId: string): Promise<IDiagramSnapshot | null> => {
  return await DiagramSnapshotModel.findOne({ diagramId });
};

export interface SaveSnapshotDocResult {
  success: boolean;
  conflict?: boolean;
  currentVersion?: number;
  currentSnapshot?: Project;
  snapshot?: IDiagramSnapshot;
}

export const saveDiagramSnapshotDoc = async (
  diagramId: string,
  state: Project,
  clientVersion?: number,
  crdtState?: Buffer
): Promise<SaveSnapshotDocResult> => {
  const existing = await DiagramSnapshotModel.findOne({ diagramId });

  if (!existing) {
    const payload: Record<string, unknown> = {
      diagramId,
      state,
      version: 1,
    };
    if (crdtState) payload.crdtState = crdtState;

    const created = await DiagramSnapshotModel.create(payload);
    await touchDiagramDoc(diagramId);
    return { success: true, snapshot: created };
  }

  if (clientVersion !== undefined && clientVersion !== existing.version) {
    return {
      success: false,
      conflict: true,
      currentVersion: existing.version,
      currentSnapshot: existing.state,
    };
  }

  const nextVersion = existing.version + 1;
  const setPayload: Record<string, unknown> = {
    state,
    version: nextVersion,
    updatedAt: new Date(),
  };
  if (crdtState) {
    setPayload.crdtState = crdtState;
  }

  const updated = await DiagramSnapshotModel.findOneAndUpdate(
    { diagramId, version: existing.version },
    { $set: setPayload },
    { new: true }
  );

  if (!updated) {
    const latest = await DiagramSnapshotModel.findOne({ diagramId });
    return {
      success: false,
      conflict: true,
      currentVersion: latest ? latest.version : existing.version,
      currentSnapshot: latest ? latest.state : existing.state,
    };
  }

  await touchDiagramDoc(diagramId);
  return { success: true, snapshot: updated };
};
