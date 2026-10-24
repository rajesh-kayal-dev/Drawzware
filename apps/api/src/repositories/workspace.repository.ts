import { DatabasePool } from '../db/interface';
import { getDbPool } from '../db/pool';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceInvitation,
} from '@drawzware/contracts';

interface WorkspaceDbRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface MemberDbRow {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  user_email?: string;
  created_at: string;
}

interface InvitationDbRow {
  id: string;
  workspace_id: string;
  email: string;
  role: 'editor' | 'viewer';
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
}

export class WorkspaceRepository {
  private pool: DatabasePool;

  constructor(pool?: DatabasePool) {
    this.pool = pool || getDbPool();
  }

  async createWorkspace(name: string, ownerId: string, ownerEmail?: string): Promise<Workspace> {
    const wsResult = await this.pool.query<WorkspaceDbRow>(
      `INSERT INTO workspaces (name, owner_id)
       VALUES ($1, $2)
       RETURNING id, name, owner_id, created_at, updated_at`,
      [name, ownerId]
    );

    const ws = wsResult.rows[0];

    // Automatically add owner to workspace_members
    await this.pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, user_email)
       VALUES ($1, $2, 'owner', $3)`,
      [ws.id, ownerId, ownerEmail || null]
    );

    return {
      id: ws.id,
      name: ws.name,
      ownerId: ws.owner_id,
      createdAt: ws.created_at,
      updatedAt: ws.updated_at,
    };
  }

  async findWorkspaceById(id: string): Promise<Workspace | null> {
    const res = await this.pool.query<WorkspaceDbRow>(
      `SELECT id, name, owner_id, created_at, updated_at FROM workspaces WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const ws = res.rows[0];
    return {
      id: ws.id,
      name: ws.name,
      ownerId: ws.owner_id,
      createdAt: ws.created_at,
      updatedAt: ws.updated_at,
    };
  }

  async listWorkspacesForUser(userId: string): Promise<Array<Workspace & { role: WorkspaceRole }>> {
    const res = await this.pool.query<WorkspaceDbRow & { role: WorkspaceRole }>(
      `SELECT w.id, w.name, w.owner_id, w.created_at, w.updated_at, m.role
       FROM workspaces w
       INNER JOIN workspace_members m ON w.id = m.workspace_id
       WHERE m.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      ownerId: row.owner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      role: row.role,
    }));
  }

  async findMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const res = await this.pool.query<MemberDbRow>(
      `SELECT workspace_id, user_id, role, user_email, created_at
       FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId]
    );

    if (res.rows.length === 0) return null;
    const m = res.rows[0];
    return {
      workspaceId: m.workspace_id,
      userId: m.user_id,
      role: m.role,
      userEmail: m.user_email,
      createdAt: m.created_at,
    };
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const res = await this.pool.query<MemberDbRow>(
      `SELECT workspace_id, user_id, role, user_email, created_at
       FROM workspace_members
       WHERE workspace_id = $1
       ORDER BY created_at ASC`,
      [workspaceId]
    );

    return res.rows.map((m) => ({
      workspaceId: m.workspace_id,
      userId: m.user_id,
      role: m.role,
      userEmail: m.user_email,
      createdAt: m.created_at,
    }));
  }

  async createInvitation(
    workspaceId: string,
    email: string,
    role: 'editor' | 'viewer',
    invitedBy: string
  ): Promise<WorkspaceInvitation> {
    // Invalidate existing pending invitations for this email in this workspace
    await this.pool.query(
      `UPDATE workspace_invitations
       SET status = 'expired'
       WHERE workspace_id = $1 AND email = $2 AND status = 'pending'`,
      [workspaceId, email]
    );

    const res = await this.pool.query<InvitationDbRow>(
      `INSERT INTO workspace_invitations (workspace_id, email, role, invited_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, workspace_id, email, role, invited_by, status, created_at, expires_at`,
      [workspaceId, email, role, invitedBy]
    );

    const inv = res.rows[0];
    return {
      id: inv.id,
      workspaceId: inv.workspace_id,
      email: inv.email,
      role: inv.role,
      invitedBy: inv.invited_by,
      status: inv.status,
      createdAt: inv.created_at,
      expiresAt: inv.expires_at,
    };
  }

  async findInvitationById(id: string): Promise<WorkspaceInvitation | null> {
    const res = await this.pool.query<InvitationDbRow>(
      `SELECT id, workspace_id, email, role, invited_by, status, created_at, expires_at
       FROM workspace_invitations
       WHERE id = $1`,
      [id]
    );

    if (res.rows.length === 0) return null;
    const inv = res.rows[0];
    return {
      id: inv.id,
      workspaceId: inv.workspace_id,
      email: inv.email,
      role: inv.role,
      invitedBy: inv.invited_by,
      status: inv.status,
      createdAt: inv.created_at,
      expiresAt: inv.expires_at,
    };
  }

  async acceptInvitation(invitationId: string, userId: string, userEmail: string): Promise<WorkspaceMember> {
    const inv = await this.findInvitationById(invitationId);
    if (!inv) {
      throw new Error('INVITATION_NOT_FOUND');
    }

    if (inv.status !== 'pending') {
      throw new Error(`INVITATION_${inv.status.toUpperCase()}`);
    }

    if (new Date(inv.expiresAt).getTime() <= Date.now()) {
      await this.pool.query(`UPDATE workspace_invitations SET status = 'expired' WHERE id = $1`, [invitationId]);
      throw new Error('INVITATION_EXPIRED');
    }

    if (inv.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error('INVITATION_EMAIL_MISMATCH');
    }

    // Insert or update member role
    await this.pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, user_email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (workspace_id, user_id)
       DO UPDATE SET role = EXCLUDED.role`,
      [inv.workspaceId, userId, inv.role, userEmail]
    );

    // Update invitation status to accepted
    await this.pool.query(
      `UPDATE workspace_invitations
       SET status = 'accepted', accepted_at = NOW()
       WHERE id = $1`,
      [invitationId]
    );

    return {
      workspaceId: inv.workspaceId,
      userId,
      role: inv.role,
      userEmail,
      createdAt: new Date().toISOString(),
    };
  }
}
