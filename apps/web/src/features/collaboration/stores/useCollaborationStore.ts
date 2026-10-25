'use client';

import { create } from 'zustand';
import type * as Y from 'yjs';
import type {
  AccessControlState,
  AuthUser,
  Collaborator,
  CollaboratorRole,
  InvitationData,
  LiveCursor,
  WorkspaceRole,
  UserPresence,
} from '../types/collaboration.types';
import type { CollabConnectionStatus } from '../services/collab.client';
import { authClient } from '../services/auth.client';

const DEFAULT_COLLABORATORS: Collaborator[] = [
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
];

interface CollaborationState {
  // Auth state — null by default to support personal canvas without login
  currentUser: AuthUser | null;
  isLive: boolean;
  myRole: CollaboratorRole;
  isReadOnly: boolean;
  connectionStatus: CollabConnectionStatus;

  // Collaborator roster & live cursors
  collaborators: Collaborator[];
  liveCursors: LiveCursor[];
  undoManager: Y.UndoManager | null;

  // Modal dialog states
  authModalOpen: boolean;
  inviteModalOpen: boolean;
  inviteActiveTab: 'invite' | 'manage';
  publishEmbedModalOpen: boolean;
  collaboratorsPopoverOpen: boolean;
  invitationAcceptModalOpen: boolean;
  accessControlModalOpen: boolean;
  accessControlState: AccessControlState;

  // Real-time collaboration simulation states
  activeEditorName: string | null;
  showLiveCursors: boolean;
  invitationData: InvitationData;

  // Actions
  signIn: (
    userOrEmail?: string | { id?: string; name?: string; email?: string; isEmailVerified?: boolean },
    maybeName?: string,
    options?: { keepModalOpen?: boolean }
  ) => void;
  signOut: () => void;
  checkAuth: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  setLive: (live: boolean) => void;
  setMyRole: (role: CollaboratorRole) => void;
  setConnectionStatus: (status: CollabConnectionStatus) => void;
  setLiveCursors: (cursors: LiveCursor[]) => void;
  setUndoManager: (um: Y.UndoManager | null) => void;
  collabUndo: () => void;
  collabRedo: () => void;
  updateFromPresence: (
    users: Array<{
      userId: string;
      userEmail?: string;
      role: WorkspaceRole;
      presence: UserPresence;
    }>
  ) => void;
  removeUserPresence: (userId: string) => void;
  setAuthModalOpen: (open: boolean) => void;
  setInviteModalOpen: (open: boolean, tab?: 'invite' | 'manage') => void;
  setPublishEmbedModalOpen: (open: boolean) => void;
  setCollaboratorsPopoverOpen: (open: boolean) => void;
  setInvitationAcceptModalOpen: (open: boolean, data?: Partial<InvitationData>) => void;
  setAccessControlModalOpen: (open: boolean, state?: AccessControlState) => void;
  setAccessControlState: (state: AccessControlState) => void;
  addCollaborator: (email: string, role: CollaboratorRole) => void;
  updateCollaboratorRole: (id: string, role: CollaboratorRole) => void;
  removeCollaborator: (id: string) => void;
  toggleLiveCursors: () => void;
  setActiveEditorName: (name: string | null) => void;
}

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  currentUser: null,
  isLive: false,
  myRole: 'owner',
  isReadOnly: false,
  connectionStatus: 'disconnected',
  collaborators: DEFAULT_COLLABORATORS,
  liveCursors: [],
  undoManager: null,

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
  invitationData: {
    inviterName: 'Rajesh Kayal',
    projectName: 'Monolith',
    role: 'editor',
    expiryDays: 7,
  },

  signIn: (
    userOrEmail = 'rajesh@example.com',
    maybeName = 'Rajesh (You)',
    options?: { keepModalOpen?: boolean }
  ) => {
    let id = 'current-user';
    let name = maybeName;
    let email = typeof userOrEmail === 'string' ? userOrEmail : 'user@example.com';
    let isEmailVerified = true;

    if (typeof userOrEmail === 'object' && userOrEmail !== null) {
      id = userOrEmail.id || id;
      name = userOrEmail.name || name;
      email = userOrEmail.email || email;
      isEmailVerified = Boolean(userOrEmail.isEmailVerified);
    }

    const initials = name.slice(0, 1).toUpperCase();
    const newUser: AuthUser = {
      id,
      name,
      email,
      initials,
      avatarBg: 'bg-blue-600',
      isEmailVerified,
    };

    set((state) => ({
      currentUser: newUser,
      isLive: isEmailVerified, // Enable live collaboration only if email is verified
      authModalOpen: options?.keepModalOpen ? state.authModalOpen : false,
      collaborators: state.collaborators.map((c) =>
        c.isCurrentUser
          ? { ...c, name, email, initials }
          : c
      ),
    }));
  },

  checkAuth: async () => {
    try {
      const user = await authClient.getMe();
      if (user) {
        get().signIn(user);
      }
    } catch {
      // Offline or unauthenticated
    }
  },

  refreshCurrentUser: async () => {
    try {
      const user = await authClient.getMe();
      if (user) {
        get().signIn(user, undefined, { keepModalOpen: get().authModalOpen });
      }
    } catch {
      // Offline or unauthenticated
    }
  },

  signOut: () => {
    authClient.logout();
    set({
      currentUser: null,
      isLive: false,
      collaboratorsPopoverOpen: false,
      inviteModalOpen: false,
    });
  },

  setLive: (live) => set({ isLive: live }),

  setMyRole: (role) =>
    set({
      myRole: role,
      isReadOnly: role === 'viewer',
    }),

  setConnectionStatus: (status) =>
    set({
      connectionStatus: status,
      isLive: status === 'connected' || status === 'reconnecting',
    }),

  setLiveCursors: (cursors) => set({ liveCursors: cursors }),

  setUndoManager: (um) => set({ undoManager: um }),

  collabUndo: () => {
    const um = get().undoManager;
    if (um) um.undo();
  },

  collabRedo: () => {
    const um = get().undoManager;
    if (um) um.redo();
  },

  updateFromPresence: (users) => {
    const colorPalette = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'];
    const bgPalette = [
      'bg-blue-600',
      'bg-pink-600',
      'bg-purple-600',
      'bg-emerald-600',
      'bg-amber-600',
      'bg-cyan-600',
    ];

    set((state) => {
      const currentUserId = state.currentUser?.id;
      const updatedCollaborators = [...state.collaborators];
      const cursorsMap = new Map<string, LiveCursor>(state.liveCursors.map((c) => [c.id, c]));

      let activeEditor: string | null = state.activeEditorName;

      for (const u of users) {
        const isCurrent = u.userId === currentUserId;
        const name = u.presence.userName || (u.userEmail ? u.userEmail.split('@')[0] : u.userId);
        const initials = name.slice(0, 1).toUpperCase();
        const hash = Math.abs(
          u.userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        );
        const color = colorPalette[hash % colorPalette.length];
        const avatarBg = bgPalette[hash % bgPalette.length];

        const existingIdx = updatedCollaborators.findIndex((c) => c.id === u.userId);
        const collabObj: Collaborator = {
          id: u.userId,
          name: isCurrent ? `${name} (You)` : name,
          email: u.userEmail || `${u.userId}@drawzware.com`,
          role: u.role,
          initials,
          color,
          avatarBg,
          isCurrentUser: isCurrent,
          status: 'active',
          lastActive: 'Just now',
        };

        if (existingIdx >= 0) {
          updatedCollaborators[existingIdx] = collabObj;
        } else {
          updatedCollaborators.push(collabObj);
        }

        // Live cursor for peers (not current user)
        if (!isCurrent) {
          if (u.presence.cursor) {
            cursorsMap.set(u.userId, {
              id: u.userId,
              name,
              role: u.role,
              color,
              badgeBg: avatarBg,
              x: u.presence.cursor.x,
              y: u.presence.cursor.y,
              activeAction: u.presence.selectedNodeIds.length > 0 ? 'selecting' : undefined,
            });
            activeEditor = name;
          } else {
            cursorsMap.delete(u.userId);
          }
        }
      }

      return {
        collaborators: updatedCollaborators,
        liveCursors: Array.from(cursorsMap.values()),
        activeEditorName: activeEditor,
      };
    });
  },

  removeUserPresence: (userId) => {
    set((state) => ({
      liveCursors: state.liveCursors.filter((c) => c.id !== userId),
      collaborators: state.collaborators.map((c) =>
        c.id === userId ? { ...c, status: 'pending' as const, lastActive: 'Offline' } : c
      ),
    }));
  },

  setAuthModalOpen: (open) => set({ authModalOpen: open }),

  setInviteModalOpen: (open, tab) =>
    set((state) => ({
      inviteModalOpen: open,
      inviteActiveTab: tab || state.inviteActiveTab,
    })),

  setPublishEmbedModalOpen: (open) => set({ publishEmbedModalOpen: open }),

  setCollaboratorsPopoverOpen: (open) => set({ collaboratorsPopoverOpen: open }),

  setInvitationAcceptModalOpen: (open, data) =>
    set((state) => ({
      invitationAcceptModalOpen: open,
      invitationData: data ? { ...state.invitationData, ...data } : state.invitationData,
    })),

  setAccessControlModalOpen: (open, state) =>
    set((s) => ({
      accessControlModalOpen: open,
      accessControlState: state ?? s.accessControlState,
    })),

  setAccessControlState: (state) => set({ accessControlState: state }),

  addCollaborator: (email, role) => {
    const rawName = email.split('@')[0] || 'Collaborator';
    const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const initials = name.slice(0, 1).toUpperCase();

    const colorPalette = ['#10b981', '#6366f1', '#06b6d4', '#f97316', '#a855f7'];
    const bgPalette = ['bg-emerald-600', 'bg-indigo-600', 'bg-cyan-600', 'bg-orange-600', 'bg-purple-600'];
    const idx = Math.floor(Math.random() * colorPalette.length);

    const newCollab: Collaborator = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      initials,
      color: colorPalette[idx],
      avatarBg: bgPalette[idx],
      status: 'active',
      lastActive: 'Just now',
    };

    set((state) => ({
      collaborators: [...state.collaborators, newCollab],
    }));
  },

  updateCollaboratorRole: (id, role) =>
    set((state) => ({
      collaborators: state.collaborators.map((c) =>
        c.id === id ? { ...c, role } : c
      ),
    })),

  removeCollaborator: (id) =>
    set((state) => ({
      collaborators: state.collaborators.filter((c) => c.id !== id),
    })),

  toggleLiveCursors: () => set((state) => ({ showLiveCursors: !state.showLiveCursors })),

  setActiveEditorName: (name) => set({ activeEditorName: name }),
}));

// Cross-tab synchronization: when another tab completes auth or verification,
// fetch fresh user state from the trusted API endpoint.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'drawzware_auth_event') {
      useCollaborationStore.getState().refreshCurrentUser();
    }
  });
}

