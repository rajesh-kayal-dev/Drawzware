import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import LZString from 'lz-string';
import { ProjectSchema } from '@drawzware/contracts';
import {
  decodeCanvasFromUrl,
  MAX_SHARE_ENCODED_CHARS,
  MAX_SHARED_NODES,
  MAX_SHARED_EDGES,
} from '../apps/web/src/features/sharing/utils/share';
import { parseJsonImport } from '../apps/web/src/features/import-export/utils/json-import';
import { createRateLimiter } from '../apps/api/src/middleware/rate-limiter';
import { generateToken, verifyToken } from '../apps/api/src/utils/jwt.util';
import { isOriginAllowed } from '../apps/api/src/config/env';

describe('Security Remediations Regression Suite', () => {
  describe('URL Sharing Decompression & Hardening', () => {
    it('decodes valid compressed payload', () => {
      const payload = JSON.stringify({
        n: [{ id: 'node-1', type: 'system', position: { x: 10, y: 20 }, data: { label: 'Node 1' } }],
        e: [{ id: 'edge-1', source: 'node-1', target: 'node-2', data: {} }],
      });
      const encoded = LZString.compressToEncodedURIComponent(payload);
      const decoded = decodeCanvasFromUrl(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.nodes).toHaveLength(1);
      expect(decoded?.edges).toHaveLength(1);
      expect(decoded?.nodes[0].id).toBe('node-1');
    });

    it('rejects payloads exceeding MAX_SHARE_ENCODED_CHARS', () => {
      const hugeString = 'a'.repeat(MAX_SHARE_ENCODED_CHARS + 10);
      expect(decodeCanvasFromUrl(hugeString)).toBeNull();
    });

    it('rejects payloads with node counts exceeding MAX_SHARED_NODES', () => {
      const nodes = Array.from({ length: MAX_SHARED_NODES + 10 }, (_, i) => ({
        id: `node-${i}`,
        position: { x: i, y: i },
      }));
      const payload = JSON.stringify({ n: nodes, e: [] });
      const encoded = LZString.compressToEncodedURIComponent(payload);
      expect(decodeCanvasFromUrl(encoded)).toBeNull();
    });

    it('filters out malformed or poisoned node objects', () => {
      const payload = JSON.stringify({
        n: [
          { id: 'valid-1', position: { x: 0, y: 0 } },
          { id: 'invalid-no-pos' },
          { id: 12345, position: { x: 0, y: 0 } }, // invalid id type
          null,
          'not-an-object',
        ],
        e: [
          { id: 'edge-1', source: 'valid-1', target: 'valid-2' },
          { id: 'invalid-no-target', source: 'valid-1' },
          null,
        ],
      });
      const encoded = LZString.compressToEncodedURIComponent(payload);
      const decoded = decodeCanvasFromUrl(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.nodes).toHaveLength(1);
      expect(decoded?.nodes[0].id).toBe('valid-1');
      expect(decoded?.edges).toHaveLength(1);
      expect(decoded?.edges[0].id).toBe('edge-1');
    });
  });

  describe('ProjectSchema Contract Hardening', () => {
    it('accepts valid project structures with bounded nodes and edges', () => {
      const project = {
        id: 'valid-project-123',
        name: 'Safe Architecture',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [{ id: 'n1', position: { x: 0, y: 0 } }],
        edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
      };
      const res = ProjectSchema.safeParse(project);
      expect(res.success).toBe(true);
    });

    it('rejects projects with primitive elements in nodes array', () => {
      const project = {
        id: 'invalid-project',
        name: 'Poisoned Project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: ['string-not-object', 12345],
        edges: [],
      };
      const res = ProjectSchema.safeParse(project);
      expect(res.success).toBe(false);
    });

    it('rejects project names exceeding 256 characters', () => {
      const project = {
        id: 'long-name-project',
        name: 'a'.repeat(300),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [],
        edges: [],
      };
      const res = ProjectSchema.safeParse(project);
      expect(res.success).toBe(false);
    });
  });

  describe('JSON Import Hardening', () => {
    it('parses valid exported project', () => {
      const json = JSON.stringify({
        name: 'Imported Demo',
        nodes: [{ id: 'node-1', position: { x: 0, y: 0 } }],
        edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
      });
      const items = parseJsonImport(json);
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Imported Demo');
      expect(items[0].nodes).toHaveLength(1);
    });

    it('rejects imports where nodes contain non-object primitives', () => {
      const json = JSON.stringify({
        name: 'Invalid Items',
        nodes: [1, 2, 'bad'],
        edges: [],
      });
      expect(() => parseJsonImport(json)).toThrow();
    });
  });

  describe('Auth Rate Limiter Middleware', () => {
    it('throttles requests exceeding configured limit and sets Retry-After header', () => {
      const limiter = createRateLimiter({
        windowMs: 10000,
        maxRequests: 3,
        keyGenerator: () => 'test-ip-client',
      });

      const responses: Array<{ status: number; body?: unknown; headers: Record<string, unknown> }> = [];

      const makeReq = () => {
        let statusCode = 200;
        let responseBody: unknown;
        const headers: Record<string, unknown> = {};

        const req = {
          ip: '127.0.0.1',
          headers: {},
          socket: {},
        } as any;

        const res = {
          setHeader: (k: string, v: unknown) => {
            headers[k] = v;
          },
          status: (code: number) => {
            statusCode = code;
            return {
              json: (b: unknown) => {
                responseBody = b;
              },
            };
          },
        } as any;

        let calledNext = false;
        limiter(req, res, () => {
          calledNext = true;
        });

        responses.push({ status: calledNext ? 200 : statusCode, body: responseBody, headers });
      };

      makeReq(); // 1: allowed (remaining: 2)
      makeReq(); // 2: allowed (remaining: 1)
      makeReq(); // 3: allowed (remaining: 0)
      makeReq(); // 4: rejected (429)

      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(200);
      expect(responses[2].status).toBe(200);
      expect(responses[3].status).toBe(429);
      expect(responses[3].headers['Retry-After']).toBeDefined();
      expect((responses[3].body as any)?.error).toBe('TOO_MANY_REQUESTS');

      limiter.reset();
    });
  });

  describe('JWT Algorithm Pinning', () => {
    const originalSecret = process.env.JWT_SECRET;

    beforeEach(() => {
      process.env.JWT_SECRET = 'super-secret-key-for-test-suite-at-least-32-chars';
    });

    afterEach(() => {
      process.env.JWT_SECRET = originalSecret;
    });

    it('generates and verifies HS256 tokens', () => {
      const token = generateToken({ id: 'user-sec-1', email: 'sec@example.com' });
      expect(typeof token).toBe('string');

      const payload = verifyToken(token, process.env.JWT_SECRET!);
      expect(payload.id).toBe('user-sec-1');
      expect(payload.email).toBe('sec@example.com');
    });
  });

  describe('Production CORS Origin Restrictions', () => {
    const envObj = process.env as Record<string, string | undefined>;
    const originalEnv = process.env.NODE_ENV;
    const originalOrigin = process.env.WEB_ORIGIN;

    afterEach(() => {
      envObj.NODE_ENV = originalEnv;
      process.env.WEB_ORIGIN = originalOrigin;
    });

    it('allows localhost and desktop shell in development or test mode', () => {
      envObj.NODE_ENV = 'test';
      delete process.env.WEB_ORIGIN;

      expect(isOriginAllowed('http://localhost:3000')).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:3000')).toBe(true);
      expect(isOriginAllowed('app://drawzware')).toBe(true);
      expect(isOriginAllowed('https://evil-unauthorized-site.com')).toBe(false);
    });

    it('rejects default localhost in production when WEB_ORIGIN is customized', () => {
      envObj.NODE_ENV = 'production';
      process.env.WEB_ORIGIN = 'https://drawzware.com';

      expect(isOriginAllowed('https://drawzware.com')).toBe(true);
      expect(isOriginAllowed('app://drawzware')).toBe(true);
      expect(isOriginAllowed('http://localhost:3000')).toBe(false);
      expect(isOriginAllowed('http://127.0.0.1:3000')).toBe(false);
    });
  });
});
