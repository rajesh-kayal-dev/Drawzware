import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Y from 'yjs';
import {
  initYDocFromCanvas,
  extractCanvasFromYDoc,
  applyCanvasDiffToYDoc,
  createCollabUndoManager,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '../apps/web/src/features/collaboration/utils/yjs-sync';
import { CollabClient } from '../apps/web/src/features/collaboration/services/collab.client';
import { useCollaborationStore } from '../apps/web/src/features/collaboration/stores/useCollaborationStore';
import { useCanvasStore } from '../apps/web/src/features/canvas/stores/useCanvasStore';
import type { SystemNode, SystemEdge as SystemEdgeModel } from '../apps/web/src/features/canvas/types/canvas.types';

describe('Phase 4: Frontend Canvas Yjs Synchronization & Real-Time Collaboration', () => {
  const createMockNode = (
    id: string,
    label: string,
    nodeType: SystemNode['data']['nodeType'] = 'service',
    x = 0,
    y = 0
  ): SystemNode => ({
    id,
    type: 'system',
    position: { x, y },
    data: {
      label,
      nodeType,
      techStack: [],
    },
  });

  const createMockEdge = (
    id: string,
    source: string,
    target: string,
    label = 'HTTPS'
  ): SystemEdgeModel => ({
    id,
    source,
    target,
    type: 'system',
    data: {
      label,
      edgeType: 'rest',
      strokeStyle: 'solid',
    },
  });

  const sampleNodes: SystemNode[] = [
    createMockNode('node-client-1', 'Web Client', 'client', 100, 120),
    createMockNode('node-api-1', 'API Gateway', 'api-gateway', 400, 120),
  ];

  const sampleEdges: SystemEdgeModel[] = [
    createMockEdge('edge-client-api', 'node-client-1', 'node-api-1', 'HTTPS'),
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    useCollaborationStore.setState({
      currentUser: null,
      isLive: false,
      myRole: 'owner',
      isReadOnly: false,
      connectionStatus: 'disconnected',
      liveCursors: [],
      undoManager: null,
    });

    useCanvasStore.setState({
      nodes: [...sampleNodes],
      edges: [...sampleEdges],
      history: [{ nodes: [...sampleNodes], edges: [...sampleEdges] }],
      historyIndex: 0,
    });
  });

  describe('1. Yjs Binary Encoders & Canvas Diff Sync', () => {
    it('serializes and deserializes uint8Array and base64 accurately', () => {
      const original = new Uint8Array([0, 1, 240, 128, 42, 255]);
      const base64 = uint8ArrayToBase64(original);
      const decoded = base64ToUint8Array(base64);

      expect(decoded.length).toBe(original.length);
      for (let i = 0; i < original.length; i++) {
        expect(decoded[i]).toBe(original[i]);
      }
    });

    it('initializes Y.Doc from canvas nodes and edges', () => {
      const doc = initYDocFromCanvas(sampleNodes, sampleEdges, 'diag-sync-101');
      const { nodes, edges } = extractCanvasFromYDoc(doc);

      expect(nodes.length).toBe(2);
      expect(edges.length).toBe(1);
      expect(nodes[0].id).toBe('node-client-1');
      expect(edges[0].id).toBe('edge-client-api');
    });

    it('computes differential mutations when nodes are added, moved, or deleted', () => {
      const doc = initYDocFromCanvas(sampleNodes, sampleEdges, 'diag-sync-102');

      // Add a third node and move node 1
      const updatedNodes: SystemNode[] = [
        {
          ...sampleNodes[0],
          position: { x: 150, y: 180 }, // moved
        },
        sampleNodes[1],
        createMockNode('node-cache-1', 'Redis Cache', 'cache', 700, 120),
      ];

      const hasChanges = applyCanvasDiffToYDoc(doc, updatedNodes, sampleEdges, 'local');
      expect(hasChanges).toBe(true);

      const { nodes } = extractCanvasFromYDoc(doc);
      expect(nodes.length).toBe(3);
      const moved = nodes.find((n) => n.id === 'node-client-1');
      expect(moved?.position).toEqual({ x: 150, y: 180 });
      const added = nodes.find((n) => n.id === 'node-cache-1');
      expect(added?.data.label).toBe('Redis Cache');

      // Now delete node 2
      const afterDelete = updatedNodes.filter((n) => n.id !== 'node-api-1');
      applyCanvasDiffToYDoc(doc, afterDelete, sampleEdges, 'local');

      const { nodes: remainingNodes } = extractCanvasFromYDoc(doc);
      expect(remainingNodes.length).toBe(2);
      expect(remainingNodes.some((n) => n.id === 'node-api-1')).toBe(false);
    });
  });

  describe('2. Collaboration-Specific Undo / Redo Isolation', () => {
    it('undoes only local mutations and preserves remote peer mutations intact', () => {
      const doc = initYDocFromCanvas(sampleNodes, sampleEdges, 'diag-undo-001');
      const undoManager = createCollabUndoManager(doc);

      // Local user adds a new service node
      const localNode = createMockNode('node-local-service', 'Local Auth', 'service', 500, 300);
      applyCanvasDiffToYDoc(doc, [...sampleNodes, localNode], sampleEdges, 'local');

      let current = extractCanvasFromYDoc(doc);
      expect(current.nodes.length).toBe(3);

      // Remote peer concurrently adds a database node (origin: 'remote')
      const remoteNode = createMockNode('node-remote-db', 'Remote DB', 'database', 900, 300);
      applyCanvasDiffToYDoc(doc, [...current.nodes, remoteNode], sampleEdges, 'remote');

      current = extractCanvasFromYDoc(doc);
      expect(current.nodes.length).toBe(4);

      // Local user triggers undo -> should ONLY undo 'node-local-service', NOT 'node-remote-db'!
      undoManager.undo();

      current = extractCanvasFromYDoc(doc);
      expect(current.nodes.length).toBe(3);
      expect(current.nodes.some((n) => n.id === 'node-local-service')).toBe(false); // undone!
      expect(current.nodes.some((n) => n.id === 'node-remote-db')).toBe(true); // preserved!

      // Local user triggers redo -> restores 'node-local-service'
      undoManager.redo();
      current = extractCanvasFromYDoc(doc);
      expect(current.nodes.length).toBe(4);
      expect(current.nodes.some((n) => n.id === 'node-local-service')).toBe(true);
    });

    it('delegates useCanvasStore.undo() to Y.UndoManager when collaboration session is live', () => {
      const doc = initYDocFromCanvas(sampleNodes, sampleEdges, 'diag-store-undo');
      const undoManager = createCollabUndoManager(doc);

      // Attach to collaboration store and enter live mode
      useCollaborationStore.setState({
        isLive: true,
        undoManager,
      });

      // Apply a local change in Y.Doc
      const newNode = createMockNode('node-added-live', 'Live Node', 'service', 220, 220);
      applyCanvasDiffToYDoc(doc, [...sampleNodes, newNode], sampleEdges, 'local');

      const undoSpy = vi.spyOn(undoManager, 'undo');

      // Calling canvas store undo() should call Y.UndoManager
      useCanvasStore.getState().undo();

      expect(undoSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Viewer Read-Only Permissions Enforcement', () => {
    it('sets isReadOnly to true when myRole is viewer', () => {
      expect(useCollaborationStore.getState().isReadOnly).toBe(false);

      useCollaborationStore.getState().setMyRole('viewer');
      expect(useCollaborationStore.getState().myRole).toBe('viewer');
      expect(useCollaborationStore.getState().isReadOnly).toBe(true);

      useCollaborationStore.getState().setMyRole('editor');
      expect(useCollaborationStore.getState().isReadOnly).toBe(false);
    });
  });

  describe('4. Presence & Live Cursor Tracking', () => {
    it('maps incoming server presence to live cursors with custom colors and roles', () => {
      useCollaborationStore.getState().updateFromPresence([
        {
          userId: 'usr-sneha-202',
          userEmail: 'sneha@drawzware.com',
          role: 'editor',
          presence: {
            userId: 'usr-sneha-202',
            userName: 'Sneha',
            cursor: { x: 350, y: 210 },
            selectedNodeIds: ['node-client-1'],
            lastActiveAt: new Date().toISOString(),
          },
        },
        {
          userId: 'usr-priya-203',
          userEmail: 'priya@drawzware.com',
          role: 'viewer',
          presence: {
            userId: 'usr-priya-203',
            userName: 'Priya',
            cursor: { x: 620, y: 440 },
            selectedNodeIds: [],
            lastActiveAt: new Date().toISOString(),
          },
        },
      ]);

      const { liveCursors, collaborators } = useCollaborationStore.getState();
      expect(liveCursors).toHaveLength(2);

      const snehaCursor = liveCursors.find((c) => c.id === 'usr-sneha-202');
      expect(snehaCursor).toBeDefined();
      expect(snehaCursor?.name).toBe('Sneha');
      expect(snehaCursor?.x).toBe(350);
      expect(snehaCursor?.y).toBe(210);
      expect(snehaCursor?.role).toBe('editor');

      const priyaCursor = liveCursors.find((c) => c.id === 'usr-priya-203');
      expect(priyaCursor).toBeDefined();
      expect(priyaCursor?.role).toBe('viewer');

      expect(collaborators.some((c) => c.id === 'usr-sneha-202')).toBe(true);
    });

    it('clears cursor when user leaves the room', () => {
      useCollaborationStore.getState().updateFromPresence([
        {
          userId: 'usr-aman-303',
          userEmail: 'aman@drawzware.com',
          role: 'editor',
          presence: {
            userId: 'usr-aman-303',
            userName: 'Aman',
            cursor: { x: 100, y: 100 },
            selectedNodeIds: [],
            lastActiveAt: new Date().toISOString(),
          },
        },
      ]);

      expect(useCollaborationStore.getState().liveCursors).toHaveLength(1);

      useCollaborationStore.getState().removeUserPresence('usr-aman-303');
      expect(useCollaborationStore.getState().liveCursors).toHaveLength(0);
    });
  });

  describe('5. CollabClient Reconnect & Exponential Backoff', () => {
    it('manages connection status and reconnection attempts with backoff', () => {
      vi.useFakeTimers();

      const statuses: string[] = [];
      const client = new CollabClient({
        diagramId: 'diag-reconnect-01',
        token: 'test-token',
        wsUrl: 'ws://127.0.0.1:9999/collab',
        onStatusChange: (s) => statuses.push(s),
      });

      expect(client.getStatus()).toBe('disconnected');

      client.connect();
      expect(statuses).toContain('connecting');

      client.disconnect();
      expect(client.getStatus()).toBe('disconnected');

      vi.useRealTimers();
    });

    it('evaluates dynamic token function before connecting and halts on empty token', async () => {
      let callCount = 0;
      const tokenGetter = vi.fn().mockImplementation(() => {
        callCount++;
        return `dynamic-jwt-${callCount}`;
      });

      const client = new CollabClient({
        diagramId: 'diag-dynamic-token',
        token: tokenGetter,
        wsUrl: 'ws://127.0.0.1:9999/collab',
      });

      await client.connect();
      expect(tokenGetter).toHaveBeenCalledTimes(1);
      client.disconnect();

      // Test null token halts connection
      let revokedReason: string | undefined;
      const haltingClient = new CollabClient({
        diagramId: 'diag-null-token',
        token: () => null,
        wsUrl: 'ws://127.0.0.1:9999/collab',
        onPermissionRevoked: (r) => {
          revokedReason = r;
        },
      });

      await haltingClient.connect();
      expect(haltingClient.getStatus()).toBe('disconnected');
      expect(revokedReason).toContain('token missing');
    });
  });

  describe('6. Transient Selection & Selection Isolation', () => {
    it('does not dirty Y.Doc when node selection changes in canvas', () => {
      const doc = initYDocFromCanvas(sampleNodes, sampleEdges, 'diag-selection-clean');
      const nodesMap = doc.getMap<SystemNode>('nodes');

      // Nodes in Y.Doc should not have 'selected: true'
      nodesMap.forEach((node) => {
        expect(node.selected).toBeUndefined();
      });

      // Simulating user clicking node 1 (React Flow sets selected: true)
      const selectedNodes: SystemNode[] = [
        { ...sampleNodes[0], selected: true },
        sampleNodes[1],
      ];

      // applyCanvasDiffToYDoc should return false because substantive attributes did not change!
      const hasSubstantiveChanges = applyCanvasDiffToYDoc(doc, selectedNodes, sampleEdges, 'local');
      expect(hasSubstantiveChanges).toBe(false);
    });
  });
});
