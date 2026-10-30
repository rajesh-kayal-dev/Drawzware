declare module 'ws' {
  import { EventEmitter } from 'events';
  import { IncomingMessage, Server as HttpServer } from 'http';
  import { Socket } from 'net';
  import { Duplex } from 'stream';

  export type RawData = Buffer | ArrayBuffer | Buffer[];

  export interface ServerOptions {
    host?: string;
    port?: number;
    backlog?: number;
    server?: HttpServer;
    verifyClient?: (
      info: { origin: string; secure: boolean; req: IncomingMessage },
      callback: (res: boolean, code?: number, message?: string) => void
    ) => void;
    handleProtocols?: (protocols: Set<string>, request: IncomingMessage) => string | false;
    path?: string;
    noServer?: boolean;
    clientTracking?: boolean;
    perMessageDeflate?: boolean | Record<string, unknown>;
    maxPayload?: number;
    skipUTF8Validation?: boolean;
  }

  export class WebSocket extends EventEmitter {
    static readonly CONNECTING: 0;
    static readonly OPEN: 1;
    static readonly CLOSING: 2;
    static readonly CLOSED: 3;

    readonly CONNECTING: 0;
    readonly OPEN: 1;
    readonly CLOSING: 2;
    readonly CLOSED: 3;

    readyState: number;
    url: string;

    constructor(address: string | URL, protocols?: string | string[], options?: Record<string, unknown>);
    constructor(address: string | URL, options?: Record<string, unknown>);

    close(code?: number, data?: string | Buffer): void;
    ping(data?: unknown, mask?: boolean, cb?: (err: Error) => void): void;
    pong(data?: unknown, mask?: boolean, cb?: (err: Error) => void): void;
    send(data: unknown, cb?: (err?: Error) => void): void;
    send(data: unknown, options?: { mask?: boolean; binary?: boolean; compress?: boolean; fin?: boolean }, cb?: (err?: Error) => void): void;
    terminate(): void;

    on(event: 'close', listener: (code: number, reason: Buffer) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'upgrade', listener: (request: IncomingMessage) => void): this;
    on(event: 'message', listener: (data: RawData, isBinary: boolean) => void): this;
    on(event: 'open', listener: () => void): this;
    on(event: 'ping' | 'pong', listener: (data: Buffer) => void): this;
    on(event: string | symbol, listener: (...args: unknown[]) => void): this;
  }

  export class WebSocketServer extends EventEmitter {
    options: ServerOptions;
    clients: Set<WebSocket>;

    constructor(options?: ServerOptions, callback?: () => void);

    close(cb?: (err?: Error) => void): void;
    handleUpgrade(
      request: IncomingMessage,
      socket: Duplex | Socket,
      upgradeHead: Buffer,
      callback: (client: WebSocket, request: IncomingMessage) => void
    ): void;
    shouldHandle(request: IncomingMessage): boolean | Promise<boolean>;

    on(event: 'connection', listener: (socket: WebSocket, request: IncomingMessage, ...args: unknown[]) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'headers', listener: (headers: string[], request: IncomingMessage) => void): this;
    on(event: 'close' | 'listening', listener: () => void): this;
    on(event: string | symbol, listener: (...args: unknown[]) => void): this;
  }

  export default WebSocket;
}
