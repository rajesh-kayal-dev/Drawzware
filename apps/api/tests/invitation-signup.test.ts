import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import * as userRepo from '../src/repositories/user.repository.js';
import * as workspaceRepo from '../src/repositories/workspace.repository.js';
import * as memberRepo from '../src/repositories/workspace-member.repository.js';
import * as invitationRepo from '../src/repositories/workspace-invitation.repository.js';
import * as sessionRepo from '../src/repositories/session.repository.js';
import { emailService } from '../src/services/email.service.js';
import { generateUsernameFromEmail, validateUsername } from '@drawzware/contracts';

describe('Invitation Signup Flow & Username Derivation', () => {
  const app = createApp();

  describe('Username Generation and Validation Rules', () => {
    it('generates username by stripping numbers and special characters and converting to camelCase', () => {
      // User's specific example:
      expect(generateUsernameFromEmail('rajeshkayal33@gmail.com')).toBe('rajeshkayal');

      // Underscores converted to camelCase:
      expect(generateUsernameFromEmail('rajesh_kayal@gmail.com')).toBe('rajeshKayal');
      expect(generateUsernameFromEmail('rajesh_kayal_33@gmail.com')).toBe('rajeshKayal');

      // Dots converted to camelCase:
      expect(generateUsernameFromEmail('john.doe@example.com')).toBe('johnDoe');

      // Hyphens converted to camelCase:
      expect(generateUsernameFromEmail('john-smith-99@domain.com')).toBe('johnSmith');

      // Complex prefix:
      expect(generateUsernameFromEmail('alice_marie_curie_1867@nobel.org')).toBe('aliceMarieCurie');

      // Skips everything after @:
      expect(generateUsernameFromEmail('developer_pro@drawzware.com')).toBe('developerPro');
    });

    it('validates the generated username successfully', () => {
      const u1 = generateUsernameFromEmail('rajeshkayal33@gmail.com');
      expect(validateUsername(u1)).toBe(true);
      expect(/^[a-zA-Z]{2,50}$/.test(u1)).toBe(true);

      const u2 = generateUsernameFromEmail('rajesh_kayal@gmail.com');
      expect(validateUsername(u2)).toBe(true);
      expect(/^[a-zA-Z]{2,50}$/.test(u2)).toBe(true);
    });
  });

  describe('Direct Invitation Signup API (POST /api/invitations/:id/signup)', () => {
    const invId = '11111111-2222-3333-4444-555555555555';
    const wsId = '22222222-3333-4444-5555-666666666666';

    let mockInvitation: any;

    beforeEach(() => {
      vi.restoreAllMocks();
      mockInvitation = {
        _id: invId,
        workspaceId: wsId,
        email: 'rajeshkayal33@gmail.com',
        role: 'editor',
        invitedBy: 'usr-inviter-1',
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
        canvasUrl: '/canvas?id=canvas-proj-123',
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(sessionRepo, 'createSessionDoc').mockResolvedValue({} as any);
      vi.spyOn(emailService, 'sendWelcomeEmail').mockResolvedValue(true);
      vi.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue(true);
      vi.spyOn(workspaceRepo, 'findWorkspaceDocById').mockResolvedValue({ _id: wsId, name: 'Architecture Workspace' } as any);
      vi.spyOn(memberRepo, 'upsertWorkspaceMemberDoc').mockResolvedValue({ workspaceId: wsId, userId: 'usr-new-1', role: 'editor' } as any);
    });

    it('creates a new user with verified email, sends welcome email, and returns canvasUrl without asking for verification email', async () => {
      vi.spyOn(invitationRepo, 'findInvitationDocById').mockResolvedValue(mockInvitation as any);
      vi.spyOn(userRepo, 'findUserDocByEmail').mockResolvedValue(null);

      const createdUser = {
        _id: 'usr-new-1',
        name: 'rajeshkayal',
        email: 'rajeshkayal33@gmail.com',
        isEmailVerified: true,
        tokenVersion: 0,
      };
      vi.spyOn(userRepo, 'createUserDoc').mockResolvedValue(createdUser as any);

      const res = await request(app)
        .post(`/api/invitations/${invId}/signup`)
        .send({ password: 'securePassword123' });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe('rajeshkayal'); // Verified generated username without numbers!
      expect(res.body.user.isEmailVerified).toBe(true); // Verified directly without secondary email!
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.canvasUrl).toBe('/canvas?id=canvas-proj-123'); // Redirect target provided!

      // Verify welcome email was dispatched
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'rajeshkayal33@gmail.com',
        'rajeshkayal',
        'Architecture Workspace',
        '/canvas?id=canvas-proj-123'
      );

      // Verify secondary verification email was NOT dispatched
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();

      // Verify invitation was accepted
      expect(mockInvitation.status).toBe('accepted');
      expect(mockInvitation.save).toHaveBeenCalled();
    });

    it('signs in an existing user with matching password, marks verified, and accepts invitation', async () => {
      vi.spyOn(invitationRepo, 'findInvitationDocById').mockResolvedValue(mockInvitation as any);
      const hashedPassword = await bcrypt.hash('existingPassword123', 10);
      const existingUser = {
        _id: 'usr-existing-1',
        name: 'rajeshkayal',
        email: 'rajeshkayal33@gmail.com',
        password: hashedPassword,
        isEmailVerified: false,
        tokenVersion: 0,
      };
      vi.spyOn(userRepo, 'findUserDocByEmail').mockResolvedValue(existingUser as any);
      vi.spyOn(userRepo, 'markEmailAsVerified').mockResolvedValue({ ...existingUser, isEmailVerified: true } as any);

      const res = await request(app)
        .post(`/api/invitations/${invId}/signup`)
        .send({ password: 'existingPassword123' });

      expect(res.status).toBe(201);
      expect(res.body.user.isEmailVerified).toBe(true);
      expect(userRepo.markEmailAsVerified).toHaveBeenCalledWith('usr-existing-1');
      expect(mockInvitation.status).toBe('accepted');
    });

    it('returns 401 when existing user provides wrong password', async () => {
      vi.spyOn(invitationRepo, 'findInvitationDocById').mockResolvedValue(mockInvitation as any);
      const hashedPassword = await bcrypt.hash('correctPassword123', 10);
      const existingUser = {
        _id: 'usr-existing-1',
        name: 'rajeshkayal',
        email: 'rajeshkayal33@gmail.com',
        password: hashedPassword,
        isEmailVerified: true,
        tokenVersion: 0,
      };
      vi.spyOn(userRepo, 'findUserDocByEmail').mockResolvedValue(existingUser as any);

      const res = await request(app)
        .post(`/api/invitations/${invId}/signup`)
        .send({ password: 'wrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Account already exists with this email');
    });
  });
});
