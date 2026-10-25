import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createWorkspaceInvitation,
  revokeWorkspaceInvitation,
  getInvitationPreview,
  acceptWorkspaceInvitation,
} from '../apps/api/src/services/workspace.service';
import * as wsRepo from '../apps/api/src/repositories/workspace.repository';
import * as memberRepo from '../apps/api/src/repositories/workspace-member.repository';
import * as invRepo from '../apps/api/src/repositories/workspace-invitation.repository';
import * as userRepo from '../apps/api/src/repositories/user.repository';
import { emailService } from '../apps/api/src/services/email.service';
import { hasMinimumRole } from '@drawzware/contracts';

describe('Phase 4: Canvas Invitations & Access Control', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Invitation Creation & Email Dispatch', () => {
    it('creates invitation with 7-day expiration, expires older pending invites, and sends email', async () => {
      const mockWorkspace = { _id: 'ws-1', name: 'Microservices Architecture' };
      const mockInviter = { _id: 'owner-1', name: 'Alice Lead', email: 'alice@example.com' };

      const mockInvitation = {
        _id: 'inv-uuid-1',
        workspaceId: 'ws-1',
        email: 'collaborator@example.com',
        role: 'editor',
        invitedBy: 'owner-1',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      vi.spyOn(wsRepo, 'findWorkspaceDocById').mockResolvedValue(mockWorkspace as any);
      vi.spyOn(memberRepo, 'findWorkspaceMemberByEmailDoc').mockResolvedValue(null);
      const expireSpy = vi.spyOn(invRepo, 'expirePendingInvitationsDoc').mockResolvedValue();
      vi.spyOn(invRepo, 'createInvitationDoc').mockResolvedValue(mockInvitation as any);
      vi.spyOn(userRepo, 'findUserDocById').mockResolvedValue(mockInviter as any);
      const emailSpy = vi.spyOn(emailService, 'sendInvitationEmail').mockResolvedValue(true);

      const result = await createWorkspaceInvitation(
        'ws-1',
        '  Collaborator@Example.COM  ',
        'editor',
        'owner-1'
      );

      expect(result.email).toBe('collaborator@example.com');
      expect(result.role).toBe('editor');
      expect(result.status).toBe('pending');
      expect(expireSpy).toHaveBeenCalledWith('ws-1', 'collaborator@example.com');

      // Email sent via EmailService with correct params
      expect(emailSpy).toHaveBeenCalledWith(
        'collaborator@example.com',
        'inv-uuid-1',
        'Microservices Architecture',
        'Alice Lead',
        'editor'
      );
    });

    it('rejects invitation if user is already a member of the workspace', async () => {
      const mockWorkspace = { _id: 'ws-1', name: 'Platform Engineering' };
      const existingMember = { workspaceId: 'ws-1', userId: 'user-existing', role: 'viewer' };

      vi.spyOn(wsRepo, 'findWorkspaceDocById').mockResolvedValue(mockWorkspace as any);
      vi.spyOn(memberRepo, 'findWorkspaceMemberByEmailDoc').mockResolvedValue(existingMember as any);

      await expect(
        createWorkspaceInvitation('ws-1', 'existing@example.com', 'editor', 'owner-1')
      ).rejects.toThrow('ALREADY_A_MEMBER');
    });
  });

  describe('Invitation Preview & Expiration Detection', () => {
    it('returns preview data for valid pending invitation', async () => {
      const mockInv = {
        _id: 'inv-uuid-2',
        workspaceId: 'ws-2',
        email: 'dev@example.com',
        role: 'viewer',
        invitedBy: 'user-lead',
        status: 'pending',
        expiresAt: new Date(Date.now() + 5 * 86400000),
      };

      vi.spyOn(invRepo, 'findInvitationDocById').mockResolvedValue(mockInv as any);
      vi.spyOn(wsRepo, 'findWorkspaceDocById').mockResolvedValue({ _id: 'ws-2', name: 'Core Team' } as any);
      vi.spyOn(userRepo, 'findUserDocById').mockResolvedValue({ _id: 'user-lead', name: 'Lead Dev' } as any);

      const preview = await getInvitationPreview('inv-uuid-2');
      expect(preview.workspaceName).toBe('Core Team');
      expect(preview.role).toBe('viewer');
      expect(preview.isExpired).toBe(false);
      expect(preview.status).toBe('pending');
    });

    it('detects passed 7-day expiration date and marks as expired', async () => {
      const saveSpy = vi.fn().mockResolvedValue(true);
      const mockInv = {
        _id: 'inv-expired',
        workspaceId: 'ws-2',
        email: 'dev@example.com',
        role: 'viewer',
        invitedBy: 'user-lead',
        status: 'pending',
        expiresAt: new Date(Date.now() - 1000), // in the past
        save: saveSpy,
      };

      vi.spyOn(invRepo, 'findInvitationDocById').mockResolvedValue(mockInv as any);
      vi.spyOn(wsRepo, 'findWorkspaceDocById').mockResolvedValue({ _id: 'ws-2', name: 'Core Team' } as any);
      vi.spyOn(userRepo, 'findUserDocById').mockResolvedValue(null);

      const preview = await getInvitationPreview('inv-expired');
      expect(preview.isExpired).toBe(true);
      expect(preview.status).toBe('expired');
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('Owner Revocation of Invitations', () => {
    it('allows owner to revoke a pending invitation', async () => {
      const saveSpy = vi.fn().mockResolvedValue(true);
      const mockInv = {
        _id: 'inv-to-revoke',
        workspaceId: 'ws-3',
        email: 'contractor@example.com',
        role: 'viewer',
        invitedBy: 'owner-1',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        save: saveSpy,
      };

      vi.spyOn(invRepo, 'findInvitationDocById').mockResolvedValue(mockInv as any);

      const result = await revokeWorkspaceInvitation('ws-3', 'inv-to-revoke');
      expect(result.status).toBe('revoked');
      expect(saveSpy).toHaveBeenCalled();
    });

    it('rejects revocation if invitation is already accepted or revoked', async () => {
      const mockInvAccepted = {
        _id: 'inv-accepted',
        workspaceId: 'ws-3',
        status: 'accepted',
      };
      vi.spyOn(invRepo, 'findInvitationDocById').mockResolvedValue(mockInvAccepted as any);

      await expect(
        revokeWorkspaceInvitation('ws-3', 'inv-accepted')
      ).rejects.toThrow('INVITATION_ACCEPTED');
    });
  });

  describe('Invitation Acceptance Security & Constraints', () => {
    it('rejects acceptance if user account email is unverified', async () => {
      await expect(
        acceptWorkspaceInvitation('inv-1', 'user-unverified', 'alice@example.com', false)
      ).rejects.toThrow('EMAIL_NOT_VERIFIED');
    });

    it('rejects acceptance if recipient email does not match invitation email', async () => {
      const mockInv = {
        _id: 'inv-1',
        workspaceId: 'ws-1',
        email: 'intended-recipient@example.com',
        role: 'editor',
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
      };

      vi.spyOn(invRepo, 'findInvitationDocById').mockResolvedValue(mockInv as any);

      await expect(
        acceptWorkspaceInvitation('inv-1', 'user-other', 'different-account@example.com', true)
      ).rejects.toThrow('INVITATION_EMAIL_MISMATCH');
    });

    it('rejects acceptance if invitation is expired', async () => {
      const saveSpy = vi.fn().mockResolvedValue(true);
      const mockInv = {
        _id: 'inv-1',
        workspaceId: 'ws-1',
        email: 'recipient@example.com',
        status: 'pending',
        expiresAt: new Date(Date.now() - 1000), // expired
        save: saveSpy,
      };

      vi.spyOn(invRepo, 'findInvitationDocById').mockResolvedValue(mockInv as any);

      await expect(
        acceptWorkspaceInvitation('inv-1', 'user-1', 'recipient@example.com', true)
      ).rejects.toThrow('INVITATION_EXPIRED');
    });

    it('rejects duplicate acceptance if already accepted', async () => {
      const mockInv = {
        _id: 'inv-1',
        workspaceId: 'ws-1',
        email: 'recipient@example.com',
        status: 'accepted',
      };

      vi.spyOn(invRepo, 'findInvitationDocById').mockResolvedValue(mockInv as any);

      await expect(
        acceptWorkspaceInvitation('inv-1', 'user-1', 'recipient@example.com', true)
      ).rejects.toThrow('INVITATION_ACCEPTED');
    });

    it('rejects acceptance if invitation was revoked by owner', async () => {
      const mockInv = {
        _id: 'inv-1',
        workspaceId: 'ws-1',
        email: 'recipient@example.com',
        status: 'revoked',
      };

      vi.spyOn(invRepo, 'findInvitationDocById').mockResolvedValue(mockInv as any);

      await expect(
        acceptWorkspaceInvitation('inv-1', 'user-1', 'recipient@example.com', true)
      ).rejects.toThrow('INVITATION_REVOKED');
    });

    it('successfully accepts invitation and assigns invited role when verified', async () => {
      const saveSpy = vi.fn().mockResolvedValue(true);
      const mockInv = {
        _id: 'inv-valid',
        workspaceId: 'ws-4',
        email: 'partner@example.com',
        role: 'editor',
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
        save: saveSpy,
      };

      const mockMember = {
        workspaceId: 'ws-4',
        userId: 'user-partner',
        role: 'editor',
        userEmail: 'partner@example.com',
        createdAt: new Date(),
      };

      vi.spyOn(invRepo, 'findInvitationDocById').mockResolvedValue(mockInv as any);
      vi.spyOn(memberRepo, 'upsertWorkspaceMemberDoc').mockResolvedValue(mockMember as any);

      const accepted = await acceptWorkspaceInvitation(
        'inv-valid',
        'user-partner',
        'partner@example.com',
        true
      );

      expect(accepted.role).toBe('editor');
      expect(accepted.workspaceId).toBe('ws-4');
      expect(mockInv.status).toBe('accepted');
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('Role Permissions Hierarchy (Owner / Editor / Viewer)', () => {
    it('verifies owner satisfies all roles', () => {
      expect(hasMinimumRole('owner', 'owner')).toBe(true);
      expect(hasMinimumRole('owner', 'editor')).toBe(true);
      expect(hasMinimumRole('owner', 'viewer')).toBe(true);
    });

    it('verifies editor satisfies editor and viewer but not owner', () => {
      expect(hasMinimumRole('editor', 'owner')).toBe(false);
      expect(hasMinimumRole('editor', 'editor')).toBe(true);
      expect(hasMinimumRole('editor', 'viewer')).toBe(true);
    });

    it('verifies viewer satisfies only viewer', () => {
      expect(hasMinimumRole('viewer', 'owner')).toBe(false);
      expect(hasMinimumRole('viewer', 'editor')).toBe(false);
      expect(hasMinimumRole('viewer', 'viewer')).toBe(true);
    });
  });
});
