import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../apps/api/src/app';
import { WorkspaceModel } from '../apps/api/src/models/workspace.model';
import { WorkspaceMemberModel } from '../apps/api/src/models/workspace-member.model';
import { WorkspaceInvitationModel } from '../apps/api/src/models/workspace-invitation.model';
import { DiagramModel } from '../apps/api/src/models/diagram.model';
import { DiagramSnapshotModel } from '../apps/api/src/models/diagram-snapshot.model';

describe('Drawzware API (Refactored Mongoose + Express Architecture)', () => {
  let app: any;

  // In-memory collections for mocking Mongoose operations
  const workspaces = new Map<string, any>();
  const members = new Map<string, any>();
  const invitations = new Map<string, any>();
  const diagrams = new Map<string, any>();
  const snapshots = new Map<string, any>();

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
    workspaces.clear();
    members.clear();
    invitations.clear();
    diagrams.clear();
    snapshots.clear();

    // 1. Mock WorkspaceModel
    vi.spyOn(WorkspaceModel, 'create').mockImplementation(async (data: any) => {
      const _id = data._id || `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();
      const doc = {
        _id,
        name: data.name,
        ownerId: data.ownerId,
        createdAt: now,
        updatedAt: now,
      };
      workspaces.set(_id, doc);
      return doc as any;
    });

    vi.spyOn(WorkspaceModel, 'findById').mockImplementation((async (id: string) => {
      return workspaces.get(id) || null;
    }) as any);

    vi.spyOn(WorkspaceModel, 'find').mockImplementation(((filter?: any) => {
      let list = Array.from(workspaces.values());
      if (filter?._id?.$in) {
        const set = new Set(filter._id.$in);
        list = list.filter((w) => set.has(w._id));
      }
      return {
        sort: (_s: any) => Promise.resolve(list),
      } as any;
    }) as any);

    // 2. Mock WorkspaceMemberModel
    vi.spyOn(WorkspaceMemberModel, 'create').mockImplementation(async (data: any) => {
      const now = new Date();
      const doc = {
        workspaceId: data.workspaceId,
        userId: data.userId,
        role: data.role,
        userEmail: data.userEmail,
        createdAt: now,
        updatedAt: now,
      };
      const key = `${data.workspaceId}:${data.userId}`;
      members.set(key, doc);
      return doc as any;
    });

    vi.spyOn(WorkspaceMemberModel, 'findOne').mockImplementation((async (filter: any) => {
      const key = `${filter.workspaceId}:${filter.userId}`;
      return members.get(key) || null;
    }) as any);

    vi.spyOn(WorkspaceMemberModel, 'find').mockImplementation(((filter: any) => {
      const list = Array.from(members.values()).filter((m) => {
        if (filter.workspaceId && m.workspaceId !== filter.workspaceId) return false;
        if (filter.userId && m.userId !== filter.userId) return false;
        return true;
      });
      const promise: any = Promise.resolve(list);
      promise.sort = (_s: any) => Promise.resolve(list);
      return promise;
    }) as any);

    vi.spyOn(WorkspaceMemberModel, 'findOneAndUpdate').mockImplementation((async (filter: any, update: any) => {
      const key = `${filter.workspaceId}:${filter.userId}`;
      const now = new Date();
      const existing = members.get(key);
      const doc = {
        workspaceId: filter.workspaceId,
        userId: filter.userId,
        role: update.$set?.role || existing?.role || 'editor',
        userEmail: update.$set?.userEmail || existing?.userEmail,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      members.set(key, doc);
      return doc as any;
    }) as any);

    // 3. Mock WorkspaceInvitationModel
    vi.spyOn(WorkspaceInvitationModel, 'create').mockImplementation(async (data: any) => {
      const _id = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();
      const doc: any = {
        _id,
        workspaceId: data.workspaceId,
        email: data.email,
        role: data.role,
        invitedBy: data.invitedBy,
        status: data.status || 'pending',
        expiresAt: new Date(Date.now() + 7 * 86400000),
        createdAt: now,
        updatedAt: now,
      };
      doc.save = async function () {
        invitations.set(_id, this);
        return this;
      };
      invitations.set(_id, doc);
      return doc as any;
    });

    vi.spyOn(WorkspaceInvitationModel, 'findById').mockImplementation((async (id: string) => {
      return invitations.get(id) || null;
    }) as any);

    vi.spyOn(WorkspaceInvitationModel, 'updateMany').mockImplementation((async (filter: any, update: any) => {
      for (const [id, inv] of invitations.entries()) {
        if (
          inv.workspaceId === filter.workspaceId &&
          inv.email === filter.email &&
          inv.status === filter.status
        ) {
          inv.status = update.$set?.status || inv.status;
          invitations.set(id, inv);
        }
      }
      return { modifiedCount: 1 } as any;
    }) as any);

    // 4. Mock DiagramModel
    vi.spyOn(DiagramModel, 'create').mockImplementation(async (data: any) => {
      const _id = `diag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();
      const doc = {
        _id,
        workspaceId: data.workspaceId,
        title: data.title,
        diagramType: data.diagramType,
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now,
      };
      diagrams.set(_id, doc);
      return doc as any;
    });

    vi.spyOn(DiagramModel, 'findById').mockImplementation((async (id: string) => {
      return diagrams.get(id) || null;
    }) as any);

    vi.spyOn(DiagramModel, 'find').mockImplementation(((filter: any) => {
      const list = Array.from(diagrams.values()).filter((d) => d.workspaceId === filter.workspaceId);
      return {
        sort: (_s: any) => Promise.resolve(list),
      } as any;
    }) as any);

    vi.spyOn(DiagramModel, 'findByIdAndUpdate').mockImplementation((async (id: string, update: any) => {
      const doc = diagrams.get(id);
      if (!doc) return null;
      if (update.$set?.title !== undefined) doc.title = update.$set.title;
      if (update.$set?.diagramType !== undefined) doc.diagramType = update.$set.diagramType;
      doc.updatedAt = new Date();
      diagrams.set(id, doc);
      return doc as any;
    }) as any);

    // 5. Mock DiagramSnapshotModel
    vi.spyOn(DiagramSnapshotModel, 'create').mockImplementation(async (data: any) => {
      const now = new Date();
      const doc = {
        diagramId: data.diagramId,
        state: data.state,
        version: data.version || 1,
        createdAt: now,
        updatedAt: now,
      };
      snapshots.set(data.diagramId, doc);
      return doc as any;
    });

    vi.spyOn(DiagramSnapshotModel, 'findOne').mockImplementation((async (filter: any) => {
      return snapshots.get(filter.diagramId) || null;
    }) as any);

    app = createApp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

      const acceptRes = await request(app)
        .post(`/api/invitations/${invitationId}/accept`)
        .set('Authorization', `Bearer ${tokenEditor}`);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.member.role).toBe('editor');
      expect(acceptRes.body.member.userId).toBe(userEditor.id);

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
      const createRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Backend Cluster' });
      const wsId = createRes.body.id;

      const invRes = await request(app)
        .post(`/api/workspaces/${wsId}/invitations`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ email: userEditor.email, role: 'editor' });
      await request(app)
        .post(`/api/invitations/${invRes.body.id}/accept`)
        .set('Authorization', `Bearer ${tokenEditor}`);

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
      const createRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Viewer Tests' });
      const wsId = createRes.body.id;

      const invRes = await request(app)
        .post(`/api/workspaces/${wsId}/invitations`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ email: userViewer.email, role: 'viewer' });
      await request(app)
        .post(`/api/invitations/${invRes.body.id}/accept`)
        .set('Authorization', `Bearer ${tokenViewer}`);

      const failCreate = await request(app)
        .post(`/api/workspaces/${wsId}/diagrams`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({ title: 'Viewer Illegal Diagram' });

      expect(failCreate.status).toBe(403);
      expect(failCreate.body.error).toBe('INSUFFICIENT_PERMISSIONS');

      const diagRes = await request(app)
        .post(`/api/workspaces/${wsId}/diagrams`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ title: 'System Overview' });
      const diagId = diagRes.body.id;

      const readRes = await request(app)
        .get(`/api/diagrams/${diagId}`)
        .set('Authorization', `Bearer ${tokenViewer}`);
      expect(readRes.status).toBe(200);

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
