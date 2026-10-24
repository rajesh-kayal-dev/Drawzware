import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import * as userRepo from '../src/repositories/user.repository.js';
import * as workspaceRepo from '../src/repositories/workspace.repository.js';
import * as memberRepo from '../src/repositories/workspace-member.repository.js';
import * as invitationRepo from '../src/repositories/workspace-invitation.repository.js';
import * as diagramRepo from '../src/repositories/diagram.repository.js';

describe('Apps/API Modular Architecture Tests', () => {
  const app = createApp();

  const user = { id: 'usr-test-1', email: 'test@drawzware.com' };
  const token = jwt.sign({ sub: user.id, email: user.email }, 'test-secret', { expiresIn: '1h' });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Health & Metadata', () => {
    it('GET /api/health returns 200 with service info', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('drawzware-api');
    });

    it('GET /api/unknown-endpoint returns 404 via centralized notFoundHandler', async () => {
      const res = await request(app).get('/api/non-existent-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
      expect(res.body.message).toBe('Requested API endpoint not found.');
    });
  });

  describe('Authentication Middleware', () => {
    it('GET /api/me fails with 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('GET /api/me succeeds with 200 when valid bearer token is provided', async () => {
      const res = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(user.id);
      expect(res.body.user.email).toBe(user.email);
    });
  });

  describe('Authentication Endpoints (Register & Login)', () => {
    it('POST /api/auth/register validates required inputs', async () => {
      const res1 = await request(app).post('/api/auth/register').send({});
      expect(res1.status).toBe(400);
      expect(res1.body.message).toContain('Name is required');

      const res2 = await request(app).post('/api/auth/register').send({ name: 'Alice', email: 'invalid-email' });
      expect(res2.status).toBe(400);
      expect(res2.body.message).toContain('Valid email is required');

      const res3 = await request(app).post('/api/auth/register').send({ name: 'Alice', email: 'alice@example.com', password: '123' });
      expect(res3.status).toBe(400);
      expect(res3.body.message).toContain('at least 6 characters');
    });

    it('POST /api/auth/register successfully creates user and returns token without exposing password', async () => {
      const mockCreatedUser = {
        _id: 'usr-new-123',
        name: 'Alice Designer',
        email: 'alice@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(userRepo, 'findUserDocByEmail').mockResolvedValue(null);
      vi.spyOn(userRepo, 'createUserDoc').mockResolvedValue(mockCreatedUser as any);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Alice Designer', email: 'alice@example.com', password: 'securePassword123' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.user.id).toBe(mockCreatedUser._id);
      expect(res.body.user.name).toBe(mockCreatedUser.name);
      expect(res.body.user.email).toBe(mockCreatedUser.email);
      expect(res.body.user.password).toBeUndefined();
      expect(typeof res.body.token).toBe('string');
      expect(userRepo.createUserDoc).toHaveBeenCalled();
    });

    it('POST /api/auth/register rejects duplicate emails with 409 Conflict', async () => {
      vi.spyOn(userRepo, 'findUserDocByEmail').mockResolvedValue({
        _id: 'usr-existing',
        name: 'Existing User',
        email: 'existing@example.com',
      } as any);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Duplicate User', email: 'existing@example.com', password: 'securePassword123' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CONFLICT');
      expect(res.body.message).toBe('Email already registered.');
    });

    it('POST /api/auth/register safely handles MongoDB E11000 duplicate key race conditions', async () => {
      vi.spyOn(userRepo, 'findUserDocByEmail').mockResolvedValue(null);
      const mongoDupError = new Error('E11000 duplicate key error collection: users index: email_1 dup key: { email: "race@example.com" }');
      (mongoDupError as any).code = 11000;
      vi.spyOn(userRepo, 'createUserDoc').mockRejectedValue(mongoDupError);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Race User', email: 'race@example.com', password: 'securePassword123' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CONFLICT');
      expect(res.body.message).toBe('Email already registered.');
    });

    it('POST /api/auth/login validates input parameters', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('POST /api/auth/login fails with 401 on invalid credentials', async () => {
      vi.spyOn(userRepo, 'findUserDocByEmail').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'wrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('POST /api/auth/login succeeds with valid credentials and issues verifiable JWT', async () => {
      const plainPassword = 'correctPassword123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      vi.spyOn(userRepo, 'findUserDocByEmail').mockResolvedValue({
        _id: 'usr-login-1',
        name: 'Login User',
        email: 'login@drawzware.com',
        password: hashedPassword,
      } as any);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@drawzware.com', password: plainPassword });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.user.id).toBe('usr-login-1');
      expect(res.body.user.password).toBeUndefined();
      expect(typeof res.body.token).toBe('string');

      // Verify the generated token works on protected /api/me
      const meRes = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${res.body.token}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.id).toBe('usr-login-1');
    });

    it('Protected routes reject tokens signed with incorrect secret or expired tokens', async () => {
      const forgedToken = jwt.sign({ id: 'usr-forged', email: 'forged@test.com' }, 'wrong-secret');
      const forgedRes = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${forgedToken}`);
      expect(forgedRes.status).toBe(401);
      expect(forgedRes.body.error).toBe('INVALID_TOKEN');

      const expiredToken = jwt.sign(
        { id: 'usr-expired', email: 'expired@test.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: -10 }
      );
      const expiredRes = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(expiredRes.status).toBe(401);
      expect(expiredRes.body.error).toBe('TOKEN_EXPIRED');
    });
  });

  describe('Layered Repository & Service Execution', () => {
    it('POST /api/workspaces delegates cleanly to repository layer', async () => {
      const now = new Date();
      const mockWorkspace = {
        _id: 'ws-repo-test-1',
        name: 'Repo Layer Test',
        ownerId: user.id,
        createdAt: now,
        updatedAt: now,
      };

      vi.spyOn(workspaceRepo, 'createWorkspaceDoc').mockResolvedValue(mockWorkspace as any);
      vi.spyOn(memberRepo, 'createWorkspaceMemberDoc').mockResolvedValue({
        workspaceId: mockWorkspace._id,
        userId: user.id,
        role: 'owner',
        createdAt: now,
        updatedAt: now,
      } as any);

      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Repo Layer Test' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(mockWorkspace._id);
      expect(res.body.name).toBe('Repo Layer Test');
      expect(workspaceRepo.createWorkspaceDoc).toHaveBeenCalledWith({
        name: 'Repo Layer Test',
        ownerId: user.id,
      });
    });

    it('GET /api/workspaces/:workspaceId/diagrams delegates to diagram repository', async () => {
      const workspaceId = 'ws-diagram-test-1';
      const now = new Date();

      vi.spyOn(memberRepo, 'findWorkspaceMemberDoc').mockResolvedValue({
        workspaceId,
        userId: user.id,
        role: 'viewer',
        createdAt: now,
        updatedAt: now,
      } as any);

      vi.spyOn(diagramRepo, 'findDiagramDocsByWorkspace').mockResolvedValue([
        {
          _id: 'diag-1',
          workspaceId,
          title: 'Architecture Diagram',
          diagramType: 'architecture',
          createdBy: user.id,
          createdAt: now,
          updatedAt: now,
        } as any,
      ]);

      const res = await request(app)
        .get(`/api/workspaces/${workspaceId}/diagrams`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Architecture Diagram');
      expect(diagramRepo.findDiagramDocsByWorkspace).toHaveBeenCalledWith(workspaceId);
    });
  });
});
