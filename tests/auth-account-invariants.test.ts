import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCollaborationStore } from '../apps/web/src/features/collaboration/stores/useCollaborationStore';
import { authClient } from '../apps/web/src/features/collaboration/services/auth.client';
import { sanitizeReturnUrl } from '../apps/web/src/shared/utils/routes';

describe('Phase 1: Core Session Invariants & Authentication Integrity', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useCollaborationStore.setState({
      currentUser: null,
      isLive: false,
      collaboratorsPopoverOpen: false,
      inviteModalOpen: false,
      activeDiagramId: null,
    });
  });

  describe('1. Authentication Decoupled from Live Mode (B7)', () => {
    it('signing in preserves personal offline mode (isLive remains false)', () => {
      useCollaborationStore.getState().signIn({
        id: 'user-verified-1',
        name: 'Verified User',
        email: 'verified@drawzware.com',
        isEmailVerified: true,
      });

      const state = useCollaborationStore.getState();
      expect(state.currentUser).not.toBeNull();
      expect(state.currentUser?.name).toBe('Verified User');
      expect(state.currentUser?.isEmailVerified).toBe(true);
      // Critical invariant: signing in MUST NOT automatically set isLive to true
      expect(state.isLive).toBe(false);
    });

    it('unverified user signing in also remains in personal offline mode', () => {
      useCollaborationStore.getState().signIn({
        id: 'user-unverified-2',
        name: 'New User',
        email: 'new@drawzware.com',
        isEmailVerified: false,
      });

      const state = useCollaborationStore.getState();
      expect(state.currentUser?.isEmailVerified).toBe(false);
      expect(state.isLive).toBe(false);
    });
  });

  describe('2. Account Sign-Out Lifecycle (B4)', () => {
    it('signOut terminates session, clears tokens, and reverts to offline personal mode', async () => {
      const logoutSpy = vi.spyOn(authClient, 'logout').mockResolvedValue();

      useCollaborationStore.getState().signIn({
        id: 'user-3',
        name: 'Alice',
        email: 'alice@drawzware.com',
        isEmailVerified: true,
      });
      useCollaborationStore.getState().setLive(true);
      useCollaborationStore.setState({ activeDiagramId: 'cloud-diag-123' });

      expect(useCollaborationStore.getState().isLive).toBe(true);
      expect(useCollaborationStore.getState().activeDiagramId).toBe('cloud-diag-123');

      await useCollaborationStore.getState().signOut();

      expect(logoutSpy).toHaveBeenCalledTimes(1);
      const state = useCollaborationStore.getState();
      expect(state.currentUser).toBeNull();
      expect(state.isLive).toBe(false);
      expect(state.activeDiagramId).toBeNull();
      expect(state.collaboratorsPopoverOpen).toBe(false);
    });
  });

  describe('3. Return URL Sanitization for Post-Verification Navigation (B1)', () => {
    it('preserves valid internal canvas route with query parameters', () => {
      const safe = sanitizeReturnUrl('/canvas?id=proj-123&diagramType=architecture', '/app');
      expect(safe).toBe('/canvas?id=proj-123&diagramType=architecture');
    });

    it('rejects external open redirects and falls back to safe destination', () => {
      expect(sanitizeReturnUrl('https://evil-phishing.com/steal-token', '/app')).toBe('/app');
      expect(sanitizeReturnUrl('//evil.com/canvas', '/app')).toBe('/app');
      expect(sanitizeReturnUrl('javascript:alert(1)', '/app')).toBe('/app');
    });
  });
});
