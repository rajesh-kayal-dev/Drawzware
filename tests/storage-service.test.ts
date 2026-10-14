import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StorageService, StorageError } from '../electron/services/storage.service';
import { sampleArchitectureProject } from './fixtures/projects';
import type { Project } from '../electron/types/document';

describe('StorageService (Electron Main-Process Persistence)', () => {
  let tempDir: string;
  let storage: StorageService;

  beforeEach(async () => {
    // Isolated sandbox directory for each test run
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drawzware-test-'));
    storage = new StorageService({ baseDir: tempDir, appVersion: '0.1.0-test' });
    await storage.initialize();
  });

  afterEach(async () => {
    // Clean up temporary sandbox directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('initializes library directories and empty index', async () => {
    const paths = storage.getPaths();
    expect(fs.existsSync(paths.libraryDir)).toBe(true);
    expect(fs.existsSync(paths.projectsDir)).toBe(true);
    expect(fs.existsSync(paths.indexPath)).toBe(true);

    const index = await storage.getIndex();
    expect(index.version).toBe(1);
    expect(index.projects).toEqual([]);
    expect(index.lastOpenedProjectId).toBeNull();
  });

  it('saves and reads a canonical project with correct envelope and metadata', async () => {
    const res = await storage.saveProject(sampleArchitectureProject);
    expect(res.success).toBe(true);

    // Read back through storage service
    const loaded = await storage.readProject(sampleArchitectureProject.id);
    expect(loaded.id).toBe(sampleArchitectureProject.id);
    expect(loaded.name).toBe(sampleArchitectureProject.name);
    expect(loaded.nodes.length).toBe(2);
    expect(loaded.edges.length).toBe(1);
    expect(loaded.diagramData).toEqual(sampleArchitectureProject.diagramData);

    // Inspect physical file on disk: must be canonical .drawz envelope
    const paths = storage.getPaths();
    const diskPath = path.join(paths.projectsDir, `${sampleArchitectureProject.id}.drawz`);
    expect(fs.existsSync(diskPath)).toBe(true);

    const diskRaw = JSON.parse(fs.readFileSync(diskPath, 'utf-8'));
    expect(diskRaw.fileType).toBe('drawzware-project');
    expect(diskRaw.schemaVersion).toBe(1);
    expect(diskRaw.appVersion).toBe('0.1.0-test');

    // Verify index was updated
    const index = await storage.getIndex();
    expect(index.projects.length).toBe(1);
    expect(index.projects[0].id).toBe(sampleArchitectureProject.id);
    expect(index.projects[0].name).toBe(sampleArchitectureProject.name);
    expect(index.projects[0].nodeCount).toBe(2);
    expect(index.projects[0].edgeCount).toBe(1);
    expect(index.projects[0].diagramType).toBe('architecture');
  });

  it('creates a prior version backup (.drawz.bak) when overwriting an existing project', async () => {
    // 1. Initial save
    await storage.saveProject(sampleArchitectureProject);

    // 2. Modify project
    const modifiedProject: Project = {
      ...sampleArchitectureProject,
      name: 'Modified E-Commerce System',
      updatedAt: '2026-03-21T00:00:00.000Z',
    };

    await storage.saveProject(modifiedProject);

    // Check backup file exists
    const paths = storage.getPaths();
    const backupPath = path.join(paths.projectsDir, `${sampleArchitectureProject.id}.drawz.bak`);
    expect(fs.existsSync(backupPath)).toBe(true);

    // Verify backup contains the initial version
    const backupRaw = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    expect(backupRaw.project.name).toBe(sampleArchitectureProject.name);

    // Verify active file contains modified version
    const loaded = await storage.readProject(sampleArchitectureProject.id);
    expect(loaded.name).toBe('Modified E-Commerce System');
  });

  it('rejects path traversal and invalid project IDs with INVALID_ID', async () => {
    const maliciousIds = [
      '../outside',
      '../../secret',
      '..\\windows\\system32',
      'invalid*id',
      'has spaces',
      '',
    ];

    for (const badId of maliciousIds) {
      await expect(storage.readProject(badId)).rejects.toThrowError(StorageError);
      await expect(
        storage.saveProject({
          ...sampleArchitectureProject,
          id: badId,
        })
      ).rejects.toThrowError(StorageError);
    }
  });

  it('protects existing project data during an interrupted or failed write', async () => {
    // Save valid initial project
    await storage.saveProject(sampleArchitectureProject);

    const paths = storage.getPaths();
    const projectPath = path.join(paths.projectsDir, `${sampleArchitectureProject.id}.drawz`);
    const originalContent = fs.readFileSync(projectPath, 'utf-8');

    // Attempt to save invalid payload (violates ProjectSchema)
    const invalidProject = {
      ...sampleArchitectureProject,
      nodes: 'this-should-be-an-array' as unknown as Project['nodes'],
    };

    await expect(storage.saveProject(invalidProject)).rejects.toThrowError(StorageError);

    // Verify original file was not touched or corrupted
    const currentContent = fs.readFileSync(projectPath, 'utf-8');
    expect(currentContent).toBe(originalContent);
  });

  it('quarantines corrupted project file and recovers from backup if available', async () => {
    // 1. Save valid project
    await storage.saveProject(sampleArchitectureProject);

    // 2. Save update to generate .bak
    const updatedProject: Project = {
      ...sampleArchitectureProject,
      name: 'Second Revision',
      updatedAt: '2026-03-22T00:00:00.000Z',
    };
    await storage.saveProject(updatedProject);

    const paths = storage.getPaths();
    const projectPath = path.join(paths.projectsDir, `${sampleArchitectureProject.id}.drawz`);

    // 3. Corrupt the active project file with invalid JSON
    fs.writeFileSync(projectPath, 'CORRUPTED_GARBAGE_DATA{{{');

    // 4. Reading should detect corruption, quarantine it, and recover from .bak
    const recovered = await storage.readProject(sampleArchitectureProject.id);
    expect(recovered.name).toBe(sampleArchitectureProject.name);

    // Verify a quarantine file was created
    const files = fs.readdirSync(paths.projectsDir);
    const quarantineFile = files.find((f) => f.includes('corrupted'));
    expect(quarantineFile).toBeDefined();

    // Verify the file was restored to active path
    expect(fs.readFileSync(projectPath, 'utf-8')).not.toBe('CORRUPTED_GARBAGE_DATA{{{');
  });

  it('preserves corrupted file in quarantine when no backup is available', async () => {
    const paths = storage.getPaths();
    const projectPath = path.join(paths.projectsDir, 'no-backup-proj.drawz');
    fs.writeFileSync(projectPath, 'TRUNCATED_JSON_{"fileType"');

    await expect(storage.readProject('no-backup-proj')).rejects.toThrowError(StorageError);

    // Verify the truncated file was quarantined, not deleted
    const files = fs.readdirSync(paths.projectsDir);
    const quarantineFile = files.find((f) => f.includes('no-backup-proj.corrupted'));
    expect(quarantineFile).toBeDefined();
  });

  it('deletes a project and its backup cleanly, updating index', async () => {
    await storage.saveProject(sampleArchitectureProject);
    const paths = storage.getPaths();
    const projectPath = path.join(paths.projectsDir, `${sampleArchitectureProject.id}.drawz`);

    expect(fs.existsSync(projectPath)).toBe(true);

    const deleteRes = await storage.deleteProject(sampleArchitectureProject.id);
    expect(deleteRes.success).toBe(true);

    expect(fs.existsSync(projectPath)).toBe(false);

    // Reading should throw FILE_NOT_FOUND
    await expect(storage.readProject(sampleArchitectureProject.id)).rejects.toThrowError(StorageError);

    // Index should no longer list the project
    const index = await storage.getIndex();
    expect(index.projects.length).toBe(0);
  });

  it('auto-repairs a missing or corrupted index without losing existing projects', async () => {
    // 1. Save two projects
    await storage.saveProject(sampleArchitectureProject);
    const project2: Project = {
      ...sampleArchitectureProject,
      id: 'second-project-002',
      name: 'Second Diagram Project',
      updatedAt: '2026-03-25T10:00:00.000Z',
    };
    await storage.saveProject(project2);

    const paths = storage.getPaths();

    // 2. Corrupt the index.json file
    fs.writeFileSync(paths.indexPath, 'CORRUPTED_INDEX_GARBAGE!!!');

    // 3. Request index: auto-repair should reconstruct it from disk
    const repairedIndex = await storage.getIndex();
    expect(repairedIndex.projects.length).toBe(2);

    const ids = repairedIndex.projects.map((p) => p.id);
    expect(ids).toContain(sampleArchitectureProject.id);
    expect(ids).toContain('second-project-002');

    // 4. Delete the index completely
    fs.unlinkSync(paths.indexPath);

    // Should reconstruct again
    const repairedFromMissing = await storage.getIndex();
    expect(repairedFromMissing.projects.length).toBe(2);
  });
});
