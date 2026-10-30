import * as Y from 'yjs';
import { Project, ProjectSchema, isValidProjectId } from '@drawzware/contracts';
import {
  findDiagramSnapshotDoc,
  saveDiagramSnapshotDoc,
  findDiagramDocById,
} from '../repositories/diagram.repository.js';

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

export function initYDocFromProject(project: Project, existingDoc?: Y.Doc): Y.Doc {
  const doc = existingDoc ?? new Y.Doc();
  doc.transact(() => {
    const meta = doc.getMap('meta');
    meta.set('id', project.id);
    meta.set('name', project.name || 'Untitled Diagram');
    if (project.description !== undefined) meta.set('description', project.description);
    meta.set('createdAt', project.createdAt || new Date().toISOString());
    meta.set('updatedAt', project.updatedAt || new Date().toISOString());
    meta.set('viewport', project.viewport ?? { x: 0, y: 0, zoom: 1 });
    if (project.diagramType) meta.set('diagramType', project.diagramType);
    if (project.diagramData) meta.set('diagramData', project.diagramData);

    const nodesMap = doc.getMap('nodes');
    nodesMap.clear();
    for (const node of project.nodes || []) {
      if (node && typeof node === 'object' && 'id' in node) {
        nodesMap.set(String((node as { id: string }).id), node);
      }
    }

    const edgesMap = doc.getMap('edges');
    edgesMap.clear();
    for (const edge of project.edges || []) {
      if (edge && typeof edge === 'object' && 'id' in edge) {
        edgesMap.set(String((edge as { id: string }).id), edge);
      }
    }
  });
  return doc;
}

export function yDocToProject(doc: Y.Doc, fallbackDiagramId: string): Project {
  const meta = doc.getMap('meta');
  const nodesMap = doc.getMap('nodes');
  const edgesMap = doc.getMap('edges');

  const rawId = meta.get('id');
  const id = typeof rawId === 'string' && isValidProjectId(rawId) ? rawId : fallbackDiagramId;
  const name = (meta.get('name') as string) || 'Untitled Diagram';
  const description = meta.get('description') as string | undefined;
  const createdAt = (meta.get('createdAt') as string) || new Date().toISOString();
  const updatedAt = new Date().toISOString();
  const rawViewport = meta.get('viewport') as { x?: number; y?: number; zoom?: number } | undefined;
  const viewport = {
    x: typeof rawViewport?.x === 'number' ? rawViewport.x : 0,
    y: typeof rawViewport?.y === 'number' ? rawViewport.y : 0,
    zoom: typeof rawViewport?.zoom === 'number' ? rawViewport.zoom : 1,
  };
  const diagramType = (meta.get('diagramType') as 'architecture' | 'sequence' | 'er') || 'architecture';
  const diagramData = meta.get('diagramData') as Record<string, unknown> | undefined;

  const nodes: Record<string, unknown>[] = [];
  nodesMap.forEach((node) => {
    if (node && typeof node === 'object') {
      nodes.push(node as Record<string, unknown>);
    }
  });

  const edges: Record<string, unknown>[] = [];
  edgesMap.forEach((edge) => {
    if (edge && typeof edge === 'object') {
      edges.push(edge as Record<string, unknown>);
    }
  });

  return {
    id,
    name,
    description,
    createdAt,
    updatedAt,
    nodes,
    edges,
    viewport,
    diagramType,
    diagramData,
  };
}

export interface CrdtSession {
  doc: Y.Doc;
  diagramId: string;
  isDirty: boolean;
  saveTimer: NodeJS.Timeout | null;
  lastSavedAt?: Date;
  version: number;
}

export interface CrdtManagerOptions {
  debounceMs?: number;
}

export class CrdtManager {
  private sessions: Map<string, CrdtSession> = new Map();
  private debounceMs: number;

  constructor(options: CrdtManagerOptions = {}) {
    this.debounceMs = options.debounceMs ?? 1500;
  }

  async getOrCreateSession(diagramId: string): Promise<CrdtSession> {
    const existing = this.sessions.get(diagramId);
    if (existing) {
      return existing;
    }

    const doc = new Y.Doc();
    let version = 0;

    try {
      const snapshotDoc = await findDiagramSnapshotDoc(diagramId);
      if (snapshotDoc?.crdtState && snapshotDoc.crdtState.length > 0) {
        Y.applyUpdate(doc, new Uint8Array(snapshotDoc.crdtState));
        version = snapshotDoc.version || 1;
      } else if (snapshotDoc && snapshotDoc.state) {
        initYDocFromProject(snapshotDoc.state, doc);
        version = snapshotDoc.version || 1;
      } else {
        const diagram = await findDiagramDocById(diagramId);
        const initialProject: Project = {
          id: diagramId,
          name: diagram?.title || 'Untitled Diagram',
          createdAt: diagram?.createdAt ? diagram.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: diagram?.updatedAt ? diagram.updatedAt.toISOString() : new Date().toISOString(),
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          diagramType: diagram?.diagramType || 'architecture',
        };
        initYDocFromProject(initialProject, doc);
      }
    } catch {
      const fallbackProject: Project = {
        id: diagramId,
        name: 'Untitled Diagram',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        diagramType: 'architecture',
      };
      initYDocFromProject(fallbackProject, doc);
    }

    const session: CrdtSession = {
      doc,
      diagramId,
      isDirty: false,
      saveTimer: null,
      version,
    };

    this.sessions.set(diagramId, session);
    return session;
  }

  getSession(diagramId: string): CrdtSession | undefined {
    return this.sessions.get(diagramId);
  }

  async getSyncStep1(diagramId: string): Promise<string> {
    const session = await this.getOrCreateSession(diagramId);
    const vector = Y.encodeStateVector(session.doc);
    return uint8ArrayToBase64(vector);
  }

  async getSyncStep2(diagramId: string, clientStateVectorBase64?: string): Promise<string> {
    const session = await this.getOrCreateSession(diagramId);
    let update: Uint8Array;
    if (clientStateVectorBase64) {
      try {
        const clientVector = base64ToUint8Array(clientStateVectorBase64);
        update = Y.encodeStateAsUpdate(session.doc, clientVector);
      } catch {
        update = Y.encodeStateAsUpdate(session.doc);
      }
    } else {
      update = Y.encodeStateAsUpdate(session.doc);
    }
    return uint8ArrayToBase64(update);
  }

  async applyClientUpdate(
    diagramId: string,
    updateBase64: string
  ): Promise<{ success: boolean; error?: string }> {
    const session = await this.getOrCreateSession(diagramId);
    try {
      const updateBytes = base64ToUint8Array(updateBase64);
      Y.applyUpdate(session.doc, updateBytes);

      session.isDirty = true;
      if (session.saveTimer) {
        clearTimeout(session.saveTimer);
      }

      session.saveTimer = setTimeout(() => {
        void this.persistSession(diagramId);
      }, this.debounceMs);

      if (session.saveTimer && typeof session.saveTimer.unref === 'function') {
        session.saveTimer.unref();
      }

      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Invalid CRDT update',
      };
    }
  }

  async persistSession(
    diagramId: string
  ): Promise<{ success: boolean; version?: number; error?: string }> {
    const session = this.sessions.get(diagramId);
    if (!session || !session.isDirty) {
      return { success: true, version: session?.version };
    }

    if (session.saveTimer) {
      clearTimeout(session.saveTimer);
      session.saveTimer = null;
    }

    try {
      const projectState = yDocToProject(session.doc, diagramId);
      const parseResult = ProjectSchema.safeParse(projectState);
      if (!parseResult.success) {
        return {
          success: false,
          error: `Project validation failed: ${parseResult.error.message}`,
        };
      }

      const crdtBinary = Buffer.from(Y.encodeStateAsUpdate(session.doc));
      const result = await saveDiagramSnapshotDoc(
        diagramId,
        parseResult.data,
        session.version > 0 ? session.version : undefined,
        crdtBinary
      );

      if (result.success && result.snapshot) {
        session.isDirty = false;
        session.version = result.snapshot.version;
        session.lastSavedAt = new Date();
        return { success: true, version: session.version };
      }

      if (result.conflict) {
        session.version = result.currentVersion || session.version;
        // Reschedule automatic retry with the updated version so in-memory dirty changes are not stranded
        if (!session.saveTimer) {
          session.saveTimer = setTimeout(() => {
            void this.persistSession(diagramId);
          }, 500);
          if (typeof session.saveTimer.unref === 'function') {
            session.saveTimer.unref();
          }
        }
        return { success: false, error: 'SNAPSHOT_VERSION_CONFLICT' };
      }

      return { success: false, error: 'SAVE_FAILED' };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Persistence failed',
      };
    }
  }

  async flushAndCloseSession(diagramId: string): Promise<void> {
    const session = this.sessions.get(diagramId);
    if (!session) return;

    if (session.saveTimer) {
      clearTimeout(session.saveTimer);
      session.saveTimer = null;
    }

    let attempts = 0;
    while (session.isDirty && attempts < 3) {
      attempts++;
      const res = await this.persistSession(diagramId);
      if (session.saveTimer) {
        clearTimeout(session.saveTimer);
        session.saveTimer = null;
      }
      if (res.success || !res.error?.includes('CONFLICT')) {
        break;
      }
    }

    session.doc.destroy();
    this.sessions.delete(diagramId);
  }

  async closeAll(): Promise<void> {
    const diagramIds = Array.from(this.sessions.keys());
    for (const id of diagramIds) {
      await this.flushAndCloseSession(id);
    }
    this.sessions.clear();
  }

  getActiveSessionsCount(): number {
    return this.sessions.size;
  }
}
