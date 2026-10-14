import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StorageService, StorageError } from '../electron/services/storage.service';
import { sampleArchitectureProject } from './fixtures/projects';
import type { Project } from '../electron/types/document';

describe('StorageService Concurrency & Race-Condition Safety', () => {
  let tempDir: string;
  let storage: StorageService;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drawzware-concurrency-test-'));
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

  it('1. serializes multiple overlapping saves to the same project deterministically', async () => {
    const revisions: Project[] = Array.from({ length: 6 }, (_, i) => ({
      ...sampleArchitectureProject,
      name: `Revision ${i + 1}`,
      updatedAt: new Date(Date.now() + i * 1000).toISOString(),
    }));

    // Launch all saves simultaneously (simulating rapid debounced autosaves or concurrent triggers)
    const results = await Promise.all(revisions.map((rev) => storage.saveProject(rev)));

    for (const res of results) {
      expect(res.success).toBe(true);
    }

    // Verify final state on disk matches the last queued revision (Revision 6)
    const loaded = await storage.readProject(sampleArchitectureProject.id);
    expect(loaded.name).toBe('Revision 6');

    // Verify index has Revision 6
    const index = await storage.getIndex();
    expect(index.projects.length).toBe(1);
    expect(index.projects[0].name).toBe('Revision 6');

    // Verify .bak exists and holds Revision 5
    const paths = storage.getPaths();
    const backupPath = path.join(paths.projectsDir, `${sampleArchitectureProject.id}.drawz.bak`);
    expect(fs.existsSync(backupPath)).toBe(true);
    const backupRaw = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    expect(backupRaw.project.name).toBe('Revision 5');

    // Verify no temporary files remain
    const files = fs.readdirSync(paths.projectsDir);
    const tmpFiles = files.filter((f) => f.includes('.tmp'));
    expect(tmpFiles.length).toBe(0);

    // Verify project lock queue is cleaned up (no memory leak)
    expect(storage.getActiveProjectLocksCount()).toBe(0);
  });

  it('2. prevents lost index updates during concurrent saves to different projects', async () => {
    const projectCount = 10;
    const projects: Project[] = Array.from({ length: projectCount }, (_, i) => ({
      ...sampleArchitectureProject,
      id: `parallel-proj-${i.toString().padStart(3, '0')}`,
      name: `Parallel Project ${i}`,
      updatedAt: new Date(Date.now() + i * 100).toISOString(),
    }));

    // Save all projects concurrently
    const results = await Promise.all(projects.map((p) => storage.saveProject(p)));
    expect(results.every((r) => r.success)).toBe(true);

    // Inspect physical files on disk: all 10 must exist
    const paths = storage.getPaths();
    for (const p of projects) {
      const filePath = path.join(paths.projectsDir, `${p.id}.drawz`);
      expect(fs.existsSync(filePath)).toBe(true);
    }

    // Verify index: all 10 projects MUST be recorded (no lost updates!)
    const index = await storage.getIndex();
    expect(index.projects.length).toBe(projectCount);

    const indexedIds = new Set(index.projects.map((p) => p.id));
    for (const p of projects) {
      expect(indexedIds.has(p.id)).toBe(true);
    }

    // Verify memory cleanup
    expect(storage.getActiveProjectLocksCount()).toBe(0);
  });

  it('3. serializes save overlapping a delete for the same project in defined order', async () => {
    const project = { ...sampleArchitectureProject, id: 'save-delete-race-01' };

    // Case A: Save followed immediately by Delete
    const [saveRes, deleteRes] = await Promise.all([
      storage.saveProject(project),
      storage.deleteProject(project.id),
    ]);

    expect(saveRes.success).toBe(true);
    expect(deleteRes.success).toBe(true);

    // Because delete was queued after save, the project must be deleted
    await expect(storage.readProject(project.id)).rejects.toThrowError(StorageError);
    const index = await storage.getIndex();
    expect(index.projects.some((p) => p.id === project.id)).toBe(false);

    // Case B: Delete followed immediately by Save
    const [delRes2, saveRes2] = await Promise.all([
      storage.deleteProject(project.id),
      storage.saveProject({ ...project, name: 'Recreated After Delete' }),
    ]);

    expect(delRes2.success).toBe(true);
    expect(saveRes2.success).toBe(true);

    // Final state must reflect the recreated project
    const finalLoaded = await storage.readProject(project.id);
    expect(finalLoaded.name).toBe('Recreated After Delete');
  });

  it('4. serializes multiple simultaneous library-index updates without lost updates', async () => {
    const p1 = { ...sampleArchitectureProject, id: 'index-race-01', name: 'Project One' };
    const p2 = { ...sampleArchitectureProject, id: 'index-race-02', name: 'Project Two' };

    // Concurrently save p1, set last opened to p1, and save p2
    await Promise.all([
      storage.saveProject(p1),
      storage.setLastOpenedProjectId(p1.id),
      storage.saveProject(p2),
    ]);

    const index = await storage.getIndex();
    expect(index.projects.length).toBe(2);
    expect(index.projects.map((p) => p.id).sort()).toEqual([p1.id, p2.id].sort());
    expect(index.lastOpenedProjectId).toBe(p1.id);
  });

  it('5. handles a failed queued write without poisoning subsequent queued writes', async () => {
    const targetId = 'poison-test-01';
    const invalidProject = {
      ...sampleArchitectureProject,
      id: targetId,
      name: 'Invalid Project',
      nodes: 'invalid-nodes-type' as unknown as Project['nodes'],
    };
    const validProject: Project = {
      ...sampleArchitectureProject,
      id: targetId,
      name: 'Valid Project After Failure',
    };

    // Dispatch invalid save followed immediately by valid save
    const promise1 = storage.saveProject(invalidProject);
    const promise2 = storage.saveProject(validProject);

    await expect(promise1).rejects.toThrowError(StorageError);
    await expect(promise2).resolves.toEqual({ success: true });

    // Verify the project was saved successfully with the valid payload
    const loaded = await storage.readProject(targetId);
    expect(loaded.name).toBe('Valid Project After Failure');

    // Verify lock was released
    expect(storage.getActiveProjectLocksCount()).toBe(0);
  });

  it('6. safely handles index repair overlapping concurrent mutations', async () => {
    // 1. Initial project
    await storage.saveProject(sampleArchitectureProject);

    // 2. Launch repairIndex and a concurrent saveProject for a new project
    const newProject = {
      ...sampleArchitectureProject,
      id: 'concurrent-during-repair',
      name: 'Concurrent Project During Repair',
    };

    const [repairRes, saveRes] = await Promise.all([
      storage.repairIndex(),
      storage.saveProject(newProject),
    ]);

    expect(repairRes.version).toBe(1);
    expect(saveRes.success).toBe(true);

    // Both projects must be present in the final index
    const finalIndex = await storage.getIndex();
    expect(finalIndex.projects.length).toBe(2);
    const ids = finalIndex.projects.map((p) => p.id);
    expect(ids).toContain(sampleArchitectureProject.id);
    expect(ids).toContain(newProject.id);
  });

  it('7. cleans up temporary files when writes fail', async () => {
    const paths = storage.getPaths();
    const invalidProject = {
      ...sampleArchitectureProject,
      id: 'tmp-cleanup-test',
      nodes: 12345 as unknown as Project['nodes'],
    };

    await expect(storage.saveProject(invalidProject)).rejects.toThrowError(StorageError);

    // Ensure no .tmp files exist in projects directory
    const files = fs.readdirSync(paths.projectsDir);
    const orphanTmp = files.filter((f) => f.includes('.tmp'));
    expect(orphanTmp.length).toBe(0);
  });

  it('8. reopens and validates data fidelity for every successfully saved project', async () => {
    const testProjects: Project[] = [
      { ...sampleArchitectureProject, id: 'verify-01', name: 'Verify Arch' },
      { ...sampleArchitectureProject, id: 'verify-02', name: 'Verify Seq', diagramType: 'sequence' },
      { ...sampleArchitectureProject, id: 'verify-03', name: 'Verify ER', diagramType: 'er' },
    ];

    await Promise.all(testProjects.map((p) => storage.saveProject(p)));

    for (const orig of testProjects) {
      const readBack = await storage.readProject(orig.id);
      expect(readBack.id).toBe(orig.id);
      expect(readBack.name).toBe(orig.name);
      expect(readBack.diagramType).toBe(orig.diagramType);
      expect(readBack.nodes).toEqual(orig.nodes);
      expect(readBack.edges).toEqual(orig.edges);
      expect(readBack.viewport).toEqual(orig.viewport);
      expect(readBack.diagramData).toEqual(orig.diagramData);
    }
  });
});
