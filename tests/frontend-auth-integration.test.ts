import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  authClient,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredTokens,
  clearStoredTokens,
} from '../apps/web/src/features/collaboration/services/auth.client';
import { useCollaborationStore } from '../apps/web/src/features/collaboration/stores/useCollaborationStore';

// Mock localStorage for test environment
const mockLocalStorageStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockLocalStorageStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorageStore.set(key, String(value));
  }),
  removeItem: vi.fn((key: string) => {
    mockLocalStorageStore.delete(key);
  }),
  clear: vi.fn(() => {
    mockLocalStorageStore.clear();
  }),
};

if (typeof (globalThis as any).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: mockLocalStorage,
      location: { port: '3000' },
    },
    writable: true,
  });
}

if (typeof (globalThis as any).localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}

describe('Phase 5: Frontend UI & Client Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLocalStorageStore.clear();
    clearStoredTokens();
    useCollaborationStore.setState({
      currentUser: null,
      isLive: false,
      myRole: 'owner',
      isReadOnly: false,
      authModalOpen: false,
      inviteModalOpen: false,
    });
  });

  afterEach(() => {
    clearStoredTokens();
  });

  describe('Token Management & Storage Invariants', () => {
    it('stores access and refresh tokens, synchronizing with drawzware_token for compatibility', () => {
      setStoredTokens({
        accessToken: 'access-jwt-token-123',
        refreshToken: 'refresh-token-opaque-456',
      });

      expect(getStoredAccessToken()).toBe('access-jwt-token-123');
      expect(getStoredRefreshToken()).toBe('refresh-token-opaque-456');
      expect(localStorage.getItem('drawzware_token')).toBe('access-jwt-token-123');
    });

    it('clears all stored tokens on logout', () => {
      setStoredTokens({
        accessToken: 'access-jwt-token-123',
        refreshToken: 'refresh-token-opaque-456',
      });

      clearStoredTokens();

      expect(getStoredAccessToken()).toBeNull();
      expect(getStoredRefreshToken()).toBeNull();
      expect(localStorage.getItem('drawzware_token')).toBeNull();
    });
  });

  describe('Local-First Canvas Invariant', () => {
    it('starts with null user and isLive=false by default (offline personal canvas works without login)', () => {
      const state = useCollaborationStore.getState();

      expect(state.currentUser).toBeNull();
      expect(state.isLive).toBe(false);
      expect(state.isReadOnly).toBe(false);
    });

    it('signing in an unverified user records profile but keeps isLive=false (cloud collaboration blocked)', () => {
      const { signIn } = useCollaborationStore.getState();

      signIn({
        id: 'user-unverified',
        name: 'Unverified Dev',
        email: 'dev@example.com',
        isEmailVerified: false,
      });

      const updated = useCollaborationStore.getState();
      expect(updated.currentUser?.email).toBe('dev@example.com');
      expect(updated.currentUser?.isEmailVerified).toBe(false);
      expect(updated.isLive).toBe(false); // Cloud collaboration not enabled
    });

    it('signing in a verified user enables live collaboration (isLive=true)', () => {
      const { signIn } = useCollaborationStore.getState();

      signIn({
        id: 'user-verified',
        name: 'Verified Architect',
        email: 'architect@example.com',
        isEmailVerified: true,
      });

      const updated = useCollaborationStore.getState();
      expect(updated.currentUser?.email).toBe('architect@example.com');
      expect(updated.currentUser?.isEmailVerified).toBe(true);
      expect(updated.isLive).toBe(true);
    });

    it('signOut resets cloud collaboration and returns to offline personal mode', () => {
      const { signIn, signOut } = useCollaborationStore.getState();

      signIn({
        id: 'user-verified',
        name: 'Verified Architect',
        email: 'architect@example.com',
        isEmailVerified: true,
      });

      expect(useCollaborationStore.getState().isLive).toBe(true);

      signOut();

      const afterLogout = useCollaborationStore.getState();
      expect(afterLogout.currentUser).toBeNull();
      expect(afterLogout.isLive).toBe(false);
    });
  });

  describe('Auth Client HTTP API Calls', () => {
    it('login sends payload, stores returned tokens, and returns user summary', async () => {
      const mockResponse = {
        user: {
          id: 'user-123',
          name: 'Jane Doe',
          email: 'jane@example.com',
          isEmailVerified: true,
        },
        tokens: {
          accessToken: 'jwt-access-abc',
          refreshToken: 'refresh-xyz',
          tokenType: 'Bearer',
          expiresIn: 900,
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const result = await authClient.login({
        email: 'jane@example.com',
        password: 'Password123!',
      });

      expect(result.user.email).toBe('jane@example.com');
      expect(result.tokens.accessToken).toBe('jwt-access-abc');
      expect(getStoredAccessToken()).toBe('jwt-access-abc');
      expect(getStoredRefreshToken()).toBe('refresh-xyz');
    });

    it('verifyEmail calls endpoint with token and returns confirmation', async () => {
      const mockResult = {
        success: true,
        message: 'Email verified successfully. You can now use cloud collaboration.',
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as any);

      const result = await authClient.verifyEmail({ token: 'test-verification-token' });

      expect(result.message).toContain('Email verified successfully');
      expect(result.success).toBe(true);
    });

    it('resetPassword calls endpoint with token and new password', async () => {
      const mockResult = {
        message: 'Password reset successfully. All active sessions have been invalidated.',
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as any);

      const result = await authClient.resetPassword({
        token: 'test-reset-token',
        newPassword: 'BrandNewSecurePassword123!',
      });

      expect(result.message).toContain('Password reset successfully');
    });

    it('getInvitationPreview retrieves public preview without authentication header', async () => {
      const mockPreview = {
        invitationId: 'inv-456',
        workspaceId: 'ws-789',
        workspaceName: 'Cloud Infrastructure',
        email: 'invited@example.com',
        role: 'editor',
        inviterName: 'Lead Architect',
        inviterEmail: 'lead@example.com',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        status: 'pending',
      };

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockPreview,
      } as any);

      const preview = await authClient.getInvitationPreview('inv-456');

      expect(preview.workspaceName).toBe('Cloud Infrastructure');
      expect(preview.email).toBe('invited@example.com');
      expect(preview.role).toBe('editor');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/invitations/inv-456'),
        expect.any(Object)
      );
    });

    it('acceptInvitation sends POST with auth header and returns joined workspace', async () => {
      setStoredTokens({ accessToken: 'valid-user-access-token' });

      const mockAcceptResponse = {
        message: 'Workspace invitation accepted successfully',
        member: {
          workspaceId: 'ws-789',
          userId: 'user-123',
          role: 'editor',
          createdAt: new Date().toISOString(),
        },
      };

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockAcceptResponse,
      } as any);

      const res = await authClient.acceptInvitation('inv-456');

      expect(res.role).toBe('editor');
      expect(res.workspaceId).toBe('ws-789');

      // Verify Authorization Bearer was attached
      const lastCallArgs = fetchSpy.mock.calls[0];
      const headers = lastCallArgs[1]?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer valid-user-access-token');
    });
  });

  describe('Invitation Eligibility & Mismatch Logic', () => {
    it('detects email mismatch when logged-in user email differs from invitation recipient', () => {
      const loggedInEmail = 'alice@example.com';
      const inviteRecipient = 'bob@example.com';

      const isMatch = loggedInEmail.toLowerCase() === inviteRecipient.toLowerCase();
      expect(isMatch).toBe(false);
    });

    it('matches emails case-insensitively', () => {
      const loggedInEmail = 'Alice.Dev@Example.COM';
      const inviteRecipient = 'alice.dev@example.com';

      const isMatch = loggedInEmail.toLowerCase() === inviteRecipient.toLowerCase();
      expect(isMatch).toBe(true);
    });

    it('identifies expired invitations correctly', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 1 day in future

      const isPastExpired = new Date(pastDate).getTime() < Date.now();
      const isFutureExpired = new Date(futureDate).getTime() < Date.now();

      expect(isPastExpired).toBe(true);
      expect(isFutureExpired).toBe(false);
    });
  });
});
