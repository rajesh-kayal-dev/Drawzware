import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import { createApp } from '../src/app.js';
import * as diagramRepo from '../src/repositories/diagram.repository.js';
import * as memberRepo from '../src/repositories/workspace-member.repository.js';
import * as userRepo from '../src/repositories/user.repository.js';
import { attachCollaborationServer, CollabServer } from '../src/websocket/collab.server.js';
import {
  initYDocFromProject,
  yDocToProject,
  CrdtManager,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '../src/websocket/crdt.service.js';
import {
  CollabServerMessage,
  CollabClientMessage,
  Project,
  ProjectSchema,
} from '@drawzware/contracts';

interface TestWsClient {
  ws: WebSocket;
  waitForMessage: (timeoutMs?: number) => Promise<CollabServerMessage>;
  messages: CollabServerMessage[];
  close: () => void;
  send: (msg: CollabClientMessage) => void;
}

describe('Phase 3: Yjs CRDT Collaboration & Safe MongoDB Snapshot Persistence', () => {
  const sampleProject: Project = {
    id: 'proj-crdt-test-01',
    name: 'Distributed Event-Driven Architecture',
    description: 'High throughput event streaming pipeline',
    createdAt: '2026-10-25T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z',
    nodes: [
      {
        id: 'node-gateway-1',
        type: 'custom',
        position: { x: 120, y: 80 },
        data: { label: 'API Gateway', service: 'ingress' },
      },
      {
        id: 'node-kafka-1',
        type: 'custom',
        position: { x: 380, y: 160 },
        data: { label: 'Kafka Cluster', partitions: 12 },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'node-gateway-1',
        target: 'node-kafka-1',
        label: 'Produce Events',
      },
    ],
    viewport: { x: 10, y: 20, zoom: 1.2 },
    diagramType: 'architecture',
  };

  describe('CRDT Document Hydration & Schema Serialization', () => {
    it('hydrates Y.Doc from canonical Project and preserves data fidelity', () => {
      const doc = initYDocFromProject(sampleProject);
      const meta = doc.getMap('meta');
      const nodes = doc.getMap('nodes');
      const edges = doc.getMap('edges');

      expect(meta.get('name')).toBe('Distributed Event-Driven Architecture');
      expect(meta.get('id')).toBe('proj-crdt-test-01');
      expect(nodes.size).toBe(2);
      expect(edges.size).toBe(1);

      const gatewayNode = nodes.get('node-gateway-1') as any;
      expect(gatewayNode.data.label).toBe('API Gateway');

      const serialized = yDocToProject(doc, 'proj-crdt-test-01');
      expect(serialized.id).toBe('proj-crdt-test-01');
      expect(serialized.name).toBe('Distributed Event-Driven Architecture');
      expect(serialized.nodes.length).toBe(2);
      expect(serialized.edges.length).toBe(1);

      const validation = ProjectSchema.safeParse(serialized);
      expect(validation.success).toBe(true);
    });

    it('synchronizes edits between two Y.Docs via binary updates', () => {
      const serverDoc = initYDocFromProject(sampleProject);
      const clientDoc = new Y.Doc();

      // Client requests sync step 1
      const clientVector = Y.encodeStateVector(clientDoc);
      // Server generates sync step 2 diff
      const serverDiff = Y.encodeStateAsUpdate(serverDoc, clientVector);
      // Client applies diff
      Y.applyUpdate(clientDoc, serverDiff);

      // Verify client doc has identical nodes
      const clientNodes = clientDoc.getMap('nodes');
      expect(clientNodes.size).toBe(2);
      expect(clientNodes.has('node-gateway-1')).toBe(true);

      // Client performs local mutation (adds a new node)
      clientDoc.transact(() => {
        clientNodes.set('node-worker-1', {
          id: 'node-worker-1',
          type: 'custom',
          position: { x: 600, y: 240 },
          data: { label: 'Event Processor' },
        });
      });

      // Client encodes delta update to send to server
      const clientUpdate = Y.encodeStateAsUpdate(clientDoc, Y.encodeStateVector(serverDoc));
      // Server applies client delta
      Y.applyUpdate(serverDoc, clientUpdate);

      const serverNodes = serverDoc.getMap('nodes');
      expect(serverNodes.size).toBe(3);
      expect(serverNodes.has('node-worker-1')).toBe(true);

      const updatedProject = yDocToProject(serverDoc, 'proj-crdt-test-01');
      expect(updatedProject.nodes.length).toBe(3);
    });
  });

  describe('CrdtManager Persistence Lifecycle', () => {
    let savedSnapshot: any = null;

    beforeEach(() => {
      vi.restoreAllMocks();
      savedSnapshot = null;

      vi.spyOn(diagramRepo, 'findDiagramDocById').mockImplementation(async (diagramId: string) => {
        return {
          _id: diagramId,
          workspaceId: 'ws-mock',
          title: 'Mock Diagram',
          diagramType: 'architecture',
          createdBy: 'usr-mock',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
      });

      vi.spyOn(diagramRepo, 'findDiagramSnapshotDoc').mockImplementation(async (diagramId: string) => {
        if (savedSnapshot && savedSnapshot.diagramId === diagramId) {
          return savedSnapshot;
        }
        return null;
      });

      vi.spyOn(diagramRepo, 'saveDiagramSnapshotDoc').mockImplementation(
        async (diagramId: string, state: Project, clientVersion?: number, crdtState?: Buffer) => {
          if (!savedSnapshot) {
            savedSnapshot = { diagramId, state, version: 1, crdtState, updatedAt: new Date() };
            return { success: true, snapshot: savedSnapshot };
          }

          if (clientVersion !== undefined && clientVersion !== savedSnapshot.version) {
            return {
              success: false,
              conflict: true,
              currentVersion: savedSnapshot.version,
              currentSnapshot: savedSnapshot.state,
            };
          }

          const nextVersion = savedSnapshot.version + 1;
          savedSnapshot = {
            diagramId,
            state,
            version: nextVersion,
            updatedAt: new Date(),
          };
          return { success: true, snapshot: savedSnapshot };
        }
      );
    });

    it('creates initial session, debounces updates, and persists to MongoDB', async () => {
      const crdtManager = new CrdtManager({ debounceMs: 50 });
      const diagramId = 'diag-crdt-persist-01';

      // Load session
      const session = await crdtManager.getOrCreateSession(diagramId);
      expect(session.diagramId).toBe(diagramId);
      expect(session.isDirty).toBe(false);

      // Create a client update
      const clientDoc = new Y.Doc();
      const nodesMap = clientDoc.getMap('nodes');
      nodesMap.set('node-db-1', {
        id: 'node-db-1',
        type: 'custom',
        position: { x: 300, y: 400 },
        data: { label: 'MongoDB Primary' },
      });
      const updateBytes = Y.encodeStateAsUpdate(clientDoc);
      const updateBase64 = uint8ArrayToBase64(updateBytes);

      // Apply update
      const applyResult = await crdtManager.applyClientUpdate(diagramId, updateBase64);
      expect(applyResult.success).toBe(true);
      expect(session.isDirty).toBe(true);

      // Before debounce expires, snapshot not yet written
      expect(savedSnapshot).toBeNull();

      // Wait for debounce timer to fire
      await new Promise((r) => setTimeout(r, 80));

      expect(savedSnapshot).not.toBeNull();
      expect(savedSnapshot.diagramId).toBe(diagramId);
      expect(savedSnapshot.version).toBe(1);
      expect(session.isDirty).toBe(false);

      await crdtManager.closeAll();
    });

    it('flushes dirty changes immediately on flushAndCloseSession', async () => {
      const crdtManager = new CrdtManager({ debounceMs: 5000 }); // long debounce
      const diagramId = 'diag-crdt-flush-01';

      await crdtManager.getOrCreateSession(diagramId);

      const clientDoc = new Y.Doc();
      clientDoc.getMap('nodes').set('node-redis-1', {
        id: 'node-redis-1',
        type: 'custom',
        position: { x: 50, y: 50 },
        data: { label: 'Cache' },
      });
      const updateBase64 = uint8ArrayToBase64(Y.encodeStateAsUpdate(clientDoc));

      await crdtManager.applyClientUpdate(diagramId, updateBase64);

      // Flush and close immediately
      await crdtManager.flushAndCloseSession(diagramId);

      // Snapshot should be persisted immediately
      expect(savedSnapshot).not.toBeNull();
      expect(savedSnapshot.diagramId).toBe(diagramId);
      expect(crdtManager.getActiveSessionsCount()).toBe(0);
    });
  });

  describe('WebSocket Server Yjs Protocol & RBAC Integration', () => {
    const app = createApp();
    let server: http.Server;
    let collabServer: CollabServer;
    let port: number;
    const activeClients: WebSocket[] = [];

    const jwtSecret = 'test-crdt-jwt-secret';
    const originalSecret = process.env.JWT_SECRET;

    const userOwner = { id: 'usr-crdt-owner', email: 'owner@drawzware.com' };
    const userEditor = { id: 'usr-crdt-editor', email: 'editor@drawzware.com' };
    const userViewer = { id: 'usr-crdt-viewer', email: 'viewer@drawzware.com' };

    const tokenOwner = jwt.sign({ id: userOwner.id, email: userOwner.email, isEmailVerified: true }, jwtSecret, { expiresIn: '1h' });
    const tokenEditor = jwt.sign({ id: userEditor.id, email: userEditor.email, isEmailVerified: true }, jwtSecret, { expiresIn: '1h' });
    const tokenViewer = jwt.sign({ id: userViewer.id, email: userViewer.email, isEmailVerified: true }, jwtSecret, { expiresIn: '1h' });

    const sampleWorkspaceId = 'ws-crdt-workspace';
    const sampleDiagramId = 'diag-crdt-001';

    const sampleDiagram = {
      _id: sampleDiagramId,
      workspaceId: sampleWorkspaceId,
      title: 'Event Streaming Engine',
      diagramType: 'architecture',
      createdBy: userOwner.id,
      createdAt: new Date('2026-10-25T00:00:00.000Z'),
      updatedAt: new Date('2026-10-25T00:00:00.000Z'),
    };

    let persistedSnapshot: any = null;

    beforeAll(async () => {
      process.env.JWT_SECRET = jwtSecret;
      server = http.createServer(app);
      collabServer = attachCollaborationServer(server, {
        heartbeatIntervalMs: 0,
        crdtDebounceMs: 50,
      });

      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => {
          const address = server.address() as AddressInfo;
          port = address.port;
          resolve();
        });
      });
    });

    afterAll(async () => {
      process.env.JWT_SECRET = originalSecret;
      await collabServer.close();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    });

    beforeEach(() => {
      vi.restoreAllMocks();
      persistedSnapshot = null;

      vi.spyOn(diagramRepo, 'findDiagramDocById').mockImplementation(async (id: string) => {
        if (id === sampleDiagramId) return sampleDiagram as any;
        return null;
      });

      vi.spyOn(memberRepo, 'findWorkspaceMemberDoc').mockImplementation(async (wsId: string, uId: string) => {
        if (wsId !== sampleWorkspaceId) return null;
        if (uId === userOwner.id) {
          return { workspaceId: wsId, userId: uId, role: 'owner', userEmail: userOwner.email } as any;
        }
        if (uId === userEditor.id) {
          return { workspaceId: wsId, userId: uId, role: 'editor', userEmail: userEditor.email } as any;
        }
        if (uId === userViewer.id) {
          return { workspaceId: wsId, userId: uId, role: 'viewer', userEmail: userViewer.email } as any;
        }
        return null;
      });

      vi.spyOn(userRepo, 'findUserDocById').mockImplementation((async (id: string) => {
        return { _id: id, isEmailVerified: true, tokenVersion: 0 } as any;
      }) as any);

      vi.spyOn(diagramRepo, 'findDiagramSnapshotDoc').mockImplementation(async (diagramId: string) => {
        if (persistedSnapshot && persistedSnapshot.diagramId === diagramId) {
          return persistedSnapshot;
        }
        return null;
      });

      vi.spyOn(diagramRepo, 'saveDiagramSnapshotDoc').mockImplementation(
        async (diagramId: string, state: Project, clientVersion?: number, crdtState?: Buffer) => {
          if (!persistedSnapshot) {
            persistedSnapshot = { diagramId, state, version: 1, crdtState, updatedAt: new Date() };
            return { success: true, snapshot: persistedSnapshot };
          }
          const nextVersion = (clientVersion ?? persistedSnapshot.version) + 1;
          persistedSnapshot = {
            diagramId,
            state,
            version: nextVersion,
            crdtState: crdtState ?? persistedSnapshot.crdtState,
            updatedAt: new Date(),
          };
          return { success: true, snapshot: persistedSnapshot };
        }
      );
    });

    afterEach(async () => {
      for (const ws of activeClients) {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.close();
          } catch {}
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.on('error', () => {});
        }
      }
      activeClients.length = 0;
      await new Promise((r) => setTimeout(r, 50));
      collabServer.getRooms().clear();
    });

    function createClientWs(query: string): TestWsClient {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/collab?${query}`);
      ws.on('error', () => {});
      activeClients.push(ws);
      const messages: CollabServerMessage[] = [];
      const waiters: Array<{
        resolve: (msg: CollabServerMessage) => void;
        reject: (err: Error) => void;
        timer: NodeJS.Timeout;
      }> = [];

      ws.on('message', (data) => {
        try {
          const msg: CollabServerMessage = JSON.parse(data.toString());
          if (waiters.length > 0) {
            const waiter = waiters.shift()!;
            clearTimeout(waiter.timer);
            waiter.resolve(msg);
          } else {
            messages.push(msg);
          }
        } catch {}
      });

      const waitForMessage = (timeoutMs = 2000): Promise<CollabServerMessage> => {
        if (messages.length > 0) {
          return Promise.resolve(messages.shift()!);
        }
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            const idx = waiters.findIndex((w) => w.timer === timer);
            if (idx !== -1) waiters.splice(idx, 1);
            reject(new Error('Timeout waiting for WS message'));
          }, timeoutMs);
          waiters.push({ resolve, reject, timer });
        });
      };

      return {
        ws,
        waitForMessage,
        messages,
        close: () => {
          try {
            ws.close();
          } catch {}
        },
        send: (msg: CollabClientMessage) => {
          ws.send(JSON.stringify(msg));
        },
      };
    }

    it('handles sync_step_1 handshake and returns sync_step_2 with document update', async () => {
      const client = createClientWs(`token=${tokenOwner}&diagramId=${sampleDiagramId}`);
      await client.waitForMessage(); // room_joined
      await client.waitForMessage(); // presence_batch

      // Send sync_step_1 with empty client state vector
      const clientDoc = new Y.Doc();
      const clientVectorBase64 = uint8ArrayToBase64(Y.encodeStateVector(clientDoc));

      client.send({
        type: 'sync_step_1',
        diagramId: sampleDiagramId,
        payload: { stateVector: clientVectorBase64 },
      });

      const step2Msg = await client.waitForMessage();
      expect(step2Msg.type).toBe('sync_step_2');
      expect(step2Msg.diagramId).toBe(sampleDiagramId);
      expect(typeof step2Msg.payload?.update).toBe('string');

      // Server also returns sync_step_1 with server's state vector for bidirectional sync
      const step1Msg = await client.waitForMessage();
      expect(step1Msg.type).toBe('sync_step_1');
      expect(step1Msg.diagramId).toBe(sampleDiagramId);
      expect(typeof step1Msg.payload?.stateVector).toBe('string');

      // Client applies update from server
      const updateBytes = base64ToUint8Array(step2Msg.payload!.update as string);
      Y.applyUpdate(clientDoc, updateBytes);

      // Verify meta was initialized
      const meta = clientDoc.getMap('meta');
      expect(meta.get('name')).toBe('Event Streaming Engine');

      client.close();
    });

    it('allows editor to apply CRDT sync_update, broadcasts to peers, and persists to DB', async () => {
      const clientOwner = createClientWs(`token=${tokenOwner}&diagramId=${sampleDiagramId}`);
      await clientOwner.waitForMessage(); // room_joined
      await clientOwner.waitForMessage(); // presence_batch

      const clientEditor = createClientWs(`token=${tokenEditor}&diagramId=${sampleDiagramId}`);
      await clientEditor.waitForMessage(); // room_joined
      await clientEditor.waitForMessage(); // presence_batch
      await clientOwner.waitForMessage();  // user_joined (editor)

      // Editor generates a new node
      const editorDoc = new Y.Doc();
      editorDoc.getMap('nodes').set('node-service-auth', {
        id: 'node-service-auth',
        type: 'custom',
        position: { x: 200, y: 300 },
        data: { label: 'Auth Service' },
      });

      const updateBase64 = uint8ArrayToBase64(Y.encodeStateAsUpdate(editorDoc));

      clientEditor.send({
        type: 'sync_update',
        diagramId: sampleDiagramId,
        payload: { update: updateBase64 },
      });

      // Owner should receive the broadcasted sync_update
      const broadcastMsg = await clientOwner.waitForMessage();
      expect(broadcastMsg.type).toBe('sync_update');
      expect(broadcastMsg.payload?.update).toBe(updateBase64);

      // Verify server session applied the update
      const session = collabServer.getCrdtManager().getSession(sampleDiagramId);
      expect(session).toBeDefined();
      const serverNodes = session!.doc.getMap('nodes');
      expect(serverNodes.has('node-service-auth')).toBe(true);

      // Wait for debounced persistence (50ms configured)
      await new Promise((r) => setTimeout(r, 80));

      expect(persistedSnapshot).not.toBeNull();
      expect(persistedSnapshot.state.nodes.some((n: any) => n.id === 'node-service-auth')).toBe(true);

      clientOwner.close();
      clientEditor.close();
    });

    it('allows viewer to request sync_step_1 but rejects sync_update mutations', async () => {
      const clientViewer = createClientWs(`token=${tokenViewer}&diagramId=${sampleDiagramId}`);
      await clientViewer.waitForMessage(); // room_joined
      await clientViewer.waitForMessage(); // presence_batch

      // Viewer requests sync_step_1 -> should succeed
      clientViewer.send({
        type: 'sync_step_1',
        diagramId: sampleDiagramId,
        payload: {},
      });

      const syncReply = await clientViewer.waitForMessage();
      expect(syncReply.type).toBe('sync_step_2');
      expect(syncReply.payload?.update).toBeDefined();

      // Viewer attempts to mutate with sync_update -> should be rejected
      clientViewer.send({
        type: 'sync_update',
        diagramId: sampleDiagramId,
        payload: { update: uint8ArrayToBase64(new Uint8Array([0, 0])) },
      });

      const errorMsg = await clientViewer.waitForMessage();
      expect(errorMsg.type).toBe('error');
      expect(errorMsg.payload?.code).toBe('INSUFFICIENT_PERMISSIONS');

      clientViewer.close();
    });

    it('responds to application-layer ping with pong to maintain connection health', async () => {
      const client = createClientWs(`token=${tokenOwner}&diagramId=${sampleDiagramId}`);
      await client.waitForMessage(); // room_joined
      await client.waitForMessage(); // presence_batch

      const pingTimestamp = Date.now();
      client.send({
        type: 'ping',
        diagramId: sampleDiagramId,
        payload: { timestamp: pingTimestamp },
      });

      const pongReply = await client.waitForMessage();
      expect(pongReply.type).toBe('pong');
      expect(pongReply.diagramId).toBe(sampleDiagramId);
      expect(pongReply.payload?.timestamp).toBeDefined();

      client.close();
    });

    it('persists crdtState binary alongside JSON state and restores with exact causal clocks', async () => {
      const crdtManager = new CrdtManager({ debounceMs: 20 });
      const testDiagId = 'diag-binary-test-01';

      // 1. Initial hydration
      const session1 = await crdtManager.getOrCreateSession(testDiagId);
      const nodes1 = session1.doc.getMap('nodes');
      nodes1.set('node-redis', {
        id: 'node-redis',
        type: 'custom',
        position: { x: 50, y: 50 },
        data: { label: 'Redis Cluster' },
      });

      // 2. Persist session
      session1.isDirty = true;
      const persistRes = await crdtManager.persistSession(testDiagId);
      expect(persistRes.success).toBe(true);

      expect(persistedSnapshot).not.toBeNull();
      expect(persistedSnapshot.crdtState).toBeDefined();
      expect(Buffer.isBuffer(persistedSnapshot.crdtState)).toBe(true);
      expect(persistedSnapshot.crdtState.length).toBeGreaterThan(0);

      // 3. Close & destroy session simulating server restart
      await crdtManager.flushAndCloseSession(testDiagId);
      expect(crdtManager.getSession(testDiagId)).toBeUndefined();

      // 4. Hydrate in a new manager
      const newManager = new CrdtManager({ debounceMs: 20 });
      const session2 = await newManager.getOrCreateSession(testDiagId);
      const nodes2 = session2.doc.getMap('nodes');
      expect(nodes2.has('node-redis')).toBe(true);

      const redisNode = nodes2.get('node-redis') as any;
      expect(redisNode.data.label).toBe('Redis Cluster');

      const sv = Y.encodeStateVector(session2.doc);
      expect(sv.length).toBeGreaterThan(0);
    });

    it('safely migrates legacy JSON snapshots that lack crdtState and saves binary update on first edit', async () => {
      const crdtManager = new CrdtManager({ debounceMs: 20 });
      const legacyDiagId = 'legacy-diag-without-binary';

      vi.spyOn(diagramRepo, 'findDiagramSnapshotDoc').mockImplementation(async (diagramId: string) => {
        if (diagramId === legacyDiagId) {
          if (persistedSnapshot && persistedSnapshot.diagramId === legacyDiagId) return persistedSnapshot;
          return { diagramId: legacyDiagId, state: sampleProject, version: 1 } as any;
        }
        return null;
      });

      const session = await crdtManager.getOrCreateSession(legacyDiagId);
      expect(session.doc.getMap('nodes').size).toBe(2);

      session.doc.getMap('nodes').set('migrated-node', {
        id: 'migrated-node',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: { label: 'Migrated Node' },
      });
      session.isDirty = true;
      const persistRes = await crdtManager.persistSession(legacyDiagId);
      expect(persistRes.success).toBe(true);

      expect(persistedSnapshot.crdtState).toBeDefined();
      expect(Buffer.isBuffer(persistedSnapshot.crdtState)).toBe(true);
      expect(persistedSnapshot.state.nodes.some((n: any) => n.id === 'migrated-node')).toBe(true);

      // spy auto-restored
    });

    it('reconciles offline edits after server restart without node duplication or property loss', async () => {
      const crdtManager = new CrdtManager({ debounceMs: 20 });
      const syncDiagId = 'diag-offline-reconcile-01';

      // 1. Establish baseline session and persist
      const session1 = await crdtManager.getOrCreateSession(syncDiagId);
      session1.doc.getMap('nodes').set('node-gateway', {
        id: 'node-gateway',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: { label: 'Gateway' },
      });
      session1.isDirty = true;
      await crdtManager.persistSession(syncDiagId);

      // 2. Client has this document locally
      const clientDoc = new Y.Doc();
      Y.applyUpdate(clientDoc, Buffer.from(persistedSnapshot.crdtState));

      // 3. Server restarts and session is cleared
      await crdtManager.flushAndCloseSession(syncDiagId);

      // 4. Client makes OFFLINE edits
      clientDoc.getMap('nodes').set('node-offline', {
        id: 'node-offline',
        type: 'custom',
        position: { x: 200, y: 200 },
        data: { label: 'Created Offline' },
      });

      // 5. Server starts up fresh and loads from DB
      const freshManager = new CrdtManager({ debounceMs: 20 });
      const freshServerSession = await freshManager.getOrCreateSession(syncDiagId);

      // 6. Client reconnects: exchanges sync steps
      const clientVector = Y.encodeStateVector(clientDoc);
      const serverUpdateForClient = await freshManager.getSyncStep2(syncDiagId, uint8ArrayToBase64(clientVector));
      Y.applyUpdate(clientDoc, base64ToUint8Array(serverUpdateForClient));

      const serverVector = base64ToUint8Array(await freshManager.getSyncStep1(syncDiagId));
      const clientUpdateForServer = Y.encodeStateAsUpdate(clientDoc, serverVector);
      if (clientUpdateForServer.byteLength > 2) {
        await freshManager.applyClientUpdate(syncDiagId, uint8ArrayToBase64(clientUpdateForServer));
      }

      // 7. Verify both client and server converged with both nodes
      const finalServerNodes = freshServerSession.doc.getMap('nodes');
      const finalClientNodes = clientDoc.getMap('nodes');

      expect(finalServerNodes.size).toBe(2);
      expect(finalClientNodes.size).toBe(2);
      expect(finalServerNodes.has('node-gateway')).toBe(true);
      expect(finalServerNodes.has('node-offline')).toBe(true);
      expect(finalClientNodes.has('node-gateway')).toBe(true);
      expect(finalClientNodes.has('node-offline')).toBe(true);

      const offlineNode = finalServerNodes.get('node-offline') as any;
      expect(offlineNode.data.label).toBe('Created Offline');
    });
  });
});
