import {
  dialog,
  type IpcMain,
  type IpcMainInvokeEvent,
  type OpenDialogOptions,
  type OpenDialogReturnValue,
  type SaveDialogOptions,
  type SaveDialogReturnValue,
  BrowserWindow,
} from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  IPC_CHANNELS,
  type IpcResult,
  type FileOpenResult,
  type FileSaveResult,
  type BackupImportSummary,
  type FileBackupImportResult,
  type IpcErrorCode,
} from '../types/ipc';
import {
  isValidProjectId,
  ProjectSchema,
  parseProjectDocument,
  serializeDrawzDocument,
  parseBackupDocument,
  type Project,
} from '../types/document';
import { StorageService } from '../services/storage.service';
import { isTrustedSender } from './library-handlers';

export interface FileHandlerDeps {
  showOpenDialog?: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
  showSaveDialog?: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>;
  readFile?: (filePath: string, encoding: string) => Promise<string>;
  writeFileAtomic?: (filePath: string, content: string) => Promise<void>;
  appVersion?: string;
}

/**
 * Safely sanitizes a project name for use as a default file name.
 */
export function sanitizeFilename(name: string): string {
  const sanitized = name.replace(/[/\\?%*:|"<>]/g, '_').trim();
  return sanitized.length > 0 ? sanitized : 'untitled';
}

/**
 * Writes content atomically to targetPath by writing to a sibling temporary file,
 * syncing to disk, and renaming into place.
 */
export async function defaultWriteFileAtomic(targetPath: string, content: string): Promise<void> {
  const dir = path.dirname(targetPath);
  const tempPath = path.join(
    dir,
    `.${path.basename(targetPath)}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`
  );

  let fileHandle: fs.promises.FileHandle | null = null;
  try {
    fileHandle = await fs.promises.open(tempPath, 'w');
    await fileHandle.writeFile(content, 'utf-8');
    await fileHandle.sync();
    await fileHandle.close();
    fileHandle = null;

    // Atomic replace on same volume
    await fs.promises.rename(tempPath, targetPath);
  } catch (err) {
    if (fileHandle) {
      try {
        await fileHandle.close();
      } catch {
        // ignore close error
      }
    }
    if (fs.existsSync(tempPath)) {
      try {
        await fs.promises.unlink(tempPath);
      } catch {
        // ignore unlink error
      }
    }
    throw err;
  }
}

/**
 * Safely imports a .drawz file from an absolute disk path into the library.
 * Reads file, parses document schema, validates, assigns unique ID if collision occurs, and persists to library.
 */
export async function importDrawzFileFromDisk(
  filePath: string,
  storageService: StorageService,
  readFile = (p: string) => fs.promises.readFile(p, 'utf-8')
): Promise<Project> {
  let fileContent: string;
  try {
    fileContent = await readFile(filePath);
  } catch (readErr) {
    throw new Error(`Failed to read file: ${(readErr as Error).message}`);
  }

  const parseResult = parseProjectDocument(fileContent);
  if (!parseResult.success) {
    throw new Error(parseResult.error);
  }

  let importedProject: Project;
  if (parseResult.format === 'canonical') {
    importedProject = parseResult.document.project;
  } else if (parseResult.format === 'legacy-project') {
    importedProject = parseResult.rawProject;
  } else if (parseResult.format === 'legacy-backup') {
    if (!parseResult.backup.projects || parseResult.backup.projects.length === 0) {
      throw new Error('Backup bundle contains no valid projects.');
    }
    importedProject = parseResult.backup.projects[0];
  } else {
    throw new Error('Unrecognized project format.');
  }

  let needsNewId = !isValidProjectId(importedProject.id);
  if (!needsNewId) {
    try {
      const existing = await storageService.readProject(importedProject.id);
      if (existing) {
        needsNewId = true;
      }
    } catch {
      // ID is not currently in library
    }
  }

  const now = new Date().toISOString();
  const projectToSave: Project = {
    ...importedProject,
    id: needsNewId ? crypto.randomUUID() : importedProject.id,
    name: needsNewId && importedProject.name ? `${importedProject.name} (Imported)` : importedProject.name,
    createdAt: importedProject.createdAt || now,
    updatedAt: now,
  };

  await storageService.saveProject(projectToSave);
  return projectToSave;
}

/**
 * Pure handler for opening and importing a native .drawz file.
 */
export async function handleOpenDrawzFile(
  event: Pick<IpcMainInvokeEvent, 'senderFrame'>,
  storageService: StorageService,
  deps?: FileHandlerDeps
): Promise<IpcResult<FileOpenResult>> {
  if (!isTrustedSender(event.senderFrame)) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access Denied: Invocations are only permitted from the Drawzware desktop shell.',
      },
    };
  }

  const showOpenDialog = deps?.showOpenDialog ?? (async (opts) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    return focusedWindow ? dialog.showOpenDialog(focusedWindow, opts) : dialog.showOpenDialog(opts);
  });
  const readFile = deps?.readFile ?? ((p) => fs.promises.readFile(p, 'utf-8'));

  try {
    const dialogResult = await showOpenDialog({
      title: 'Open Drawzware Project',
      filters: [
        { name: 'Drawzware Project (*.drawz)', extensions: ['drawz'] },
        { name: 'JSON Document (*.json)', extensions: ['json'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
      return {
        success: true,
        data: { canceled: true },
      };
    }

    const selectedFilePath = dialogResult.filePaths[0];

    let fileContent: string;
    try {
      fileContent = await readFile(selectedFilePath, 'utf-8');
    } catch (readErr) {
      return {
        success: false,
        error: {
          code: 'READ_FAILED',
          message: `Failed to read file: ${(readErr as Error).message}`,
        },
      };
    }

    const parseResult = parseProjectDocument(fileContent);
    if (!parseResult.success) {
      const codeMap: Record<string, 'MALFORMED_JSON' | 'UNSUPPORTED_VERSION' | 'CORRUPTED_DOCUMENT'> = {
        MALFORMED_JSON: 'MALFORMED_JSON',
        UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
        INVALID_ENVELOPE: 'CORRUPTED_DOCUMENT',
        INVALID_PROJECT: 'CORRUPTED_DOCUMENT',
        UNRECOGNIZED_FORMAT: 'CORRUPTED_DOCUMENT',
      };
      const code = codeMap[parseResult.code] || 'CORRUPTED_DOCUMENT';
      return {
        success: false,
        error: {
          code,
          message: parseResult.error,
          details: parseResult.details,
        },
      };
    }

    // Extract raw project
    let importedProject: Project;
    if (parseResult.format === 'canonical') {
      importedProject = parseResult.document.project;
    } else if (parseResult.format === 'legacy-project') {
      importedProject = parseResult.rawProject;
    } else if (parseResult.format === 'legacy-backup') {
      if (!parseResult.backup.projects || parseResult.backup.projects.length === 0) {
        return {
          success: false,
          error: {
            code: 'CORRUPTED_DOCUMENT',
            message: 'Backup bundle contains no valid projects.',
          },
        };
      }
      importedProject = parseResult.backup.projects[0];
    } else {
      return {
        success: false,
        error: {
          code: 'CORRUPTED_DOCUMENT',
          message: 'Unrecognized project format.',
        },
      };
    }

    // Protect existing library projects from silent overwrites:
    // If ID already exists or is invalid, generate a fresh unique UUID
    let needsNewId = !isValidProjectId(importedProject.id);
    if (!needsNewId) {
      try {
        const existing = await storageService.readProject(importedProject.id);
        if (existing) {
          needsNewId = true;
        }
      } catch {
        // ID is not currently in library
      }
    }

    const now = new Date().toISOString();
    const projectToSave: Project = {
      ...importedProject,
      id: needsNewId ? crypto.randomUUID() : importedProject.id,
      name: needsNewId && importedProject.name ? `${importedProject.name} (Imported)` : importedProject.name,
      createdAt: importedProject.createdAt || now,
      updatedAt: now,
    };

    await storageService.saveProject(projectToSave);

    return {
      success: true,
      data: {
        project: projectToSave,
        canceled: false,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : 'An unexpected error occurred while opening the file.',
      },
    };
  }
}

/**
 * Pure handler for exporting the current project as a standalone native .drawz file.
 */
export async function handleSaveDrawzFile(
  event: Pick<IpcMainInvokeEvent, 'senderFrame'>,
  projectData: unknown,
  deps?: FileHandlerDeps
): Promise<IpcResult<FileSaveResult>> {
  if (!isTrustedSender(event.senderFrame)) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access Denied: Invocations are only permitted from the Drawzware desktop shell.',
      },
    };
  }

  const validation = ProjectSchema.safeParse(projectData);
  if (!validation.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid project payload provided for export.',
        details: validation.error.format(),
      },
    };
  }

  const project = validation.data;
  const showSaveDialog = deps?.showSaveDialog ?? (async (opts) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    return focusedWindow ? dialog.showSaveDialog(focusedWindow, opts) : dialog.showSaveDialog(opts);
  });
  const writeFileAtomic = deps?.writeFileAtomic ?? defaultWriteFileAtomic;
  const appVersion = deps?.appVersion ?? '0.1.0';

  const defaultFilename = `${sanitizeFilename(project.name)}.drawz`;

  try {
    const dialogResult = await showSaveDialog({
      title: 'Save As .drawz',
      defaultPath: defaultFilename,
      filters: [{ name: 'Drawzware Project (*.drawz)', extensions: ['drawz'] }],
      properties: ['showOverwriteConfirmation'],
    });

    if (dialogResult.canceled || !dialogResult.filePath) {
      return {
        success: true,
        data: {
          saved: false,
          canceled: true,
        },
      };
    }

    let targetFilePath = dialogResult.filePath;
    if (!targetFilePath.toLowerCase().endsWith('.drawz')) {
      targetFilePath = `${targetFilePath}.drawz`;
    }

    const serializedContent = serializeDrawzDocument(project, appVersion);
    await writeFileAtomic(targetFilePath, serializedContent);

    return {
      success: true,
      data: {
        saved: true,
        canceled: false,
        filePath: targetFilePath,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'WRITE_FAILED',
        message: `Failed to save file: ${(err as Error).message}`,
      },
    };
  }
}

/**
 * Pure handler for importing a multi-project backup file into the local desktop storage library.
 * Performs upfront validation on all projects to avoid partial imports.
 * Protects existing desktop projects by renaming and re-identifying any collisions.
 */
export async function handleImportBackupFile(
  event: Pick<IpcMainInvokeEvent, 'senderFrame'>,
  storageService: StorageService,
  deps?: FileHandlerDeps
): Promise<IpcResult<FileBackupImportResult>> {
  if (!isTrustedSender(event.senderFrame)) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access Denied: Invocations are only permitted from the Drawzware desktop shell.',
      },
    };
  }

  const showOpenDialog =
    deps?.showOpenDialog ??
    (async (opts) => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      return focusedWindow ? dialog.showOpenDialog(focusedWindow, opts) : dialog.showOpenDialog(opts);
    });
  const readFile = deps?.readFile ?? fs.promises.readFile;

  try {
    const dialogResult = await showOpenDialog({
      title: 'Import Project Backup',
      filters: [
        {
          name: 'Drawzware Backup (*.drawzbackup, *.json, *.drawz)',
          extensions: ['drawzbackup', 'json', 'drawz'],
        },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
      return {
        success: true,
        data: { canceled: true },
      };
    }

    const selectedFilePath = dialogResult.filePaths[0];

    let fileContent: string;
    try {
      fileContent = await readFile(selectedFilePath, 'utf-8');
    } catch (readErr) {
      return {
        success: false,
        error: {
          code: 'READ_FAILED',
          message: `Failed to read backup file: ${(readErr as Error).message}`,
        },
      };
    }

    const parseResult = parseBackupDocument(fileContent);
    if (!parseResult.success) {
      const codeMap: Record<string, IpcErrorCode> = {
        MALFORMED_JSON: 'MALFORMED_JSON',
        UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
        EMPTY_BACKUP: 'EMPTY_BACKUP',
        INVALID_PROJECTS: 'INVALID_PROJECTS',
        UNRECOGNIZED_FORMAT: 'CORRUPTED_DOCUMENT',
      };
      const code = codeMap[parseResult.code] || 'CORRUPTED_DOCUMENT';
      return {
        success: false,
        error: {
          code,
          message: parseResult.error,
          details: parseResult.details,
        },
      };
    }

    if (!parseResult.projects || parseResult.projects.length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_BACKUP',
          message: 'Backup file contains no projects to import.',
        },
      };
    }

    const existingMetadata = await storageService.listProjects();
    const assignedIds = new Set(existingMetadata.map((p) => p.id));

    const summary: BackupImportSummary = {
      total: parseResult.projects.length,
      imported: 0,
      renamed: 0,
      failed: 0,
      importedProjects: [],
      errors: [],
    };

    for (const rawProj of parseResult.projects) {
      const needsNewId = !isValidProjectId(rawProj.id) || assignedIds.has(rawProj.id);
      let newId = rawProj.id;
      let newName = rawProj.name;

      if (needsNewId) {
        newId = crypto.randomUUID();
        while (assignedIds.has(newId)) {
          newId = crypto.randomUUID();
        }
        newName = rawProj.name ? `${rawProj.name} (Imported)` : 'Imported Project';
        summary.renamed++;
      }

      assignedIds.add(newId);

      const now = new Date().toISOString();
      const projectToSave: Project = {
        ...rawProj,
        id: newId,
        name: newName,
        createdAt: rawProj.createdAt || now,
        updatedAt: now,
      };

      try {
        await storageService.saveProject(projectToSave);
        summary.imported++;
        summary.importedProjects.push(projectToSave);
      } catch (err) {
        summary.failed++;
        summary.errors?.push({
          id: rawProj.id,
          name: rawProj.name,
          message: (err as Error).message,
        });
      }
    }

    if (summary.imported === 0 && summary.failed > 0) {
      return {
        success: false,
        error: {
          code: 'WRITE_FAILED',
          message: `Failed to import projects to desktop storage: ${summary.errors?.[0]?.message ?? 'Unknown storage error'}`,
          details: summary.errors,
        },
      };
    }

    if (summary.errors && summary.errors.length === 0) {
      delete summary.errors;
    }

    return {
      success: true,
      data: {
        canceled: false,
        summary,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'IO_ERROR',
        message: `Backup import failed: ${(err as Error).message}`,
      },
    };
  }
}

/**
 * Registers native file IPC handlers on electron ipcMain.
 */
export function registerFileIpcHandlers(
  ipcMain: IpcMain,
  storageService: StorageService,
  appVersion = '0.1.0'
): void {
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN_DRAWZ, (event) =>
    handleOpenDrawzFile(event, storageService, { appVersion })
  );
  ipcMain.handle(IPC_CHANNELS.FILE_SAVE_DRAWZ, (event, project) =>
    handleSaveDrawzFile(event, project, { appVersion })
  );
  ipcMain.handle(IPC_CHANNELS.FILE_IMPORT_BACKUP, (event) =>
    handleImportBackupFile(event, storageService, { appVersion })
  );
}

/**
 * Unregisters native file IPC handlers.
 */
export function unregisterFileIpcHandlers(ipcMain: IpcMain): void {
  ipcMain.removeHandler(IPC_CHANNELS.FILE_OPEN_DRAWZ);
  ipcMain.removeHandler(IPC_CHANNELS.FILE_SAVE_DRAWZ);
  ipcMain.removeHandler(IPC_CHANNELS.FILE_IMPORT_BACKUP);
}
