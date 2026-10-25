import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import WebSocket, { RawData } from 'ws';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import * as diagramRepo from '../src/repositories/diagram.repository.js';
import * as memberRepo from '../src/repositories/workspace-member.repository.js';
import { attachCollaborationServer, CollabServer } from '../src/websocket/collab.server.js';
import {
  CollabServerMessage,
  CollabClientMessage,
} from '@drawzware/contracts';

interface TestWsClient {
  ws: WebSocket;
  waitForMessage: (timeoutMs?: number) => Promise<CollabServerMessage>;
  messages: CollabServerMessage[];
  close: () => void;
  send: (msg: CollabClientMessage) => void;
}

describe('Real-Time Collaboration WebSocket Transport & RBAC Guard', () => {
  const app = createApp();
  let server: http.Server;
  let collabServer: CollabServer;
  let port: number;
  const activeClients: WebSocket[] = [];

  const jwtSecret = 'test-collab-jwt-secret';
  const originalSecret = process.env.JWT_SECRET;

  const userOwner = { id: 'usr-owner-101', email: 'owner@drawzware.com' };
  const userEditor = { id: 'usr-editor-102', email: 'editor@drawzware.com' };
  const userViewer = { id: 'usr-viewer-103', email: 'viewer@drawzware.com' };
  const userStranger = { id: 'usr-stranger-104', email: 'stranger@drawzware.com' };

  const tokenOwner = jwt.sign({ id: userOwner.id, email: userOwner.email }, jwtSecret, { expiresIn: '1h' });
  const tokenEditor = jwt.sign({ id: userEditor.id, email: userEditor.email }, jwtSecret, { expiresIn: '1h' });
  const tokenViewer = jwt.sign({ id: userViewer.id, email: userViewer.email }, jwtSecret, { expiresIn: '1h' });
  const tokenStranger = jwt.sign({ id: userStranger.id, email: userStranger.email }, jwtSecret, { expiresIn: '1h' });
  const tokenExpired = jwt.sign({ id: userOwner.id, email: userOwner.email }, jwtSecret, { expiresIn: '-10s' });

  const sampleWorkspaceId = 'ws-collab-alpha';
  const sampleDiagramId = 'diag-collab-001';

  const sampleDiagram = {
    _id: sampleDiagramId,
    workspaceId: sampleWorkspaceId,
    title: 'Distributed Transaction Architecture',
    diagramType: 'architecture',
    createdBy: userOwner.id,
    createdAt: new Date('2026-10-25T00:00:00.000Z'),
    updatedAt: new Date('2026-10-25T00:00:00.000Z'),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    server = http.createServer(app);
    collabServer = attachCollaborationServer(server, { heartbeatIntervalMs: 0 });

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

    vi.spyOn(diagramRepo, 'findDiagramDocById').mockImplementation(async (id: string) => {
      if (id === sampleDiagramId) return sampleDiagram as any;
      return null;
    });

    vi.spyOn(memberRepo, 'findWorkspaceMemberDoc').mockImplementation(async (wsId: string, uId: string) => {
      if (wsId !== sampleWorkspaceId) return null;
      if (uId === userOwner.id) {
        return { workspaceId: wsId, userId: uId, role: 'owner', userEmail: userOwner.email, createdAt: new Date() } as any;
      }
      if (uId === userEditor.id) {
        return { workspaceId: wsId, userId: uId, role: 'editor', userEmail: userEditor.email, createdAt: new Date() } as any;
      }
      if (uId === userViewer.id) {
        return { workspaceId: wsId, userId: uId, role: 'viewer', userEmail: userViewer.email, createdAt: new Date() } as any;
      }
      return null;
    });
  });

  afterEach(async () => {
    for (const ws of activeClients) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try {
          ws.close();
        } catch {}
      }
    }
    activeClients.length = 0;
    // Allow sockets to finish closing
    await new Promise((r) => setTimeout(r, 50));
    collabServer.getRooms().clear();
  });

  function createClientWs(query: string): TestWsClient {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/collab?${query}`);
    activeClients.push(ws);
    const messages: CollabServerMessage[] = [];
    const waiters: Array<{
      resolve: (msg: CollabServerMessage) => void;
      reject: (err: Error) => void;
      timer: NodeJS.Timeout;
    }> = [];

    ws.on('message', (data: RawData) => {
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

  function waitForCloseOrError(ws: WebSocket): Promise<{ code?: number; error?: Error }> {
    return new Promise((resolve) => {
      ws.once('close', (code) => resolve({ code }));
      ws.once('error', (error) => resolve({ error }));
    });
  }

  describe('Upgrade Authentication & Membership Guard', () => {
    it('rejects connection upgrade when token is missing', async () => {
      const client = createClientWs(`diagramId=${sampleDiagramId}`);
      const res = await waitForCloseOrError(client.ws);
      expect(client.ws.readyState).not.toBe(WebSocket.OPEN);
      expect(res.error || res.code).toBeDefined();
    });

    it('rejects connection upgrade when token is expired', async () => {
      const client = createClientWs(`token=${tokenExpired}&diagramId=${sampleDiagramId}`);
      const res = await waitForCloseOrError(client.ws);
      expect(client.ws.readyState).not.toBe(WebSocket.OPEN);
      expect(res.error || res.code).toBeDefined();
    });

    it('rejects connection upgrade when diagramId is missing', async () => {
      const client = createClientWs(`token=${tokenOwner}`);
      const res = await waitForCloseOrError(client.ws);
      expect(client.ws.readyState).not.toBe(WebSocket.OPEN);
      expect(res.error || res.code).toBeDefined();
    });

    it('rejects connection upgrade when diagram does not exist', async () => {
      const client = createClientWs(`token=${tokenOwner}&diagramId=non-existent-diagram`);
      const res = await waitForCloseOrError(client.ws);
      expect(client.ws.readyState).not.toBe(WebSocket.OPEN);
      expect(res.error || res.code).toBeDefined();
    });

    it('rejects connection upgrade when user is not a member of the workspace', async () => {
      const client = createClientWs(`token=${tokenStranger}&diagramId=${sampleDiagramId}`);
      const res = await waitForCloseOrError(client.ws);
      expect(client.ws.readyState).not.toBe(WebSocket.OPEN);
      expect(res.error || res.code).toBeDefined();
    });

    it('rejects connection upgrade when request URL is malformed without crashing process', async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/collab?token=%E0%A4%A&diagramId=test`);
      activeClients.push(ws);
      const res = await waitForCloseOrError(ws);
      expect(ws.readyState).not.toBe(WebSocket.OPEN);
      expect(res.error || res.code).toBeDefined();
    });
  });

  describe('Room Connection, Presence & Broadcast', () => {
    it('authenticates owner, joins room, and sends initial room_joined and presence_batch', async () => {
      const client = createClientWs(`token=${tokenOwner}&diagramId=${sampleDiagramId}`);

      const firstMsg = await client.waitForMessage();
      expect(firstMsg.type).toBe('room_joined');
      expect(firstMsg.diagramId).toBe(sampleDiagramId);
      expect(firstMsg.payload?.role).toBe('owner');
      expect(firstMsg.payload?.userId).toBe(userOwner.id);

      const secondMsg = await client.waitForMessage();
      expect(secondMsg.type).toBe('presence_batch');
      expect(secondMsg.diagramId).toBe(sampleDiagramId);
      expect(Array.isArray(secondMsg.payload?.users)).toBe(true);

      const clients = collabServer.getRoomClients(sampleDiagramId);
      expect(clients.length).toBe(1);
      expect(clients[0].userId).toBe(userOwner.id);
      expect(clients[0].role).toBe('owner');

      client.close();
    });

    it('broadcasts user_joined to existing room peers when a second collaborator connects', async () => {
      const clientOwner = createClientWs(`token=${tokenOwner}&diagramId=${sampleDiagramId}`);
      await clientOwner.waitForMessage(); // room_joined
      await clientOwner.waitForMessage(); // presence_batch

      const clientEditor = createClientWs(`token=${tokenEditor}&diagramId=${sampleDiagramId}`);

      const [ownerHeard, editorJoined] = await Promise.all([
        clientOwner.waitForMessage(),
        clientEditor.waitForMessage(),
      ]);

      expect(ownerHeard.type).toBe('user_joined');
      expect(ownerHeard.payload?.userId).toBe(userEditor.id);
      expect(ownerHeard.payload?.role).toBe('editor');

      expect(editorJoined.type).toBe('room_joined');
      expect(editorJoined.payload?.role).toBe('editor');

      clientOwner.close();
      clientEditor.close();
    });
  });

  describe('Viewer Read-Only Enforcement', () => {
    it('allows viewer to connect with viewer role', async () => {
      const clientViewer = createClientWs(`token=${tokenViewer}&diagramId=${sampleDiagramId}`);
      const msg = await clientViewer.waitForMessage();

      expect(msg.type).toBe('room_joined');
      expect(msg.payload?.role).toBe('viewer');
      expect(msg.payload?.userId).toBe(userViewer.id);

      clientViewer.close();
    });

    it('rejects mutation messages from viewer and does not broadcast them', async () => {
      const clientOwner = createClientWs(`token=${tokenOwner}&diagramId=${sampleDiagramId}`);
      await clientOwner.waitForMessage(); // room_joined
      await clientOwner.waitForMessage(); // presence_batch

      const clientViewer = createClientWs(`token=${tokenViewer}&diagramId=${sampleDiagramId}`);
      await clientViewer.waitForMessage(); // room_joined
      await clientViewer.waitForMessage(); // presence_batch
      await clientOwner.waitForMessage();  // user_joined (viewer)

      let ownerReceivedMutation = false;
      const ownerListener = (data: RawData) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'sync_update') {
            ownerReceivedMutation = true;
          }
        } catch {}
      };
      clientOwner.ws.on('message', ownerListener);

      const mutationMsg: CollabClientMessage = {
        type: 'sync_update',
        diagramId: sampleDiagramId,
        payload: { delta: 'unauthorized-mutation' },
      };
      clientViewer.send(mutationMsg);

      const viewerResponse = await clientViewer.waitForMessage();
      expect(viewerResponse.type).toBe('error');
      expect(viewerResponse.payload?.code).toBe('INSUFFICIENT_PERMISSIONS');

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(ownerReceivedMutation).toBe(false);

      clientOwner.ws.off('message', ownerListener);
      clientOwner.close();
      clientViewer.close();
    });

    it('allows viewer to send cursor and presence updates to room peers', async () => {
      const clientOwner = createClientWs(`token=${tokenOwner}&diagramId=${sampleDiagramId}`);
      await clientOwner.waitForMessage(); // room_joined
      await clientOwner.waitForMessage(); // presence_batch

      const clientViewer = createClientWs(`token=${tokenViewer}&diagramId=${sampleDiagramId}`);
      await clientViewer.waitForMessage(); // room_joined
      await clientViewer.waitForMessage(); // presence_batch
      await clientOwner.waitForMessage();  // user_joined

      const cursorMsg: CollabClientMessage = {
        type: 'cursor_move',
        diagramId: sampleDiagramId,
        payload: { cursor: { x: 320, y: 480 }, selectedNodeIds: ['node-viewer-1'] },
      };
      clientViewer.send(cursorMsg);

      const ownerHeardCursor = await clientOwner.waitForMessage();
      expect(ownerHeardCursor.type).toBe('presence_batch');
      const users = ownerHeardCursor.payload?.users as any[];
      expect(users).toBeDefined();
      expect(users[0].userId).toBe(userViewer.id);
      expect(users[0].presence.cursor).toEqual({ x: 320, y: 480 });

      clientOwner.close();
      clientViewer.close();
    });
  });

  describe('Editor Sync Broadcast', () => {
    it('broadcasts mutation sync_update from editor to other peers', async () => {
      const clientOwner = createClientWs(`token=${tokenOwner}&diagramId=${sampleDiagramId}`);
      await clientOwner.waitForMessage(); // room_joined
      await clientOwner.waitForMessage(); // presence_batch

      const clientEditor = createClientWs(`token=${tokenEditor}&diagramId=${sampleDiagramId}`);
      await clientEditor.waitForMessage(); // room_joined
      await clientEditor.waitForMessage(); // presence_batch
      await clientOwner.waitForMessage();  // user_joined

      const syncMsg: CollabClientMessage = {
        type: 'sync_update',
        diagramId: sampleDiagramId,
        payload: { patch: 'valid-editor-state-patch' },
      };
      clientEditor.send(syncMsg);

      const ownerHeardSync = await clientOwner.waitForMessage();
      expect(ownerHeardSync.type).toBe('sync_update');
      expect(ownerHeardSync.payload?.patch).toBe('valid-editor-state-patch');

      clientOwner.close();
      clientEditor.close();
    });
  });

  describe('Disconnect & Revocation Handling', () => {
    it('broadcasts user_left when client disconnects and cleans empty room', async () => {
      const clientOwner = createClientWs(`token=${tokenOwner}&diagramId=${sampleDiagramId}`);
      await clientOwner.waitForMessage(); // room_joined
      await clientOwner.waitForMessage(); // presence_batch

      const clientEditor = createClientWs(`token=${tokenEditor}&diagramId=${sampleDiagramId}`);
      await clientEditor.waitForMessage(); // room_joined
      await clientEditor.waitForMessage(); // presence_batch
      await clientOwner.waitForMessage();  // user_joined

      clientEditor.close();

      const ownerHeardLeave = await clientOwner.waitForMessage();
      expect(ownerHeardLeave.type).toBe('user_left');
      expect(ownerHeardLeave.payload?.userId).toBe(userEditor.id);

      clientOwner.close();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const room = collabServer.getRooms().get(sampleDiagramId);
      expect(room).toBeUndefined();
    });

    it('revokes access for specific user and notifies them before closing socket', async () => {
      const clientEditor = createClientWs(`token=${tokenEditor}&diagramId=${sampleDiagramId}`);
      await clientEditor.waitForMessage(); // room_joined
      await clientEditor.waitForMessage(); // presence_batch

      const revoked = collabServer.revokeUserAccess(sampleDiagramId, userEditor.id, 'Membership role removed');
      expect(revoked).toBe(true);

      const msg = await clientEditor.waitForMessage();
      expect(msg.type).toBe('permission_revoked');
      expect(msg.payload?.reason).toBe('Membership role removed');

      await waitForCloseOrError(clientEditor.ws);
      expect(clientEditor.ws.readyState).toBe(WebSocket.CLOSED);
    });

    it('revokes entire room and notifies all clients', async () => {
      const clientOwner = createClientWs(`token=${tokenOwner}&diagramId=${sampleDiagramId}`);
      await clientOwner.waitForMessage(); // room_joined
      await clientOwner.waitForMessage(); // presence_batch

      const clientViewer = createClientWs(`token=${tokenViewer}&diagramId=${sampleDiagramId}`);
      await clientViewer.waitForMessage(); // room_joined
      await clientViewer.waitForMessage(); // presence_batch
      await clientOwner.waitForMessage();  // user_joined (viewer)

      const revoked = collabServer.revokeRoom(sampleDiagramId, 'Diagram archived');
      expect(revoked).toBe(true);

      const [ownerMsg, viewerMsg] = await Promise.all([
        clientOwner.waitForMessage(),
        clientViewer.waitForMessage(),
      ]);

      expect(ownerMsg.type).toBe('permission_revoked');
      expect(viewerMsg.type).toBe('permission_revoked');

      expect(collabServer.getRooms().has(sampleDiagramId)).toBe(false);
    });

    it('retains user in room if user has multiple active connections (tabs) when one closes', async () => {
      const clientOwner = createClientWs(`token=${tokenOwner}&diagramId=${sampleDiagramId}`);
      await clientOwner.waitForMessage(); // room_joined
      await clientOwner.waitForMessage(); // presence_batch

      const clientEditorTab1 = createClientWs(`token=${tokenEditor}&diagramId=${sampleDiagramId}`);
      await clientEditorTab1.waitForMessage(); // room_joined
      await clientEditorTab1.waitForMessage(); // presence_batch
      await clientOwner.waitForMessage();      // user_joined (tab 1)

      const clientEditorTab2 = createClientWs(`token=${tokenEditor}&diagramId=${sampleDiagramId}`);
      await clientEditorTab2.waitForMessage(); // room_joined
      await clientEditorTab2.waitForMessage(); // presence_batch
      await clientOwner.waitForMessage();      // user_joined (tab 2)

      let ownerHeardLeave = false;
      const onMsg = (data: RawData) => {
        try {
          const m = JSON.parse(data.toString());
          if (m.type === 'user_left' && m.payload?.userId === userEditor.id) {
            ownerHeardLeave = true;
          }
        } catch {}
      };
      clientOwner.ws.on('message', onMsg);

      clientEditorTab1.close();
      await new Promise((r) => setTimeout(r, 100));

      expect(ownerHeardLeave).toBe(false);

      clientEditorTab2.close();
      const leaveMsg = await clientOwner.waitForMessage();
      expect(leaveMsg.type).toBe('user_left');
      expect(leaveMsg.payload?.userId).toBe(userEditor.id);

      clientOwner.ws.off('message', onMsg);
      clientOwner.close();
    });
  });
});
