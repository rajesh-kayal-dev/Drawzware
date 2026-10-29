import { describe, it, expect, vi, beforeAll } from 'vitest';
import crypto from 'node:crypto';
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
import {
  WorkspaceSchema,
  WorkspaceMemberSchema,
  WorkspaceInvitationSchema,
  DiagramMetadataSchema,
  ProjectSchema,
  SaveDiagramSnapshotInputSchema,
  DiagramSnapshotResponseSchema,
  DiagramSnapshotConflictErrorSchema,
  WorkspaceRole,
  Project,
} from '@drawzware/contracts';

export interface AuditScenarioRecord {
  endpoint: string;
  method: string;
  scenario: string;
  requestPayload: unknown;
  expectedStatus: number;
  expectedBehavior: string;
  actualStatus: number;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  contractValidation: {
    contractName: string;
    passed: boolean;
    mismatch: string | null;
  };
  pass: boolean;
}

export const auditRecords: AuditScenarioRecord[] = [];

function redact(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const copy: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const k = key.toLowerCase();
    if (k.includes('token') || k.includes('authorization')) {
      copy[key] = '[REDACTED_JWT_TOKEN]';
    } else if (k.includes('password')) {
      copy[key] = '[REDACTED_PASSWORD]';
    } else if (k.includes('secret')) {
      copy[key] = '[REDACTED_SECRET]';
    } else if (typeof val === 'object' && val !== null) {
      copy[key] = redact(val);
    } else {
      copy[key] = val;
    }
  }
  return copy;
}

describe('Comprehensive Drawzware Real HTTP & Contract Audit Suite', () => {
  const app = createApp();

  const testSecret = 'audit-test-secret-key-32-chars-long!';
  process.env.JWT_SECRET = testSecret;

  // Real UUIDs for strict schema validation
  const ownerUser = { id: crypto.randomUUID(), name: 'Alice Owner', email: 'owner@drawzware.com' };
  const editorUser = { id: crypto.randomUUID(), name: 'Bob Editor', email: 'editor@drawzware.com' };
  const viewerUser = { id: crypto.randomUUID(), name: 'Charlie Viewer', email: 'viewer@drawzware.com' };
  const strangerUser = { id: crypto.randomUUID(), name: 'Eve Stranger', email: 'stranger@drawzware.com' };

  const ownerToken = jwt.sign({ id: ownerUser.id, email: ownerUser.email, isEmailVerified: true }, testSecret, { expiresIn: '1h' });
  const editorToken = jwt.sign({ id: editorUser.id, email: editorUser.email, isEmailVerified: true }, testSecret, { expiresIn: '1h' });
  const viewerToken = jwt.sign({ id: viewerUser.id, email: viewerUser.email, isEmailVerified: true }, testSecret, { expiresIn: '1h' });
  const strangerToken = jwt.sign({ id: strangerUser.id, email: strangerUser.email, isEmailVerified: true }, testSecret, { expiresIn: '1h' });
  const expiredToken = jwt.sign({ id: ownerUser.id, email: ownerUser.email, isEmailVerified: true }, testSecret, { expiresIn: '-1s' });
  const tokenMissingEmail = jwt.sign({ id: editorUser.id, isEmailVerified: true }, testSecret, { expiresIn: '1h' });

  // In-memory backing stores with UUID keys
  const users = new Map<string, any>();
  const workspaces = new Map<string, any>();
  const members = new Map<string, any>();
  const invitations = new Map<string, any>();
  const diagrams = new Map<string, any>();
  const snapshots = new Map<string, any>();

  let sampleWsId: string = crypto.randomUUID();
  let sampleDiagId: string = crypto.randomUUID();
  let sampleInvId: string = crypto.randomUUID();
  let expiredInvId: string = crypto.randomUUID();
  let acceptedInvId: string = crypto.randomUUID();

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('validSecretPass123', 10);
    users.set(ownerUser.email, {
      _id: ownerUser.id,
      name: ownerUser.name,
      email: ownerUser.email,
      password: hashedPassword,
      isEmailVerified: true,
      tokenVersion: 0,
    });
    users.set(editorUser.email, {
      _id: editorUser.id,
      name: editorUser.name,
      email: editorUser.email,
      password: hashedPassword,
      isEmailVerified: true,
      tokenVersion: 0,
    });

    vi.spyOn(sessionRepo, 'createSessionDoc').mockResolvedValue({} as any);
    vi.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue(true);
    vi.spyOn(emailService, 'sendInvitationEmail').mockResolvedValue(true);

    vi.spyOn(userRepo, 'findUserDocById').mockImplementation(async (id: string) => {
      const u = Array.from(users.values()).find((user) => user._id === id);
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
      const _id = crypto.randomUUID();
      const user = { _id, ...data, isEmailVerified: true };
      users.set(data.email.toLowerCase().trim(), user);
      return user;
    });

    // Workspaces
    vi.spyOn(workspaceRepo, 'createWorkspaceDoc').mockImplementation(async (data: any) => {
      const _id = crypto.randomUUID();
      const now = new Date();
      const ws = { _id, name: data.name, ownerId: data.ownerId, createdAt: now, updatedAt: now };
      workspaces.set(_id, ws);
      sampleWsId = _id;
      return ws as any;
    });
    vi.spyOn(workspaceRepo, 'findWorkspaceDocById').mockImplementation(async (id: string) => workspaces.get(id) || null);
    vi.spyOn(workspaceRepo, 'findWorkspaceDocsByIds').mockImplementation(async (ids: string[]) => ids.map((id) => workspaces.get(id)).filter(Boolean));

    // Members
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
      return Array.from(members.values()).filter((m) => m.workspaceId === wsId);
    });
    vi.spyOn(memberRepo, 'findWorkspaceMembershipsForUserDocs').mockImplementation(async (uId: string) => {
      return Array.from(members.values()).filter((m) => m.userId === uId);
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
      return Array.from(members.values()).find((m) => m.workspaceId === wsId && m.userEmail?.toLowerCase() === email.toLowerCase()) || null;
    });

    // Invitations
    vi.spyOn(invitationRepo, 'createInvitationDoc').mockImplementation(async (data: any) => {
      const _id = crypto.randomUUID();
      const now = new Date();
      const inv = {
        _id,
        ...data,
        status: 'pending',
        createdAt: now,
        expiresAt: new Date(Date.now() + 7 * 86400000),
        save: async function () {
          return this;
        },
      };
      invitations.set(_id, inv);
      sampleInvId = _id;
      return inv as any;
    });
    vi.spyOn(invitationRepo, 'findInvitationDocById').mockImplementation(async (id: string) => invitations.get(id) || null);
    vi.spyOn(invitationRepo, 'expirePendingInvitationsDoc').mockImplementation(async (wsId: string, email: string) => {
      for (const inv of invitations.values()) {
        if (inv.workspaceId === wsId && inv.email === email && inv.status === 'pending') {
          inv.status = 'expired';
        }
      }
    });

    // Diagrams
    vi.spyOn(diagramRepo, 'createDiagramDoc').mockImplementation(async (data: any) => {
      const _id = crypto.randomUUID();
      const now = new Date();
      const diag = { _id, ...data, createdAt: now, updatedAt: now };
      diagrams.set(_id, diag);
      sampleDiagId = _id;
      return diag as any;
    });
    vi.spyOn(diagramRepo, 'findDiagramDocById').mockImplementation(async (id: string) => diagrams.get(id) || null);
    vi.spyOn(diagramRepo, 'findDiagramDocsByWorkspace').mockImplementation(async (wsId: string) => {
      return Array.from(diagrams.values()).filter((d) => d.workspaceId === wsId);
    });
    vi.spyOn(diagramRepo, 'updateDiagramDoc').mockImplementation(async (id: string, updates: any) => {
      const existing = diagrams.get(id);
      if (!existing) return null;
      const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
      const updated = { ...existing, ...cleanUpdates, updatedAt: new Date() };
      diagrams.set(id, updated);
      return updated;
    });
    vi.spyOn(diagramRepo, 'createDiagramSnapshotDoc').mockImplementation(async (diagId: string, state: any, version = 1) => {
      const snap = { diagramId: diagId, state, version, createdAt: new Date(), updatedAt: new Date() };
      snapshots.set(diagId, snap);
      return snap as any;
    });
    vi.spyOn(diagramRepo, 'findDiagramSnapshotDoc').mockImplementation(async (diagId: string) => snapshots.get(diagId) || null);
    vi.spyOn(diagramRepo, 'touchDiagramDoc').mockImplementation(async (id: string) => {
      const existing = diagrams.get(id);
      if (!existing) return null;
      existing.updatedAt = new Date();
      return existing;
    });
    vi.spyOn(diagramRepo, 'saveDiagramSnapshotDoc').mockImplementation(
      async (diagId: string, state: any, clientVersion?: number) => {
        const existing = snapshots.get(diagId);
        if (!existing) {
          const snap = { diagramId: diagId, state, version: 1, createdAt: new Date(), updatedAt: new Date() };
          snapshots.set(diagId, snap);
          return { success: true, snapshot: snap as any };
        }
        if (clientVersion !== undefined && clientVersion !== existing.version) {
          return {
            success: false,
            conflict: true,
            currentVersion: existing.version,
            currentSnapshot: existing.state,
          };
        }
        existing.version += 1;
        existing.state = state;
        existing.updatedAt = new Date();
        return { success: true, snapshot: existing as any };
      }
    );
  });

  async function executeCase(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    scenario: string,
    expectedStatus: number,
    expectedBehavior: string,
    options: {
      headers?: Record<string, string>;
      body?: unknown;
      token?: string;
      contractValidator?: (body: any) => { passed: boolean; mismatch: string | null };
      pathParams?: Record<string, string>;
    } = {}
  ) {
    let resolvedPath = endpoint;
    if (options.pathParams) {
      for (const [k, v] of Object.entries(options.pathParams)) {
        resolvedPath = resolvedPath.replace(`:${k}`, v);
      }
    }

    let req = (request(app) as any)[method.toLowerCase()](resolvedPath);

    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        req = req.set(k, v);
      }
    }
    if (options.token) {
      req = req.set('Authorization', `Bearer ${options.token}`);
    }
    if (options.body) {
      req = req.send(options.body);
    }

    const res = await req;

    const respHeaders: Record<string, string> = {
      'content-type': res.headers['content-type'] || 'application/json',
      'content-length': res.headers['content-length'] || '0',
    };

    let validationResult = { contractName: 'None', passed: true, mismatch: null as string | null };
    if (options.contractValidator && res.status === expectedStatus) {
      const v = options.contractValidator(res.body);
      validationResult = {
        contractName: options.contractValidator.name || 'ContractSchema',
        passed: v.passed,
        mismatch: v.mismatch,
      };
    }

    const statusMatches = res.status === expectedStatus;
    const passed = statusMatches && validationResult.passed;

    auditRecords.push({
      endpoint,
      method,
      scenario,
      requestPayload: redact(options.body || null),
      expectedStatus,
      expectedBehavior,
      actualStatus: res.status,
      responseHeaders: respHeaders,
      responseBody: redact(res.body),
      contractValidation: validationResult,
      pass: passed,
    });

    expect(res.status).toBe(expectedStatus);
    if (options.contractValidator && statusMatches) {
      if (!validationResult.passed) {
        console.error('CONTRACT_MISMATCH:', validationResult.mismatch, 'BODY:', res.body);
      }
      expect(validationResult.passed, validationResult.mismatch || undefined).toBe(true);
    }
  }

  // --- 1. HEALTH ENDPOINT ---
  it('GET /api/health - Public health check', async () => {
    await executeCase('/api/health', 'GET', 'Public health check', 200, 'Returns service status and timestamp');
  });

  // --- 2. AUTHENTICATION ENDPOINTS ---
  it('POST /api/auth/register - Validation failure (empty body)', async () => {
    await executeCase(
      '/api/auth/register',
      'POST',
      'Validation failure - empty body',
      400,
      'Rejects empty payload with field errors',
      { body: {} }
    );
  });

  it('POST /api/auth/register - Validation failure (invalid email format)', async () => {
    await executeCase(
      '/api/auth/register',
      'POST',
      'Validation failure - invalid email format',
      400,
      'Rejects invalid email format',
      { body: { name: 'Bob', email: 'not-an-email', password: 'password123' } }
    );
  });

  it('POST /api/auth/register - Validation failure (short password <6)', async () => {
    await executeCase(
      '/api/auth/register',
      'POST',
      'Validation failure - password too short (<6 chars)',
      400,
      'Rejects password shorter than 6 chars',
      { body: { name: 'Bob', email: 'bob.new@drawzware.com', password: '123' } }
    );
  });

  it('POST /api/auth/register - Successful registration', async () => {
    await executeCase(
      '/api/auth/register',
      'POST',
      'Successful new user registration',
      201,
      'Registers user and returns JWT token',
      {
        body: { name: 'New User', email: 'newuser@drawzware.com', password: 'securePassword123' },
        contractValidator: function UserAuthContract(body: any) {
          const valid = typeof body?.token === 'string' && typeof body?.user?.id === 'string' && body?.user?.email === 'newuser@drawzware.com';
          return { passed: valid, mismatch: valid ? null : 'Missing token or user identity fields' };
        },
      }
    );
  });

  it('POST /api/auth/register - Duplicate email conflict', async () => {
    await executeCase(
      '/api/auth/register',
      'POST',
      'Duplicate email registration conflict',
      409,
      'Returns 409 CONFLICT for already registered email',
      { body: { name: 'Alice Owner', email: 'owner@drawzware.com', password: 'password123' } }
    );
  });

  it('POST /api/auth/login - Validation failure (missing fields)', async () => {
    await executeCase(
      '/api/auth/login',
      'POST',
      'Validation failure - missing credentials',
      400,
      'Rejects missing email or password',
      { body: {} }
    );
  });

  it('POST /api/auth/login - Invalid credentials (wrong password)', async () => {
    await executeCase(
      '/api/auth/login',
      'POST',
      'Invalid credentials - incorrect password',
      401,
      'Returns 401 UNAUTHORIZED on bad password',
      { body: { email: 'owner@drawzware.com', password: 'wrongPassword' } }
    );
  });

  it('POST /api/auth/login - Successful login', async () => {
    await executeCase(
      '/api/auth/login',
      'POST',
      'Successful login with valid credentials',
      200,
      'Returns 200 with JWT and user identity',
      {
        body: { email: 'owner@drawzware.com', password: 'validSecretPass123' },
        contractValidator: function LoginContract(body: any) {
          const valid = typeof body?.token === 'string' && body?.user?.email === 'owner@drawzware.com';
          return { passed: valid, mismatch: valid ? null : 'Missing token or user identity' };
        },
      }
    );
  });

  // --- 3. IDENTITY ENDPOINT (/api/me) ---
  it('GET /api/me - Missing token', async () => {
    await executeCase('/api/me', 'GET', 'Unauthenticated request missing token', 401, 'Requires Bearer token');
  });

  it('GET /api/me - Malformed authorization header', async () => {
    await executeCase('/api/me', 'GET', 'Malformed authorization header (no Bearer)', 401, 'Rejects header without Bearer prefix', {
      headers: { authorization: 'Basic 12345' },
    });
  });

  it('GET /api/me - Invalid token signature', async () => {
    await executeCase('/api/me', 'GET', 'Invalid JWT token signature', 401, 'Rejects tampered JWT', {
      headers: { authorization: 'Bearer invalid.jwt.signature' },
    });
  });

  it('GET /api/me - Expired token', async () => {
    await executeCase('/api/me', 'GET', 'Expired JWT token', 401, 'Returns 401 TOKEN_EXPIRED', {
      token: expiredToken,
    });
  });

  it('GET /api/me - Valid authenticated user', async () => {
    await executeCase('/api/me', 'GET', 'Valid authentication returns user identity', 200, 'Returns authenticated user', {
      token: ownerToken,
      contractValidator: function AuthenticatedUserContract(body: any) {
        const valid = body?.user?.id === ownerUser.id && body?.user?.email === ownerUser.email;
        return { passed: valid, mismatch: valid ? null : 'Body does not match AuthenticatedUser' };
      },
    });
  });

  // --- 4. WORKSPACE ENDPOINTS ---
  it('POST /api/workspaces - Unauthenticated', async () => {
    await executeCase('/api/workspaces', 'POST', 'Unauthenticated workspace creation', 401, 'Requires authentication', {
      body: { name: 'Alpha' },
    });
  });

  it('POST /api/workspaces - Validation error (empty name)', async () => {
    await executeCase(
      '/api/workspaces',
      'POST',
      'Validation failure - empty workspace name',
      400,
      'Rejects empty workspace name',
      { token: ownerToken, body: { name: '   ' } }
    );
  });

  it('POST /api/workspaces - Successful workspace creation (owner auto-assigned)', async () => {
    await executeCase(
      '/api/workspaces',
      'POST',
      'Successful workspace creation by authenticated owner',
      201,
      'Creates workspace conforming to WorkspaceSchema',
      {
        token: ownerToken,
        body: { name: 'Engineering Production' },
        contractValidator: function WorkspaceContract(body: any) {
          const parsed = WorkspaceSchema.safeParse(body);
          return { passed: parsed.success, mismatch: parsed.success ? null : JSON.stringify(parsed.error.issues) };
        },
      }
    );
  });

  it('GET /api/workspaces - List workspaces for user', async () => {
    await executeCase('/api/workspaces', 'GET', 'List workspaces for authenticated user', 200, 'Returns list of workspaces with role', {
      token: ownerToken,
      contractValidator: function WorkspaceListContract(body: any) {
        if (!Array.isArray(body) || body.length === 0) return { passed: false, mismatch: 'Expected non-empty array' };
        const item = body[0];
        const parsed = WorkspaceSchema.safeParse(item);
        const hasRole = ['owner', 'editor', 'viewer'].includes(item.role);
        return { passed: parsed.success && hasRole, mismatch: parsed.success ? null : JSON.stringify(parsed.error.issues) };
      },
    });
  });

  it('GET /api/workspaces/:workspaceId - Forbidden for stranger', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId',
      'GET',
      'Forbidden for non-member stranger',
      403,
      'Rejects access for non-member stranger',
      { token: strangerToken, pathParams: { workspaceId: sampleWsId } }
    );
  });

  it('GET /api/workspaces/:workspaceId - Owner access', async () => {
    await executeCase('/api/workspaces/:workspaceId', 'GET', 'Owner retrieves workspace details', 200, 'Returns workspace entity', {
      token: ownerToken,
      pathParams: { workspaceId: sampleWsId },
      contractValidator: function WorkspaceContract(body: any) {
        const parsed = WorkspaceSchema.safeParse(body);
        return { passed: parsed.success, mismatch: parsed.success ? null : JSON.stringify(parsed.error.issues) };
      },
    });
  });

  // --- 5. WORKSPACE MEMBERS ENDPOINT ---
  it('GET /api/workspaces/:workspaceId/members - Stranger blocked', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId/members',
      'GET',
      'List members forbidden for stranger',
      403,
      'Rejects non-members',
      { token: strangerToken, pathParams: { workspaceId: sampleWsId } }
    );
  });

  it('GET /api/workspaces/:workspaceId/members - Owner lists members', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId/members',
      'GET',
      'List members by workspace member',
      200,
      'Returns array matching WorkspaceMemberSchema',
      {
        token: ownerToken,
        pathParams: { workspaceId: sampleWsId },
        contractValidator: function WorkspaceMemberArrayContract(body: any) {
          if (!Array.isArray(body)) return { passed: false, mismatch: 'Expected array' };
          const allPass = body.every((m: any) => WorkspaceMemberSchema.safeParse(m).success);
          return { passed: allPass, mismatch: allPass ? null : 'Member item failed WorkspaceMemberSchema' };
        },
      }
    );
  });

  // --- 6. WORKSPACE INVITATIONS ENDPOINTS ---
  it('POST /api/workspaces/:workspaceId/invitations - Stranger blocked', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId/invitations',
      'POST',
      'Forbidden for non-owner stranger',
      403,
      'Rejects stranger with 403 FORBIDDEN',
      {
        token: strangerToken,
        pathParams: { workspaceId: sampleWsId },
        body: { email: 'invitee@drawzware.com', role: 'editor' },
      }
    );
  });

  it('POST /api/workspaces/:workspaceId/invitations - Viewer role blocked (owner required)', async () => {
    members.set(`${sampleWsId}:${viewerUser.id}`, {
      workspaceId: sampleWsId,
      userId: viewerUser.id,
      role: 'viewer',
      userEmail: viewerUser.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await executeCase(
      '/api/workspaces/:workspaceId/invitations',
      'POST',
      'Forbidden for viewer role (Owner required)',
      403,
      'Rejects viewer with 403 INSUFFICIENT_PERMISSIONS',
      {
        token: viewerToken,
        pathParams: { workspaceId: sampleWsId },
        body: { email: 'invitee@drawzware.com', role: 'editor' },
      }
    );
  });

  it('POST /api/workspaces/:workspaceId/invitations - Editor role blocked (owner required)', async () => {
    members.set(`${sampleWsId}:${editorUser.id}`, {
      workspaceId: sampleWsId,
      userId: editorUser.id,
      role: 'editor',
      userEmail: editorUser.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await executeCase(
      '/api/workspaces/:workspaceId/invitations',
      'POST',
      'Forbidden for editor role (Owner required)',
      403,
      'Rejects editor with 403 INSUFFICIENT_PERMISSIONS',
      {
        token: editorToken,
        pathParams: { workspaceId: sampleWsId },
        body: { email: 'invitee@drawzware.com', role: 'editor' },
      }
    );
  });

  it('POST /api/workspaces/:workspaceId/invitations - Validation error (invalid email)', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId/invitations',
      'POST',
      'Validation failure - invalid email format',
      400,
      'Rejects bad email address',
      {
        token: ownerToken,
        pathParams: { workspaceId: sampleWsId },
        body: { email: 'bad-email-no-at', role: 'editor' },
      }
    );
  });

  it('POST /api/workspaces/:workspaceId/invitations - Owner creates invitation for editor', async () => {
    members.delete(`${sampleWsId}:${editorUser.id}`);
    await executeCase(
      '/api/workspaces/:workspaceId/invitations',
      'POST',
      'Owner creates invitation for editor',
      201,
      'Creates invitation conforming to WorkspaceInvitationSchema',
      {
        token: ownerToken,
        pathParams: { workspaceId: sampleWsId },
        body: { email: editorUser.email, role: 'editor' },
        contractValidator: function WorkspaceInvitationContract(body: any) {
          const parsed = WorkspaceInvitationSchema.safeParse(body);
          return { passed: parsed.success, mismatch: parsed.success ? null : JSON.stringify(parsed.error.issues) };
        },
      }
    );
  });

  it('POST /api/workspaces/:workspaceId/invitations - Owner re-invites same email (expires previous pending)', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId/invitations',
      'POST',
      'Owner re-invites email (expires previous duplicate pending)',
      201,
      'Expires previous invitation and returns fresh invitation',
      {
        token: ownerToken,
        pathParams: { workspaceId: sampleWsId },
        body: { email: editorUser.email, role: 'editor' },
      }
    );
  });

  // --- 7. ACCEPT INVITATION ENDPOINT (/api/invitations/:invitationId/accept) ---
  it('POST /api/invitations/:invitationId/accept - Missing token email claim', async () => {
    await executeCase(
      '/api/invitations/:invitationId/accept',
      'POST',
      'Rejects acceptance when auth token lacks email claim',
      400,
      'Returns 400 MISSING_EMAIL',
      {
        token: tokenMissingEmail,
        pathParams: { invitationId: sampleInvId },
      }
    );
  });

  it('POST /api/invitations/:invitationId/accept - Non-existent invitation', async () => {
    await executeCase(
      '/api/invitations/:invitationId/accept',
      'POST',
      'Rejects non-existent invitation ID',
      404,
      'Returns 404 NOT_FOUND',
      {
        token: editorToken,
        pathParams: { invitationId: crypto.randomUUID() },
      }
    );
  });

  it('POST /api/invitations/:invitationId/accept - Reject email mismatch', async () => {
    await executeCase(
      '/api/invitations/:invitationId/accept',
      'POST',
      'Reject acceptance when token email mismatches invitation recipient',
      403,
      'Returns 403 EMAIL_MISMATCH',
      {
        token: strangerToken,
        pathParams: { invitationId: sampleInvId },
      }
    );
  });

  it('POST /api/invitations/:invitationId/accept - Expired invitation', async () => {
    expiredInvId = crypto.randomUUID();
    invitations.set(expiredInvId, {
      _id: expiredInvId,
      workspaceId: sampleWsId,
      email: editorUser.email,
      role: 'editor',
      invitedBy: ownerUser.id,
      status: 'pending',
      createdAt: new Date(Date.now() - 14 * 86400000),
      expiresAt: new Date(Date.now() - 7 * 86400000),
      save: async function () {
        return this;
      },
    });

    await executeCase(
      '/api/invitations/:invitationId/accept',
      'POST',
      'Rejects expired invitation',
      410,
      'Returns 410 EXPIRED',
      {
        token: editorToken,
        pathParams: { invitationId: expiredInvId },
      }
    );
  });

  it('POST /api/invitations/:invitationId/accept - Successful acceptance by matching user', async () => {
    await executeCase(
      '/api/invitations/:invitationId/accept',
      'POST',
      'Accept invitation by matching recipient user',
      200,
      'Returns success message and WorkspaceMember entity',
      {
        token: editorToken,
        pathParams: { invitationId: sampleInvId },
        contractValidator: function AcceptInvitationMemberContract(body: any) {
          const parsed = WorkspaceMemberSchema.safeParse(body?.member);
          return { passed: parsed.success, mismatch: parsed.success ? null : JSON.stringify(parsed.error.issues) };
        },
      }
    );
    acceptedInvId = sampleInvId;
  });

  it('POST /api/invitations/:invitationId/accept - Already accepted invitation rejected', async () => {
    await executeCase(
      '/api/invitations/:invitationId/accept',
      'POST',
      'Rejects already accepted invitation',
      409,
      'Returns 409 INVALID_STATUS',
      {
        token: editorToken,
        pathParams: { invitationId: acceptedInvId },
      }
    );
  });

  // --- 8. DIAGRAMS ENDPOINTS ---
  it('GET /api/workspaces/:workspaceId/diagrams - Stranger blocked', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId/diagrams',
      'GET',
      'List diagrams forbidden for stranger',
      403,
      'Returns 403 FORBIDDEN',
      {
        token: strangerToken,
        pathParams: { workspaceId: sampleWsId },
      }
    );
  });

  it('GET /api/workspaces/:workspaceId/diagrams - Viewer lists diagrams', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId/diagrams',
      'GET',
      'Viewer member lists diagrams in workspace',
      200,
      'Returns array matching DiagramMetadataSchema',
      {
        token: viewerToken,
        pathParams: { workspaceId: sampleWsId },
        contractValidator: function DiagramMetadataArrayContract(body: any) {
          if (!Array.isArray(body)) return { passed: false, mismatch: 'Expected array' };
          const allPass = body.every((d: any) => DiagramMetadataSchema.safeParse(d).success);
          return { passed: allPass, mismatch: allPass ? null : 'Item failed DiagramMetadataSchema' };
        },
      }
    );
  });

  it('POST /api/workspaces/:workspaceId/diagrams - Viewer role blocked (editor required)', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId/diagrams',
      'POST',
      'Forbidden diagram creation for viewer (Editor required)',
      403,
      'Returns 403 INSUFFICIENT_PERMISSIONS',
      {
        token: viewerToken,
        pathParams: { workspaceId: sampleWsId },
        body: { title: 'Viewer Attempt', diagramType: 'architecture' },
      }
    );
  });

  it('POST /api/workspaces/:workspaceId/diagrams - Validation failure (empty title)', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId/diagrams',
      'POST',
      'Validation failure - empty diagram title',
      400,
      'Rejects empty diagram title',
      {
        token: editorToken,
        pathParams: { workspaceId: sampleWsId },
        body: { title: '   ', diagramType: 'architecture' },
      }
    );
  });

  it('POST /api/workspaces/:workspaceId/diagrams - Editor creates diagram', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId/diagrams',
      'POST',
      'Editor creates new diagram',
      201,
      'Returns 201 Created conforming to DiagramMetadataSchema',
      {
        token: editorToken,
        pathParams: { workspaceId: sampleWsId },
        body: { title: 'Microservices Topology', diagramType: 'architecture' },
        contractValidator: function DiagramMetadataContract(body: any) {
          const parsed = DiagramMetadataSchema.safeParse(body);
          return { passed: parsed.success, mismatch: parsed.success ? null : JSON.stringify(parsed.error.issues) };
        },
      }
    );
  });

  // --- 9. DIAGRAM IMPORT ENDPOINT ---
  const validProjectData: Project = {
    id: crypto.randomUUID(),
    name: 'Imported Cloud Architecture',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    diagramType: 'architecture',
  };

  it('POST /api/workspaces/:workspaceId/diagrams/import - Viewer role blocked (editor required)', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId/diagrams/import',
      'POST',
      'Forbidden diagram import for viewer (Editor required)',
      403,
      'Returns 403 INSUFFICIENT_PERMISSIONS',
      {
        token: viewerToken,
        pathParams: { workspaceId: sampleWsId },
        body: { title: 'Import Test', project: validProjectData },
      }
    );
  });

  it('POST /api/workspaces/:workspaceId/diagrams/import - Validation error (invalid project)', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId/diagrams/import',
      'POST',
      'Validation failure - project missing required nodes/edges',
      400,
      'Rejects malformed project data',
      {
        token: editorToken,
        pathParams: { workspaceId: sampleWsId },
        body: { title: 'Import Test', project: { id: 'not-valid' } },
      }
    );
  });

  it('POST /api/workspaces/:workspaceId/diagrams/import - Editor imports diagram', async () => {
    await executeCase(
      '/api/workspaces/:workspaceId/diagrams/import',
      'POST',
      'Editor successfully imports diagram project',
      201,
      'Creates diagram and snapshot conforming to contracts',
      {
        token: editorToken,
        pathParams: { workspaceId: sampleWsId },
        body: { title: 'Imported Cloud Architecture', project: validProjectData },
        contractValidator: function ImportDiagramContract(body: any) {
          const parsed = DiagramMetadataSchema.safeParse(body?.diagram);
          return { passed: parsed.success, mismatch: parsed.success ? null : JSON.stringify(parsed.error.issues) };
        },
      }
    );
  });

  // --- 10. SINGLE DIAGRAM RETRIEVAL & UPDATE ---
  it('GET /api/diagrams/:diagramId - Stranger blocked', async () => {
    await executeCase(
      '/api/diagrams/:diagramId',
      'GET',
      'Forbidden diagram access for non-member stranger',
      403,
      'Returns 403 FORBIDDEN',
      {
        token: strangerToken,
        pathParams: { diagramId: sampleDiagId },
      }
    );
  });

  it('GET /api/diagrams/:diagramId - Non-existent diagram ID', async () => {
    await executeCase(
      '/api/diagrams/:diagramId',
      'GET',
      'Non-existent diagram ID returns 404',
      404,
      'Returns 404 NOT_FOUND',
      {
        token: ownerToken,
        pathParams: { diagramId: crypto.randomUUID() },
      }
    );
  });

  it('GET /api/diagrams/:diagramId - Viewer retrieves diagram with snapshot', async () => {
    await executeCase(
      '/api/diagrams/:diagramId',
      'GET',
      'Viewer retrieves diagram metadata and project snapshot',
      200,
      'Returns diagram metadata with embedded project snapshot',
      {
        token: viewerToken,
        pathParams: { diagramId: sampleDiagId },
        contractValidator: function DiagramWithSnapshotContract(body: any) {
          const diagParsed = DiagramMetadataSchema.safeParse(body);
          const snapParsed = body.snapshot ? ProjectSchema.safeParse(body.snapshot) : { success: true };
          const ok = diagParsed.success && snapParsed.success;
          return {
            passed: ok,
            mismatch: ok
              ? null
              : `Diag: ${diagParsed.success ? 'OK' : JSON.stringify(diagParsed.error.issues)}, Snap: ${
                  snapParsed.success ? 'OK' : JSON.stringify((snapParsed as any).error.issues)
                }`,
          };
        },
      }
    );
  });

  it('PATCH /api/diagrams/:diagramId - Stranger blocked', async () => {
    await executeCase(
      '/api/diagrams/:diagramId',
      'PATCH',
      'Forbidden update for stranger',
      403,
      'Returns 403 FORBIDDEN',
      {
        token: strangerToken,
        pathParams: { diagramId: sampleDiagId },
        body: { title: 'Hacked Title' },
      }
    );
  });

  it('PATCH /api/diagrams/:diagramId - Viewer blocked (Editor required)', async () => {
    await executeCase(
      '/api/diagrams/:diagramId',
      'PATCH',
      'Forbidden update for viewer member (Editor required)',
      403,
      'Returns 403 INSUFFICIENT_PERMISSIONS',
      {
        token: viewerToken,
        pathParams: { diagramId: sampleDiagId },
        body: { title: 'Viewer Attempt' },
      }
    );
  });

  it('PATCH /api/diagrams/:diagramId - Editor updates diagram title', async () => {
    await executeCase(
      '/api/diagrams/:diagramId',
      'PATCH',
      'Editor successfully updates diagram title',
      200,
      'Returns updated DiagramMetadata',
      {
        token: editorToken,
        pathParams: { diagramId: sampleDiagId },
        body: { title: 'Microservices Topology v2' },
        contractValidator: function UpdateDiagramContract(body: any) {
          const parsed = DiagramMetadataSchema.safeParse(body);
          const titleMatches = body?.title === 'Microservices Topology v2';
          return {
            passed: parsed.success && titleMatches,
            mismatch: !parsed.success ? `DiagramMetadataSchema failed: ${JSON.stringify(parsed.error.issues)}` : (!titleMatches ? `Title was ${body?.title}` : null),
          };
        },
      }
    );
  });

  // --- 11. DIAGRAM CANVAS SNAPSHOT ENDPOINTS ---
  it('GET /api/diagrams/:diagramId/snapshot - Viewer retrieves snapshot', async () => {
    // Prime a snapshot for sampleDiagId
    snapshots.set(sampleDiagId, {
      diagramId: sampleDiagId,
      state: validProjectData,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await executeCase(
      '/api/diagrams/:diagramId/snapshot',
      'GET',
      'Viewer retrieves diagram snapshot metadata',
      200,
      'Returns DiagramSnapshotResponse matching schema',
      {
        token: viewerToken,
        pathParams: { diagramId: sampleDiagId },
        contractValidator: function SnapshotResponseContract(body: any) {
          const parsed = DiagramSnapshotResponseSchema.safeParse(body);
          return { passed: parsed.success, mismatch: parsed.success ? null : JSON.stringify(parsed.error.issues) };
        },
      }
    );
  });

  it('PUT /api/diagrams/:diagramId/snapshot - Viewer blocked (Editor required)', async () => {
    await executeCase(
      '/api/diagrams/:diagramId/snapshot',
      'PUT',
      'Forbidden snapshot save for viewer member (Editor required)',
      403,
      'Returns 403 INSUFFICIENT_PERMISSIONS',
      {
        token: viewerToken,
        pathParams: { diagramId: sampleDiagId },
        body: { project: validProjectData },
      }
    );
  });

  it('PUT /api/diagrams/:diagramId/snapshot - Editor saves cloud snapshot', async () => {
    await executeCase(
      '/api/diagrams/:diagramId/snapshot',
      'PUT',
      'Editor successfully updates cloud canvas snapshot',
      200,
      'Returns updated snapshot matching DiagramSnapshotResponseSchema with version 2',
      {
        token: editorToken,
        pathParams: { diagramId: sampleDiagId },
        body: { project: validProjectData },
        contractValidator: function SaveSnapshotContract(body: any) {
          const parsed = DiagramSnapshotResponseSchema.safeParse(body);
          const verMatches = body?.version === 2;
          return {
            passed: parsed.success && verMatches,
            mismatch: !parsed.success ? `DiagramSnapshotResponseSchema failed: ${JSON.stringify(parsed.error.issues)}` : (!verMatches ? `Version was ${body?.version}` : null),
          };
        },
      }
    );
  });

  it('PUT /api/diagrams/:diagramId/snapshot - Stale clientVersion returns 409 conflict', async () => {
    await executeCase(
      '/api/diagrams/:diagramId/snapshot',
      'PUT',
      'Stale clientVersion rejected with 409 Conflict',
      409,
      'Returns DiagramSnapshotConflictErrorSchema with current server version',
      {
        token: editorToken,
        pathParams: { diagramId: sampleDiagId },
        body: { project: validProjectData, clientVersion: 1 }, // server is currently at version 2
        contractValidator: function ConflictContract(body: any) {
          const parsed = DiagramSnapshotConflictErrorSchema.safeParse(body);
          const verMatches = body?.currentVersion === 2;
          return {
            passed: parsed.success && verMatches,
            mismatch: !parsed.success ? `DiagramSnapshotConflictErrorSchema failed: ${JSON.stringify(parsed.error.issues)}` : (!verMatches ? `CurrentVersion was ${body?.currentVersion}` : null),
          };
        },
      }
    );
  });

  // --- 12. CENTRALIZED 404 ROUTE ---
  it('GET /api/unknown-endpoint - Centralized 404 handler', async () => {
    await executeCase(
      '/api/unrecognized-route-path',
      'GET',
      'Centralized 404 for unrecognized path',
      404,
      'Returns uniform 404 NOT_FOUND JSON'
    );
  });
});
