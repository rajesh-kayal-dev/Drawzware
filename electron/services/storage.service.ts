import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import {
  DRAWZ_FILE_TYPE,
  CURRENT_DOCUMENT_SCHEMA_VERSION,
  isValidProjectId,
  parseProjectDocument,
  ProjectSchema,
  LibraryIndexSchema,
  type Project,
  type DrawzDocument,
  type LibraryIndex,
  type LibraryProjectMetadata,
} from '../types/document';

export type StorageErrorCode =
  | 'INVALID_ID'
  | 'VALIDATION_FAILED'
  | 'FILE_NOT_FOUND'
  | 'CORRUPTED_DOCUMENT'
  | 'UNSUPPORTED_VERSION'
  | 'UNRECOGNIZED_FORMAT'
  | 'WRITE_FAILED'
  | 'IO_ERROR'
  | 'INDEX_CORRUPT';

export class StorageError extends Error {
  public readonly code: StorageErrorCode;
  public readonly details?: unknown;

  constructor(code: StorageErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

export interface StorageServiceOptions {
  /**
   * Custom root directory for the library.
   * Defaults to path.join(app.getPath('userData'), 'library').
   */
  baseDir?: string;
  /**
   * Application version to record in document envelopes.
   */
  appVersion?: string;
}

export class StorageService {
  private readonly libraryDir: string;
  private readonly projectsDir: string;
  private readonly indexPath: string;
  private readonly appVersion: string;
  private initialized = false;

  /**
   * Per-project serialization queue to serialize operations targeting the same project ID.
   * Prevents atomic rename conflicts (EBUSY/EPERM on Windows) and race conditions during backups.
   */
  private readonly projectQueues = new Map<string, Promise<unknown>>();

  /**
   * Global FIFO index queue to serialize read-modify-write operations on library/index.json.
   * Prevents lost updates when concurrent saves or deletes occur.
   */
  private indexQueue: Promise<unknown> = Promise.resolve();

  constructor(options: StorageServiceOptions = {}) {
    if (options.baseDir) {
      this.libraryDir = path.resolve(options.baseDir);
    } else {
      const userData = app?.getPath ? app.getPath('userData') : process.cwd();
      this.libraryDir = path.join(userData, 'library');
    }

    this.projectsDir = path.join(this.libraryDir, 'projects');
    this.indexPath = path.join(this.libraryDir, 'index.json');
    this.appVersion = options.appVersion ?? (app?.getVersion ? app.getVersion() : '0.1.0');
  }

  /**
   * Returns the canonical absolute paths for diagnostic purposes.
   */
  public getPaths() {
    return {
      libraryDir: this.libraryDir,
      projectsDir: this.projectsDir,
      indexPath: this.indexPath,
    };
  }

  /**
   * Diagnostic helper returning the number of active project lock queues.
   * Used in tests to verify that completed queues are pruned to prevent memory leaks.
   */
  public getActiveProjectLocksCount(): number {
    return this.projectQueues.size;
  }

  /**
   * Serializes an action on a given project ID.
   * - Ensures sequential execution for the same project.
   * - Never poisons the queue if an action rejects.
   * - Automatically prunes the queue entry from the map when idle.
   */
  private async runWithProjectLock<T>(id: string, action: () => Promise<T>): Promise<T> {
    const currentQueue = this.projectQueues.get(id) ?? Promise.resolve();
    let releaseLock: () => void;
    const nextInQueue = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const chainedQueue = currentQueue.catch(() => {}).then(() => nextInQueue);
    this.projectQueues.set(id, chainedQueue);

    await currentQueue.catch(() => {});
    try {
      return await action();
    } finally {
      releaseLock!();
      if (this.projectQueues.get(id) === chainedQueue) {
        this.projectQueues.delete(id);
      }
    }
  }

  /**
   * Serializes an index mutation on library/index.json.
   * - Prevents lost updates during concurrent Read-Modify-Write cycles.
   * - Never poisons the index queue on rejection.
   */
  private async runWithIndexLock<T>(action: () => Promise<T>): Promise<T> {
    const previous = this.indexQueue;
    let releaseLock: () => void;
    const next = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.indexQueue = previous.catch(() => {}).then(() => next);

    await previous.catch(() => {});
    try {
      return await action();
    } finally {
      releaseLock!();
    }
  }

  /**
   * Ensures library and projects directories exist and index is ready.
   * Auto-repairs the index if it is missing or corrupted.
   */
  public async initialize(): Promise<void> {
    try {
      await fs.promises.mkdir(this.projectsDir, { recursive: true });

      // Verify or initialize index
      if (!fs.existsSync(this.indexPath)) {
        await this.writeIndexAtomic({
          version: 1,
          lastOpenedProjectId: null,
          projects: [],
        });
      } else {
        try {
          const rawIndex = await fs.promises.readFile(this.indexPath, 'utf-8');
          const parsed = JSON.parse(rawIndex);
          const validation = LibraryIndexSchema.safeParse(parsed);
          if (!validation.success) {
            console.warn('[StorageService] Corrupt index detected during init. Repairing from disk...');
            await this.repairIndex();
          }
        } catch {
          console.warn('[StorageService] Malformed index JSON during init. Repairing from disk...');
          await this.repairIndex();
        }
      }

      this.initialized = true;
    } catch (err) {
      throw new StorageError(
        'IO_ERROR',
        `Failed to initialize library directory: ${(err as Error).message}`,
        err
      );
    }
  }

  private ensureInitialized() {
    if (!this.initialized && !fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
      this.initialized = true;
    }
  }

  /**
   * Resolves and verifies that a project ID points strictly within projectsDir.
   */
  private resolveProjectPath(id: string): string {
    if (!isValidProjectId(id)) {
      throw new StorageError(
        'INVALID_ID',
        `Invalid project ID "${id}". Project IDs must only contain alphanumeric characters, underscores, and hyphens (max 128 chars).`
      );
    }

    const targetPath = path.resolve(this.projectsDir, `${id}.drawz`);
    const rel = path.relative(this.projectsDir, targetPath);

    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new StorageError('INVALID_ID', `Security violation: Path traversal detected for ID "${id}".`);
    }

    return targetPath;
  }

  /**
   * Reads and parses the library index. Auto-repairs if corrupted.
   */
  public async getIndex(): Promise<LibraryIndex> {
    this.ensureInitialized();
    return this.internalGetIndex();
  }

  private async internalGetIndex(): Promise<LibraryIndex> {
    if (!fs.existsSync(this.indexPath)) {
      return this.repairIndex();
    }

    try {
      const content = await fs.promises.readFile(this.indexPath, 'utf-8');
      const parsed = JSON.parse(content);
      const res = LibraryIndexSchema.safeParse(parsed);
      if (res.success) {
        return res.data;
      }
      return this.repairIndex();
    } catch {
      return this.repairIndex();
    }
  }

  /**
   * Returns metadata for all projects in the library index.
   */
  public async listProjects(): Promise<LibraryProjectMetadata[]> {
    const index = await this.getIndex();
    return index.projects;
  }

  /**
   * Reads a project by validated ID.
   * Guarded by project lock so concurrent saves/deletes execute predictably.
   */
  public async readProject(id: string): Promise<Project> {
    if (!isValidProjectId(id)) {
      throw new StorageError(
        'INVALID_ID',
        `Invalid project ID "${id}". Project IDs must only contain alphanumeric characters, underscores, and hyphens (max 128 chars).`
      );
    }
    return this.runWithProjectLock(id, () => this.internalReadProject(id));
  }

  private async internalReadProject(id: string): Promise<Project> {
    this.ensureInitialized();
    const filePath = this.resolveProjectPath(id);

    if (!fs.existsSync(filePath)) {
      throw new StorageError('FILE_NOT_FOUND', `Project "${id}" was not found in library.`);
    }

    let fileContent: string;
    try {
      fileContent = await fs.promises.readFile(filePath, 'utf-8');
    } catch (err) {
      throw new StorageError('IO_ERROR', `Failed to read project file: ${(err as Error).message}`, err);
    }

    const parseResult = parseProjectDocument(fileContent);

    if (parseResult.success) {
      if (parseResult.format === 'canonical' || parseResult.format === 'legacy-project') {
        return parseResult.document.project;
      }
      throw new StorageError(
        'UNRECOGNIZED_FORMAT',
        `File for project "${id}" contains a backup bundle rather than a single project.`
      );
    }

    // Handle corruption: Quarantine corrupted file and check for backup
    const timestamp = Date.now();
    const corruptedPath = path.join(this.projectsDir, `${id}.corrupted.${timestamp}.json`);
    try {
      await fs.promises.rename(filePath, corruptedPath);
      console.warn(`[StorageService] Quarantined corrupted project "${id}" to ${corruptedPath}`);
    } catch (quarantineErr) {
      console.error(`[StorageService] Failed to quarantine corrupted file:`, quarantineErr);
    }

    // Check if a backup exists
    const backupPath = `${filePath}.bak`;
    if (fs.existsSync(backupPath)) {
      try {
        const backupContent = await fs.promises.readFile(backupPath, 'utf-8');
        const backupParse = parseProjectDocument(backupContent);
        if (backupParse.success && (backupParse.format === 'canonical' || backupParse.format === 'legacy-project')) {
          console.warn(`[StorageService] Successfully recovered project "${id}" from backup!`);
          // Restore backup file to main path
          await fs.promises.copyFile(backupPath, filePath);
          return backupParse.document.project;
        }
      } catch (backupErr) {
        console.error(`[StorageService] Backup recovery failed for project "${id}":`, backupErr);
      }
    }

    if (parseResult.code === 'UNSUPPORTED_VERSION') {
      throw new StorageError('UNSUPPORTED_VERSION', parseResult.error, parseResult.details);
    }

    throw new StorageError(
      'CORRUPTED_DOCUMENT',
      `Project "${id}" is corrupted and could not be loaded. Corrupted file was preserved at ${path.basename(
        corruptedPath
      )}.`,
      parseResult.details
    );
  }

  /**
   * Saves a project atomically:
   * Guarded by project lock so concurrent saves execute sequentially without EBUSY/EPERM.
   */
  public async saveProject(project: Project): Promise<{ success: boolean; error?: string }> {
    if (!project || typeof project.id !== 'string' || !isValidProjectId(project.id)) {
      throw new StorageError(
        'INVALID_ID',
        `Invalid project ID "${project?.id}". Project IDs must only contain alphanumeric characters, underscores, and hyphens (max 128 chars).`
      );
    }
    return this.runWithProjectLock(project.id, () => this.internalSaveProject(project));
  }

  private async internalSaveProject(project: Project): Promise<{ success: boolean; error?: string }> {
    this.ensureInitialized();

    // 1. Validate payload
    const validation = ProjectSchema.safeParse(project);
    if (!validation.success) {
      throw new StorageError(
        'VALIDATION_FAILED',
        'Project payload does not match required schema.',
        validation.error.format()
      );
    }

    const validProject = validation.data;
    const targetPath = this.resolveProjectPath(validProject.id);

    // 2. Prepare envelope
    const envelope: DrawzDocument = {
      fileType: DRAWZ_FILE_TYPE,
      schemaVersion: CURRENT_DOCUMENT_SCHEMA_VERSION,
      appVersion: this.appVersion,
      exportedAt: new Date().toISOString(),
      project: validProject,
    };

    const serialized = JSON.stringify(envelope, null, 2);

    // 3. Write to unique temp file in same directory (guarantees same filesystem for atomic rename)
    const tempPath = path.join(
      this.projectsDir,
      `${validProject.id}.drawz.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`
    );

    let fileHandle: fs.promises.FileHandle | null = null;
    try {
      fileHandle = await fs.promises.open(tempPath, 'w');
      await fileHandle.writeFile(serialized, 'utf-8');
      // 4. Force flush to disk
      await fileHandle.sync();
      await fileHandle.close();
      fileHandle = null;

      // 5. Create backup of existing project if one already exists
      const backupPath = `${targetPath}.bak`;
      if (fs.existsSync(targetPath)) {
        try {
          await fs.promises.copyFile(targetPath, backupPath);
        } catch (copyErr) {
          console.warn('[StorageService] Warning: Failed to create project backup before overwrite:', copyErr);
        }
      }

      // 6. Atomic rename
      await fs.promises.rename(tempPath, targetPath);

      // 7. Update library index atomically (serialized through runWithIndexLock)
      await this.updateIndexForProject(validProject);

      return { success: true };
    } catch (err) {
      if (fileHandle) {
        try {
          await fileHandle.close();
        } catch {
          // Ignore handle close error on failure path
        }
      }
      if (fs.existsSync(tempPath)) {
        try {
          await fs.promises.unlink(tempPath);
        } catch {
          // Ignore temp cleanup error
        }
      }
      if (err instanceof StorageError) throw err;
      throw new StorageError('WRITE_FAILED', `Failed to save project "${validProject.id}": ${(err as Error).message}`, err);
    }
  }

  /**
   * Deletes a project and its backups from library, updating the index.
   * Guarded by project lock so save and delete do not race.
   */
  public async deleteProject(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isValidProjectId(id)) {
      throw new StorageError(
        'INVALID_ID',
        `Invalid project ID "${id}". Project IDs must only contain alphanumeric characters, underscores, and hyphens (max 128 chars).`
      );
    }
    return this.runWithProjectLock(id, () => this.internalDeleteProject(id));
  }

  private async internalDeleteProject(id: string): Promise<{ success: boolean; error?: string }> {
    this.ensureInitialized();
    const targetPath = this.resolveProjectPath(id);
    const backupPath = `${targetPath}.bak`;

    try {
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
      }
      if (fs.existsSync(backupPath)) {
        try {
          await fs.promises.unlink(backupPath);
        } catch {
          // Ignore backup removal failure
        }
      }

      // Update index atomically under index lock
      await this.runWithIndexLock(async () => {
        const index = await this.internalGetIndex();
        const updatedProjects = index.projects.filter((p) => p.id !== id);
        const updatedLastOpened = index.lastOpenedProjectId === id ? null : index.lastOpenedProjectId;

        await this.writeIndexAtomic({
          ...index,
          projects: updatedProjects,
          lastOpenedProjectId: updatedLastOpened,
        });
      });

      return { success: true };
    } catch (err) {
      if (err instanceof StorageError) throw err;
      throw new StorageError('IO_ERROR', `Failed to delete project "${id}": ${(err as Error).message}`, err);
    }
  }

  /**
   * Sets the last opened project ID in the library index.
   * Guarded by index lock.
   */
  public async setLastOpenedProjectId(id: string | null): Promise<void> {
    if (id !== null && !isValidProjectId(id)) {
      throw new StorageError('INVALID_ID', `Invalid project ID: ${id}`);
    }
    return this.runWithIndexLock(async () => {
      const index = await this.internalGetIndex();
      await this.writeIndexAtomic({
        ...index,
        lastOpenedProjectId: id,
      });
    });
  }

  /**
   * Rebuilds the library index from the physical .drawz files present on disk.
   * Guarded by index lock.
   */
  public async repairIndex(): Promise<LibraryIndex> {
    this.ensureInitialized();
    return this.runWithIndexLock(() => this.internalRepairIndex());
  }

  private async internalRepairIndex(): Promise<LibraryIndex> {
    const reconstructedProjects: LibraryProjectMetadata[] = [];
    let existingLastOpened: string | null = null;

    try {
      if (fs.existsSync(this.indexPath)) {
        const raw = await fs.promises.readFile(this.indexPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (typeof parsed?.lastOpenedProjectId === 'string') {
          existingLastOpened = parsed.lastOpenedProjectId;
        }
      }
    } catch {
      // Ignore existing index read failure
    }

    try {
      const entries = await fs.promises.readdir(this.projectsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.drawz')) continue;

        const fullPath = path.join(this.projectsDir, entry.name);
        try {
          const content = await fs.promises.readFile(fullPath, 'utf-8');
          const parseResult = parseProjectDocument(content);
          if (parseResult.success && (parseResult.format === 'canonical' || parseResult.format === 'legacy-project')) {
            const p = parseResult.document.project;
            reconstructedProjects.push({
              id: p.id,
              name: p.name,
              description: p.description,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
              diagramType: p.diagramType,
              nodeCount: Array.isArray(p.nodes) ? p.nodes.length : 0,
              edgeCount: Array.isArray(p.edges) ? p.edges.length : 0,
              fileName: entry.name,
            });
          }
        } catch (err) {
          console.warn(`[StorageService] Skipping unreadable project file during index repair: ${entry.name}`, err);
        }
      }

      // Sort by updatedAt descending
      reconstructedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      // Ensure lastOpenedProjectId still exists
      const lastOpenedValid = reconstructedProjects.some((p) => p.id === existingLastOpened) ? existingLastOpened : null;

      const newIndex: LibraryIndex = {
        version: 1,
        lastOpenedProjectId: lastOpenedValid,
        projects: reconstructedProjects,
      };

      await this.writeIndexAtomic(newIndex);
      return newIndex;
    } catch (err) {
      throw new StorageError('IO_ERROR', `Failed to repair library index: ${(err as Error).message}`, err);
    }
  }

  /**
   * Updates or appends a project in the library index.
   * Serialized under index lock.
   */
  private async updateIndexForProject(project: Project): Promise<void> {
    return this.runWithIndexLock(async () => {
      const index = await this.internalGetIndex();

      const metadata: LibraryProjectMetadata = {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        diagramType: project.diagramType,
        nodeCount: Array.isArray(project.nodes) ? project.nodes.length : 0,
        edgeCount: Array.isArray(project.edges) ? project.edges.length : 0,
        fileName: `${project.id}.drawz`,
      };

      const existingIndex = index.projects.findIndex((p) => p.id === project.id);
      let updatedProjects: LibraryProjectMetadata[];

      if (existingIndex >= 0) {
        updatedProjects = [...index.projects];
        updatedProjects[existingIndex] = metadata;
      } else {
        updatedProjects = [metadata, ...index.projects];
      }

      // Re-sort by updatedAt descending
      updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      await this.writeIndexAtomic({
        ...index,
        projects: updatedProjects,
      });
    });
  }

  /**
   * Writes the index atomically with flush and rename.
   */
  private async writeIndexAtomic(indexData: LibraryIndex): Promise<void> {
    const serialized = JSON.stringify(indexData, null, 2);
    const tempPath = path.join(
      this.libraryDir,
      `index.json.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`
    );

    let handle: fs.promises.FileHandle | null = null;
    try {
      handle = await fs.promises.open(tempPath, 'w');
      await handle.writeFile(serialized, 'utf-8');
      await handle.sync();
      await handle.close();
      handle = null;

      // Preserve index backup
      if (fs.existsSync(this.indexPath)) {
        try {
          await fs.promises.copyFile(this.indexPath, `${this.indexPath}.bak`);
        } catch {
          // Ignore index backup copy error
        }
      }

      await fs.promises.rename(tempPath, this.indexPath);
    } catch (err) {
      if (handle) {
        try {
          await handle.close();
        } catch {
          // ignore
        }
      }
      if (fs.existsSync(tempPath)) {
        try {
          await fs.promises.unlink(tempPath);
        } catch {
          // ignore
        }
      }
      throw err;
    }
  }
}
