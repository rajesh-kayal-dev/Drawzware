import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import { createApp } from '../apps/api/src/app.js';
import * as diagramRepo from '../apps/api/src/repositories/diagram.repository.js';
import * as memberRepo from '../apps/api/src/repositories/workspace-member.repository.js';
import { attachCollaborationServer, CollabServer } from '../apps/api/src/websocket/collab.server.js';
import {
  initYDocFromProject,
  yDocToProject,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '../apps/api/src/websocket/crdt.service.js';
import { CollabClient } from '../apps/web/src/features/collaboration/services/collab.client.js';
import {
  initYDocFromCanvas,
  extractCanvasFromYDoc,
  applyCanvasDiffToYDoc,
  createCollabUndoManager,
} from '../apps/web/src/features/collaboration/utils/yjs-sync.js';
import type { SystemNode, SystemEdge as SystemEdgeModel } from '../apps/web/src/features/canvas/types/canvas.types.js';
import { Project, ProjectSchema, WorkspaceRole } from '@drawzware/contracts';

describe('DrawzWare Phase 4: End-to-End Real Multi-Client Collaboration Validation', () => {
  const JWT_SECRET = 'drawzware-e2e-test-jwt-secret-key-32chars!';
  const sampleWorkspaceId = '660000000000000000000001';

  const userA = { id: 'usr-alice-101', email: 'alice@drawzware.com' };
  const userB = { id: 'usr-bob-102', email: 'bob@drawzware.com' };
  const userC = { id: 'usr-charlie-103', email: 'charlie@drawzware.com' };

  let tokenA: string;
  let tokenB: string;
  let tokenC: string;

  let httpServer: http.Server;
  let collabServer: CollabServer;
  let wsUrl: string;

  // In-memory mock database store to verify MongoDB persistence
  let persistedSnapshot: {
    diagramId: string;
    state: Project;
    version: number;
    updatedAt: Date;
  } | null = null;

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

  // Client Simulation Context: bridges CollabClient and local Y.Doc like useCollaborationSync
  interface SimulatedClientContext {
    client: CollabClient;
    doc: Y.Doc;
    undoManager: Y.UndoManager;
    receivedErrors: Array<{ code: string; message: string }>;
    syncWithCanvas: (newNodes: SystemNode[], newEdges: SystemEdgeModel[]) => void;
  }

  function setupClientContext(
    diagramId: string,
    token: string,
    role: WorkspaceRole,
    initialNodes: SystemNode[] = [],
    initialEdges: SystemEdgeModel[] = []
  ): SimulatedClientContext {
    const doc = initYDocFromCanvas(initialNodes, initialEdges, diagramId);
    const undoManager = createCollabUndoManager(doc);
    const receivedErrors: Array<{ code: string; message: string }> = [];

    const client = new CollabClient({
      diagramId,
      token,
      wsUrl,
      role,
      onStatusChange: (status) => {
        if (status === 'connected') {
          const vectorBase64 = uint8ArrayToBase64(Y.encodeStateVector(doc));
          client.sendSyncStep1(vectorBase64);
        }
      },
      onSyncStep1: (serverVectorBase64) => {
        if (role === 'viewer') return;
        try {
          const serverVector = base64ToUint8Array(serverVectorBase64);
          const diffForServer = Y.encodeStateAsUpdate(doc, serverVector);
          if (diffForServer.byteLength > 2) {
            client.sendSyncUpdate(uint8ArrayToBase64(diffForServer));
          }
        } catch {}
      },
      onSyncStep2: (updateBase64) => {
        try {
          const updateBytes = base64ToUint8Array(updateBase64);
          Y.applyUpdate(doc, updateBytes, 'remote-init');
        } catch {}
      },
      onRemoteUpdate: (updateBase64) => {
        try {
          const updateBytes = base64ToUint8Array(updateBase64);
          Y.applyUpdate(doc, updateBytes, 'remote');
        } catch {}
      },
      onError: (err) => {
        receivedErrors.push(err);
      },
    });

    // Broadcast local updates
    doc.on('update', (updateBytes: Uint8Array, origin: unknown) => {
      if (origin === 'local' || origin === undoManager) {
        if (role !== 'viewer') {
          client.sendSyncUpdate(uint8ArrayToBase64(updateBytes));
        }
      }
    });

    const syncWithCanvas = (newNodes: SystemNode[], newEdges: SystemEdgeModel[]) => {
      applyCanvasDiffToYDoc(doc, newNodes, newEdges, 'local');
    };

    return { client, doc, undoManager, receivedErrors, syncWithCanvas };
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    tokenA = jwt.sign({ id: userA.id, email: userA.email }, JWT_SECRET, { expiresIn: '2h' });
    tokenB = jwt.sign({ id: userB.id, email: userB.email }, JWT_SECRET, { expiresIn: '2h' });
    tokenC = jwt.sign({ id: userC.id, email: userC.email }, JWT_SECRET, { expiresIn: '2h' });

    const app = createApp();
    httpServer = http.createServer(app);
    collabServer = attachCollaborationServer(httpServer, { path: '/collab' });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address() as AddressInfo;
        wsUrl = `ws://127.0.0.1:${addr.port}/collab`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await collabServer.close();
    httpServer.closeAllConnections?.();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    persistedSnapshot = null;

    vi.spyOn(diagramRepo, 'findDiagramDocById').mockImplementation(async (id: string) => {
      return {
        _id: id,
        id: id,
        workspaceId: sampleWorkspaceId,
        title: 'Distributed Cloud Architecture',
        diagramType: 'architecture',
        createdBy: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    });

    vi.spyOn(memberRepo, 'findWorkspaceMemberDoc').mockImplementation(async (wsId: string, uId: string) => {
      if (wsId !== sampleWorkspaceId) return null;
      if (uId === userA.id) return { workspaceId: wsId, userId: uId, role: 'editor', userEmail: userA.email } as any;
      if (uId === userB.id) return { workspaceId: wsId, userId: uId, role: 'editor', userEmail: userB.email } as any;
      if (uId === userC.id) return { workspaceId: wsId, userId: uId, role: 'viewer', userEmail: userC.email } as any;
      return null;
    });

    vi.spyOn(diagramRepo, 'findDiagramSnapshotDoc').mockImplementation(async (diagramId: string) => {
      if (persistedSnapshot && persistedSnapshot.diagramId === diagramId) {
        return persistedSnapshot as any;
      }
      return null;
    });

    vi.spyOn(diagramRepo, 'saveDiagramSnapshotDoc').mockImplementation(
      async (diagramId: string, state: Project, clientVersion?: number) => {
        if (!persistedSnapshot) {
          persistedSnapshot = {
            diagramId,
            state,
            version: 1,
            updatedAt: new Date(),
          };
          return { success: true, snapshot: persistedSnapshot as any };
        }
        const nextVersion = (clientVersion ?? persistedSnapshot.version) + 1;
        persistedSnapshot = {
          diagramId,
          state,
          version: nextVersion,
          updatedAt: new Date(),
        };
        return { success: true, snapshot: persistedSnapshot as any };
      }
    );
  });

  afterEach(async () => {
    collabServer.getRooms().clear();
    const crdt = collabServer.getCrdtManager() as any;
    if (crdt?.sessions) {
      crdt.sessions.clear();
    }
    await new Promise((r) => setTimeout(r, 60));
  });

  it('1. Connects two real clients and synchronizes node and edge mutations bi-directionally', async () => {
    const diagId = '660000000000000000000011';
    const clientCtxA = setupClientContext(diagId, tokenA, 'editor');
    const clientCtxB = setupClientContext(diagId, tokenB, 'editor');

    await clientCtxA.client.connect();
    await clientCtxB.client.connect();
    await new Promise((r) => setTimeout(r, 150));

    // Client A adds node 1 and node 2 and edge
    const node1 = createMockNode('node-srv-1', 'Order Service', 'service', 100, 100);
    const node2 = createMockNode('node-db-1', 'Order DB', 'database', 400, 100);
    const edge1 = createMockEdge('edge-1-2', 'node-srv-1', 'node-db-1', 'gRPC');

    clientCtxA.syncWithCanvas([node1, node2], [edge1]);
    await new Promise((r) => setTimeout(r, 200));

    // Verify Client B received the updates via WebSocket
    const canvasB = extractCanvasFromYDoc(clientCtxB.doc);
    expect(canvasB.nodes).toHaveLength(2);
    expect(canvasB.edges).toHaveLength(1);
    expect(canvasB.nodes.find((n) => n.id === 'node-srv-1')?.data.label).toBe('Order Service');

    // Client B moves node 1 and updates label
    const updatedNode1 = {
      ...node1,
      position: { x: 250, y: 180 },
      data: { ...node1.data, label: 'Order Microservice' },
    };
    clientCtxB.syncWithCanvas([updatedNode1, node2], [edge1]);
    await new Promise((r) => setTimeout(r, 200));

    // Verify Client A received Client B's move
    const canvasA = extractCanvasFromYDoc(clientCtxA.doc);
    expect(canvasA.nodes.find((n) => n.id === 'node-srv-1')?.position).toEqual({ x: 250, y: 180 });
    expect(canvasA.nodes.find((n) => n.id === 'node-srv-1')?.data.label).toBe('Order Microservice');

    clientCtxA.client.disconnect();
    clientCtxB.client.disconnect();
  });

  it('2. Mathematically converges when two clients perform simultaneous concurrent edits', async () => {
    const diagId = '660000000000000000000012';
    const clientCtxA = setupClientContext(diagId, tokenA, 'editor');
    const clientCtxB = setupClientContext(diagId, tokenB, 'editor');

    await clientCtxA.client.connect();
    await clientCtxB.client.connect();
    await new Promise((r) => setTimeout(r, 150));

    // Base state: 2 initial nodes
    const baseNode1 = createMockNode('base-1', 'Gateway', 'api-gateway', 100, 100);
    const baseNode2 = createMockNode('base-2', 'Auth Service', 'service', 300, 100);
    clientCtxA.syncWithCanvas([baseNode1, baseNode2], []);
    await new Promise((r) => setTimeout(r, 150));

    // Simultaneous concurrent edits:
    // Client A adds Node A-Concurrent and moves base-1
    const nodeA = createMockNode('node-a-conc', 'Redis Cache', 'cache', 100, 300);
    const movedBase1 = { ...baseNode1, position: { x: 120, y: 140 } };

    // Client B simultaneously adds Node B-Concurrent and updates base-2 label
    const nodeB = createMockNode('node-b-conc', 'Kafka Stream', 'queue', 500, 100);
    const updatedBase2 = { ...baseNode2, data: { ...baseNode2.data, label: 'Auth & Session Service' } };

    // Trigger both at same tick
    clientCtxA.syncWithCanvas([movedBase1, baseNode2, nodeA], []);
    clientCtxB.syncWithCanvas([baseNode1, updatedBase2, nodeB], []);

    // Wait for WS broadcast and convergence
    await new Promise((r) => setTimeout(r, 350));

    const finalA = extractCanvasFromYDoc(clientCtxA.doc);
    const finalB = extractCanvasFromYDoc(clientCtxB.doc);

    // Both clients must contain all 4 nodes
    expect(finalA.nodes).toHaveLength(4);
    expect(finalB.nodes).toHaveLength(4);

    // Check convergence of all node IDs
    const idsA = finalA.nodes.map((n) => n.id).sort();
    const idsB = finalB.nodes.map((n) => n.id).sort();
    expect(idsA).toEqual(idsB);

    // Check both see Kafka Stream and Redis Cache
    expect(finalA.nodes.some((n) => n.id === 'node-a-conc')).toBe(true);
    expect(finalA.nodes.some((n) => n.id === 'node-b-conc')).toBe(true);
    expect(finalB.nodes.some((n) => n.id === 'node-a-conc')).toBe(true);
    expect(finalB.nodes.some((n) => n.id === 'node-b-conc')).toBe(true);

    clientCtxA.client.disconnect();
    clientCtxB.client.disconnect();
  });

  it('3. Reconnects cleanly and propagates edits made while disconnected', async () => {
    const diagId = '660000000000000000000013';
    const clientCtxA = setupClientContext(diagId, tokenA, 'editor');
    const clientCtxB = setupClientContext(diagId, tokenB, 'editor');

    await clientCtxA.client.connect();
    await clientCtxB.client.connect();
    await new Promise((r) => setTimeout(r, 150));

    const baseNode = createMockNode('base-node-1', 'Initial Node', 'service', 100, 100);
    clientCtxA.syncWithCanvas([baseNode], []);
    await new Promise((r) => setTimeout(r, 150));

    // Client A drops connection (simulate network disconnect)
    clientCtxA.client.disconnect();
    expect(clientCtxA.client.getStatus()).toBe('disconnected');

    // While Client A is disconnected:
    // 1. Client A creates a node offline
    const offlineNodeA = createMockNode('offline-node-a', 'Offline Ingress', 'load-balancer', 50, 50);
    clientCtxA.syncWithCanvas([baseNode, offlineNodeA], []);

    // 2. Client B creates a node online
    const onlineNodeB = createMockNode('online-node-b', 'Online Worker', 'worker', 400, 200);
    clientCtxB.syncWithCanvas([baseNode, onlineNodeB], []);
    await new Promise((r) => setTimeout(r, 150));

    // Now Client A reconnects
    await clientCtxA.client.connect();
    // Wait for bidirectional handshake to reconcile offline diffs
    await new Promise((r) => setTimeout(r, 350));

    const reconciledA = extractCanvasFromYDoc(clientCtxA.doc);
    const reconciledB = extractCanvasFromYDoc(clientCtxB.doc);

    // Both should contain: base-node-1, offline-node-a, and online-node-b
    expect(reconciledA.nodes).toHaveLength(3);
    expect(reconciledB.nodes).toHaveLength(3);

    expect(reconciledB.nodes.some((n) => n.id === 'offline-node-a')).toBe(true);
    expect(reconciledA.nodes.some((n) => n.id === 'online-node-b')).toBe(true);

    clientCtxA.client.disconnect();
    clientCtxB.client.disconnect();
  });

  it('4. Merges pre-existing offline diagram when transitioning into cloud collaboration', async () => {
    const diagId = '660000000000000000000014';
    // Cloud room already has a cloud node
    const preExistingServerProject: Project = {
      id: diagId,
      name: 'Distributed Cloud Architecture',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: 'cloud-node-origin',
          type: 'custom',
          position: { x: 300, y: 300 },
          data: { label: 'Server Origin Cloud' },
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      diagramType: 'architecture',
    };
    persistedSnapshot = {
      diagramId: diagId,
      state: preExistingServerProject,
      version: 1,
      updatedAt: new Date(),
    };

    // User A was working offline on local design with 2 nodes
    const localOfflineNode1 = createMockNode('local-1', 'Local Client', 'client', 50, 50);
    const localOfflineNode2 = createMockNode('local-2', 'Local Backend', 'service', 200, 50);

    const clientCtxA = setupClientContext(
      diagId,
      tokenA,
      'editor',
      [localOfflineNode1, localOfflineNode2],
      []
    );

    // User A connects to cloud room
    await clientCtxA.client.connect();
    await new Promise((r) => setTimeout(r, 350));

    const merged = extractCanvasFromYDoc(clientCtxA.doc);

    // The merged diagram must contain both the cloud origin node AND the offline local nodes
    expect(merged.nodes.length).toBeGreaterThanOrEqual(3);
    expect(merged.nodes.some((n) => n.id === 'cloud-node-origin')).toBe(true);
    expect(merged.nodes.some((n) => n.id === 'local-1')).toBe(true);
    expect(merged.nodes.some((n) => n.id === 'local-2')).toBe(true);

    clientCtxA.client.disconnect();
  });

  it('5. Enforces collaboration-specific undo/redo isolation between two clients', async () => {
    const diagId = '660000000000000000000015';
    const clientCtxA = setupClientContext(diagId, tokenA, 'editor');
    const clientCtxB = setupClientContext(diagId, tokenB, 'editor');

    await clientCtxA.client.connect();
    await clientCtxB.client.connect();
    await new Promise((r) => setTimeout(r, 150));

    // Base node
    const baseNode = createMockNode('shared-base', 'Shared Base', 'service', 100, 100);
    clientCtxA.syncWithCanvas([baseNode], []);
    clientCtxA.undoManager.stopCapturing();
    await new Promise((r) => setTimeout(r, 150));

    // Client A adds an undoable node
    const nodeA = createMockNode('node-a-undo', 'Alice Temp Service', 'service', 100, 300);
    clientCtxA.syncWithCanvas([baseNode, nodeA], []);
    clientCtxA.undoManager.stopCapturing();
    await new Promise((r) => setTimeout(r, 150));

    // Client B concurrently adds a keeper node
    const nodeB = createMockNode('node-b-keeper', 'Bob Important DB', 'database', 500, 300);
    clientCtxB.syncWithCanvas([baseNode, nodeA, nodeB], []);
    await new Promise((r) => setTimeout(r, 200));

    let currentA = extractCanvasFromYDoc(clientCtxA.doc);
    let currentB = extractCanvasFromYDoc(clientCtxB.doc);
    expect(currentA.nodes).toHaveLength(3);
    expect(currentB.nodes).toHaveLength(3);

    // Client A triggers undo -> MUST ONLY UNDO node-a-undo, NOT node-b-keeper!
    clientCtxA.undoManager.undo();
    await new Promise((r) => setTimeout(r, 200));

    currentA = extractCanvasFromYDoc(clientCtxA.doc);
    currentB = extractCanvasFromYDoc(clientCtxB.doc);

    // Both should now have 2 nodes: shared-base and node-b-keeper
    expect(currentA.nodes).toHaveLength(2);
    expect(currentB.nodes).toHaveLength(2);
    expect(currentA.nodes.some((n) => n.id === 'node-a-undo')).toBe(false);
    expect(currentB.nodes.some((n) => n.id === 'node-a-undo')).toBe(false);
    expect(currentA.nodes.some((n) => n.id === 'node-b-keeper')).toBe(true);
    expect(currentB.nodes.some((n) => n.id === 'node-b-keeper')).toBe(true);

    // Client A triggers redo -> restores node-a-undo
    clientCtxA.undoManager.redo();
    await new Promise((r) => setTimeout(r, 200));

    currentA = extractCanvasFromYDoc(clientCtxA.doc);
    expect(currentA.nodes).toHaveLength(3);
    expect(currentA.nodes.some((n) => n.id === 'node-a-undo')).toBe(true);

    clientCtxA.client.disconnect();
    clientCtxB.client.disconnect();
  });

  it('6. Blocks viewer from mutating canvas and rejects sync_update with INSUFFICIENT_PERMISSIONS', async () => {
    const diagId = '660000000000000000000016';
    const clientCtxA = setupClientContext(diagId, tokenA, 'editor');
    const clientCtxViewer = setupClientContext(diagId, tokenC, 'viewer');

    await clientCtxA.client.connect();
    await clientCtxViewer.client.connect();
    await new Promise((r) => setTimeout(r, 150));

    const baseNode = createMockNode('legit-node', 'Legit Service', 'service', 100, 100);
    clientCtxA.syncWithCanvas([baseNode], []);
    await new Promise((r) => setTimeout(r, 150));

    // Viewer tries to inject a mutation directly over WebSocket
    const forgedDoc = new Y.Doc();
    forgedDoc.getMap('nodes').set('hacked-node', {
      id: 'hacked-node',
      type: 'custom',
      position: { x: 0, y: 0 },
      data: { label: 'Hacked' },
    });
    const forgedUpdate = uint8ArrayToBase64(Y.encodeStateAsUpdate(forgedDoc));

    clientCtxViewer.client.sendSyncUpdate(forgedUpdate);
    await new Promise((r) => setTimeout(r, 200));

    // Assert error received by viewer
    expect(clientCtxViewer.receivedErrors.some((e) => e.code === 'INSUFFICIENT_PERMISSIONS')).toBe(true);

    // Assert document was NOT mutated
    const docStateA = extractCanvasFromYDoc(clientCtxA.doc);
    expect(docStateA.nodes.some((n) => n.id === 'hacked-node')).toBe(false);

    clientCtxA.client.disconnect();
    clientCtxViewer.client.disconnect();
  });

  it('7. Persists final converged state into MongoDB and restores full fidelity upon server restart', async () => {
    const diagId = '660000000000000000000017';
    const clientCtxA = setupClientContext(diagId, tokenA, 'editor');
    await clientCtxA.client.connect();
    await new Promise((r) => setTimeout(r, 150));

    const node1 = createMockNode('persist-svc', 'Order API', 'service', 120, 150);
    const node2 = createMockNode('persist-db', 'Order PostgreSQL', 'database', 450, 150);
    const edge = createMockEdge('persist-edge', 'persist-svc', 'persist-db', 'TCP/5432');

    clientCtxA.syncWithCanvas([node1, node2], [edge]);
    await new Promise((r) => setTimeout(r, 200));

    // Disconnect client A first so room can be cleanly closed
    clientCtxA.client.disconnect();

    // Explicitly flush and close server CRDT session to trigger MongoDB snapshot save
    const crdtManager = collabServer.getCrdtManager();
    await crdtManager.flushAndCloseSession(diagId);

    // Verify snapshot in database mock
    expect(persistedSnapshot).not.toBeNull();
    expect(persistedSnapshot!.state.nodes).toHaveLength(2);
    expect(persistedSnapshot!.state.edges).toHaveLength(1);
    expect(persistedSnapshot!.version).toBeGreaterThanOrEqual(1);

    const schemaValidation = ProjectSchema.safeParse(persistedSnapshot!.state);
    expect(schemaValidation.success).toBe(true);

    // ── Simulate Server Restart & In-Memory Cache Loss ─────
    // Purge server in-memory CRDT sessions to simulate full server process restart
    const crdt = collabServer.getCrdtManager() as any;
    if (crdt?.sessions) {
      crdt.sessions.clear();
    }
    collabServer.getRooms().clear();

    // Connect a completely new Client E to the server (must reload from MongoDB)
    const clientDocE = new Y.Doc();
    const clientE = new CollabClient({
      diagramId: diagId,
      token: tokenB,
      wsUrl,
      role: 'editor',
      onStatusChange: (status) => {
        if (status === 'connected') {
          clientE.sendSyncStep1(uint8ArrayToBase64(Y.encodeStateVector(clientDocE)));
        }
      },
      onSyncStep2: (updateBase64) => {
        Y.applyUpdate(clientDocE, base64ToUint8Array(updateBase64), 'remote-init');
      },
    });

    await clientE.connect();
    await new Promise((r) => setTimeout(r, 300));

    // Verify Client E received the persisted snapshot from MongoDB with 100% fidelity
    const restoredCanvas = extractCanvasFromYDoc(clientDocE);
    expect(restoredCanvas.nodes).toHaveLength(2);
    expect(restoredCanvas.edges).toHaveLength(1);

    const restoredSvc = restoredCanvas.nodes.find((n) => n.id === 'persist-svc');
    expect(restoredSvc?.data.label).toBe('Order API');
    expect(restoredSvc?.position).toEqual({ x: 120, y: 150 });

    const restoredEdge = restoredCanvas.edges.find((e) => e.id === 'persist-edge');
    expect(restoredEdge?.data?.label).toBe('TCP/5432');

    clientE.disconnect();
  });
});
