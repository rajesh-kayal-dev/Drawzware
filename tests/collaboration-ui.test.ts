import { describe, it, expect, beforeEach } from 'vitest';
import { useCollaborationStore } from '../apps/web/src/features/collaboration/stores/useCollaborationStore';

describe('DrawzWare Collaboration Feature & State Management', () => {
  beforeEach(() => {
    // Reset store to initial state
    useCollaborationStore.setState({
      currentUser: null,
      isLive: false,
      collaborators: [
        {
          id: 'user-1',
          name: 'Rajesh (You)',
          email: 'rajesh@example.com',
          role: 'owner',
          initials: 'R',
          color: '#3b82f6',
          avatarBg: 'bg-blue-600',
          isCurrentUser: true,
          status: 'active',
        },
        {
          id: 'user-2',
          name: 'Sneha',
          email: 'sneha@example.com',
          role: 'editor',
          initials: 'S',
          color: '#ec4899',
          avatarBg: 'bg-pink-600',
          status: 'active',
        },
        {
          id: 'user-3',
          name: 'Aman',
          email: 'aman@example.com',
          role: 'editor',
          initials: 'A',
          color: '#8b5cf6',
          avatarBg: 'bg-purple-600',
          status: 'active',
        },
        {
          id: 'user-4',
          name: 'Priya',
          email: 'priya@example.com',
          role: 'viewer',
          initials: 'P',
          color: '#f59e0b',
          avatarBg: 'bg-amber-600',
          status: 'active',
        },
      ],
      authModalOpen: false,
      inviteModalOpen: false,
      inviteActiveTab: 'invite',
      publishEmbedModalOpen: false,
      collaboratorsPopoverOpen: false,
      invitationAcceptModalOpen: false,
      accessControlModalOpen: false,
      accessControlState: 'granted',
      activeEditorName: 'Aman',
      showLiveCursors: true,
    });
  });

  describe('1. Personal Canvas vs Collaborative Canvas', () => {
    it('defaults to offline personal canvas with no login required', () => {
      const state = useCollaborationStore.getState();
      expect(state.currentUser).toBeNull();
      expect(state.isLive).toBe(false);
    });

    it('signs in user, enters live mode, and activates collaborator presence', () => {
      useCollaborationStore.getState().signIn('sneha.custom@drawzware.app', 'Sneha User');

      const state = useCollaborationStore.getState();
      expect(state.currentUser).not.toBeNull();
      expect(state.currentUser?.email).toBe('sneha.custom@drawzware.app');
      expect(state.currentUser?.name).toBe('Sneha User');
      expect(state.isLive).toBe(true);
      expect(state.authModalOpen).toBe(false);
    });

    it('signs out and cleanly reverts to personal canvas', () => {
      useCollaborationStore.getState().signIn();
      expect(useCollaborationStore.getState().isLive).toBe(true);

      useCollaborationStore.getState().signOut();
      const state = useCollaborationStore.getState();
      expect(state.currentUser).toBeNull();
      expect(state.isLive).toBe(false);
      expect(state.collaboratorsPopoverOpen).toBe(false);
    });
  });

  describe('2. Collaborator Management & Permission Roles', () => {
    it('lists initial reference collaborators (Rajesh Owner, Sneha Editor, Aman Editor, Priya Viewer)', () => {
      const { collaborators } = useCollaborationStore.getState();
      expect(collaborators).toHaveLength(4);

      const owner = collaborators.find((c) => c.role === 'owner');
      expect(owner?.name).toBe('Rajesh (You)');

      const editors = collaborators.filter((c) => c.role === 'editor');
      expect(editors.map((e) => e.name)).toEqual(['Sneha', 'Aman']);

      const viewer = collaborators.find((c) => c.role === 'viewer');
      expect(viewer?.name).toBe('Priya');
    });

    it('adds a new invited collaborator with chosen role', () => {
      useCollaborationStore.getState().addCollaborator('vikram@example.com', 'editor');
      const { collaborators } = useCollaborationStore.getState();
      expect(collaborators).toHaveLength(5);

      const added = collaborators.find((c) => c.email === 'vikram@example.com');
      expect(added).toBeDefined();
      expect(added?.role).toBe('editor');
      expect(added?.name).toBe('Vikram');
    });

    it('updates role of an existing collaborator', () => {
      useCollaborationStore.getState().updateCollaboratorRole('user-4', 'editor');
      const priya = useCollaborationStore.getState().collaborators.find((c) => c.id === 'user-4');
      expect(priya?.role).toBe('editor');
    });

    it('removes a collaborator when access is revoked', () => {
      useCollaborationStore.getState().removeCollaborator('user-2');
      const { collaborators } = useCollaborationStore.getState();
      expect(collaborators.find((c) => c.id === 'user-2')).toBeUndefined();
      expect(collaborators).toHaveLength(3);
    });
  });

  describe('3. Modal Navigation & Panel States', () => {
    it('manages Auth modal open/close', () => {
      useCollaborationStore.getState().setAuthModalOpen(true);
      expect(useCollaborationStore.getState().authModalOpen).toBe(true);

      useCollaborationStore.getState().setAuthModalOpen(false);
      expect(useCollaborationStore.getState().authModalOpen).toBe(false);
    });

    it('manages Invite modal with tab switching (invite vs manage)', () => {
      useCollaborationStore.getState().setInviteModalOpen(true, 'manage');
      expect(useCollaborationStore.getState().inviteModalOpen).toBe(true);
      expect(useCollaborationStore.getState().inviteActiveTab).toBe('manage');

      useCollaborationStore.getState().setInviteModalOpen(true, 'invite');
      expect(useCollaborationStore.getState().inviteActiveTab).toBe('invite');
    });

    it('manages Publish & Embed modal state', () => {
      useCollaborationStore.getState().setPublishEmbedModalOpen(true);
      expect(useCollaborationStore.getState().publishEmbedModalOpen).toBe(true);
    });

    it('manages Invitation Accept modal with diagram metadata', () => {
      useCollaborationStore.getState().setInvitationAcceptModalOpen(true, {
        inviterName: 'Rajesh Kayal',
        projectName: 'Monolith Architecture',
        role: 'editor',
      });
      const state = useCollaborationStore.getState();
      expect(state.invitationAcceptModalOpen).toBe(true);
      expect(state.invitationData.projectName).toBe('Monolith Architecture');
    });

    it('supports all access control preview states: denied, sign-in-required, email-verification', () => {
      useCollaborationStore.getState().setAccessControlModalOpen(true, 'denied');
      expect(useCollaborationStore.getState().accessControlState).toBe('denied');

      useCollaborationStore.getState().setAccessControlState('sign-in-required');
      expect(useCollaborationStore.getState().accessControlState).toBe('sign-in-required');

      useCollaborationStore.getState().setAccessControlState('email-verification');
      expect(useCollaborationStore.getState().accessControlState).toBe('email-verification');
    });
  });

  describe('4. Real-Time Collaboration Simulation', () => {
    it('toggles live cursors display', () => {
      expect(useCollaborationStore.getState().showLiveCursors).toBe(true);
      useCollaborationStore.getState().toggleLiveCursors();
      expect(useCollaborationStore.getState().showLiveCursors).toBe(false);
      useCollaborationStore.getState().toggleLiveCursors();
      expect(useCollaborationStore.getState().showLiveCursors).toBe(true);
    });

    it('controls active editing user status indicator', () => {
      expect(useCollaborationStore.getState().activeEditorName).toBe('Aman');
      useCollaborationStore.getState().setActiveEditorName(null);
      expect(useCollaborationStore.getState().activeEditorName).toBeNull();
      useCollaborationStore.getState().setActiveEditorName('Sneha');
      expect(useCollaborationStore.getState().activeEditorName).toBe('Sneha');
    });
  });
});
