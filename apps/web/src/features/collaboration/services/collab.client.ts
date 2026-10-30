import type {
  CollabServerMessage,
  CollabClientMessage,
  WorkspaceRole,
  UserPresence,
} from '@drawzware/contracts';

export type CollabConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface CollabClientOptions {
  diagramId: string;
  token: string | (() => string | null | Promise<string | null>);
  wsUrl?: string;
  role?: WorkspaceRole;
  onStatusChange?: (status: CollabConnectionStatus) => void;
  onRemoteUpdate?: (updateBase64: string) => void;
  onSyncStep1?: (stateVectorBase64: string) => void;
  onSyncStep2?: (updateBase64: string) => void;
  onPresenceUpdate?: (
    users: Array<{
      userId: string;
      userEmail?: string;
      role: WorkspaceRole;
      presence: UserPresence;
    }>
  ) => void;
  onUserLeft?: (userId: string) => void;
  onPermissionRevoked?: (reason?: string) => void;
  onError?: (error: { code: string; message: string }) => void;
}

export function getDefaultWsUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Fallback to current host with /collab or localhost:3000 in dev
    const isDev = window.location.port === '3000' || window.location.port === '3001';
    const host = isDev ? '127.0.0.1:5000' : window.location.host;
    return `${protocol}//${host}/collab`;
  }
  return 'ws://127.0.0.1:5000/collab';
}

export class CollabClient {
  private ws: WebSocket | null = null;
  private options: CollabClientOptions;
  private status: CollabConnectionStatus = 'disconnected';
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private baseDelayMs = 1000;
  private maxDelayMs = 10000;
  private cursorThrottleTimer: NodeJS.Timeout | null = null;
  private pendingCursor: { x: number; y: number } | null = null;
  private pendingSelectedNodeIds: string[] = [];
  private queuedMessages: CollabClientMessage[] = [];
  private heartbeatPingTimer: NodeJS.Timeout | null = null;
  private heartbeatWatchdogTimer: NodeJS.Timeout | null = null;
  private serverSupportsAppPing = true;
  private lastServerActivityTimestamp = 0;
  private readonly PING_INTERVAL_MS = 12000;
  private readonly DEAD_TIMEOUT_MS = 20000;

  constructor(options: CollabClientOptions) {
    this.options = options;
  }

  getStatus(): CollabConnectionStatus {
    return this.status;
  }

  private setStatus(newStatus: CollabConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.options.onStatusChange?.(newStatus);
    }
  }

  async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.shouldReconnect = true;
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    let tokenVal: string | null = null;
    try {
      tokenVal = typeof this.options.token === 'function' ? await this.options.token() : this.options.token;
    } catch {
      tokenVal = null;
    }

    if (!tokenVal) {
      this.shouldReconnect = false;
      this.setStatus('disconnected');
      this.options.onPermissionRevoked?.('Authentication token missing or expired');
      return;
    }

    const baseUrl = this.options.wsUrl || getDefaultWsUrl();
    const query = `diagramId=${encodeURIComponent(this.options.diagramId)}&token=${encodeURIComponent(tokenVal)}`;
    const fullUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${query}`;

    try {
      this.ws = new WebSocket(fullUrl);
    } catch {
      this.setStatus('error');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.serverSupportsAppPing = true;
      this.lastServerActivityTimestamp = Date.now();
      this.setStatus('connected');
      this.startHeartbeat();
      this.flushQueue();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleServerMessage(event.data);
    };

    this.ws.onerror = () => {
      // If we already have a reconnect cycle or are disconnected, avoid flashing "error" status prematurely
      if (this.reconnectAttempts >= 3) {
        this.setStatus('error');
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.stopHeartbeat();
      this.ws = null;
      if (event.code === 4403 || event.code === 4401 || event.code === 4404 || event.code === 1008) {
        // Access revoked, diagram not found, or authentication expired - do not reconnect
        this.shouldReconnect = false;
        this.setStatus('disconnected');
        this.options.onPermissionRevoked?.(event.reason || 'Diagram not found or authentication revoked');
        return;
      }

      if (this.shouldReconnect) {
        this.scheduleReconnect();
      } else {
        this.setStatus('disconnected');
      }
    };
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    if (this.reconnectAttempts >= 4) {
      this.setStatus('error');
    } else {
      this.setStatus('reconnecting');
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const backoff = Math.min(
      this.baseDelayMs * Math.pow(1.5, Math.min(this.reconnectAttempts, 6)),
      4000
    );
    const jitter = Math.random() * 300;
    const delay = backoff + jitter;

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  reconnect(): void {
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Safe ignore
      }
      this.ws = null;
    }
    this.setStatus('connecting');
    void this.connect();
  }

  private handleServerMessage(rawData: unknown): void {
    if (typeof rawData !== 'string') return;
    this.lastServerActivityTimestamp = Date.now();
    let message: CollabServerMessage;
    try {
      message = JSON.parse(rawData);
    } catch {
      return;
    }
    if (message.type === 'pong') {
      return;
    }

    switch (message.type) {
      case 'room_joined': {
        break;
      }

      case 'presence_batch': {
        if (message.payload && Array.isArray(message.payload.users)) {
          this.options.onPresenceUpdate?.(
            message.payload.users as Array<{
              userId: string;
              userEmail?: string;
              role: WorkspaceRole;
              presence: UserPresence;
            }>
          );
        }
        break;
      }

      case 'user_joined': {
        if (message.payload?.userId) {
          const u = message.payload as {
            userId: string;
            userEmail?: string;
            role: WorkspaceRole;
          };
          this.options.onPresenceUpdate?.([
            {
              userId: u.userId,
              userEmail: u.userEmail,
              role: u.role || 'viewer',
              presence: {
                userId: u.userId,
                userName: u.userEmail ? u.userEmail.split('@')[0] : u.userId,
                email: u.userEmail,
                cursor: null,
                selectedNodeIds: [],
                lastActiveAt: new Date().toISOString(),
              },
            },
          ]);
        }
        break;
      }

      case 'user_left': {
        if (typeof message.payload?.userId === 'string') {
          this.options.onUserLeft?.(message.payload.userId);
        }
        break;
      }

      case 'sync_step_1': {
        if (typeof message.payload?.stateVector === 'string') {
          this.options.onSyncStep1?.(message.payload.stateVector);
        }
        break;
      }

      case 'sync_step_2': {
        if (typeof message.payload?.update === 'string') {
          this.options.onSyncStep2?.(message.payload.update);
        }
        break;
      }

      case 'sync_update': {
        if (typeof message.payload?.update === 'string') {
          this.options.onRemoteUpdate?.(message.payload.update);
        }
        break;
      }

      case 'permission_revoked': {
        const reason = typeof message.payload?.reason === 'string' ? message.payload.reason : undefined;
        this.options.onPermissionRevoked?.(reason);
        this.disconnect();
        break;
      }

      case 'error': {
        const code = (message.payload?.code as string) || 'UNKNOWN_ERROR';
        const msg = (message.payload?.message as string) || 'Collaboration error occurred';
        if (code === 'INVALID_MESSAGE_SCHEMA' && typeof msg === 'string' && msg.includes('ping')) {
          this.serverSupportsAppPing = false;
          if (this.heartbeatPingTimer) {
            clearInterval(this.heartbeatPingTimer);
            this.heartbeatPingTimer = null;
          }
          return;
        }
        this.options.onError?.({ code, message: msg });
        break;
      }
    }
  }

  send(message: CollabClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return;
      } catch {
        // Safe ignore
      }
    }

    // Queue CRDT mutation and sync messages to be flushed immediately upon connection
    if (
      message.type === 'sync_update' ||
      message.type === 'sync_step_2' ||
      message.type === 'sync_step_1'
    ) {
      this.queuedMessages.push(message);
    }
  }

  private flushQueue(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this.queuedMessages.length > 0) {
      const msg = this.queuedMessages.shift();
      if (msg) {
        try {
          this.ws.send(JSON.stringify(msg));
        } catch {
          break;
        }
      }
    }
  }

  sendSyncStep1(stateVectorBase64?: string): void {
    this.send({
      type: 'sync_step_1',
      diagramId: this.options.diagramId,
      payload: stateVectorBase64 ? { stateVector: stateVectorBase64 } : {},
    });
  }

  sendSyncUpdate(updateBase64: string): void {
    this.send({
      type: 'sync_update',
      diagramId: this.options.diagramId,
      payload: { update: updateBase64 },
    });
  }

  sendCursorMove(pos: { x: number; y: number } | null, selectedNodeIds: string[] = []): void {
    this.pendingCursor = pos;
    this.pendingSelectedNodeIds = selectedNodeIds;

    if (pos === null) {
      if (this.cursorThrottleTimer) {
        clearTimeout(this.cursorThrottleTimer);
        this.cursorThrottleTimer = null;
      }
      this.send({
        type: 'cursor_move',
        diagramId: this.options.diagramId,
        payload: {
          cursor: null,
          selectedNodeIds: [],
        },
      });
      return;
    }

    if (this.cursorThrottleTimer) return;

    this.cursorThrottleTimer = setTimeout(() => {
      this.cursorThrottleTimer = null;
      this.send({
        type: 'cursor_move',
        diagramId: this.options.diagramId,
        payload: {
          cursor: this.pendingCursor,
          selectedNodeIds: this.pendingSelectedNodeIds,
        },
      });
    }, 40);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastServerActivityTimestamp = Date.now();

    // Send application-layer ping periodically
    this.heartbeatPingTimer = setInterval(() => {
      if (!this.serverSupportsAppPing) return;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          diagramId: this.options.diagramId,
          payload: { timestamp: Date.now() },
        });
      }
    }, this.PING_INTERVAL_MS);

    // Watchdog: detect dead connection / half-open socket if no server activity
    this.heartbeatWatchdogTimer = setInterval(() => {
      if (this.status !== 'connected') return;
      const elapsed = Date.now() - this.lastServerActivityTimestamp;
      if (elapsed > this.DEAD_TIMEOUT_MS) {
        console.warn(`[CollabClient] Heartbeat dead connection detected (${elapsed}ms without server activity). Reconnecting...`);
        this.stopHeartbeat();
        if (this.ws) {
          try {
            this.ws.close();
          } catch {
            // Safe ignore
          }
          this.ws = null;
        }
        this.setStatus('reconnecting');
        this.scheduleReconnect();
      }
    }, 4000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatPingTimer) {
      clearInterval(this.heartbeatPingTimer);
      this.heartbeatPingTimer = null;
    }
    if (this.heartbeatWatchdogTimer) {
      clearInterval(this.heartbeatWatchdogTimer);
      this.heartbeatWatchdogTimer = null;
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.cursorThrottleTimer) {
      clearTimeout(this.cursorThrottleTimer);
      this.cursorThrottleTimer = null;
    }

    if (this.ws) {
      try {
        this.send({
          type: 'leave_room',
          diagramId: this.options.diagramId,
        });
        this.ws.close(1000, 'Client disconnected');
      } catch {
        // Safe ignore
      }
      this.ws = null;
    }

    this.setStatus('disconnected');
  }
}
