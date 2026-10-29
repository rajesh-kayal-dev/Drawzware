import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import * as userRepo from '../src/repositories/user.repository.js';
import * as workspaceRepo from '../src/repositories/workspace.repository.js';
import * as memberRepo from '../src/repositories/workspace-member.repository.js';
import * as invitationRepo from '../src/repositories/workspace-invitation.repository.js';
import * as diagramRepo from '../src/repositories/diagram.repository.js';
import * as sessionRepo from '../src/repositories/session.repository.js';
import { emailService } from '../src/services/email.service.js';
import { WorkspaceRole } from '@drawzware/contracts';

interface AuditResult {
  endpoint: string;
  method: string;
  scenario: string;
  expectedStatus: number;
  actualStatus: number;
  responseBody: unknown;
  pass: boolean;
}

const auditLog: AuditResult[] = [];

function redact(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const copy: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key.toLowerCase().includes('token')) {
      copy[key] = '[REDACTED_JWT_TOKEN]';
    } else if (key.toLowerCase().includes('password')) {
      copy[key] = '[REDACTED_PASSWORD]';
    } else if (key.toLowerCase().includes('secret')) {
      copy[key] = '[REDACTED_SECRET]';
    } else if (typeof val === 'object' && val !== null) {
      copy[key] = redact(val);
    } else {
      copy[key] = val;
    }
  }
  return copy;
}

describe('Comprehensive Drawzware Phase 1 API Audit', () => {
  const app = createApp();

  const ownerUser = { id: 'usr-owner-101', name: 'Alice Owner', email: 'owner@drawzware.com' };
  const editorUser = { id: 'usr-editor-102', name: 'Bob Editor', email: 'editor@drawzware.com' };
  const viewerUser = { id: 'usr-viewer-103', name: 'Charlie Viewer', email: 'viewer@drawzware.com' };
  const strangerUser = { id: 'usr-stranger-104', name: 'Eve Stranger', email: 'stranger@drawzware.com' };

  const ownerToken = jwt.sign({ id: ownerUser.id, email: ownerUser.email, isEmailVerified: true }, process.env.JWT_SECRET || 'test-secret');
  const editorToken = jwt.sign({ id: editorUser.id, email: editorUser.email, isEmailVerified: true }, process.env.JWT_SECRET || 'test-secret');
  const viewerToken = jwt.sign({ id: viewerUser.id, email: viewerUser.email, isEmailVerified: true }, process.env.JWT_SECRET || 'test-secret');
  const strangerToken = jwt.sign({ id: strangerUser.id, email: strangerUser.email, isEmailVerified: true }, process.env.JWT_SECRET || 'test-secret');

  const users = new Map<string, any>();
  const workspaces = new Map<string, any>();
  const members = new Map<string, any>();
  const invitations = new Map<string, any>();
  const diagrams = new Map<string, any>();
  const snapshots = new Map<string, any>();

  let sampleWsId = 'ws-sample-100';
  let sampleDiagId = 'diag-sample-200';
  let sampleInvId = 'inv-sample-300';

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('secretPass123', 10);
    users.set(ownerUser.email, {
      _id: ownerUser.id,
      name: ownerUser.name,
      email: ownerUser.email,
      password: hashedPassword,
      isEmailVerified: true,
      tokenVersion: 0,
    });

    vi.spyOn(sessionRepo, 'createSessionDoc').mockResolvedValue({} as any);
    vi.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue(true);
    vi.spyOn(emailService, 'sendInvitationEmail').mockResolvedValue(true);

    vi.spyOn(userRepo, 'findUserDocById').mockImplementation(async (id: string) => {
      const u = Array.from(users.values()).find(user => user._id === id);
      if (u) return u;
      return { _id: id, isEmailVerified: true, tokenVersion: 0 } as any;
    });

    vi.spyOn(userRepo, 'findUserDocByEmail').mockImplementation(async (email: string, includePassword = false) => {
      const u = users.get(email.toLowerCase().trim());
      if (!u) return null;
      if (includePassword) return u;
      const { password, ...safe } = u;
      return safe;
    });

    vi.spyOn(userRepo, 'createUserDoc').mockImplementation(async (data: any) => {
      const _id = `usr-${Date.now()}`;
      const user = { _id, ...data, isEmailVerified: true };
      users.set(data.email.toLowerCase().trim(), user);
      return user;
    });

    vi.spyOn(workspaceRepo, 'createWorkspaceDoc').mockImplementation(async (data: any) => {
      const _id = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date();
      const ws = { _id, name: data.name, ownerId: data.ownerId, createdAt: now, updatedAt: now };
      workspaces.set(_id, ws);
      sampleWsId = _id;
      return ws as any;
    });

    vi.spyOn(workspaceRepo, 'findWorkspaceDocById').mockImplementation(async (id: string) => workspaces.get(id) || null);
    vi.spyOn(workspaceRepo, 'findWorkspaceDocsByIds').mockImplementation(async (ids: string[]) => ids.map(id => workspaces.get(id)).filter(Boolean));

    vi.spyOn(memberRepo, 'createWorkspaceMemberDoc').mockImplementation(async (data: any) => {
      const key = `${data.workspaceId}:${data.userId}`;
      const now = new Date();
      const m = { ...data, createdAt: now, updatedAt: now };
      members.set(key, m);
      return m as any;
    });

    vi.spyOn(memberRepo, 'findWorkspaceMemberDoc').mockImplementation(async (wsId: string, uId: string) => {
      return members.get(`${wsId}:${uId}`) || null;
    });

    vi.spyOn(memberRepo, 'findWorkspaceMembersDocs').mockImplementation(async (wsId: string) => {
      return Array.from(members.values()).filter(m => m.workspaceId === wsId);
    });

    vi.spyOn(memberRepo, 'findWorkspaceMembershipsForUserDocs').mockImplementation(async (uId: string) => {
      return Array.from(members.values()).filter(m => m.userId === uId);
    });

    vi.spyOn(memberRepo, 'upsertWorkspaceMemberDoc').mockImplementation(async (wsId: string, uId: string, role: WorkspaceRole, userEmail?: string) => {
      const key = `${wsId}:${uId}`;
      const now = new Date();
      const existing = members.get(key);
      const m = { workspaceId: wsId, userId: uId, role, userEmail, createdAt: existing?.createdAt || now, updatedAt: now };
      members.set(key, m);
      return m as any;
    });

    vi.spyOn(memberRepo, 'findWorkspaceMemberByEmailDoc').mockImplementation(async (wsId: string, email: string) => {
      return Array.from(members.values()).find(m => m.workspaceId === wsId && m.userEmail?.toLowerCase() === email.toLowerCase()) || null;
    });

    vi.spyOn(invitationRepo, 'createInvitationDoc').mockImplementation(async (data: any) => {
      const _id = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date();
      const inv = {
        _id,
        ...data,
        status: 'pending',
        createdAt: now,
        expiresAt: new Date(Date.now() + 7 * 86400000),
        save: async function () { return this; }
      };
      invitations.set(_id, inv);
      sampleInvId = _id;
      return inv as any;
    });

    vi.spyOn(invitationRepo, 'findInvitationDocById').mockImplementation(async (id: string) => invitations.get(id) || null);
    vi.spyOn(invitationRepo, 'expirePendingInvitationsDoc').mockImplementation(async () => {});

    vi.spyOn(diagramRepo, 'createDiagramDoc').mockImplementation(async (data: any) => {
      const _id = `diag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date();
      const d = { _id, ...data, createdAt: now, updatedAt: now };
      diagrams.set(_id, d);
      sampleDiagId = _id;
      return d as any;
    });

    vi.spyOn(diagramRepo, 'findDiagramDocById').mockImplementation(async (id: string) => diagrams.get(id) || null);
    vi.spyOn(diagramRepo, 'findDiagramDocsByWorkspace').mockImplementation(async (wsId: string) => {
      return Array.from(diagrams.values()).filter(d => d.workspaceId === wsId);
    });

    vi.spyOn(diagramRepo, 'updateDiagramDoc').mockImplementation(async (id: string, updates: any) => {
      const existing = diagrams.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      diagrams.set(id, updated);
      return updated;
    });

    vi.spyOn(diagramRepo, 'createDiagramSnapshotDoc').mockImplementation(async (diagId: string, state: any, version = 1) => {
      const snap = { diagramId: diagId, state, version, createdAt: new Date(), updatedAt: new Date() };
      snapshots.set(diagId, snap);
      return snap as any;
    });

    vi.spyOn(diagramRepo, 'findDiagramSnapshotDoc').mockImplementation(async (diagId: string) => snapshots.get(diagId) || null);
  });

  async function recordCase(endpoint: string, method: string, scenario: string, expectedStatus: number, fn: () => Promise<any>) {
    const res = await fn();
    const pass = res.status === expectedStatus;
    auditLog.push({
      endpoint,
      method,
      scenario,
      expectedStatus,
      actualStatus: res.status,
      responseBody: redact(res.body),
      pass,
    });
    expect(res.status).toBe(expectedStatus);
  }

  it('GET /api/health - Public health check', async () => {
    await recordCase('/api/health', 'GET', 'Public health check', 200, () =>
      request(app).get('/api/health')
    );
  });

  it('POST /api/auth/register - Validation failure (empty body)', async () => {
    await recordCase('/api/auth/register', 'POST', 'Validation failure - empty body', 400, () =>
      request(app).post('/api/auth/register').send({})
    );
  });

  it('POST /api/auth/register - Validation failure (invalid email)', async () => {
    await recordCase('/api/auth/register', 'POST', 'Validation failure - invalid email format', 400, () =>
      request(app).post('/api/auth/register').send({ name: 'Sam', email: 'bad-email', password: 'password123' })
    );
  });

  it('POST /api/auth/register - Validation failure (short password)', async () => {
    await recordCase('/api/auth/register', 'POST', 'Validation failure - password too short (<6 chars)', 400, () =>
      request(app).post('/api/auth/register').send({ name: 'Sam', email: 'sam@example.com', password: '123' })
    );
  });

  it('POST /api/auth/register - Successful registration', async () => {
    await recordCase('/api/auth/register', 'POST', 'Successful new user registration', 201, () =>
      request(app).post('/api/auth/register').send({ name: 'Sam Developer', email: 'sam@drawzware.com', password: 'securePass123' })
    );
  });

  it('POST /api/auth/register - Duplicate email rejection', async () => {
    await recordCase('/api/auth/register', 'POST', 'Duplicate email registration rejection', 409, () =>
      request(app).post('/api/auth/register').send({ name: 'Duplicate Sam', email: 'sam@drawzware.com', password: 'securePass123' })
    );
  });

  it('POST /api/auth/login - Validation failure', async () => {
    await recordCase('/api/auth/login', 'POST', 'Validation failure - missing fields', 400, () =>
      request(app).post('/api/auth/login').send({})
    );
  });

  it('POST /api/auth/login - Invalid credentials', async () => {
    await recordCase('/api/auth/login', 'POST', 'Invalid credentials - wrong password', 401, () =>
      request(app).post('/api/auth/login').send({ email: ownerUser.email, password: 'wrongPassword' })
    );
  });

  it('POST /api/auth/login - Successful login', async () => {
    await recordCase('/api/auth/login', 'POST', 'Successful login with valid credentials', 200, () =>
      request(app).post('/api/auth/login').send({ email: ownerUser.email, password: 'secretPass123' })
    );
  });

  it('GET /api/me - Missing token', async () => {
    await recordCase('/api/me', 'GET', 'Unauthenticated request missing token', 401, () =>
      request(app).get('/api/me')
    );
  });

  it('GET /api/me - Invalid token', async () => {
    await recordCase('/api/me', 'GET', 'Invalid JWT token signature', 401, () =>
      request(app).get('/api/me').set('Authorization', 'Bearer invalid.forged.token')
    );
  });

  it('GET /api/me - Expired token', async () => {
    const expired = jwt.sign({ id: ownerUser.id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: -10 });
    await recordCase('/api/me', 'GET', 'Expired JWT token', 401, () =>
      request(app).get('/api/me').set('Authorization', `Bearer ${expired}`)
    );
  });

  it('GET /api/me - Valid authentication', async () => {
    await recordCase('/api/me', 'GET', 'Valid authentication returns user identity', 200, () =>
      request(app).get('/api/me').set('Authorization', `Bearer ${ownerToken}`)
    );
  });

  it('POST /api/workspaces - Unauthenticated creation', async () => {
    await recordCase('/api/workspaces', 'POST', 'Unauthenticated workspace creation', 401, () =>
      request(app).post('/api/workspaces').send({ name: 'Test WS' })
    );
  });

  it('POST /api/workspaces - Validation failure', async () => {
    await recordCase('/api/workspaces', 'POST', 'Validation failure - empty workspace name', 400, () =>
      request(app).post('/api/workspaces').set('Authorization', `Bearer ${ownerToken}`).send({ name: '' })
    );
  });

  it('POST /api/workspaces - Successful workspace creation', async () => {
    await recordCase('/api/workspaces', 'POST', 'Successful workspace creation by authenticated user', 201, () =>
      request(app).post('/api/workspaces').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Alpha Studio' })
    );
  });

  it('GET /api/workspaces - List user workspaces', async () => {
    await recordCase('/api/workspaces', 'GET', 'List workspaces for user', 200, () =>
      request(app).get('/api/workspaces').set('Authorization', `Bearer ${ownerToken}`)
    );
  });

  it('GET /api/workspaces/:workspaceId - Owner access (Viewer+)', async () => {
    await recordCase('/api/workspaces/:workspaceId', 'GET', 'Get workspace by owner (Viewer+)', 200, () =>
      request(app).get(`/api/workspaces/${sampleWsId}`).set('Authorization', `Bearer ${ownerToken}`)
    );
  });

  it('GET /api/workspaces/:workspaceId - Forbidden for stranger', async () => {
    await recordCase('/api/workspaces/:workspaceId', 'GET', 'Forbidden for stranger non-member', 403, () =>
      request(app).get(`/api/workspaces/${sampleWsId}`).set('Authorization', `Bearer ${strangerToken}`)
    );
  });

  it('GET /api/workspaces/:workspaceId/members - Member lists members', async () => {
    await recordCase('/api/workspaces/:workspaceId/members', 'GET', 'List members by workspace member', 200, () =>
      request(app).get(`/api/workspaces/${sampleWsId}/members`).set('Authorization', `Bearer ${ownerToken}`)
    );
  });

  it('GET /api/workspaces/:workspaceId/members - Forbidden for stranger', async () => {
    await recordCase('/api/workspaces/:workspaceId/members', 'GET', 'List members forbidden for stranger', 403, () =>
      request(app).get(`/api/workspaces/${sampleWsId}/members`).set('Authorization', `Bearer ${strangerToken}`)
    );
  });

  it('POST /api/workspaces/:workspaceId/invitations - Forbidden for stranger', async () => {
    await recordCase('/api/workspaces/:workspaceId/invitations', 'POST', 'Forbidden for non-owner stranger', 403, () =>
      request(app).post(`/api/workspaces/${sampleWsId}/invitations`).set('Authorization', `Bearer ${strangerToken}`).send({ email: 'bob@drawzware.com', role: 'editor' })
    );
  });

  it('POST /api/workspaces/:workspaceId/invitations - Validation failure', async () => {
    await recordCase('/api/workspaces/:workspaceId/invitations', 'POST', 'Validation failure - invalid email', 400, () =>
      request(app).post(`/api/workspaces/${sampleWsId}/invitations`).set('Authorization', `Bearer ${ownerToken}`).send({ email: 'bad-email', role: 'editor' })
    );
  });

  it('POST /api/workspaces/:workspaceId/invitations - Owner creates invitation', async () => {
    await recordCase('/api/workspaces/:workspaceId/invitations', 'POST', 'Owner creates invitation for editor', 201, () =>
      request(app).post(`/api/workspaces/${sampleWsId}/invitations`).set('Authorization', `Bearer ${ownerToken}`).send({ email: editorUser.email, role: 'editor' })
    );
  });

  it('POST /api/invitations/:invitationId/accept - Reject email mismatch', async () => {
    await recordCase('/api/invitations/:invitationId/accept', 'POST', 'Reject acceptance when token email mismatches invitation', 403, () =>
      request(app).post(`/api/invitations/${sampleInvId}/accept`).set('Authorization', `Bearer ${strangerToken}`)
    );
  });

  it('POST /api/invitations/:invitationId/accept - Accept invitation', async () => {
    await recordCase('/api/invitations/:invitationId/accept', 'POST', 'Accept invitation by matching user', 200, () =>
      request(app).post(`/api/invitations/${sampleInvId}/accept`).set('Authorization', `Bearer ${editorToken}`)
    );
  });

  it('GET /api/workspaces/:workspaceId/diagrams - Viewer lists diagrams', async () => {
    await memberRepo.createWorkspaceMemberDoc({ workspaceId: sampleWsId, userId: viewerUser.id, role: 'viewer', userEmail: viewerUser.email });

    await recordCase('/api/workspaces/:workspaceId/diagrams', 'GET', 'List diagrams for viewer member', 200, () =>
      request(app).get(`/api/workspaces/${sampleWsId}/diagrams`).set('Authorization', `Bearer ${viewerToken}`)
    );
  });

  it('GET /api/workspaces/:workspaceId/diagrams - Forbidden for stranger', async () => {
    await recordCase('/api/workspaces/:workspaceId/diagrams', 'GET', 'List diagrams forbidden for stranger', 403, () =>
      request(app).get(`/api/workspaces/${sampleWsId}/diagrams`).set('Authorization', `Bearer ${strangerToken}`)
    );
  });

  it('POST /api/workspaces/:workspaceId/diagrams - Forbidden for viewer', async () => {
    await recordCase('/api/workspaces/:workspaceId/diagrams', 'POST', 'Forbidden for viewer member (Editor required)', 403, () =>
      request(app).post(`/api/workspaces/${sampleWsId}/diagrams`).set('Authorization', `Bearer ${viewerToken}`).send({ title: 'Illegal Diagram' })
    );
  });

  it('POST /api/workspaces/:workspaceId/diagrams - Validation failure', async () => {
    await recordCase('/api/workspaces/:workspaceId/diagrams', 'POST', 'Validation failure - empty diagram title', 400, () =>
      request(app).post(`/api/workspaces/${sampleWsId}/diagrams`).set('Authorization', `Bearer ${editorToken}`).send({ title: '' })
    );
  });

  it('POST /api/workspaces/:workspaceId/diagrams - Successful diagram creation by editor', async () => {
    await recordCase('/api/workspaces/:workspaceId/diagrams', 'POST', 'Successful diagram creation by editor', 201, () =>
      request(app).post(`/api/workspaces/${sampleWsId}/diagrams`).set('Authorization', `Bearer ${editorToken}`).send({ title: 'System Architecture', diagramType: 'architecture' })
    );
  });

  it('POST /api/workspaces/:workspaceId/diagrams/import - Forbidden for viewer', async () => {
    const sampleProject = {
      id: 'proj-sample-1',
      name: 'Imported Cloud Arch',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      diagramType: 'architecture' as const,
    };

    await recordCase('/api/workspaces/:workspaceId/diagrams/import', 'POST', 'Forbidden import for viewer member', 403, () =>
      request(app).post(`/api/workspaces/${sampleWsId}/diagrams/import`).set('Authorization', `Bearer ${viewerToken}`).send({ project: sampleProject })
    );
  });

  it('POST /api/workspaces/:workspaceId/diagrams/import - Successful import by editor', async () => {
    const sampleProject = {
      id: 'proj-sample-1',
      name: 'Imported Cloud Arch',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      diagramType: 'architecture' as const,
    };

    await recordCase('/api/workspaces/:workspaceId/diagrams/import', 'POST', 'Successful import by editor', 201, () =>
      request(app).post(`/api/workspaces/${sampleWsId}/diagrams/import`).set('Authorization', `Bearer ${editorToken}`).send({ project: sampleProject, title: 'Imported Cloud Arch' })
    );
  });

  it('GET /api/diagrams/:diagramId - Viewer member retrieves diagram with snapshot', async () => {
    await recordCase('/api/diagrams/:diagramId', 'GET', 'Viewer member retrieves diagram with snapshot', 200, () =>
      request(app).get(`/api/diagrams/${sampleDiagId}`).set('Authorization', `Bearer ${viewerToken}`)
    );
  });

  it('GET /api/diagrams/:diagramId - Forbidden for stranger', async () => {
    await recordCase('/api/diagrams/:diagramId', 'GET', 'Forbidden for non-member stranger', 403, () =>
      request(app).get(`/api/diagrams/${sampleDiagId}`).set('Authorization', `Bearer ${strangerToken}`)
    );
  });

  it('GET /api/diagrams/:diagramId - 404 for non-existent diagram', async () => {
    await recordCase('/api/diagrams/:diagramId', 'GET', '404 for non-existent diagram ID', 404, () =>
      request(app).get('/api/diagrams/non-existent-diag-id').set('Authorization', `Bearer ${ownerToken}`)
    );
  });

  it('PATCH /api/diagrams/:diagramId - Forbidden for viewer', async () => {
    await recordCase('/api/diagrams/:diagramId', 'PATCH', 'Forbidden for viewer member (Editor required)', 403, () =>
      request(app).patch(`/api/diagrams/${sampleDiagId}`).set('Authorization', `Bearer ${viewerToken}`).send({ title: 'Viewer Attempt' })
    );
  });

  it('PATCH /api/diagrams/:diagramId - Forbidden for stranger', async () => {
    await recordCase('/api/diagrams/:diagramId', 'PATCH', 'Forbidden for stranger', 403, () =>
      request(app).patch(`/api/diagrams/${sampleDiagId}`).set('Authorization', `Bearer ${strangerToken}`).send({ title: 'Stranger Attempt' })
    );
  });

  it('PATCH /api/diagrams/:diagramId - Successful update by editor', async () => {
    await recordCase('/api/diagrams/:diagramId', 'PATCH', 'Successful update by editor', 200, () =>
      request(app).patch(`/api/diagrams/${sampleDiagId}`).set('Authorization', `Bearer ${editorToken}`).send({ title: 'System Architecture v2' })
    );
  });

  it('GET /api/unknown-endpoint - Centralized 404', async () => {
    await recordCase('/api/unknown-endpoint', 'GET', 'Centralized 404 for unrecognized path', 404, () =>
      request(app).get('/api/unknown-endpoint')
    );
  });

  it('DUMP AUDIT LOG AS JSON ARTIFACT', () => {
    expect(auditLog.length).toBeGreaterThan(35);
  });
});
