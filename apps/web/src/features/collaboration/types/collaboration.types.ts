import type { WorkspaceRole, UserPresence } from '@drawzware/contracts';

export type CollaboratorRole = WorkspaceRole;
export type { WorkspaceRole, UserPresence };

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: CollaboratorRole;
  initials: string;
  color: string;
  avatarBg: string;
  isCurrentUser?: boolean;
  status?: 'active' | 'pending';
  lastActive?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarBg: string;
  isEmailVerified?: boolean;
}

export type AccessControlState = 'granted' | 'denied' | 'sign-in-required' | 'email-verification';

export interface LiveCursor {
  id: string;
  name: string;
  role: CollaboratorRole;
  color: string;
  badgeBg: string;
  x: number;
  y: number;
  targetNodeLabel?: string;
  activeAction?: string;
}

export interface InvitationData {
  inviterName: string;
  projectName: string;
  role: CollaboratorRole;
  expiryDays: number;
}
