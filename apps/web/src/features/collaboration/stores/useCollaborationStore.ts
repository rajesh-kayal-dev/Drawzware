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
import { useProjectStore } from '@/features/projects/stores/useProjectStore';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import type { Project, Workspace } from '@drawzware/contracts';
import { toast } from '@/stores/useToastStore';
import {
  formatCollaboratorName,
  getCollaboratorColor,
  getCollaboratorInitial,
} from '../utils/collaborator-helpers';

const DEFAULT_COLLABORATORS: Collaborator[] = [];

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
  authModalMode: 'login' | 'signup';
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

  // Cloud Document & Workspace Identity
  activeDiagramId: string | null;
  activeWorkspaceId: string | null;
  workspaces: Array<Workspace & { role?: string }>;

  // Publishing & Retry states
  publishModalOpen: boolean;
  publishLoading: boolean;
  publishError: string | null;
  savedToCloudConnectionFailed: boolean;
  invitationError: string | null;
  lastFailedInvitationParams: {
    wsId: string;
    email: string;
    role: 'editor' | 'viewer';
    canvasUrl: string;
    diagramId?: string;
  } | null;

  // Actions
  signIn: (
    userOrEmail?: string | { id?: string; name?: string; email?: string; isEmailVerified?: boolean },
    maybeName?: string,
    options?: { keepModalOpen?: boolean }
  ) => void;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  setLive: (live: boolean) => void;
  setMyRole: (role: CollaboratorRole) => void;
  setConnectionStatus: (status: CollabConnectionStatus) => void;
  setActiveDiagram: (diagramId: string | null, workspaceId?: string | null) => void;
  setPublishModalOpen: (open: boolean) => void;
  setPublishError: (error: string | null) => void;
  setInvitationError: (error: string | null) => void;
  loadWorkspaces: () => Promise<Array<Workspace & { role?: string }>>;
  publishCurrentCanvas: (workspaceId?: string) => Promise<{ success: boolean; diagramId?: string; error?: string }>;
  retryConnection: () => void;
  retryLastInvitation: () => Promise<void>;
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
  setAuthModalOpen: (open: boolean, mode?: 'login' | 'signup') => void;
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
  authModalMode: 'login',
  inviteModalOpen: false,
  inviteActiveTab: 'invite',
  publishEmbedModalOpen: false,
  collaboratorsPopoverOpen: false,
  invitationAcceptModalOpen: false,
  accessControlModalOpen: false,
  accessControlState: 'granted',

  activeEditorName: null,
  showLiveCursors: true,
  invitationData: {
    inviterName: 'Rajesh Kayal',
    projectName: 'Monolith',
    role: 'editor',
    expiryDays: 7,
  },

  activeDiagramId: null,
  activeWorkspaceId: null,
  workspaces: [],

  publishModalOpen: false,
  publishLoading: false,
  publishError: null,
  savedToCloudConnectionFailed: false,
  invitationError: null,
  lastFailedInvitationParams: null,

  signIn: (
    userOrEmail = 'user@example.com',
    maybeName = 'You',
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

    const initials = (name || 'U').slice(0, 1).toUpperCase();
    const newUser: AuthUser = {
      id,
      name,
      email,
      initials,
      avatarBg: 'bg-blue-600',
      isEmailVerified,
    };

    const selfCollab: Collaborator = {
      id,
      name: `${name} (You)`,
      email,
      role: get().myRole || 'owner',
      initials,
      color: '#3b82f6',
      avatarBg: 'bg-blue-600',
      isCurrentUser: true,
      status: 'active',
      lastActive: 'Just now',
    };

    set((state) => {
      const otherCollabs = state.collaborators.filter((c) => !c.isCurrentUser && c.id !== id);
      return {
        currentUser: newUser,
        authModalOpen: options?.keepModalOpen ? state.authModalOpen : false,
        collaborators: [selfCollab, ...otherCollabs],
      };
    });
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
        const keepModalOpen = user.isEmailVerified ? false : get().authModalOpen;
        get().signIn(user, undefined, { keepModalOpen });
        if (user.isEmailVerified && get().authModalOpen) {
          set({ authModalOpen: false });
        }
      }
    } catch {
      // Offline or unauthenticated
    }
  },

  signOut: async () => {
    try {
      await authClient.logout();
    } catch {
      // Safe ignore
    }
    set({
      currentUser: null,
      isLive: false,
      collaboratorsPopoverOpen: false,
      inviteModalOpen: false,
      activeDiagramId: null,
      collaborators: [],
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('drawzware_auth_event', String(Date.now()));
    }
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
      const cursorsMap = new Map<string, LiveCursor>(state.liveCursors.map((c) => [c.id, c]));
      let activeEditor: string | null = state.activeEditorName;

      // Ensure current user is maintained in roster
      let selfCollab = state.collaborators.find((c) => c.isCurrentUser);
      if (!selfCollab && state.currentUser) {
        const id = state.currentUser.id;
        const cleanName = formatCollaboratorName(state.currentUser.name, state.currentUser.email);
        const initials = getCollaboratorInitial(cleanName);
        const color = getCollaboratorColor(id || state.currentUser.email || 'user');
        selfCollab = {
          id,
          name: `${cleanName} (You)`,
          email: state.currentUser.email,
          role: state.myRole || 'owner',
          initials,
          color,
          avatarBg: '',
          isCurrentUser: true,
          status: 'active',
          lastActive: 'Just now',
        };
      }

      // Preserve existing active peers and upsert incoming user presence
      const peerMap = new Map<string, Collaborator>(
        state.collaborators.filter((c) => !c.isCurrentUser).map((c) => [c.id, c])
      );

      for (const u of users) {
        const isCurrent = u.userId === currentUserId;
        const cleanName = formatCollaboratorName(u.presence?.userName, u.userEmail);
        const initials = getCollaboratorInitial(cleanName);
        const color = getCollaboratorColor(u.userId || u.userEmail || '');

        const collabObj: Collaborator = {
          id: u.userId,
          name: isCurrent ? `${cleanName} (You)` : cleanName,
          email: u.userEmail || `${u.userId}@drawzware.com`,
          role: u.role,
          initials,
          color,
          avatarBg: '',
          isCurrentUser: isCurrent,
          status: 'active',
          lastActive: 'Just now',
        };

        if (isCurrent) {
          if (selfCollab) {
            Object.assign(selfCollab, collabObj);
          } else {
            selfCollab = collabObj;
          }
        } else {
          peerMap.set(u.userId, collabObj);
        }

        // Live cursor for peers (not current user)
        if (!isCurrent) {
          if (u.presence?.cursor) {
            cursorsMap.set(u.userId, {
              id: u.userId,
              name: cleanName,
              role: u.role,
              color,
              badgeBg: color,
              x: u.presence.cursor.x,
              y: u.presence.cursor.y,
              activeAction: u.presence.selectedNodeIds?.length > 0 ? 'selecting' : undefined,
              lastActiveAt: Date.now(),
            });
            activeEditor = cleanName;
          } else {
            cursorsMap.delete(u.userId);
          }
        }
      }

      // Live presence reflects only currently connected peers and self
      const updatedCollaborators = selfCollab
        ? [selfCollab, ...Array.from(peerMap.values())]
        : Array.from(peerMap.values());

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
      collaborators: state.collaborators.filter((c) => c.id !== userId || c.isCurrentUser),
      activeEditorName:
        state.activeEditorName && state.collaborators.find((c) => c.id === userId)?.name === state.activeEditorName
          ? null
          : state.activeEditorName,
    }));
  },

  setAuthModalOpen: (open, mode) =>
    set((state) => ({
      authModalOpen: open,
      authModalMode: mode || state.authModalMode,
    })),

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

  setActiveDiagram: (diagramId, workspaceId = null) =>
    set({
      activeDiagramId: diagramId,
      activeWorkspaceId: workspaceId,
    }),

  setPublishModalOpen: (open) =>
    set({
      publishModalOpen: open,
      publishError: open ? null : get().publishError,
    }),

  setPublishError: (error) => set({ publishError: error }),
  setInvitationError: (error) => set({ invitationError: error }),

  retryLastInvitation: async () => {
    const params = get().lastFailedInvitationParams;
    if (!params) return;
    set({ invitationError: null });
    try {
      await authClient.sendWorkspaceInvitation(
        params.wsId,
        params.email,
        params.role,
        params.canvasUrl,
        params.canvasUrl,
        params.diagramId
      );
      set({ invitationError: null, lastFailedInvitationParams: null });
      toast({ message: `Invitation resent to ${params.email}!`, tone: 'ok' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send invitation.';
      set({ invitationError: msg });
      toast({ message: msg, tone: 'danger' });
    }
  },

  loadWorkspaces: async () => {
    try {
      const list = await authClient.listWorkspaces();
      set({ workspaces: list });
      return list;
    } catch {
      return [];
    }
  },

  retryConnection: () => {
    set({ savedToCloudConnectionFailed: false, isLive: true });
  },

  publishCurrentCanvas: async (targetWorkspaceId?: string) => {
    set({ publishLoading: true, publishError: null, savedToCloudConnectionFailed: false });
    try {
      const user = get().currentUser;
      if (!user || !user.isEmailVerified) {
        set({ publishLoading: false, publishError: 'Email verification is required before publishing to the cloud.' });
        return { success: false, error: 'EMAIL_NOT_VERIFIED' };
      }

      // 1. Resolve workspace
      let wsId = targetWorkspaceId || get().activeWorkspaceId;
      if (!wsId) {
        let wsList = get().workspaces;
        if (wsList.length === 0) {
          wsList = await get().loadWorkspaces();
        }
        if (wsList.length === 0) {
          const defaultWs = await authClient.createWorkspace({ name: 'Personal Workspace' });
          wsId = defaultWs.id;
          set({ workspaces: [{ ...defaultWs, role: 'owner' }] });
        } else {
          wsId = wsList[0].id;
        }
      }

      // 2. Resolve project data to publish
      const projectStore = useProjectStore.getState();
      const canvasStore = useCanvasStore.getState();
      const activeCanvasId = canvasStore.projectId || projectStore.lastOpenedProjectId;
      let currentProj = activeCanvasId
        ? projectStore.projects.find((p) => p.id === activeCanvasId || p.cloudDiagramId === activeCanvasId)
        : null;
      if (!currentProj) {
        currentProj =
          projectStore.projects.find((p) => p.id === projectStore.lastOpenedProjectId) ||
          projectStore.projects[0];
      }

      // Idempotency: if already linked to a cloudDiagramId, do not re-import!
      if (currentProj?.cloudDiagramId) {
        set({
          activeDiagramId: currentProj.cloudDiagramId,
          activeWorkspaceId: currentProj.cloudWorkspaceId || wsId,
          isLive: true,
          publishLoading: false,
          publishModalOpen: false,
          savedToCloudConnectionFailed: false,
        });
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/canvas')) {
          const newUrl = `/canvas?id=${encodeURIComponent(currentProj.cloudDiagramId)}`;
          if (window.location.search !== `?id=${encodeURIComponent(currentProj.cloudDiagramId)}`) {
            window.history.replaceState(null, '', newUrl);
            localStorage.setItem('drawzware_last_canvas_url', newUrl);
          }
        }
        useCanvasStore.setState({ projectId: currentProj.cloudDiagramId });
        useProjectStore.getState().setLastOpened(currentProj.cloudDiagramId);
        return { success: true, diagramId: currentProj.cloudDiagramId };
      }

      const title = currentProj?.name || 'Untitled Diagram';
      const canonicalProject: Project = {
        id: currentProj?.id || activeCanvasId || `proj_${Date.now()}`,
        name: title,
        description: currentProj?.description,
        createdAt: currentProj?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: canvasStore.nodes || [],
        edges: canvasStore.edges || [],
        viewport: canvasStore.viewport || { x: 0, y: 0, zoom: 1 },
        diagramType: currentProj?.diagramType || 'architecture',
        diagramData: currentProj?.diagramData,
      };

      const res = await authClient.importDiagram(wsId, canonicalProject, title);
      const cloudDiagramId = res.diagram.id;

      // 3. Update local project with cloudDiagramId and cloudWorkspaceId
      const updatedProj: Project = {
        ...(currentProj || canonicalProject),
        id: currentProj?.id || canonicalProject.id,
        cloudDiagramId,
        cloudWorkspaceId: wsId,
      };
      await projectStore.saveProjectAsync(updatedProj);

      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/canvas')) {
        const newUrl = `/canvas?id=${encodeURIComponent(cloudDiagramId)}`;
        window.history.replaceState(null, '', newUrl);
        localStorage.setItem('drawzware_last_canvas_url', newUrl);
      }

      // Synchronize canvas store with published cloud ID
      useCanvasStore.setState({ projectId: cloudDiagramId });
      useProjectStore.getState().setLastOpened(cloudDiagramId);

      // 4. Update collaboration store state
      set({
        activeDiagramId: cloudDiagramId,
        activeWorkspaceId: wsId,
        isLive: true,
        publishLoading: false,
        publishModalOpen: false,
        publishError: null,
        savedToCloudConnectionFailed: false,
      });

      return { success: true, diagramId: cloudDiagramId };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to publish diagram to cloud.';
      set({ publishLoading: false, publishError: errorMsg });
      return { success: false, error: errorMsg };
    }
  },
}));

// Cross-tab synchronization: when another tab completes auth or verification,
// fetch fresh user state from the trusted API endpoint.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (
      event.key === 'drawzware_auth_event' ||
      event.key === 'drawzware_access_token' ||
      event.key === 'drawzware_token'
    ) {
      useCollaborationStore.getState().refreshCurrentUser();
    }
  });

  if ('BroadcastChannel' in window) {
    const authChannel = new BroadcastChannel('drawzware_auth_channel');
    authChannel.onmessage = async (event) => {
      if (event.data?.type === 'VERIFICATION_SUCCESS') {
        const user = event.data.user;
        if (user) {
          useCollaborationStore.getState().signIn(user, undefined, { keepModalOpen: false });
        } else {
          await useCollaborationStore.getState().refreshCurrentUser();
        }
        useCollaborationStore.getState().setAuthModalOpen(false);

        // Acknowledge receipt back to the verification tab so it knows the canvas tab received it
        try {
          authChannel.postMessage({
            type: 'VERIFICATION_ACK',
            canvasUrl: window.location.pathname + window.location.search,
          });
        } catch {
          // Safe ignore
        }

        // Prominently notify the user on their canvas tab
        const displayName = user?.name || useCollaborationStore.getState().currentUser?.name || 'Explorer';
        toast({
          message: `🎉 Email verified successfully! Welcome, ${displayName}! Cloud collaboration is now active.`,
          tone: 'ok',
        });

        // Briefly alert the tab title and attempt focus so the user notices their canvas tab
        try {
          const originalTitle = document.title;
          document.title = `✅ Verified! ${originalTitle}`;
          setTimeout(() => {
            document.title = originalTitle;
          }, 4500);
          window.focus();
        } catch {
          // Safe ignore
        }
      }
    };
  }
}

