import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { isOriginAllowed, validateEnvironment } from '../src/config/env.js';
import { sanitizeMongoUri, sanitizeError } from '../src/config/db.js';
import { authenticateUpgradeRequest } from '../src/websocket/collab.server.js';
import { serverError } from '../src/middleware/error-handler.js';
import { EmailService } from '../src/services/email.service.js';

describe('DrawzWare Deployment Readiness & Security Verification', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. Origin Validation & Cross-Site WebSocket Hijacking (CSWSH) Defense', () => {
    it('permits undefined or empty origins for non-browser and native clients', () => {
      expect(isOriginAllowed(undefined)).toBe(true);
      expect(isOriginAllowed('')).toBe(true);
    });

    it('permits standard local development and Electron desktop app origins', () => {
      expect(isOriginAllowed('http://localhost:3000')).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:3000')).toBe(true);
      expect(isOriginAllowed('app://drawzware')).toBe(true);
    });

    it('permits configured single and comma-separated origins from WEB_ORIGIN', () => {
      process.env.WEB_ORIGIN = 'https://drawzware.com, https://app.drawzware.com';
      expect(isOriginAllowed('https://drawzware.com')).toBe(true);
      expect(isOriginAllowed('https://app.drawzware.com')).toBe(true);
      expect(isOriginAllowed('https://drawzware.com/')).toBe(true); // trailing slash normalization
    });

    it('blocks arbitrary untrusted browser origins', () => {
      process.env.WEB_ORIGIN = 'https://drawzware.com';
      expect(isOriginAllowed('https://evil-hacker.com')).toBe(false);
      expect(isOriginAllowed('http://malicious.local')).toBe(false);
    });

    it('rejects WebSocket upgrade request with 403 Forbidden when origin is untrusted', async () => {
      process.env.WEB_ORIGIN = 'https://drawzware.com';
      const fakeReq = {
        url: '/collab?token=some-token&diagramId=diag-1',
        headers: {
          host: 'api.drawzware.com',
          origin: 'https://evil-phishing-site.com',
        },
      } as unknown as http.IncomingMessage;

      const result = await authenticateUpgradeRequest(fakeReq);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.statusCode).toBe(403);
        expect(result.statusText).toBe('Forbidden');
        expect(result.message).toBe('Origin not allowed');
      }
    });

    it('allows WebSocket upgrade request when origin matches allowed domain', async () => {
      process.env.WEB_ORIGIN = 'https://drawzware.com';
      process.env.JWT_SECRET = 'drawzware-production-audit-secret-key-32chars!';

      const fakeReq = {
        url: '/collab?token=invalid-token&diagramId=diag-1',
        headers: {
          host: 'api.drawzware.com',
          origin: 'https://drawzware.com',
        },
      } as unknown as http.IncomingMessage;

      const result = await authenticateUpgradeRequest(fakeReq);
      // Origin check passed; fails later at token validation (401), not origin rejection (403)
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.statusCode).toBe(401);
      }
    });
  });

  describe('2. Secret & Credential Redaction in Database Logs', () => {
    it('redacts plaintext username and password from MongoDB connection string', () => {
      const uri = 'mongodb://app_user:SuperSecretPassword123!@cluster0.mongodb.net:27017/drawzware?ssl=true';
      const sanitized = sanitizeMongoUri(uri);
      expect(sanitized).not.toContain('SuperSecretPassword123!');
      expect(sanitized).toBe('mongodb://***:***@cluster0.mongodb.net:27017/drawzware?ssl=true');
    });

    it('redacts credentials embedded in driver Error messages', () => {
      const errorWithSecret = new Error(
        'connect ECONNREFUSED mongodb://admin:my_db_pass_999@10.0.0.5:27017/drawzware'
      );
      const sanitized = sanitizeError(errorWithSecret);
      expect(sanitized).not.toContain('my_db_pass_999');
      expect(sanitized).toContain('mongodb://***:***@10.0.0.5:27017/drawzware');
    });
  });

  describe('3. Production Environment Validation & Error Shielding', () => {
    it('enforces minimum 32 characters for JWT_SECRET in production mode', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/drawzware';
      process.env.JWT_SECRET = 'short_weak_secret';

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      validateEnvironment();
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET must be at least 32 characters in production')
      );
    });

    it('passes validation when production JWT_SECRET is sufficiently strong', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/drawzware';
      process.env.JWT_SECRET = 'strong-production-jwt-secret-minimum-32-chars-long';

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
      validateEnvironment();
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('shields internal exception details from HTTP 500 responses in production', () => {
      (process.env as any).NODE_ENV = 'production';
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      serverError(mockRes, 'Internal server error', new Error('Sensitive MongoDB query failed'));

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: undefined,
      });
    });

    it('includes exception details for debugging when not in production', () => {
      (process.env as any).NODE_ENV = 'development';
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      serverError(mockRes, 'Internal server error', new Error('Debug error details'));

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: 'Debug error details',
      });
    });
  });

  describe('4. Email Branding & Sender Formatting (B1)', () => {
    it('sends verification email with correct DrawzWare subject, sender formatting, and template branding', async () => {
      let capturedPayload: any = null;
      const emailService = new EmailService({
        onSendFallback: (payload) => {
          capturedPayload = payload;
        },
      });

      const res = await emailService.deliverVerificationEmail('user@example.com', 'tok-123', '/canvas');
      expect(res.accepted).toBe(true);
      expect(capturedPayload).not.toBeNull();
      expect(capturedPayload.subject).toBe('Verify your DrawzWare account');
      expect(capturedPayload.html).toContain('DrawzWare');
      expect(capturedPayload.html).not.toContain('Studio');
      expect(capturedPayload.html).not.toContain('target="_blank"');
    });

    it('formats sender with "DrawzWare" display name when raw email is provided', async () => {
      const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'msg-456' });
      const mockTransporter = {
        sendMail: sendMailMock,
      } as any;

      const emailService = new EmailService({ transporter: mockTransporter });
      process.env.SMTP_FROM = 'noreply@drawzware.com';

      await emailService.deliverVerificationEmail('user@example.com', 'tok-789');
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"DrawzWare" <noreply@drawzware.com>',
          subject: 'Verify your DrawzWare account',
        })
      );
    });
  });
});
