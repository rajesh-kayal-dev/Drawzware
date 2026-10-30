import * as Y from 'yjs';
import type { SystemNode, SystemEdge as SystemEdgeModel } from '@/features/canvas/types/canvas.types';

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function sanitizeNodeForYDoc(node: SystemNode): SystemNode {
  const clone = { ...node } as SystemNode & { dragging?: boolean };
  delete clone.selected;
  delete clone.dragging;
  return clone;
}

export function sanitizeEdgeForYDoc(edge: SystemEdgeModel): SystemEdgeModel {
  const clone = { ...edge };
  delete clone.selected;
  return clone;
}

export function initYDocFromCanvas(
  nodes: SystemNode[],
  edges: SystemEdgeModel[],
  diagramId: string,
  existingDoc?: Y.Doc
): Y.Doc {
  const doc = existingDoc ?? new Y.Doc();
  doc.transact(() => {
    const meta = doc.getMap('meta');
    meta.set('id', diagramId);
    meta.set('updatedAt', new Date().toISOString());

    const nodesMap = doc.getMap<SystemNode>('nodes');
    nodesMap.clear();
    for (const node of nodes) {
      if (node && typeof node === 'object' && 'id' in node) {
        nodesMap.set(node.id, sanitizeNodeForYDoc(node));
      }
    }

    const edgesMap = doc.getMap<SystemEdgeModel>('edges');
    edgesMap.clear();
    for (const edge of edges) {
      if (edge && typeof edge === 'object' && 'id' in edge) {
        edgesMap.set(edge.id, sanitizeEdgeForYDoc(edge));
      }
    }
  }, 'local-init');

  return doc;
}

export function extractCanvasFromYDoc(doc: Y.Doc): {
  nodes: SystemNode[];
  edges: SystemEdgeModel[];
} {
  const nodesMap = doc.getMap<SystemNode>('nodes');
  const edgesMap = doc.getMap<SystemEdgeModel>('edges');

  const nodes: SystemNode[] = [];
  nodesMap.forEach((node) => {
    if (node && typeof node === 'object' && 'id' in node) {
      nodes.push(node);
    }
  });

  const edges: SystemEdgeModel[] = [];
  edgesMap.forEach((edge) => {
    if (edge && typeof edge === 'object' && 'id' in edge) {
      edges.push(edge);
    }
  });

  return { nodes, edges };
}

export function applyCanvasDiffToYDoc(
  doc: Y.Doc,
  currentNodes: SystemNode[],
  currentEdges: SystemEdgeModel[],
  origin = 'local'
): boolean {
  let hasChanges = false;
  doc.transact(() => {
    const nodesMap = doc.getMap<SystemNode>('nodes');
    const edgesMap = doc.getMap<SystemEdgeModel>('edges');

    // 1. Added or updated nodes
    const currentNodeIdSet = new Set<string>();
    for (const rawNode of currentNodes) {
      const node = sanitizeNodeForYDoc(rawNode);
      currentNodeIdSet.add(node.id);
      const existing = nodesMap.get(node.id);
      if (!existing || JSON.stringify(existing) !== JSON.stringify(node)) {
        nodesMap.set(node.id, node);
        hasChanges = true;
      }
    }

    // 2. Deleted nodes
    for (const key of Array.from(nodesMap.keys())) {
      if (!currentNodeIdSet.has(key)) {
        nodesMap.delete(key);
        hasChanges = true;
      }
    }

    // 3. Added or updated edges
    const currentEdgeIdSet = new Set<string>();
    for (const rawEdge of currentEdges) {
      const edge = sanitizeEdgeForYDoc(rawEdge);
      currentEdgeIdSet.add(edge.id);
      const existing = edgesMap.get(edge.id);
      if (!existing || JSON.stringify(existing) !== JSON.stringify(edge)) {
        edgesMap.set(edge.id, edge);
        hasChanges = true;
      }
    }

    // 4. Deleted edges
    for (const key of Array.from(edgesMap.keys())) {
      if (!currentEdgeIdSet.has(key)) {
        edgesMap.delete(key);
        hasChanges = true;
      }
    }
  }, origin);

  return hasChanges;
}

export function createCollabUndoManager(doc: Y.Doc): Y.UndoManager {
  const nodesMap = doc.getMap('nodes');
  const edgesMap = doc.getMap('edges');
  return new Y.UndoManager([nodesMap, edgesMap], {
    trackedOrigins: new Set(['local']),
  });
}
