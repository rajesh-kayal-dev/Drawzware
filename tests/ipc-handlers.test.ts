import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { WebFrameMain } from 'electron';
import {
  isTrustedSender,
  handleListProjects,
  handleReadProject,
  handleSaveProject,
  handleDeleteProject,
} from '../electron/ipc/library-handlers';
import { StorageService } from '../electron/services/storage.service';
import { sampleArchitectureProject } from './fixtures/projects';

describe('Main-Process IPC Handlers & Origin Security', () => {
  let tempDir: string;
  let storage: StorageService;

  const trustedFrame = {
    url: 'app://drawzware/app.html',
  } as unknown as WebFrameMain;

  const trustedCanvasFrame = {
    url: 'app://drawzware/canvas?id=test-123',
  } as unknown as WebFrameMain;

  const untrustedWebFrame = {
    url: 'https://evil-attacker.com/exploit.html',
  } as unknown as WebFrameMain;

  const localhostFrame = {
    url: 'http://localhost:3000/app',
  } as unknown as WebFrameMain;

  const fileSchemeFrame = {
    url: 'file:///C:/Users/test/malicious.html',
  } as unknown as WebFrameMain;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drawzware-ipc-test-'));
    storage = new StorageService({ baseDir: tempDir, appVersion: '0.1.0-test' });
    await storage.initialize();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  describe('Sender Origin Validation', () => {
    it('accepts invocations from the trusted app://drawzware origin', () => {
      expect(isTrustedSender(trustedFrame)).toBe(true);
      expect(isTrustedSender(trustedCanvasFrame)).toBe(true);
    });

    it('rejects invocations from untrusted origins, localhost, or file protocol', () => {
      expect(isTrustedSender(untrustedWebFrame)).toBe(false);
      expect(isTrustedSender(localhostFrame)).toBe(false);
      expect(isTrustedSender(fileSchemeFrame)).toBe(false);
      expect(isTrustedSender(null)).toBe(false);
      expect(isTrustedSender(undefined)).toBe(false);
      expect(isTrustedSender({ url: '' } as unknown as WebFrameMain)).toBe(false);
      expect(isTrustedSender({ url: 'not-a-valid-url' } as unknown as WebFrameMain)).toBe(false);
    });
  });

  describe('Untrusted Request Rejection', () => {
    it('rejects listProjects from untrusted sender with UNAUTHORIZED', async () => {
      const res = await handleListProjects({ senderFrame: untrustedWebFrame }, storage);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('UNAUTHORIZED');
        expect(res.error.message).toContain('Access Denied');
      }
    });

    it('rejects readProject from untrusted sender with UNAUTHORIZED', async () => {
      const res = await handleReadProject({ senderFrame: untrustedWebFrame }, 'any-id', storage);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('rejects saveProject from untrusted sender with UNAUTHORIZED', async () => {
      const res = await handleSaveProject({ senderFrame: untrustedWebFrame }, sampleArchitectureProject, storage);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('rejects deleteProject from untrusted sender with UNAUTHORIZED', async () => {
      const res = await handleDeleteProject({ senderFrame: untrustedWebFrame }, 'any-id', storage);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('Input & Payload Validation', () => {
    it('rejects readProject with invalid or path-traversal ID', async () => {
      const maliciousIds = ['../outside', '../../etc/passwd', 'project*name', ''];
      for (const id of maliciousIds) {
        const res = await handleReadProject({ senderFrame: trustedFrame }, id, storage);
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error.code).toBe('INVALID_ID');
        }
      }
    });

    it('rejects saveProject with invalid project payload schema', async () => {
      const invalidPayload = {
        name: 'Missing ID and other required fields',
      };
      const res = await handleSaveProject({ senderFrame: trustedFrame }, invalidPayload, storage);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('VALIDATION_FAILED');
        expect(res.error.details).toBeDefined();
      }
    });

    it('rejects deleteProject with invalid ID format', async () => {
      const res = await handleDeleteProject({ senderFrame: trustedFrame }, 'invalid/slashed/id', storage);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('INVALID_ID');
      }
    });
  });

  describe('Successful Operations & Error Mapping', () => {
    it('executes full save, list, read, and delete cycle with structured results', async () => {
      // 1. Save project
      const saveRes = await handleSaveProject({ senderFrame: trustedFrame }, sampleArchitectureProject, storage);
      expect(saveRes.success).toBe(true);
      if (saveRes.success) {
        expect(saveRes.data.saved).toBe(true);
      }

      // 2. List projects
      const listRes = await handleListProjects({ senderFrame: trustedFrame }, storage);
      expect(listRes.success).toBe(true);
      if (listRes.success) {
        expect(listRes.data.length).toBe(1);
        expect(listRes.data[0].id).toBe(sampleArchitectureProject.id);
        expect(listRes.data[0].name).toBe(sampleArchitectureProject.name);
      }

      // 3. Read project
      const readRes = await handleReadProject({ senderFrame: trustedFrame }, sampleArchitectureProject.id, storage);
      expect(readRes.success).toBe(true);
      if (readRes.success) {
        expect(readRes.data.id).toBe(sampleArchitectureProject.id);
        expect(readRes.data.nodes.length).toBe(2);
      }

      // 4. Delete project
      const deleteRes = await handleDeleteProject({ senderFrame: trustedFrame }, sampleArchitectureProject.id, storage);
      expect(deleteRes.success).toBe(true);
      if (deleteRes.success) {
        expect(deleteRes.data.deleted).toBe(true);
      }

      // 5. Read deleted project returns structured FILE_NOT_FOUND error
      const postDeleteRead = await handleReadProject({ senderFrame: trustedFrame }, sampleArchitectureProject.id, storage);
      expect(postDeleteRead.success).toBe(false);
      if (!postDeleteRead.success) {
        expect(postDeleteRead.error.code).toBe('FILE_NOT_FOUND');
      }
    });
  });
});
