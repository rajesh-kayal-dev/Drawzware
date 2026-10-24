import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../apps/api/src/app';
import { DatabasePool, QueryResult } from '../apps/api/src/db/interface';
import { WorkspaceRepository } from '../apps/api/src/repositories/workspace.repository';
import { DiagramRepository } from '../apps/api/src/repositories/diagram.repository';
import { WorkspaceController } from '../apps/api/src/controllers/workspace.controller';
import { DiagramController } from '../apps/api/src/controllers/diagram.controller';
import { CURRENT_DOCUMENT_SCHEMA_VERSION, DRAWZ_FILE_TYPE } from '@drawzware/contracts';

/**
 * Mock database pool storing data in memory for deterministic unit and API tests.
 */
class InMemoryDatabasePool implements DatabasePool {
  workspaces: Map<string, any> = new Map();
  members: Map<string, any> = new Map();
  invitations: Map<string, any> = new Map();
  diagrams: Map<string, any> = new Map();
  snapshots: Map<string, any> = new Map();

  async query<T = unknown>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const cleanSql = text.replace(/\s+/g, ' ').trim();

    // 1. INSERT INTO workspaces
    if (cleanSql.startsWith('INSERT INTO workspaces')) {
      const id = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const name = params[0] as string;
      const owner_id = params[1] as string;
      const created_at = new Date().toISOString();
      const updated_at = created_at;
      const record = { id, name, owner_id, created_at, updated_at };
      this.workspaces.set(id, record);
      return { rows: [record as unknown as T] };
    }

    // 2. INSERT INTO workspace_members
    if (cleanSql.startsWith('INSERT INTO workspace_members')) {
      const workspace_id = params[0] as string;
      const user_id = params[1] as string;
      // In createWorkspace: VALUES ($1, $2, 'owner', $3) -> role is 'owner', params[2] is user_email
      // In acceptInvitation: VALUES ($1, $2, $3, $4) -> params[2] is role, params[3] is user_email
      let role = 'owner';
      let user_email = params[2] as string;
      if (params.length >= 4) {
        role = params[2] as string;
        user_email = params[3] as string;
      }
      const created_at = new Date().toISOString();
      const key = `${workspace_id}:${user_id}`;
      const record = { workspace_id, user_id, role, user_email, created_at };
      this.members.set(key, record);
      return { rows: [record as unknown as T] };
    }

    // 3. SELECT FROM workspace_members (single)
    if (cleanSql.includes('FROM workspace_members WHERE workspace_id = $1 AND user_id = $2')) {
      const key = `${params[0]}:${params[1]}`;
      const record = this.members.get(key);
      return { rows: record ? [record as unknown as T] : [] };
    }

    // 4. SELECT FROM workspace_members (list)
    if (cleanSql.includes('FROM workspace_members WHERE workspace_id = $1')) {
      const wsId = params[0];
      const rows = Array.from(this.members.values()).filter((m) => m.workspace_id === wsId);
      return { rows: rows as unknown as T[] };
    }

    // 5. SELECT id, name, owner_id FROM workspaces WHERE id = $1
    if (cleanSql.startsWith('SELECT id, name, owner_id, created_at, updated_at FROM workspaces WHERE id = $1')) {
      const id = params[0] as string;
      const ws = this.workspaces.get(id);
      return { rows: ws ? [ws as unknown as T] : [] };
    }

    // 6. listWorkspacesForUser
    if (cleanSql.includes('FROM workspaces w INNER JOIN workspace_members m ON w.id = m.workspace_id WHERE m.user_id = $1')) {
      const userId = params[0] as string;
      const userMemberships = Array.from(this.members.values()).filter((m) => m.user_id === userId);
      const rows = userMemberships.map((m) => {
        const ws = this.workspaces.get(m.workspace_id);
        return {
          id: ws.id,
          name: ws.name,
          owner_id: ws.owner_id,
          created_at: ws.created_at,
          updated_at: ws.updated_at,
          role: m.role,
        };
      });
      return { rows: rows as unknown as T[] };
    }

    // 7. INSERT INTO workspace_invitations
    if (cleanSql.startsWith('INSERT INTO workspace_invitations')) {
      const id = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const workspace_id = params[0] as string;
      const email = params[1] as string;
      const role = params[2] as string;
      const invited_by = params[3] as string;
      const status = 'pending';
      const created_at = new Date().toISOString();
      const expires_at = new Date(Date.now() + 7 * 86400000).toISOString();
      const record = { id, workspace_id, email, role, invited_by, status, created_at, expires_at };
      this.invitations.set(id, record);
      return { rows: [record as unknown as T] };
    }

    // 8. UPDATE workspace_invitations SET status = 'expired'
    if (cleanSql.startsWith('UPDATE workspace_invitations SET status = \'expired\' WHERE workspace_id = $1 AND email = $2')) {
      for (const [id, inv] of this.invitations.entries()) {
        if (inv.workspace_id === params[0] && inv.email === params[1] && inv.status === 'pending') {
          inv.status = 'expired';
          this.invitations.set(id, inv);
        }
      }
      return { rows: [] };
    }

    // 9. SELECT FROM workspace_invitations WHERE id = $1
    if (cleanSql.includes('FROM workspace_invitations WHERE id = $1')) {
      const inv = this.invitations.get(params[0] as string);
      return { rows: inv ? [inv as unknown as T] : [] };
    }

    // 10. UPDATE workspace_invitations SET status = 'accepted'
    if (cleanSql.startsWith('UPDATE workspace_invitations SET status = \'accepted\'')) {
      const id = params[0] as string;
      const inv = this.invitations.get(id);
      if (inv) {
        inv.status = 'accepted';
        inv.accepted_at = new Date().toISOString();
        this.invitations.set(id, inv);
      }
      return { rows: [] };
    }

    // 11. INSERT INTO diagrams
    if (cleanSql.startsWith('INSERT INTO diagrams')) {
      const id = `diag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const workspace_id = params[0] as string;
      const title = params[1] as string;
      const diagram_type = params[2] as string;
      const created_by = params[3] as string;
      const created_at = new Date().toISOString();
      const updated_at = created_at;
      const record = { id, workspace_id, title, diagram_type, created_by, created_at, updated_at };
      this.diagrams.set(id, record);
      return { rows: [record as unknown as T] };
    }

    // 12. INSERT INTO diagram_snapshots
    if (cleanSql.startsWith('INSERT INTO diagram_snapshots')) {
      const diagram_id = params[0] as string;
      const state = params[1];
      const version = 1;
      const updated_at = new Date().toISOString();
      const record = { diagram_id, state, version, updated_at };
      this.snapshots.set(diagram_id, record);
      return { rows: [record as unknown as T] };
    }

    // 13. SELECT FROM diagrams WHERE id = $1
    if (cleanSql.includes('FROM diagrams WHERE id = $1')) {
      const diag = this.diagrams.get(params[0] as string);
      return { rows: diag ? [diag as unknown as T] : [] };
    }

    // 14. SELECT FROM diagrams WHERE workspace_id = $1
    if (cleanSql.includes('FROM diagrams WHERE workspace_id = $1')) {
      const wsId = params[0];
      const rows = Array.from(this.diagrams.values()).filter((d) => d.workspace_id === wsId);
      return { rows: rows as unknown as T[] };
    }

    // 15. UPDATE diagrams
    if (cleanSql.startsWith('UPDATE diagrams SET')) {
      const id = params[0] as string;
      const diag = this.diagrams.get(id);
      if (diag) {
        if (params.length > 2) {
          diag.title = params[1] as string;
          diag.diagram_type = params[2] as string;
        } else if (params.length === 2) {
          diag.title = params[1] as string;
        }
        diag.updated_at = new Date().toISOString();
        this.diagrams.set(id, diag);
        return { rows: [diag as unknown as T] };
      }
      return { rows: [] };
    }

    // 16. SELECT FROM diagram_snapshots
    if (cleanSql.includes('FROM diagram_snapshots WHERE diagram_id = $1')) {
      const snap = this.snapshots.get(params[0] as string);
      return { rows: snap ? [snap as unknown as T] : [] };
    }

    return { rows: [] };
  }
}

describe('Drawzware Phase 1: Backend, Authentication & Workspaces API', () => {
  let db: InMemoryDatabasePool;
  let app: any;

  const userOwner = { id: 'usr-owner-1', email: 'owner@drawzware.com' };
  const userEditor = { id: 'usr-editor-2', email: 'editor@drawzware.com' };
  const userViewer = { id: 'usr-viewer-3', email: 'viewer@drawzware.com' };
  const userStranger = { id: 'usr-stranger-4', email: 'stranger@drawzware.com' };

  const generateToken = (user: { id: string; email: string }) => {
    return jwt.sign({ sub: user.id, email: user.email }, 'test-secret', { expiresIn: '1h' });
  };

  const tokenOwner = generateToken(userOwner);
  const tokenEditor = generateToken(userEditor);
  const tokenViewer = generateToken(userViewer);
  const tokenStranger = generateToken(userStranger);

  beforeEach(() => {
    db = new InMemoryDatabasePool();
    const wsRepo = new WorkspaceRepository(db);
    const diagRepo = new DiagramRepository(db);
    const wsController = new WorkspaceController(wsRepo);
    const diagController = new DiagramController(diagRepo, wsRepo);
    app = createApp({ workspaceController: wsController, diagramController: diagController });
  });

  // ===========================================================================
  // 1. Health & Authentication Verification
  // ===========================================================================
  describe('1. Authentication & Identity Verification', () => {
    it('returns health status without requiring authentication', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('drawzware-api');
    });

    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const res = await request(app).get('/api/workspaces');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('identifies authenticated user correctly via /api/me', async () => {
      const res = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${tokenOwner}`);
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(userOwner.id);
      expect(res.body.user.email).toBe(userOwner.email);
    });
  });

  // ===========================================================================
  // 2. Workspace Creation, Listing & Membership
  // ===========================================================================
  describe('2. Workspace Creation, Membership & Roles', () => {
    it('creates workspace and automatically grants owner role to creator', async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Architecture Core' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Architecture Core');
      expect(res.body.ownerId).toBe(userOwner.id);

      // Verify workspace listing returns workspace with role: 'owner'
      const listRes = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].role).toBe('owner');
    });

    it('validates workspace input and rejects empty or invalid name', async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('forbids non-members from viewing workspace details', async () => {
      const createRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Private Workspace' });

      const wsId = createRes.body.id;

      const forbiddenRes = await request(app)
        .get(`/api/workspaces/${wsId}`)
        .set('Authorization', `Bearer ${tokenStranger}`);

      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.body.error).toBe('FORBIDDEN');
    });
  });

  // ===========================================================================
  // 3. Invitations & Acceptance Flow
  // ===========================================================================
  describe('3. Workspace Invitations & Acceptance Flow', () => {
    it('allows workspace owner to invite members with editor or viewer role', async () => {
      const createRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Collaboration Lab' });

      const wsId = createRes.body.id;

      const invRes = await request(app)
        .post(`/api/workspaces/${wsId}/invitations`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ email: userEditor.email, role: 'editor' });

      expect(invRes.status).toBe(201);
      expect(invRes.body.email).toBe(userEditor.email);
      expect(invRes.body.role).toBe('editor');
      expect(invRes.body.status).toBe('pending');
    });

    it('prevents non-owners (e.g. viewers or strangers) from sending invitations', async () => {
      const createRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Restricted Space' });

      const wsId = createRes.body.id;

      // Stranger attempt
      const strangerInv = await request(app)
        .post(`/api/workspaces/${wsId}/invitations`)
        .set('Authorization', `Bearer ${tokenStranger}`)
        .send({ email: 'new@drawzware.com', role: 'editor' });

      expect(strangerInv.status).toBe(403);
    });

    it('allows invited user to accept invitation and join the workspace', async () => {
      const createRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Frontend Team' });

      const wsId = createRes.body.id;

      const invRes = await request(app)
        .post(`/api/workspaces/${wsId}/invitations`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ email: userEditor.email, role: 'editor' });

      const invitationId = invRes.body.id;

      // Accept invitation as userEditor
      const acceptRes = await request(app)
        .post(`/api/invitations/${invitationId}/accept`)
        .set('Authorization', `Bearer ${tokenEditor}`);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.member.role).toBe('editor');
      expect(acceptRes.body.member.userId).toBe(userEditor.id);

      // Verify userEditor can now access workspace
      const wsRes = await request(app)
        .get(`/api/workspaces/${wsId}`)
        .set('Authorization', `Bearer ${tokenEditor}`);

      expect(wsRes.status).toBe(200);
    });

    it('rejects invitation acceptance if email in JWT does not match invited email', async () => {
      const createRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Strict Space' });

      const wsId = createRes.body.id;

      const invRes = await request(app)
        .post(`/api/workspaces/${wsId}/invitations`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ email: userEditor.email, role: 'editor' });

      const invitationId = invRes.body.id;

      // Stranger tries to accept editor's invitation
      const acceptRes = await request(app)
        .post(`/api/invitations/${invitationId}/accept`)
        .set('Authorization', `Bearer ${tokenStranger}`);

      expect(acceptRes.status).toBe(403);
      expect(acceptRes.body.error).toBe('EMAIL_MISMATCH');
    });
  });

  // ===========================================================================
  // 4. Diagram Metadata & Role Permissions
  // ===========================================================================
  describe('4. Diagram Metadata & Role Permissions', () => {
    it('allows editors to create diagram metadata in workspace', async () => {
      // 1. Owner creates workspace
      const createRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Backend Cluster' });
      const wsId = createRes.body.id;

      // 2. Invite userEditor and accept
      const invRes = await request(app)
        .post(`/api/workspaces/${wsId}/invitations`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ email: userEditor.email, role: 'editor' });
      await request(app)
        .post(`/api/invitations/${invRes.body.id}/accept`)
        .set('Authorization', `Bearer ${tokenEditor}`);

      // 3. userEditor creates diagram
      const diagRes = await request(app)
        .post(`/api/workspaces/${wsId}/diagrams`)
        .set('Authorization', `Bearer ${tokenEditor}`)
        .send({ title: 'Microservices Flow', diagramType: 'architecture' });

      expect(diagRes.status).toBe(201);
      expect(diagRes.body.title).toBe('Microservices Flow');
      expect(diagRes.body.diagramType).toBe('architecture');
      expect(diagRes.body.createdBy).toBe(userEditor.id);
    });

    it('strictly forbids viewers from creating diagrams or updating metadata', async () => {
      // 1. Owner creates workspace
      const createRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Viewer Tests' });
      const wsId = createRes.body.id;

      // 2. Invite userViewer as 'viewer' and accept
      const invRes = await request(app)
        .post(`/api/workspaces/${wsId}/invitations`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ email: userViewer.email, role: 'viewer' });
      await request(app)
        .post(`/api/invitations/${invRes.body.id}/accept`)
        .set('Authorization', `Bearer ${tokenViewer}`);

      // 3. Viewer attempts to create diagram -> rejected
      const failCreate = await request(app)
        .post(`/api/workspaces/${wsId}/diagrams`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({ title: 'Viewer Illegal Diagram' });

      expect(failCreate.status).toBe(403);
      expect(failCreate.body.error).toBe('INSUFFICIENT_PERMISSIONS');

      // 4. Owner creates diagram
      const diagRes = await request(app)
        .post(`/api/workspaces/${wsId}/diagrams`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ title: 'System Overview' });
      const diagId = diagRes.body.id;

      // 5. Viewer can read diagram
      const readRes = await request(app)
        .get(`/api/diagrams/${diagId}`)
        .set('Authorization', `Bearer ${tokenViewer}`);
      expect(readRes.status).toBe(200);

      // 6. Viewer attempts to update diagram -> rejected
      const failUpdate = await request(app)
        .patch(`/api/diagrams/${diagId}`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({ title: 'Viewer Modifying Title' });

      expect(failUpdate.status).toBe(403);
      expect(failUpdate.body.error).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  // ===========================================================================
  // 5. Explicit Diagram Import Flow (Without Destructive Replacement)
  // ===========================================================================
  describe('5. Explicit Local Diagram Import Flow', () => {
    it('imports an existing local Drawzware project safely into a workspace', async () => {
      const createRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Cloud Migrations' });
      const wsId = createRes.body.id;

      const localProject = {
        id: 'local-proj-123',
        name: 'Legacy Cloud Architecture',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        diagramType: 'architecture' as const,
        nodes: [
          { id: 'node-1', type: 'systemNode', position: { x: 100, y: 100 }, data: { label: 'API Gateway' } },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };

      const importRes = await request(app)
        .post(`/api/workspaces/${wsId}/diagrams/import`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          title: 'Imported Cloud Architecture',
          project: localProject,
        });

      expect(importRes.status).toBe(201);
      expect(importRes.body.message).toBe('Diagram imported successfully.');
      expect(importRes.body.diagram.title).toBe('Imported Cloud Architecture');
      expect(importRes.body.diagram.workspaceId).toBe(wsId);

      // Verify the initial diagram snapshot is stored and retrievable
      const diagId = importRes.body.diagram.id;
      const getRes = await request(app)
        .get(`/api/diagrams/${diagId}`)
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.snapshot).toBeDefined();
      expect(getRes.body.snapshot.name).toBe(localProject.name);
      expect(getRes.body.snapshot.nodes.length).toBe(1);
    });

    it('rejects invalid local project documents on import', async () => {
      const createRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Validation Lab' });
      const wsId = createRes.body.id;

      const invalidProject = {
        // Missing required fields like id, name, createdAt
        nodes: 'invalid',
      };

      const importRes = await request(app)
        .post(`/api/workspaces/${wsId}/diagrams/import`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          project: invalidProject,
        });

      expect(importRes.status).toBe(400);
      expect(importRes.body.error).toBe('VALIDATION_ERROR');
    });
  });
});
