import { describe, it, expect, vi } from 'vitest';
import {
  RegisterInputSchema,
  LoginInputSchema,
  VerifyEmailInputSchema,
  ResendVerificationInputSchema,
  ForgotPasswordInputSchema,
  ResetPasswordInputSchema,
  RefreshTokenInputSchema,
  InvitationPreviewSchema,
} from '@drawzware/contracts';
import {
  generateSecureToken,
  hashToken,
  constantTimeCompare,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from '../apps/api/src/utils/token.util';
import { EmailService } from '../apps/api/src/services/email.service';
import { UserModel } from '../apps/api/src/models/user.model';
import { SessionModel } from '../apps/api/src/models/session.model';

describe('Phase 1 & 2: Auth Models, Contracts & Email Service', () => {
  describe('Zod Contract Schemas', () => {
    it('validates and normalizes RegisterInputSchema', () => {
      const parsed = RegisterInputSchema.parse({
        name: '  Alice Smith  ',
        email: '  Alice@EXAMPLE.COM ',
        password: 'password123',
      });
      expect(parsed.name).toBe('Alice Smith');
      expect(parsed.email).toBe('alice@example.com');
      expect(parsed.password).toBe('password123');

      expect(() =>
        RegisterInputSchema.parse({ name: '', email: 'alice@example.com', password: 'short' })
      ).toThrow();
    });

    it('validates and normalizes LoginInputSchema', () => {
      const parsed = LoginInputSchema.parse({
        email: '  Bob@EXAMPLE.com ',
        password: 'secure-password',
      });
      expect(parsed.email).toBe('bob@example.com');
      expect(() => LoginInputSchema.parse({ email: 'bad-email', password: '' })).toThrow();
    });

    it('validates VerifyEmailInputSchema', () => {
      const parsed = VerifyEmailInputSchema.parse({ token: '  token-abc-123  ' });
      expect(parsed.token).toBe('token-abc-123');
      expect(() => VerifyEmailInputSchema.parse({ token: '   ' })).toThrow();
    });

    it('validates ResendVerificationInputSchema and ForgotPasswordInputSchema', () => {
      const resend = ResendVerificationInputSchema.parse({ email: '  Test@Domain.com ' });
      expect(resend.email).toBe('test@domain.com');

      const forgot = ForgotPasswordInputSchema.parse({ email: '  Forgot@Domain.com ' });
      expect(forgot.email).toBe('forgot@domain.com');
    });

    it('validates ResetPasswordInputSchema with 8-character password constraint', () => {
      const parsed = ResetPasswordInputSchema.parse({
        token: 'valid-reset-token',
        newPassword: 'new-strong-password',
      });
      expect(parsed.token).toBe('valid-reset-token');

      // Less than 8 chars must fail
      expect(() =>
        ResetPasswordInputSchema.parse({
          token: 'valid-reset-token',
          newPassword: '1234567',
        })
      ).toThrow();
    });

    it('validates RefreshTokenInputSchema', () => {
      const parsed = RefreshTokenInputSchema.parse({ refreshToken: '  refresh-xyz-987  ' });
      expect(parsed.refreshToken).toBe('refresh-xyz-987');
      expect(() => RefreshTokenInputSchema.parse({ refreshToken: '' })).toThrow();
    });

    it('validates InvitationPreviewSchema', () => {
      const preview = InvitationPreviewSchema.parse({
        id: '12345678-1234-4234-8234-123456789abc',
        workspaceId: '87654321-4321-4321-8321-cba987654321',
        workspaceName: 'Frontend Architecture Workspace',
        email: 'collaborator@example.com',
        role: 'editor',
        inviterName: 'Alice Dev',
        inviterEmail: 'alice@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isExpired: false,
        status: 'pending',
      });
      expect(preview.role).toBe('editor');
      expect(preview.isExpired).toBe(false);
    });
  });

  describe('Cryptographic Token Utilities', () => {
    it('generates secure random hex tokens with expected byte length', () => {
      const token32 = generateSecureToken(32);
      expect(token32).toMatch(/^[a-f0-9]{64}$/);

      const token40 = generateSecureToken(40);
      expect(token40).toMatch(/^[a-f0-9]{80}$/);

      // Entropy check: consecutive tokens must not match
      expect(generateSecureToken()).not.toBe(generateSecureToken());
    });

    it('computes deterministic SHA-256 token hash', () => {
      const raw = 'random-token-value-123';
      const hash1 = hashToken(raw);
      const hash2 = hashToken(raw);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      expect(hash1).not.toBe(raw);
    });

    it('performs constant-time comparisons securely', () => {
      const hash = hashToken('secret-token');
      expect(constantTimeCompare(hash, hash)).toBe(true);
      expect(constantTimeCompare(hash, hashToken('wrong-token'))).toBe(false);
      expect(constantTimeCompare(hash, 'short')).toBe(false);
    });

    it('enforces planned expiration constants', () => {
      expect(EMAIL_VERIFICATION_TTL_MS).toBe(24 * 60 * 60 * 1000);
      expect(PASSWORD_RESET_TTL_MS).toBe(60 * 60 * 1000);
      expect(REFRESH_TOKEN_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });

  describe('Email Service & Safe Link Handling', () => {
    it('generates verification link pointing to frontend route without GET mutation side-effects', async () => {
      const captured: any[] = [];
      const service = new EmailService({
        onSendFallback: (msg) => captured.push(msg),
      });

      const token = 'test-verification-token-123';
      const success = await service.sendVerificationEmail('alice@example.com', token);

      expect(success).toBe(true);
      expect(captured).toHaveLength(1);
      const email = captured[0];
      expect(email.to).toBe('alice@example.com');
      expect(email.subject).toContain('Verify');
      // Link must point to client verification page, not backend API
      expect(email.text).toContain('/verify-email?token=test-verification-token-123');
      expect(email.html).toContain('/verify-email?token=test-verification-token-123');
      expect(email.text).not.toContain('/api/auth/verify-email');
    });

    it('generates password reset link pointing to frontend route', async () => {
      const captured: any[] = [];
      const service = new EmailService({
        onSendFallback: (msg) => captured.push(msg),
      });

      const token = 'test-reset-token-456';
      const success = await service.sendPasswordResetEmail('bob@example.com', token);

      expect(success).toBe(true);
      expect(captured).toHaveLength(1);
      const email = captured[0];
      expect(email.to).toBe('bob@example.com');
      expect(email.subject).toContain('Reset your Drawzware password');
      expect(email.text).toContain('/reset-password?token=test-reset-token-456');
      expect(email.html).toContain('/reset-password?token=test-reset-token-456');
      expect(email.text).not.toContain('/api/auth/reset-password');
    });

    it('generates workspace invitation link pointing to frontend route with role and workspace name', async () => {
      const captured: any[] = [];
      const service = new EmailService({
        onSendFallback: (msg) => captured.push(msg),
      });

      const invitationId = 'invitation-uuid-789';
      const success = await service.sendInvitationEmail(
        'charlie@example.com',
        invitationId,
        'Core Architecture',
        'Alice Lead',
        'editor'
      );

      expect(success).toBe(true);
      expect(captured).toHaveLength(1);
      const email = captured[0];
      expect(email.to).toBe('charlie@example.com');
      expect(email.subject).toContain('Core Architecture');
      expect(email.text).toContain('/invitations?id=invitation-uuid-789');
      expect(email.text).toContain('Editor access');
      expect(email.html).toContain('Alice Lead');
    });

    it('delivers via mock nodemailer transporter when configured', async () => {
      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'msg-123' });
      const mockTransporter: any = {
        sendMail: mockSendMail,
      };

      const service = new EmailService({ transporter: mockTransporter });
      const success = await service.sendVerificationEmail('dan@example.com', 'raw-token-1');

      expect(success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'dan@example.com',
          subject: 'Verify your Drawzware email',
        })
      );
    });
  });

  describe('Mongoose Models Data Sanitization & Security Fields', () => {
    it('UserModel toJSON removes password, verification tokens, reset tokens, and tokenVersion', () => {
      const user = new UserModel({
        name: 'Eve Tester',
        email: 'eve@example.com',
        password: 'hashed-secret-password',
        isEmailVerified: false,
        emailVerificationToken: 'sha256-verification-hash',
        emailVerificationExpires: new Date(Date.now() + 86400000),
        passwordResetToken: 'sha256-reset-hash',
        passwordResetExpires: new Date(Date.now() + 3600000),
        tokenVersion: 2,
      });

      const json = user.toJSON();
      expect(json.name).toBe('Eve Tester');
      expect(json.email).toBe('eve@example.com');
      expect(json.isEmailVerified).toBe(false);

      // Sensitive fields must be stripped in toJSON
      expect((json as any).password).toBeUndefined();
      expect((json as any).emailVerificationToken).toBeUndefined();
      expect((json as any).emailVerificationExpires).toBeUndefined();
      expect((json as any).passwordResetToken).toBeUndefined();
      expect((json as any).passwordResetExpires).toBeUndefined();
      expect((json as any).tokenVersion).toBeUndefined();
      expect((json as any)._id).toBeUndefined();
      expect((json as any).id).toBeDefined();
    });

    it('SessionModel toJSON removes refreshTokenHash and previousRefreshTokenHash', () => {
      const session = new SessionModel({
        userId: 'user-uuid-1',
        refreshTokenHash: 'sha256-current-refresh-hash',
        previousRefreshTokenHash: 'sha256-old-refresh-hash',
        familyId: 'family-uuid-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 30 * 86400000),
      });

      const json = session.toJSON();
      expect(json.userId).toBe('user-uuid-1');
      expect(json.familyId).toBe('family-uuid-1');
      expect(json.isRevoked).toBe(false);

      // Token hashes must be stripped from serialized JSON output
      expect((json as any).refreshTokenHash).toBeUndefined();
      expect((json as any).previousRefreshTokenHash).toBeUndefined();
      expect((json as any)._id).toBeUndefined();
      expect((json as any).id).toBeDefined();
    });
  });
});
