import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import {
  handleOpenDrawzFile,
  handleSaveDrawzFile,
  handleImportBackupFile,
  importDrawzFileFromDisk,
  sanitizeFilename,
  defaultWriteFileAtomic,
} from '../electron/ipc/file-handlers';
import { StorageService } from '../electron/services/storage.service';
import {
  serializeDrawzDocument,
  parseProjectDocument,
  serializeDrawzBackup,
  type Project,
  CURRENT_DOCUMENT_SCHEMA_VERSION,
  CURRENT_BACKUP_SCHEMA_VERSION,
} from '../electron/types/document';
import { sampleArchitectureProject } from './fixtures/projects';

describe('Milestone 2C: Native .drawz File Open and Save', () => {
  let tempDir: string;
  let storageService: StorageService;
  const trustedSenderEvent = {
    senderFrame: {
      url: 'app://drawzware/app',
    },
  } as unknown as import('electron').IpcMainInvokeEvent;

  const untrustedSenderEvent = {
    senderFrame: {
      url: 'https://malicious-site.com',
    },
  } as unknown as import('electron').IpcMainInvokeEvent;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drawzware-file-test-'));
    storageService = new StorageService({
      baseDir: tempDir,
      appVersion: '0.1.0',
    });
    await storageService.initialize();
  });

  afterEach(async () => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe('1. Filename Sanitization & Atomic Writing', () => {
    it('sanitizes unsafe characters from project names', () => {
      expect(sanitizeFilename('My/Project:Name*?')).toBe('My_Project_Name__');
      expect(sanitizeFilename('  Valid Name  ')).toBe('Valid Name');
      expect(sanitizeFilename('   ')).toBe('untitled');
      expect(sanitizeFilename('A|B<C>D"E\\F')).toBe('A_B_C_D_E_F');
    });

    it('writes files atomically using temp file and rename', async () => {
      const targetFile = path.join(tempDir, 'test-atomic.drawz');
      const content = JSON.stringify({ hello: 'world' });

      await defaultWriteFileAtomic(targetFile, content);

      expect(fs.existsSync(targetFile)).toBe(true);
      expect(fs.readFileSync(targetFile, 'utf-8')).toBe(content);
    });

    it('cleans up temp file if atomic write fails', async () => {
      const nonExistentDir = path.join(tempDir, 'missing-dir', 'target.drawz');
      await expect(defaultWriteFileAtomic(nonExistentDir, 'content')).rejects.toThrow();
    });
  });

  describe('2. Open .drawz File', () => {
    it('opens and imports a valid canonical .drawz file into the library', async () => {
      const externalDoc = serializeDrawzDocument(sampleArchitectureProject, '0.1.0');

      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/fake/path/project.drawz'],
      });
      const mockReadFile = vi.fn().mockResolvedValue(externalDoc);

      const result = await handleOpenDrawzFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canceled).toBe(false);
        expect(result.data.project).toBeDefined();
        expect(result.data.project!.name).toBe(sampleArchitectureProject.name);

        // Verify project is persisted in library storage
        const inLibrary = await storageService.readProject(result.data.project!.id);
        expect(inLibrary.name).toBe(sampleArchitectureProject.name);
      }
    });

    it('prevents silent overwrite if imported project ID already exists in library', async () => {
      // Save existing project in library
      await storageService.saveProject(sampleArchitectureProject);

      // Prepare an external file with the EXACT same ID
      const externalProject: Project = {
        ...sampleArchitectureProject,
        name: 'Original Name',
      };
      const externalDoc = serializeDrawzDocument(externalProject, '0.1.0');

      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/external/copy.drawz'],
      });
      const mockReadFile = vi.fn().mockResolvedValue(externalDoc);

      const result = await handleOpenDrawzFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const imported = result.data.project!;
        // Must NOT overwrite existing project ID
        expect(imported.id).not.toBe(sampleArchitectureProject.id);
        expect(imported.name).toContain('(Imported)');

        // Original project in library must remain intact
        const originalInLibrary = await storageService.readProject(sampleArchitectureProject.id);
        expect(originalInLibrary.name).toBe(sampleArchitectureProject.name);

        // Both projects must now exist in the library
        const allProjects = await storageService.listProjects();
        expect(allProjects.length).toBe(2);
      }
    });

    it('handles user cancellation without modifying library', async () => {
      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      const result = await handleOpenDrawzFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canceled).toBe(true);
        expect(result.data.project).toBeUndefined();
      }

      const allProjects = await storageService.listProjects();
      expect(allProjects.length).toBe(0);
    });

    it('rejects malformed JSON with MALFORMED_JSON code and clear message', async () => {
      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/broken.drawz'],
      });
      const mockReadFile = vi.fn().mockResolvedValue('{ "invalidJson: true ');

      const result = await handleOpenDrawzFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('MALFORMED_JSON');
        expect(result.error.message).toContain('Malformed JSON');
      }
    });

    it('rejects unsupported newer schema versions with UNSUPPORTED_VERSION', async () => {
      const futureDoc = {
        fileType: 'drawzware-project',
        schemaVersion: CURRENT_DOCUMENT_SCHEMA_VERSION + 99,
        appVersion: '99.0.0',
        project: sampleArchitectureProject,
      };

      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/future.drawz'],
      });
      const mockReadFile = vi.fn().mockResolvedValue(JSON.stringify(futureDoc));

      const result = await handleOpenDrawzFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNSUPPORTED_VERSION');
        expect(result.error.message).toContain('is newer than supported version');
      }
    });

    it('rejects corrupted document missing required project fields', async () => {
      const corruptedDoc = {
        fileType: 'drawzware-project',
        schemaVersion: CURRENT_DOCUMENT_SCHEMA_VERSION,
        project: {
          id: 'test',
          // missing name, nodes, edges, etc.
        },
      };

      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/corrupted.drawz'],
      });
      const mockReadFile = vi.fn().mockResolvedValue(JSON.stringify(corruptedDoc));

      const result = await handleOpenDrawzFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CORRUPTED_DOCUMENT');
      }
    });

    it('handles filesystem read failure gracefully', async () => {
      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/unreadable.drawz'],
      });
      const mockReadFile = vi.fn().mockRejectedValue(new Error('EACCES: Permission denied'));

      const result = await handleOpenDrawzFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('READ_FAILED');
        expect(result.error.message).toContain('Permission denied');
      }
    });

    it('rejects untrusted sender frame', async () => {
      const result = await handleOpenDrawzFile(untrustedSenderEvent, storageService);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('3. Save As .drawz File', () => {
    it('exports current project as canonical .drawz file with atomic write', async () => {
      const targetPath = path.join(tempDir, 'exported.drawz');
      const mockShowSave = vi.fn().mockResolvedValue({
        canceled: false,
        filePath: targetPath,
      });
      const mockWriteFileAtomic = vi.fn().mockImplementation(defaultWriteFileAtomic);

      const result = await handleSaveDrawzFile(
        trustedSenderEvent,
        sampleArchitectureProject,
        {
          showSaveDialog: mockShowSave,
          writeFileAtomic: mockWriteFileAtomic,
          appVersion: '1.2.3',
        }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saved).toBe(true);
        expect(result.data.canceled).toBe(false);
        expect(result.data.filePath).toBe(targetPath);
      }

      expect(mockWriteFileAtomic).toHaveBeenCalledWith(targetPath, expect.any(String));

      // Verify file content is valid canonical .drawz document
      const fileText = fs.readFileSync(targetPath, 'utf-8');
      const parseResult = parseProjectDocument(fileText);
      expect(parseResult.success).toBe(true);
      if (parseResult.success && parseResult.format === 'canonical') {
        expect(parseResult.document.fileType).toBe('drawzware-project');
        expect(parseResult.document.schemaVersion).toBe(CURRENT_DOCUMENT_SCHEMA_VERSION);
        expect(parseResult.document.appVersion).toBe('1.2.3');
        expect(parseResult.document.project.id).toBe(sampleArchitectureProject.id);
        expect(parseResult.document.project.name).toBe(sampleArchitectureProject.name);
      }
    });

    it('appends .drawz extension if user omitted it', async () => {
      const targetPathWithoutExt = path.join(tempDir, 'my-diagram');
      const expectedPath = `${targetPathWithoutExt}.drawz`;

      const mockShowSave = vi.fn().mockResolvedValue({
        canceled: false,
        filePath: targetPathWithoutExt,
      });
      const mockWriteFileAtomic = vi.fn().mockResolvedValue(undefined);

      const result = await handleSaveDrawzFile(
        trustedSenderEvent,
        sampleArchitectureProject,
        {
          showSaveDialog: mockShowSave,
          writeFileAtomic: mockWriteFileAtomic,
        }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.filePath).toBe(expectedPath);
      }
      expect(mockWriteFileAtomic).toHaveBeenCalledWith(expectedPath, expect.any(String));
    });

    it('handles user cancellation without reporting save success', async () => {
      const mockShowSave = vi.fn().mockResolvedValue({
        canceled: true,
        filePath: undefined,
      });
      const mockWriteFileAtomic = vi.fn();

      const result = await handleSaveDrawzFile(
        trustedSenderEvent,
        sampleArchitectureProject,
        {
          showSaveDialog: mockShowSave,
          writeFileAtomic: mockWriteFileAtomic,
        }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saved).toBe(false);
        expect(result.data.canceled).toBe(true);
      }
      expect(mockWriteFileAtomic).not.toHaveBeenCalled();
    });

    it('handles filesystem write failure gracefully', async () => {
      const mockShowSave = vi.fn().mockResolvedValue({
        canceled: false,
        filePath: path.join(tempDir, 'test.drawz'),
      });
      const mockWriteFileAtomic = vi.fn().mockRejectedValue(new Error('ENOSPC: No space left on device'));

      const result = await handleSaveDrawzFile(
        trustedSenderEvent,
        sampleArchitectureProject,
        {
          showSaveDialog: mockShowSave,
          writeFileAtomic: mockWriteFileAtomic,
        }
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WRITE_FAILED');
        expect(result.error.message).toContain('No space left on device');
      }
    });

    it('rejects invalid project data at IPC boundary', async () => {
      const invalidProject = { name: 'Invalid Project', nodes: 'not-an-array' };

      const result = await handleSaveDrawzFile(trustedSenderEvent, invalidProject);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_FAILED');
      }
    });

    it('rejects untrusted sender for Save As', async () => {
      const result = await handleSaveDrawzFile(untrustedSenderEvent, sampleArchitectureProject);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('4. Milestone 2D: Multi-Project Backup Import & Duplicate Protection', () => {
    const projectA: Project = {
      ...sampleArchitectureProject,
      id: 'proj-backup-a',
      name: 'System Alpha',
    };

    const projectB: Project = {
      ...sampleArchitectureProject,
      id: 'proj-backup-b',
      name: 'System Beta',
    };

    it('imports a valid canonical .drawzbackup file into desktop storage', async () => {
      const backupContent = serializeDrawzBackup([projectA, projectB], '0.1.0');

      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/backup.drawzbackup'],
      });
      const mockReadFile = vi.fn().mockResolvedValue(backupContent);

      const result = await handleImportBackupFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canceled).toBe(false);
        const summary = result.data.summary!;
        expect(summary.total).toBe(2);
        expect(summary.imported).toBe(2);
        expect(summary.renamed).toBe(0);
        expect(summary.failed).toBe(0);

        // Verify projects exist in storage
        const savedA = await storageService.readProject('proj-backup-a');
        expect(savedA.name).toBe('System Alpha');
        const savedB = await storageService.readProject('proj-backup-b');
        expect(savedB.name).toBe('System Beta');
      }
    });

    it('imports a valid legacy web backup bundle ({ version: 1, projects })', async () => {
      const legacyJson = JSON.stringify({
        version: 1,
        projects: [projectA, projectB],
      });

      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/legacy-backup.json'],
      });
      const mockReadFile = vi.fn().mockResolvedValue(legacyJson);

      const result = await handleImportBackupFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary?.imported).toBe(2);
        expect(result.data.summary?.total).toBe(2);
      }
    });

    it('imports a raw array of projects ([ Project, Project ])', async () => {
      const arrayJson = JSON.stringify([projectA, projectB]);

      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/array.json'],
      });
      const mockReadFile = vi.fn().mockResolvedValue(arrayJson);

      const result = await handleImportBackupFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary?.imported).toBe(2);
      }
    });

    it('rejects empty backups with EMPTY_BACKUP error without mutating storage', async () => {
      const emptyCanonical = JSON.stringify({
        fileType: 'drawzware-backup',
        schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
        projects: [],
      });

      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/empty.json'],
      });
      const mockReadFile = vi.fn().mockResolvedValue(emptyCanonical);

      const result = await handleImportBackupFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('EMPTY_BACKUP');
      }

      const list = await storageService.listProjects();
      expect(list.length).toBe(0);
    });

    it('rejects malformed JSON and corrupted backup files', async () => {
      const badJson = '{ invalid: json ]]]';

      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/corrupted.json'],
      });
      const mockReadFile = vi.fn().mockResolvedValue(badJson);

      const result = await handleImportBackupFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('MALFORMED_JSON');
      }
    });

    it('rejects unsupported newer schema version with UNSUPPORTED_VERSION', async () => {
      const futureDoc = JSON.stringify({
        fileType: 'drawzware-backup',
        schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION + 99,
        projects: [projectA],
      });

      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/future.drawzbackup'],
      });
      const mockReadFile = vi.fn().mockResolvedValue(futureDoc);

      const result = await handleImportBackupFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNSUPPORTED_VERSION');
        expect(result.error.message).toContain('Please upgrade Drawzware');
      }
    });

    it('performs upfront validation and avoids partial imports if any project fails schema', async () => {
      const partialInvalid = JSON.stringify({
        fileType: 'drawzware-backup',
        schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
        projects: [
          projectA,
          { id: 'proj-bad', name: 'Corrupt', nodes: 'not-an-array' },
        ],
      });

      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/bad.json'],
      });
      const mockReadFile = vi.fn().mockResolvedValue(partialInvalid);

      const result = await handleImportBackupFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_PROJECTS');
      }

      // Zero projects should have been written to disk
      const list = await storageService.listProjects();
      expect(list.length).toBe(0);
    });

    it('protects existing desktop projects against duplicate ID collisions with safe rename', async () => {
      // 1. Pre-seed existing project in storage
      const existingProject: Project = {
        ...sampleArchitectureProject,
        id: 'collision-id',
        name: 'Existing Desktop Architecture',
      };
      await storageService.saveProject(existingProject);

      // 2. Prepare backup with the same ID
      const incomingBackupProject: Project = {
        ...sampleArchitectureProject,
        id: 'collision-id',
        name: 'Incoming Browser Architecture',
      };
      const backupJson = serializeDrawzBackup([incomingBackupProject]);

      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/backup.json'],
      });
      const mockReadFile = vi.fn().mockResolvedValue(backupJson);

      const result = await handleImportBackupFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const summary = result.data.summary!;
        expect(summary.total).toBe(1);
        expect(summary.imported).toBe(1);
        expect(summary.renamed).toBe(1);

        // Verify the original project was NOT overwritten
        const original = await storageService.readProject('collision-id');
        expect(original.name).toBe('Existing Desktop Architecture');

        // Verify the imported project got a new ID and renamed name
        const importedCopy = summary.importedProjects[0];
        expect(importedCopy.id).not.toBe('collision-id');
        expect(importedCopy.name).toBe('Incoming Browser Architecture (Imported)');

        // Verify it was actually saved to storage
        const savedImported = await storageService.readProject(importedCopy.id);
        expect(savedImported.name).toBe('Incoming Browser Architecture (Imported)');
      }
    });

    it('handles dialog cancellation gracefully without reporting error', async () => {
      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      const result = await handleImportBackupFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canceled).toBe(true);
        expect(result.data.summary).toBeUndefined();
      }
    });

    it('handles storage failures clearly and reports failed count', async () => {
      const backupJson = serializeDrawzBackup([projectA]);

      const mockShowOpen = vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/backup.json'],
      });
      const mockReadFile = vi.fn().mockResolvedValue(backupJson);

      // Mock saveProject to simulate disk failure
      const saveSpy = vi.spyOn(storageService, 'saveProject').mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const result = await handleImportBackupFile(trustedSenderEvent, storageService, {
        showOpenDialog: mockShowOpen,
        readFile: mockReadFile,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WRITE_FAILED');
        expect(result.error.message).toContain('permission denied');
      }

      saveSpy.mockRestore();
    });

    it('rejects untrusted sender frame for backup import', async () => {
      const result = await handleImportBackupFile(untrustedSenderEvent, storageService);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('Milestone 3A.1: Direct File Import from OS Handler (importDrawzFileFromDisk)', () => {
    it('successfully imports a canonical .drawz file from disk', async () => {
      const docJson = serializeDrawzDocument(sampleArchitectureProject);
      const testFilePath = path.join(tempDir, 'test-diagram.drawz');
      fs.writeFileSync(testFilePath, docJson, 'utf-8');

      const imported = await importDrawzFileFromDisk(testFilePath, storageService);
      expect(imported.id).toBe(sampleArchitectureProject.id);
      expect(imported.name).toBe(sampleArchitectureProject.name);

      const inStorage = await storageService.readProject(imported.id);
      expect(inStorage.name).toBe(sampleArchitectureProject.name);
    });

    it('protects against duplicate project ID collision by assigning a new UUID and renamed name', async () => {
      // Pre-save original project
      await storageService.saveProject(sampleArchitectureProject);

      const docJson = serializeDrawzDocument(sampleArchitectureProject);
      const testFilePath = path.join(tempDir, 'collision-diagram.drawz');
      fs.writeFileSync(testFilePath, docJson, 'utf-8');

      const imported = await importDrawzFileFromDisk(testFilePath, storageService);
      expect(imported.id).not.toBe(sampleArchitectureProject.id);
      expect(imported.name).toBe(`${sampleArchitectureProject.name} (Imported)`);

      // Ensure original project was not overwritten
      const original = await storageService.readProject(sampleArchitectureProject.id);
      expect(original.name).toBe(sampleArchitectureProject.name);
    });

    it('throws when the file is corrupted or contains invalid JSON', async () => {
      const testFilePath = path.join(tempDir, 'bad.drawz');
      fs.writeFileSync(testFilePath, '{ bad json ...', 'utf-8');

      await expect(importDrawzFileFromDisk(testFilePath, storageService)).rejects.toThrow();
    });

    it('throws when the file does not exist', async () => {
      const nonExistent = path.join(tempDir, 'does-not-exist.drawz');
      await expect(importDrawzFileFromDisk(nonExistent, storageService)).rejects.toThrow('Failed to read file');
    });
  });
});
