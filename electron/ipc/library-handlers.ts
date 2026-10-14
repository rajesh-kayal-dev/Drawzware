import type { IpcMain, IpcMainInvokeEvent, WebFrameMain } from 'electron';
import {
  IPC_CHANNELS,
  type IpcResult,
  type IpcErrorCode,
} from '../types/ipc';
import {
  isValidProjectId,
  ProjectSchema,
  type Project,
  type LibraryProjectMetadata,
} from '../types/document';
import { StorageService, StorageError } from '../services/storage.service';

/**
 * Validates that an IPC invocation originates from the trusted app://drawzware scheme.
 * Untrusted or external frames are immediately rejected.
 */
export function isTrustedSender(senderFrame: WebFrameMain | null | undefined): boolean {
  if (!senderFrame || typeof senderFrame.url !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(senderFrame.url);
    return parsed.protocol === 'app:' && parsed.hostname === 'drawzware';
  } catch {
    return false;
  }
}

function unauthorizedResult<T>(): IpcResult<T> {
  return {
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Access Denied: Invocations are only permitted from the Drawzware desktop shell.',
    },
  };
}

function mapStorageErrorToIpcResult<T>(err: unknown): IpcResult<T> {
  if (err instanceof StorageError) {
    const codeMap: Record<string, IpcErrorCode> = {
      INVALID_ID: 'INVALID_ID',
      VALIDATION_FAILED: 'VALIDATION_FAILED',
      FILE_NOT_FOUND: 'FILE_NOT_FOUND',
      CORRUPTED_DOCUMENT: 'CORRUPTED_DOCUMENT',
      UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
      WRITE_FAILED: 'WRITE_FAILED',
      IO_ERROR: 'IO_ERROR',
      UNRECOGNIZED_FORMAT: 'CORRUPTED_DOCUMENT',
    };
    const code = codeMap[err.code] || 'UNKNOWN_ERROR';
    return {
      success: false,
      error: {
        code,
        message: err.message,
        details: err.details,
      },
    };
  }

  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: err instanceof Error ? err.message : 'An unexpected storage error occurred.',
    },
  };
}

/**
 * Pure handler for listing library projects.
 */
export async function handleListProjects(
  event: Pick<IpcMainInvokeEvent, 'senderFrame'>,
  storageService: StorageService
): Promise<IpcResult<LibraryProjectMetadata[]>> {
  if (!isTrustedSender(event.senderFrame)) {
    return unauthorizedResult<LibraryProjectMetadata[]>();
  }

  try {
    const projects = await storageService.listProjects();
    return { success: true, data: projects };
  } catch (err) {
    return mapStorageErrorToIpcResult<LibraryProjectMetadata[]>(err);
  }
}

/**
 * Pure handler for reading a single project by ID.
 */
export async function handleReadProject(
  event: Pick<IpcMainInvokeEvent, 'senderFrame'>,
  id: unknown,
  storageService: StorageService
): Promise<IpcResult<Project>> {
  if (!isTrustedSender(event.senderFrame)) {
    return unauthorizedResult<Project>();
  }

  if (typeof id !== 'string' || !isValidProjectId(id)) {
    return {
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Invalid project ID. Must contain only alphanumeric characters, underscores, and hyphens (max 128 chars).`,
      },
    };
  }

  try {
    const project = await storageService.readProject(id);
    return { success: true, data: project };
  } catch (err) {
    return mapStorageErrorToIpcResult<Project>(err);
  }
}

/**
 * Pure handler for saving a project.
 */
export async function handleSaveProject(
  event: Pick<IpcMainInvokeEvent, 'senderFrame'>,
  projectData: unknown,
  storageService: StorageService
): Promise<IpcResult<{ saved: boolean }>> {
  if (!isTrustedSender(event.senderFrame)) {
    return unauthorizedResult<{ saved: boolean }>();
  }

  const validation = ProjectSchema.safeParse(projectData);
  if (!validation.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Project payload does not match required schema.',
        details: validation.error.format(),
      },
    };
  }

  try {
    const res = await storageService.saveProject(validation.data);
    return { success: true, data: { saved: res.success } };
  } catch (err) {
    return mapStorageErrorToIpcResult<{ saved: boolean }>(err);
  }
}

/**
 * Pure handler for deleting a project by ID.
 */
export async function handleDeleteProject(
  event: Pick<IpcMainInvokeEvent, 'senderFrame'>,
  id: unknown,
  storageService: StorageService
): Promise<IpcResult<{ deleted: boolean }>> {
  if (!isTrustedSender(event.senderFrame)) {
    return unauthorizedResult<{ deleted: boolean }>();
  }

  if (typeof id !== 'string' || !isValidProjectId(id)) {
    return {
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Invalid project ID. Must contain only alphanumeric characters, underscores, and hyphens (max 128 chars).`,
      },
    };
  }

  try {
    const res = await storageService.deleteProject(id);
    return { success: true, data: { deleted: res.success } };
  } catch (err) {
    return mapStorageErrorToIpcResult<{ deleted: boolean }>(err);
  }
}

/**
 * Registers all typed library IPC handlers on the electron ipcMain instance.
 */
export function registerLibraryIpcHandlers(
  ipcMain: IpcMain,
  storageService: StorageService
): void {
  ipcMain.handle(IPC_CHANNELS.LIBRARY_LIST, (event) => handleListProjects(event, storageService));
  ipcMain.handle(IPC_CHANNELS.LIBRARY_READ, (event, id) => handleReadProject(event, id, storageService));
  ipcMain.handle(IPC_CHANNELS.LIBRARY_SAVE, (event, project) => handleSaveProject(event, project, storageService));
  ipcMain.handle(IPC_CHANNELS.LIBRARY_DELETE, (event, id) => handleDeleteProject(event, id, storageService));
}

/**
 * Removes registered library IPC handlers (used during testing or teardown).
 */
export function unregisterLibraryIpcHandlers(ipcMain: IpcMain): void {
  ipcMain.removeHandler(IPC_CHANNELS.LIBRARY_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.LIBRARY_READ);
  ipcMain.removeHandler(IPC_CHANNELS.LIBRARY_SAVE);
  ipcMain.removeHandler(IPC_CHANNELS.LIBRARY_DELETE);
}
