import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import * as diagramRepo from '../src/repositories/diagram.repository.js';
import * as memberRepo from '../src/repositories/workspace-member.repository.js';
import {
  DiagramSnapshotResponseSchema,
  DiagramSnapshotConflictErrorSchema,
} from '@drawzware/contracts';

describe('Diagram Canvas Snapshot API & Version Concurrency', () => {
  const app = createApp();

  const userOwner = { id: 'usr-owner-1', email: 'owner@drawzware.com' };
  const userEditor = { id: 'usr-editor-2', email: 'editor@drawzware.com' };
  const userViewer = { id: 'usr-viewer-3', email: 'viewer@drawzware.com' };
  const userStranger = { id: 'usr-stranger-4', email: 'stranger@drawzware.com' };

  const tokenOwner = jwt.sign({ sub: userOwner.id, email: userOwner.email }, 'test-secret', { expiresIn: '1h' });
  const tokenEditor = jwt.sign({ sub: userEditor.id, email: userEditor.email }, 'test-secret', { expiresIn: '1h' });
  const tokenViewer = jwt.sign({ sub: userViewer.id, email: userViewer.email }, 'test-secret', { expiresIn: '1h' });
  const tokenStranger = jwt.sign({ sub: userStranger.id, email: userStranger.email }, 'test-secret', { expiresIn: '1h' });

  const sampleWorkspaceId = 'ws-test-alpha';
  const sampleDiagramId = 'diag-test-001';

  const sampleDiagram = {
    _id: sampleDiagramId,
    workspaceId: sampleWorkspaceId,
    title: 'Cloud Microservices Architecture',
    diagramType: 'architecture',
    createdBy: userOwner.id,
    createdAt: new Date('2026-10-25T00:00:00.000Z'),
    updatedAt: new Date('2026-10-25T00:00:00.000Z'),
  };

  const sampleProject = {
    id: 'proj-cloud-001',
    name: 'Cloud Microservices Architecture',
    createdAt: '2026-10-25T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z',
    nodes: [
      {
        id: 'node-1',
        type: 'custom',
        position: { x: 100, y: 150 },
        data: { label: 'API Gateway', variant: 'service' },
      },
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };

  // In-memory snapshot state for testing
  let currentSnapshotDoc: any = null;

  beforeEach(() => {
    vi.restoreAllMocks();
    currentSnapshotDoc = null;

    // Mock diagram repo find
    vi.spyOn(diagramRepo, 'findDiagramDocById').mockImplementation(async (id: string) => {
      if (id === sampleDiagramId) return sampleDiagram as any;
      return null;
    });

    // Mock workspace member lookups
    vi.spyOn(memberRepo, 'findWorkspaceMemberDoc').mockImplementation(async (workspaceId: string, userId: string) => {
      if (workspaceId !== sampleWorkspaceId) return null;
      if (userId === userOwner.id) {
        return { workspaceId, userId, role: 'owner', createdAt: new Date() } as any;
      }
      if (userId === userEditor.id) {
        return { workspaceId, userId, role: 'editor', createdAt: new Date() } as any;
      }
      if (userId === userViewer.id) {
        return { workspaceId, userId, role: 'viewer', createdAt: new Date() } as any;
      }
      return null;
    });

    // Mock snapshot repo operations
    vi.spyOn(diagramRepo, 'findDiagramSnapshotDoc').mockImplementation(async (diagId: string) => {
      if (diagId === sampleDiagramId && currentSnapshotDoc) {
        return currentSnapshotDoc;
      }
      return null;
    });

    vi.spyOn(diagramRepo, 'touchDiagramDoc').mockImplementation(async (id: string) => {
      if (id === sampleDiagramId) {
        sampleDiagram.updatedAt = new Date();
        return sampleDiagram as any;
      }
      return null;
    });

    vi.spyOn(diagramRepo, 'saveDiagramSnapshotDoc').mockImplementation(
      async (diagId: string, state: any, clientVersion?: number) => {
        if (!currentSnapshotDoc) {
          currentSnapshotDoc = {
            diagramId: diagId,
            state,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          return { success: true, snapshot: currentSnapshotDoc };
        }

        if (clientVersion !== undefined && clientVersion !== currentSnapshotDoc.version) {
          return {
            success: false,
            conflict: true,
            currentVersion: currentSnapshotDoc.version,
            currentSnapshot: currentSnapshotDoc.state,
          };
        }

        currentSnapshotDoc.version += 1;
        currentSnapshotDoc.state = state;
        currentSnapshotDoc.updatedAt = new Date();
        return { success: true, snapshot: currentSnapshotDoc };
      }
    );
  });

  describe('GET /api/diagrams/:diagramId/snapshot', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get(`/api/diagrams/${sampleDiagramId}/snapshot`);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('returns 403 when user is not a member of the workspace (stranger)', async () => {
      const res = await request(app)
        .get(`/api/diagrams/${sampleDiagramId}/snapshot`)
        .set('Authorization', `Bearer ${tokenStranger}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('returns 404 when diagram does not exist', async () => {
      const res = await request(app)
        .get('/api/diagrams/non-existent-diag/snapshot')
        .set('Authorization', `Bearer ${tokenEditor}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('returns 404 when diagram exists but has no snapshot stored yet', async () => {
      const res = await request(app)
        .get(`/api/diagrams/${sampleDiagramId}/snapshot`)
        .set('Authorization', `Bearer ${tokenViewer}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toContain('No snapshot found');
    });

    it('viewer can successfully retrieve snapshot once created', async () => {
      // Prime the snapshot
      currentSnapshotDoc = {
        diagramId: sampleDiagramId,
        state: sampleProject,
        version: 1,
        createdAt: new Date('2026-10-25T00:00:00.000Z'),
        updatedAt: new Date('2026-10-25T00:00:00.000Z'),
      };

      const res = await request(app)
        .get(`/api/diagrams/${sampleDiagramId}/snapshot`)
        .set('Authorization', `Bearer ${tokenViewer}`);

      expect(res.status).toBe(200);
      const parsed = DiagramSnapshotResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.diagramId).toBe(sampleDiagramId);
      expect(res.body.version).toBe(1);
      expect(res.body.state.name).toBe(sampleProject.name);
    });
  });

  describe('PUT /api/diagrams/:diagramId/snapshot', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .put(`/api/diagrams/${sampleDiagramId}/snapshot`)
        .send({ project: sampleProject });
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not in workspace', async () => {
      const res = await request(app)
        .put(`/api/diagrams/${sampleDiagramId}/snapshot`)
        .set('Authorization', `Bearer ${tokenStranger}`)
        .send({ project: sampleProject });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('returns 403 INSUFFICIENT_PERMISSIONS when user has viewer role', async () => {
      const res = await request(app)
        .put(`/api/diagrams/${sampleDiagramId}/snapshot`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({ project: sampleProject });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('INSUFFICIENT_PERMISSIONS');
      expect(res.body.message).toContain('viewer');
    });

    it('returns 404 when diagram does not exist', async () => {
      const res = await request(app)
        .put('/api/diagrams/non-existent-diag/snapshot')
        .set('Authorization', `Bearer ${tokenEditor}`)
        .send({ project: sampleProject });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('returns 400 validation error when body is missing both project and state', async () => {
      const res = await request(app)
        .put(`/api/diagrams/${sampleDiagramId}/snapshot`)
        .set('Authorization', `Bearer ${tokenEditor}`)
        .send({ clientVersion: 1 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('editor saves initial snapshot (version 1) without clientVersion', async () => {
      const res = await request(app)
        .put(`/api/diagrams/${sampleDiagramId}/snapshot`)
        .set('Authorization', `Bearer ${tokenEditor}`)
        .send({ project: sampleProject });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('saved successfully');
      expect(res.body.version).toBe(1);
      expect(res.body.diagramId).toBe(sampleDiagramId);
      expect(currentSnapshotDoc.version).toBe(1);
    });

    it('editor updates snapshot without clientVersion, incrementing version to 2', async () => {
      currentSnapshotDoc = {
        diagramId: sampleDiagramId,
        state: sampleProject,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedProject = {
        ...sampleProject,
        name: 'Updated Architecture v2',
      };

      const res = await request(app)
        .put(`/api/diagrams/${sampleDiagramId}/snapshot`)
        .set('Authorization', `Bearer ${tokenEditor}`)
        .send({ project: updatedProject });

      expect(res.status).toBe(200);
      expect(res.body.version).toBe(2);
      expect(currentSnapshotDoc.version).toBe(2);
      expect(currentSnapshotDoc.state.name).toBe('Updated Architecture v2');
    });

    it('editor updates snapshot with matching clientVersion (increments version to 3)', async () => {
      currentSnapshotDoc = {
        diagramId: sampleDiagramId,
        state: sampleProject,
        version: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const res = await request(app)
        .put(`/api/diagrams/${sampleDiagramId}/snapshot`)
        .set('Authorization', `Bearer ${tokenEditor}`)
        .send({ project: sampleProject, clientVersion: 2 });

      expect(res.status).toBe(200);
      expect(res.body.version).toBe(3);
      expect(currentSnapshotDoc.version).toBe(3);
    });

    it('rejects stale clientVersion with 409 VERSION_CONFLICT and returns current server snapshot', async () => {
      currentSnapshotDoc = {
        diagramId: sampleDiagramId,
        state: { ...sampleProject, name: 'Server Authoritative State' },
        version: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Client sends update based on stale version 1
      const res = await request(app)
        .put(`/api/diagrams/${sampleDiagramId}/snapshot`)
        .set('Authorization', `Bearer ${tokenEditor}`)
        .send({
          project: { ...sampleProject, name: 'Stale Client State' },
          clientVersion: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('VERSION_CONFLICT');
      expect(res.body.currentVersion).toBe(3);
      expect(res.body.currentSnapshot.name).toBe('Server Authoritative State');

      const conflictCheck = DiagramSnapshotConflictErrorSchema.safeParse(res.body);
      expect(conflictCheck.success).toBe(true);

      // Verify that server snapshot was NOT overwritten
      expect(currentSnapshotDoc.version).toBe(3);
      expect(currentSnapshotDoc.state.name).toBe('Server Authoritative State');
    });

    it('owner can save snapshot with state payload alias', async () => {
      const res = await request(app)
        .put(`/api/diagrams/${sampleDiagramId}/snapshot`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ state: sampleProject });

      expect(res.status).toBe(200);
      expect(res.body.version).toBe(1);
    });

    it('supports workspace-scoped route alias /api/workspaces/:workspaceId/diagrams/:diagramId/snapshot', async () => {
      const res = await request(app)
        .put(`/api/workspaces/${sampleWorkspaceId}/diagrams/${sampleDiagramId}/snapshot`)
        .set('Authorization', `Bearer ${tokenEditor}`)
        .send({ project: sampleProject });

      expect(res.status).toBe(200);
      expect(res.body.diagramId).toBe(sampleDiagramId);
    });
  });
});
