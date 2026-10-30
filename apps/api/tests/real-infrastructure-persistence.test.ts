import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import WebSocket from 'ws';
import { app } from '../src/app.js';
import {
  attachCollaborationServer,
  CollabServer,
  authenticateUpgradeRequest,
} from '../src/websocket/collab.server.js';
import {
  base64ToUint8Array,
  uint8ArrayToBase64,
  yDocToProject,
} from '../src/websocket/crdt.service.js';
import { gracefulShutdown, ServerInstance } from '../src/server.js';
import { WorkspaceModel } from '../src/models/workspace.model.js';
import { WorkspaceMemberModel } from '../src/models/workspace-member.model.js';
import { DiagramModel } from '../src/models/diagram.model.js';
import { DiagramSnapshotModel } from '../src/models/diagram-snapshot.model.js';
import { saveDiagramSnapshotDoc } from '../src/repositories/diagram.repository.js';
import { Project, WorkspaceRole } from '@drawzware/contracts';
import { applyCanvasDiffToYDoc } from '../../../apps/web/src/features/collaboration/utils/yjs-sync.js';
import type { SystemNode } from '../../../apps/web/src/features/canvas/types/canvas.types.js';

const REAL_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/drawzware_real_infrastructure_test';
const JWT_SECRET = 'drawzware-production-audit-secret-key-32chars!';
process.env.JWT_SECRET = JWT_SECRET;

async function isMongoReachable(uri: string): Promise<boolean> {
  try {
    const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 2000 }).asPromise();
    await conn.close();
    return true;
  } catch {
    return false;
  }
}

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
    techStack: ['Node.js'],
    status: 'operational',
  },
});

describe('DrawzWare Final Production-Readiness: Real Infrastructure Verification', () => {
  let mongoAvailable = false;
  let testWorkspaceId: string;
  let testDiagramId: string;

  const ownerUser = { id: 'usr-real-alice', email: 'alice-real@drawzware.com' };
  const editorUser = { id: 'usr-real-bob', email: 'bob-real@drawzware.com' };
  const viewerUser = { id: 'usr-real-charlie', email: 'charlie-real@drawzware.com' };
  const strangerUser = { id: 'usr-real-eve', email: 'eve-real@drawzware.com' };

  let ownerToken: string;
  let editorToken: string;
  let viewerToken: string;
  let strangerToken: string;
  let expiredToken: string;

  beforeAll(async () => {
    mongoAvailable = await isMongoReachable(REAL_MONGO_URI);
    if (!mongoAvailable) {
      console.warn('[Real Infrastructure Suite] Real MongoDB not reachable, skipping real tests');
      return;
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(REAL_MONGO_URI);
    }

    // Clean test database collections
    await WorkspaceModel.deleteMany({ name: /^Test Infra/ });
    await WorkspaceMemberModel.deleteMany({ userId: /^usr-real-/ });
    await DiagramModel.deleteMany({ title: /^Test Real/ });
    await DiagramSnapshotModel.deleteMany({});

    // Seed Real Documents into MongoDB
    const ws = await WorkspaceModel.create({
      name: 'Test Infra Workspace',
      ownerId: ownerUser.id,
    });
    testWorkspaceId = ws._id;

    await WorkspaceMemberModel.create([
      { workspaceId: testWorkspaceId, userId: ownerUser.id, role: 'owner', userEmail: ownerUser.email },
      { workspaceId: testWorkspaceId, userId: editorUser.id, role: 'editor', userEmail: editorUser.email },
      { workspaceId: testWorkspaceId, userId: viewerUser.id, role: 'viewer', userEmail: viewerUser.email },
    ]);

    const diagram = await DiagramModel.create({
      workspaceId: testWorkspaceId,
      title: 'Test Real Diagram',
      diagramType: 'architecture',
      createdBy: ownerUser.id,
    });
    testDiagramId = diagram._id;

    // Tokens
    ownerToken = jwt.sign({ id: ownerUser.id, email: ownerUser.email, isEmailVerified: true }, JWT_SECRET, { expiresIn: '1h' });
    editorToken = jwt.sign({ id: editorUser.id, email: editorUser.email, isEmailVerified: true }, JWT_SECRET, { expiresIn: '1h' });
    viewerToken = jwt.sign({ id: viewerUser.id, email: viewerUser.email, isEmailVerified: true }, JWT_SECRET, { expiresIn: '1h' });
    strangerToken = jwt.sign({ id: strangerUser.id, email: strangerUser.email, isEmailVerified: true }, JWT_SECRET, { expiresIn: '1h' });
    expiredToken = jwt.sign({ id: ownerUser.id, email: ownerUser.email, isEmailVerified: true }, JWT_SECRET, { expiresIn: '-1s' });
  });

  afterAll(async () => {
    if (mongoAvailable) {
      try {
        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(REAL_MONGO_URI);
        }
        await WorkspaceModel.deleteMany({ name: /^Test Infra/ });
        await WorkspaceMemberModel.deleteMany({ userId: /^usr-real-/ });
        await DiagramModel.deleteMany({ title: /^Test Real/ });
        await DiagramSnapshotModel.deleteMany({});
        await mongoose.disconnect();
      } catch {
        // Safe cleanup
      }
    }
  });

  function startServerWithPort(debounceMs = 100): Promise<{ instance: ServerInstance; wsUrl: string }> {
    return new Promise((resolve) => {
      const httpServer = http.createServer(app);
      const collabServer = attachCollaborationServer(httpServer, {
        path: '/collab',
        crdtDebounceMs: debounceMs,
      });

      httpServer.listen(0, '127.0.0.1', () => {
        const addr = httpServer.address() as AddressInfo;
        const wsUrl = `ws://127.0.0.1:${addr.port}/collab`;
        const instance = { httpServer, collabServer };
        resolve({ instance, wsUrl });
      });
    });
  }

  // 1. Real MongoDB RBAC and WebSocket Upgrade Validation
  it('authenticates upgrade requests against real MongoDB workspace membership', async () => {
    if (!mongoAvailable) return;

    // Real Editor Upgrade
    const editorReq = {
      url: `/collab?token=${editorToken}&diagramId=${testDiagramId}`,
      headers: { host: 'localhost' },
    } as unknown as http.IncomingMessage;
    const editorAuth = await authenticateUpgradeRequest(editorReq);
    expect(editorAuth.success).toBe(true);
    if (editorAuth.success) {
      expect(editorAuth.userId).toBe(editorUser.id);
      expect(editorAuth.role).toBe('editor');
    }

    // Real Viewer Upgrade
    const viewerReq = {
      url: `/collab?token=${viewerToken}&diagramId=${testDiagramId}`,
      headers: { host: 'localhost' },
    } as unknown as http.IncomingMessage;
    const viewerAuth = await authenticateUpgradeRequest(viewerReq);
    expect(viewerAuth.success).toBe(true);
    if (viewerAuth.success) {
      expect(viewerAuth.userId).toBe(viewerUser.id);
      expect(viewerAuth.role).toBe('viewer');
    }

    // Non-member (Eve) Upgrade against real DB
    const eveReq = {
      url: `/collab?token=${strangerToken}&diagramId=${testDiagramId}`,
      headers: { host: 'localhost' },
    } as unknown as http.IncomingMessage;
    const eveAuth = await authenticateUpgradeRequest(eveReq);
    expect(eveAuth.success).toBe(false);
    if (!eveAuth.success) {
      expect(eveAuth.statusCode).toBe(403);
      expect(eveAuth.message).toContain('You do not have access to this diagram');
    }

    // Expired Token
    const expiredReq = {
      url: `/collab?token=${expiredToken}&diagramId=${testDiagramId}`,
      headers: { host: 'localhost' },
    } as unknown as http.IncomingMessage;
    const expiredAuth = await authenticateUpgradeRequest(expiredReq);
    expect(expiredAuth.success).toBe(false);
    if (!expiredAuth.success) {
      expect(expiredAuth.statusCode).toBe(401);
    }

    // Non-existent diagram
    const missingDiagReq = {
      url: `/collab?token=${editorToken}&diagramId=non-existent-diag-999`,
      headers: { host: 'localhost' },
    } as unknown as http.IncomingMessage;
    const missingDiagAuth = await authenticateUpgradeRequest(missingDiagReq);
    expect(missingDiagAuth.success).toBe(false);
    if (!missingDiagAuth.success) {
      expect(missingDiagAuth.statusCode).toBe(404);
    }
  });

  // 2. Real MongoDB CRDT Persistence & Debounced Write
  it('persists in-memory Yjs CRDT mutations to real MongoDB snapshot collection', async () => {
    if (!mongoAvailable) return;

    const { instance, wsUrl } = await startServerWithPort(100);

    const ws = new WebSocket(`${wsUrl}?token=${editorToken}&diagramId=${testDiagramId}`);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });

    const clientDoc = new Y.Doc();

    // Perform handshake
    const sv1 = Y.encodeStateVector(clientDoc);
    ws.send(JSON.stringify({
      type: 'sync_step_1',
      diagramId: testDiagramId,
      payload: { stateVector: uint8ArrayToBase64(sv1) },
    }));

    // Wait for sync_step_2
    await new Promise<void>((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'sync_step_2') {
          const update = base64ToUint8Array(msg.payload.update);
          Y.applyUpdate(clientDoc, update);
          resolve();
        }
      });
    });

    // Make an edit in clientDoc: add a system node
    const testNode = createMockNode('node-real-infra-1', 'Payment Service In Real DB', 'service', 150, 250);
    const clientUpdatePromise = new Promise<Uint8Array>((res) => {
      clientDoc.once('update', (u: Uint8Array) => res(u));
    });
    applyCanvasDiffToYDoc(clientDoc, [testNode], [], 'local');
    const updateBytes = await clientUpdatePromise;

    // Send sync_update to server
    ws.send(JSON.stringify({
      type: 'sync_update',
      diagramId: testDiagramId,
      payload: { update: uint8ArrayToBase64(updateBytes) },
    }));

    // Wait for server to receive and debounce-persist to MongoDB (debounce is 100ms)
    await new Promise((r) => setTimeout(r, 400));

    // Verify directly in REAL MongoDB
    const snapshotInDb = await DiagramSnapshotModel.findOne({ diagramId: testDiagramId });
    expect(snapshotInDb).not.toBeNull();
    expect(snapshotInDb!.version).toBe(1);
    expect(snapshotInDb!.state.nodes).toHaveLength(1);
    expect(snapshotInDb!.state.nodes[0].id).toBe('node-real-infra-1');
    expect(snapshotInDb!.state.nodes[0].data.label).toBe('Payment Service In Real DB');

    // Verify touchDiagramDoc updated DiagramModel in real MongoDB
    const diagramInDb = await DiagramModel.findById(testDiagramId);
    expect(diagramInDb).not.toBeNull();
    expect(new Date(diagramInDb!.updatedAt).getTime()).toBeGreaterThan(0);

    ws.close();
    await instance.collabServer.close();
    await new Promise<void>((res) => instance.httpServer.close(() => res()));
  });

  // 3. Real Optimistic Concurrency & Concurrent Saves Against Real MongoDB
  it('enforces atomic optimistic locking and detects snapshot conflicts in real MongoDB', async () => {
    if (!mongoAvailable) return;

    // Current DB version is 1
    const snapshotBefore = await DiagramSnapshotModel.findOne({ diagramId: testDiagramId });
    expect(snapshotBefore).not.toBeNull();
    const currentVersion = snapshotBefore!.version;

    const modifiedProject: Project = {
      ...snapshotBefore!.state,
      name: 'Concurrent Test Title',
    };

    // Stale version (0 vs currentVersion 1)
    const staleResult = await saveDiagramSnapshotDoc(testDiagramId, modifiedProject, 0);
    expect(staleResult.success).toBe(false);
    expect(staleResult.conflict).toBe(true);
    expect(staleResult.currentVersion).toBe(currentVersion);

    // Concurrent saves race test: two concurrent updates attempting the same version
    const [save1, save2] = await Promise.all([
      saveDiagramSnapshotDoc(testDiagramId, { ...modifiedProject, name: 'Save 1' }, currentVersion),
      saveDiagramSnapshotDoc(testDiagramId, { ...modifiedProject, name: 'Save 2' }, currentVersion),
    ]);

    // Exactly one must succeed, and one must conflict
    const successCount = (save1.success ? 1 : 0) + (save2.success ? 1 : 0);
    const conflictCount = (save1.conflict ? 1 : 0) + (save2.conflict ? 1 : 0);
    expect(successCount).toBe(1);
    expect(conflictCount).toBe(1);

    // Verify real MongoDB snapshot is at version 2
    const snapshotAfter = await DiagramSnapshotModel.findOne({ diagramId: testDiagramId });
    expect(snapshotAfter!.version).toBe(currentVersion + 1);
  });

  // 4. Real Viewer Authorization Enforcement
  it('enforces viewer read-only permission and rejects remote updates from viewer sockets', async () => {
    if (!mongoAvailable) return;

    const { instance, wsUrl } = await startServerWithPort(100);

    const wsViewer = new WebSocket(`${wsUrl}?token=${viewerToken}&diagramId=${testDiagramId}`);
    await new Promise<void>((resolve, reject) => {
      wsViewer.on('open', () => resolve());
      wsViewer.on('error', reject);
    });

    const errorPromise = new Promise<{ type: string; payload: { code: string; message: string } }>((resolve) => {
      wsViewer.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'error') {
          resolve(msg);
        }
      });
    });

    // Create a rogue update
    const dummyDoc = new Y.Doc();
    const yArr = dummyDoc.getMap('nodes');
    let dummyBytes: Uint8Array = new Uint8Array();
    dummyDoc.once('update', (u: Uint8Array) => { dummyBytes = u; });
    yArr.set('illegal-viewer-node', { id: 'illegal-viewer-node' });

    wsViewer.send(JSON.stringify({
      type: 'sync_update',
      diagramId: testDiagramId,
      payload: { update: uint8ArrayToBase64(dummyBytes) },
    }));

    const errMsg = await errorPromise;
    expect(errMsg.payload.code).toBe('INSUFFICIENT_PERMISSIONS');
    expect(errMsg.payload.message).toContain("Users with 'viewer' role have read-only access");

    // Confirm real MongoDB did NOT receive this illegal node
    const snapshotInDb = await DiagramSnapshotModel.findOne({ diagramId: testDiagramId });
    const hasIllegalNode = snapshotInDb!.state.nodes.some((n: any) => n.id === 'illegal-viewer-node');
    expect(hasIllegalNode).toBe(false);

    wsViewer.close();
    await instance.collabServer.close();
    await new Promise<void>((res) => instance.httpServer.close(() => res()));
  });

  // 5. Real Graceful Shutdown: In-Flight Dirty Flushing to MongoDB
  it('flushes pending in-flight CRDT mutations to real MongoDB during graceful shutdown', async () => {
    if (!mongoAvailable) return;

    // Use a long debounce (5000ms) so mutations would normally remain unflushed
    const { instance, wsUrl } = await startServerWithPort(5000);

    const ws = new WebSocket(`${wsUrl}?token=${editorToken}&diagramId=${testDiagramId}`);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });

    const clientDoc = new Y.Doc();

    // Handshake
    ws.send(JSON.stringify({
      type: 'sync_step_1',
      diagramId: testDiagramId,
      payload: { stateVector: uint8ArrayToBase64(Y.encodeStateVector(clientDoc)) },
    }));

    await new Promise<void>((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'sync_step_2') {
          Y.applyUpdate(clientDoc, base64ToUint8Array(msg.payload.update));
          resolve();
        }
      });
    });

    // Make an edit
    const shutdownNode = createMockNode('node-flushed-on-shutdown', 'Shutdown Guard Node', 'database', 300, 400);
    const updatePromise = new Promise<Uint8Array>((res) => {
      clientDoc.once('update', (u: Uint8Array) => res(u));
    });
    applyCanvasDiffToYDoc(clientDoc, [
      ...((clientDoc.getMap('nodes').toJSON() ? Object.values(clientDoc.getMap('nodes').toJSON()) : []) as SystemNode[]),
      shutdownNode,
    ], [], 'local');
    const updateBytes = await updatePromise;

    ws.send(JSON.stringify({
      type: 'sync_update',
      diagramId: testDiagramId,
      payload: { update: uint8ArrayToBase64(updateBytes) },
    }));

    // Tiny 50ms tick to ensure WS received
    await new Promise((r) => setTimeout(r, 80));

    const closePromise = new Promise<number>((res) => {
      ws.on('close', (code) => res(code));
    });

    // Trigger graceful shutdown
    await gracefulShutdown(instance, 'SIGTERM');

    // Sockets should be closed with code 1001
    const closedWith = await closePromise;
    expect(closedWith).toBe(1001);

    // Verify that the dirty session was flushed into REAL MongoDB despite long debounce
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(REAL_MONGO_URI);
    }
    const finalSnapshot = await DiagramSnapshotModel.findOne({ diagramId: testDiagramId });
    expect(finalSnapshot).not.toBeNull();
    const persistedNode = finalSnapshot!.state.nodes.find((n: any) => n.id === 'node-flushed-on-shutdown');
    expect(persistedNode).toBeDefined();
    expect(persistedNode.data.label).toBe('Shutdown Guard Node');
  });

  // 6. Real Cold Restart Recovery
  it('recovers complete diagram state from real MongoDB after complete server restart', async () => {
    if (!mongoAvailable) return;

    // Ensure mongoose is connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(REAL_MONGO_URI);
    }

    // Spin up a brand new server instance (memory wiped, simulating process restart)
    const { instance: newInstance, wsUrl: newWsUrl } = await startServerWithPort(100);

    const wsClient = new WebSocket(`${newWsUrl}?token=${editorToken}&diagramId=${testDiagramId}`);
    await new Promise<void>((resolve, reject) => {
      wsClient.on('open', () => resolve());
      wsClient.on('error', reject);
    });

    const recoveredDoc = new Y.Doc();

    // Handshake
    wsClient.send(JSON.stringify({
      type: 'sync_step_1',
      diagramId: testDiagramId,
      payload: { stateVector: uint8ArrayToBase64(Y.encodeStateVector(recoveredDoc)) },
    }));

    await new Promise<void>((resolve) => {
      wsClient.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'sync_step_2') {
          Y.applyUpdate(recoveredDoc, base64ToUint8Array(msg.payload.update));
          resolve();
        }
      });
    });

    // Extract canvas project from recovered Y.Doc
    const recoveredProject = yDocToProject(recoveredDoc, testDiagramId);
    expect(recoveredProject.nodes.length).toBeGreaterThanOrEqual(2);

    const hasRealNode1 = recoveredProject.nodes.some((n: any) => n.id === 'node-real-infra-1');
    const hasShutdownNode = recoveredProject.nodes.some((n: any) => n.id === 'node-flushed-on-shutdown');

    expect(hasRealNode1).toBe(true);
    expect(hasShutdownNode).toBe(true);

    wsClient.close();
    await newInstance.collabServer.close();
    await new Promise<void>((res) => newInstance.httpServer.close(() => res()));
  });
});
