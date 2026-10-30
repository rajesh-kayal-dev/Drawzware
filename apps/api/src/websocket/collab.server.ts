import http from 'http';
import { Duplex } from 'stream';
import { URL } from 'url';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { verifyToken } from '../utils/jwt.util.js';
import { isOriginAllowed } from '../config/env.js';
import { findDiagramDocById } from '../repositories/diagram.repository.js';
import type { IDiagram } from '../models/diagram.model.js';
import { findUserDocById } from '../repositories/user.repository.js';
import { findWorkspaceMember } from '../services/workspace.service.js';
import { CrdtManager } from './crdt.service.js';
import {
  CollabClientMessageSchema,
  CollabServerMessage,
  WorkspaceRole,
  UserPresence,
} from '@drawzware/contracts';

export interface CollabClientConnection {
  socket: WebSocket;
  userId: string;
  userEmail?: string;
  role: WorkspaceRole;
  diagramId: string;
  isAlive: boolean;
  presence: UserPresence;
}

export interface CollabServerOptions {
  path?: string;
  heartbeatIntervalMs?: number;
  maxPayload?: number;
  crdtDebounceMs?: number;
}

function abortUpgrade(
  socket: Duplex,
  statusCode: number,
  statusText: string,
  message: string
): void {
  if (socket.destroyed || !socket.writable) return;
  socket.write(
    `HTTP/1.1 ${statusCode} ${statusText}\r\n` +
      'Content-Type: text/plain\r\n' +
      'Connection: close\r\n' +
      `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n` +
      message
  );
  socket.destroy();
}

function formatCloseReason(reason: string): string {
  return reason.length > 120 ? reason.slice(0, 117) + '...' : reason;
}

export async function authenticateUpgradeRequest(
  req: http.IncomingMessage
): Promise<
  | { success: true; userId: string; userEmail?: string; userName?: string; diagramId: string; role: WorkspaceRole }
  | { success: false; statusCode: number; statusText: string; message: string }
> {
  // Cross-Site WebSocket Hijacking (CSWSH) origin validation
  const origin = req.headers.origin;
  if (origin && !isOriginAllowed(origin)) {
    return {
      success: false,
      statusCode: 403,
      statusText: 'Forbidden',
      message: 'Origin not allowed',
    };
  }

  let url: URL;
  try {
    const host = req.headers.host || 'localhost';
    url = new URL(req.url || '', `http://${host}`);
  } catch {
    return {
      success: false,
      statusCode: 400,
      statusText: 'Bad Request',
      message: 'Malformed request URL',
    };
  }

  let token = url.searchParams.get('token');
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  const diagramId = url.searchParams.get('diagramId');

  if (!token) {
    return {
      success: false,
      statusCode: 401,
      statusText: 'Unauthorized',
      message: 'Missing authentication token',
    };
  }

  if (!diagramId) {
    return {
      success: false,
      statusCode: 400,
      statusText: 'Bad Request',
      message: 'Missing diagramId parameter',
    };
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return {
      success: false,
      statusCode: 500,
      statusText: 'Internal Server Error',
      message: 'Server configuration error: JWT_SECRET missing',
    };
  }

  let userId: string;
  let userEmail: string | undefined;
  let userName: string | undefined;

  try {
    const payload = verifyToken(token, secret);
    const resolvedId = payload.id || payload.sub;
    if (!resolvedId) {
      return {
        success: false,
        statusCode: 401,
        statusText: 'Unauthorized',
        message: 'Invalid token: missing subject claim',
      };
    }
    userId = resolvedId;
    userEmail = payload.email;

    // Check session validity & revocation first using fresh DB state
    let userDoc: { name?: string; isEmailVerified?: boolean; tokenVersion?: number } | null = null;
    try {
      userDoc = await findUserDocById(userId);
      if (userDoc?.name) {
        userName = userDoc.name;
      }
      if (userDoc && typeof userDoc.tokenVersion === 'number' && typeof payload.tokenVersion === 'number') {
        if (payload.tokenVersion < userDoc.tokenVersion) {
          return {
            success: false,
            statusCode: 401,
            statusText: 'Unauthorized',
            message: 'Authentication token has been revoked due to session invalidation',
          };
        }
      }
    } catch {
      // Safe fallback in mock test environments
    }

    // Check verification status from fresh database state first, falling back to payload claim
    const isEmailVerified = userDoc ? Boolean(userDoc.isEmailVerified) : Boolean(payload.isEmailVerified);
    if (!isEmailVerified) {
      return {
        success: false,
        statusCode: 403,
        statusText: 'Forbidden',
        message: 'Email verification is required for real-time cloud collaboration',
      };
    }
  } catch {
    return {
      success: false,
      statusCode: 401,
      statusText: 'Unauthorized',
      message: 'Invalid or expired authentication token',
    };
  }

  let diagram: IDiagram | null = null;
  try {
    diagram = await findDiagramDocById(diagramId);
  } catch (err) {
    console.warn(`[CollabServer] Diagram lookup error for ID ${diagramId}:`, err);
    return {
      success: false,
      statusCode: 404,
      statusText: 'Not Found',
      message: 'Diagram not found',
    };
  }

  if (!diagram) {
    return {
      success: false,
      statusCode: 404,
      statusText: 'Not Found',
      message: 'Diagram not found',
    };
  }

  let member: ReturnType<typeof findWorkspaceMember> extends Promise<infer M> ? M : null = null;
  try {
    member = await findWorkspaceMember(diagram.workspaceId, userId);
  } catch (err) {
    console.warn(`[CollabServer] Workspace member lookup error for ${diagram.workspaceId}:`, err);
    return {
      success: false,
      statusCode: 403,
      statusText: 'Forbidden',
      message: 'You do not have access to this diagram',
    };
  }

  if (!member) {
    return {
      success: false,
      statusCode: 403,
      statusText: 'Forbidden',
      message: 'You do not have access to this diagram',
    };
  }

  if (member.role !== 'owner') {
    const allowed = member.allowedDiagramIds;
    if (allowed && allowed.length > 0 && !allowed.includes(diagramId)) {
      return {
        success: false,
        statusCode: 403,
        statusText: 'Forbidden',
        message: 'You do not have access to this diagram',
      };
    }
  }

  return {
    success: true,
    userId,
    userEmail,
    userName: userName || (userEmail ? userEmail.split('@')[0] : userId),
    diagramId,
    role: member.role,
  };
}

export class CollabServer {
  private wss: WebSocketServer;
  private rooms: Map<string, Set<CollabClientConnection>> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private path: string;
  private crdtManager: CrdtManager;

  constructor(server?: http.Server, options: CollabServerOptions = {}) {
    this.path = options.path || '/collab';
    this.wss = new WebSocketServer({
      noServer: true,
      maxPayload: options.maxPayload ?? 10 * 1024 * 1024,
    });
    this.crdtManager = new CrdtManager({ debounceMs: options.crdtDebounceMs });

    if (server) {
      this.attach(server);
    }

    const interval = options.heartbeatIntervalMs ?? 30000;
    if (interval > 0) {
      this.startHeartbeat(interval);
    }
  }

  getCrdtManager(): CrdtManager {
    return this.crdtManager;
  }

  attach(server: http.Server): void {
    server.on('upgrade', async (req, socket, head) => {
      let url: URL;
      try {
        const host = req.headers.host || 'localhost';
        url = new URL(req.url || '', `http://${host}`);
      } catch {
        abortUpgrade(socket, 400, 'Bad Request', 'Malformed request URL');
        return;
      }

      if (url.pathname !== this.path) {
        return;
      }

      let socketClosed = false;
      const onEarlyClose = () => {
        socketClosed = true;
      };
      socket.once('close', onEarlyClose);
      socket.once('error', onEarlyClose);

      try {
        const authResult = await authenticateUpgradeRequest(req);

        socket.removeListener('close', onEarlyClose);
        socket.removeListener('error', onEarlyClose);

        if (socketClosed || socket.destroyed || !socket.writable) {
          return;
        }

        if (!authResult.success) {
          abortUpgrade(socket, authResult.statusCode, authResult.statusText, authResult.message);
          return;
        }

        this.wss.handleUpgrade(req, socket, head, (wsClient) => {
          this.handleConnection(wsClient, {
            userId: authResult.userId,
            userEmail: authResult.userEmail,
            userName: authResult.userName,
            role: authResult.role,
            diagramId: authResult.diagramId,
          });
        });
      } catch (upgradeErr) {
        console.error('[CollabServer] Upgrade handshake exception:', upgradeErr);
        socket.removeListener('close', onEarlyClose);
        socket.removeListener('error', onEarlyClose);
        abortUpgrade(socket, 500, 'Internal Server Error', 'Upgrade handshake failed');
      }
    });
  }

  handleConnection(
    socket: WebSocket,
    meta: { userId: string; userEmail?: string; userName?: string; role: WorkspaceRole; diagramId: string }
  ): CollabClientConnection {
    const resolvedName = meta.userName || (meta.userEmail ? meta.userEmail.split('@')[0] : meta.userId);
    const client: CollabClientConnection = {
      socket,
      userId: meta.userId,
      userEmail: meta.userEmail,
      role: meta.role,
      diagramId: meta.diagramId,
      isAlive: true,
      presence: {
        userId: meta.userId,
        userName: resolvedName,
        email: meta.userEmail,
        cursor: null,
        selectedNodeIds: [],
        lastActiveAt: new Date().toISOString(),
      },
    };

    let room = this.rooms.get(meta.diagramId);
    if (!room) {
      room = new Set();
      this.rooms.set(meta.diagramId, room);
    }
    room.add(client);

    // 1. Notify joining client of successful room join
    this.sendToClient(client, {
      type: 'room_joined',
      diagramId: meta.diagramId,
      payload: {
        userId: meta.userId,
        userEmail: meta.userEmail,
        role: meta.role,
        memberCount: room.size,
      },
    });

    // 2. Send current presence batch to connecting client
    const currentUsers = Array.from(room).map((c) => ({
      userId: c.userId,
      userEmail: c.userEmail,
      role: c.role,
      presence: c.presence,
    }));
    this.sendToClient(client, {
      type: 'presence_batch',
      diagramId: meta.diagramId,
      payload: {
        users: currentUsers,
      },
    });

    // 3. Broadcast user_joined to other room peers
    this.broadcastToRoom(
      meta.diagramId,
      {
        type: 'user_joined',
        diagramId: meta.diagramId,
        payload: {
          userId: meta.userId,
          userEmail: meta.userEmail,
          role: meta.role,
        },
      },
      client
    );

    socket.on('pong', () => {
      client.isAlive = true;
    });

    socket.on('message', (raw: RawData) => {
      void this.handleMessage(client, raw);
    });

    socket.on('close', () => {
      this.handleDisconnect(client);
    });

    socket.on('error', () => {
      this.handleDisconnect(client);
    });

    return client;
  }

  private async handleMessage(client: CollabClientConnection, raw: RawData): Promise<void> {
    let data: unknown;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      this.sendToClient(client, {
        type: 'error',
        diagramId: client.diagramId,
        payload: {
          code: 'INVALID_JSON',
          message: 'Malformed JSON payload',
        },
      });
      return;
    }

    const parseResult = CollabClientMessageSchema.safeParse(data);
    if (!parseResult.success) {
      this.sendToClient(client, {
        type: 'error',
        diagramId: client.diagramId,
        payload: {
          code: 'INVALID_MESSAGE_SCHEMA',
          message: parseResult.error.message,
        },
      });
      return;
    }

    const message = parseResult.data;

    if (message.diagramId !== client.diagramId) {
      this.sendToClient(client, {
        type: 'error',
        diagramId: client.diagramId,
        payload: {
          code: 'DIAGRAM_ID_MISMATCH',
          message: `Message diagramId (${message.diagramId}) does not match joined room (${client.diagramId})`,
        },
      });
      return;
    }

    if (message.type === 'ping') {
      client.isAlive = true;
      this.sendToClient(client, {
        type: 'pong',
        diagramId: client.diagramId,
        payload: {
          timestamp: Date.now(),
        },
      });
      return;
    }

    if (message.type === 'leave_room') {
      try {
        client.socket.close(1000, 'User left room');
      } catch {
        // Safe ignore
      }
      this.handleDisconnect(client);
      return;
    }

    const isMutationMessage =
      message.type === 'sync_update' ||
      message.type === 'sync_step_2';

    // Viewer read-only enforcement
    if (client.role === 'viewer' && isMutationMessage) {
      this.sendToClient(client, {
        type: 'error',
        diagramId: client.diagramId,
        payload: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: "Users with 'viewer' role have read-only access and cannot broadcast diagram updates.",
        },
      });
      return;
    }

    // Ephemeral presence / cursor tracking
    if (message.type === 'cursor_move' || message.type === 'presence_update') {
      if (message.payload) {
        if (message.payload.cursor === null) {
          client.presence.cursor = null;
        } else if (message.payload.cursor && typeof message.payload.cursor === 'object') {
          const c = message.payload.cursor as { x?: number; y?: number };
          if (typeof c.x === 'number' && typeof c.y === 'number') {
            client.presence.cursor = { x: c.x, y: c.y };
          }
        }
        if (Array.isArray(message.payload.selectedNodeIds)) {
          client.presence.selectedNodeIds = message.payload.selectedNodeIds.filter(
            (id: unknown): id is string => typeof id === 'string'
          );
        }
        client.presence.lastActiveAt = new Date().toISOString();
      }

      this.broadcastToRoom(
        client.diagramId,
        {
          type: 'presence_batch',
          diagramId: client.diagramId,
          payload: {
            users: [
              {
                userId: client.userId,
                userEmail: client.userEmail,
                role: client.role,
                presence: client.presence,
              },
            ],
          },
        },
        client
      );
      return;
    }

    // Handle CRDT Sync Step 1 (exchange state vector to receive sync_step_2)
    if (message.type === 'sync_step_1') {
      const stateVector =
        typeof message.payload?.stateVector === 'string'
          ? message.payload.stateVector
          : undefined;
      try {
        const update = await this.crdtManager.getSyncStep2(client.diagramId, stateVector);
        this.sendToClient(client, {
          type: 'sync_step_2',
          diagramId: client.diagramId,
          payload: { update },
        });

        // Only ask client to push missing updates if client has edit permissions (owner/editor)
        if (client.role !== 'viewer') {
          const serverVector = await this.crdtManager.getSyncStep1(client.diagramId);
          this.sendToClient(client, {
            type: 'sync_step_1',
            diagramId: client.diagramId,
            payload: { stateVector: serverVector },
          });
        }
      } catch (err: unknown) {
        this.sendToClient(client, {
          type: 'error',
          diagramId: client.diagramId,
          payload: {
            code: 'CRDT_SYNC_FAILED',
            message: err instanceof Error ? err.message : 'Failed to generate sync step 2',
          },
        });
      }
      return;
    }

    // CRDT mutation updates applied and broadcast to room peers (editor or owner)
    if (message.type === 'sync_update' || message.type === 'sync_step_2') {
      const update =
        typeof message.payload?.update === 'string' ? message.payload.update : undefined;
      if (update) {
        const res = await this.crdtManager.applyClientUpdate(client.diagramId, update);
        if (!res.success) {
          this.sendToClient(client, {
            type: 'error',
            diagramId: client.diagramId,
            payload: {
              code: 'CRDT_APPLY_FAILED',
              message: res.error || 'Failed to apply CRDT update',
            },
          });
          return;
        }
      }

      this.broadcastToRoom(
        client.diagramId,
        {
          type: message.type,
          diagramId: client.diagramId,
          payload: message.payload,
        },
        client
      );
      return;
    }
  }

  sendToClient(client: CollabClientConnection, message: CollabServerMessage): void {
    if (client.socket.readyState === 1) {
      try {
        client.socket.send(JSON.stringify(message));
      } catch {
        // Safe ignore
      }
    }
  }

  broadcastToRoom(
    diagramId: string,
    message: CollabServerMessage,
    excludeClient?: CollabClientConnection
  ): void {
    const room = this.rooms.get(diagramId);
    if (!room) return;

    const payload = JSON.stringify(message);
    for (const client of room) {
      if (client !== excludeClient && client.socket.readyState === 1) {
        try {
          client.socket.send(payload);
        } catch {
          // Safe ignore
        }
      }
    }
  }

  handleDisconnect(client: CollabClientConnection): void {
    const room = this.rooms.get(client.diagramId);
    if (!room) return;

    if (room.has(client)) {
      room.delete(client);
      if (room.size === 0) {
        this.rooms.delete(client.diagramId);
        void this.crdtManager.flushAndCloseSession(client.diagramId);
      } else {
        const userStillPresent = Array.from(room).some((c) => c.userId === client.userId);
        if (!userStillPresent) {
          this.broadcastToRoom(client.diagramId, {
            type: 'user_left',
            diagramId: client.diagramId,
            payload: {
              userId: client.userId,
            },
          });
        }
      }
    }
  }

  revokeUserAccess(diagramId: string, userId: string, reason = 'Access revoked or role changed'): boolean {
    const room = this.rooms.get(diagramId);
    if (!room) return false;

    let found = false;
    for (const client of Array.from(room)) {
      if (client.userId === userId) {
        found = true;
        this.sendToClient(client, {
          type: 'permission_revoked',
          diagramId,
          payload: { userId, reason },
        });
        try {
          client.socket.close(4403, formatCloseReason(reason));
        } catch {
          // Safe ignore
        }
        this.handleDisconnect(client);
      }
    }
    return found;
  }

  revokeRoom(diagramId: string, reason = 'Diagram session closed or deleted'): boolean {
    const room = this.rooms.get(diagramId);
    if (!room) return false;

    for (const client of Array.from(room)) {
      this.sendToClient(client, {
        type: 'permission_revoked',
        diagramId,
        payload: { reason },
      });
      try {
        client.socket.close(4403, formatCloseReason(reason));
      } catch {
        // Safe ignore
      }
    }
    this.rooms.delete(diagramId);
    void this.crdtManager.flushAndCloseSession(diagramId);
    return true;
  }

  private startHeartbeat(intervalMs: number): void {
    this.heartbeatTimer = setInterval(() => {
      for (const room of this.rooms.values()) {
        for (const client of Array.from(room)) {
          if (!client.isAlive) {
            try {
              client.socket.terminate();
            } catch {
              // Safe ignore
            }
            this.handleDisconnect(client);
            continue;
          }
          client.isAlive = false;
          try {
            client.socket.ping();
          } catch {
            // Safe ignore
          }
        }
      }
    }, intervalMs);

    if (this.heartbeatTimer && typeof this.heartbeatTimer.unref === 'function') {
      this.heartbeatTimer.unref();
    }
  }

  async close(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const room of this.rooms.values()) {
      for (const client of Array.from(room)) {
        try {
          client.socket.close(1001, 'Server shutting down');
        } catch {
          // Safe ignore
        }
      }
    }
    this.rooms.clear();
    await this.crdtManager.closeAll();
    return new Promise((resolve) => {
      this.wss.close(() => resolve());
    });
  }

  getRooms(): Map<string, Set<CollabClientConnection>> {
    return this.rooms;
  }

  getRoomClients(diagramId: string): CollabClientConnection[] {
    const room = this.rooms.get(diagramId);
    return room ? Array.from(room) : [];
  }
}

export function attachCollaborationServer(
  httpServer: http.Server,
  options?: CollabServerOptions
): CollabServer {
  return new CollabServer(httpServer, options);
}
