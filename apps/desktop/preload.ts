import { contextBridge, ipcRenderer } from 'electron';
import type { IpcResult, FileBackupImportResult } from './types/ipc';
import type { Project, LibraryProjectMetadata } from './types/document';

const IPC_CHANNELS = {
  LIBRARY_LIST: 'library:list',
  LIBRARY_READ: 'library:read',
  LIBRARY_SAVE: 'library:save',
  LIBRARY_DELETE: 'library:delete',
  WINDOW_REQUEST_CLOSE: 'window:request-close',
  WINDOW_CLOSE_RESPONSE: 'window:close-response',
  FILE_OPEN_DRAWZ: 'file:open-drawz',
  FILE_SAVE_DRAWZ: 'file:save-drawz',
  FILE_IMPORT_BACKUP: 'file:import-backup',
} as const;

let closeHandler: (() => Promise<{ canClose: boolean; hasUnsaved?: boolean; error?: string }>) | null = null;

ipcRenderer.on(IPC_CHANNELS.WINDOW_REQUEST_CLOSE, async () => {
  if (!closeHandler) {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE_RESPONSE, { canClose: true, hasUnsaved: false });
    return;
  }
  try {
    const result = await closeHandler();
    ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE_RESPONSE, result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE_RESPONSE, {
      canClose: false,
      hasUnsaved: true,
      error: errorMsg,
    });
  }
});

/**
 * Strongly typed desktop API exposed to the renderer window.
 * Strict security rules:
 * - NO raw ipcRenderer exposure.
 * - NO arbitrary filesystem access.
 * - NO generic invoke() dispatcher.
 * - ONLY individual approved, typed functions.
 */
const desktopApi = {
  isDesktop: true as const,
  platform: process.platform,
  getAppVersion: async (): Promise<string> => {
    return ipcRenderer.invoke('app:version');
  },
  storage: {
    listProjects: async (): Promise<IpcResult<LibraryProjectMetadata[]>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_LIST);
    },
    readProject: async (id: string): Promise<IpcResult<Project>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_READ, id);
    },
    saveProject: async (project: Project): Promise<IpcResult<{ saved: boolean }>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_SAVE, project);
    },
    deleteProject: async (id: string): Promise<IpcResult<{ deleted: boolean }>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_DELETE, id);
    },
  },
  window: {
    registerCloseHandler: (
      handler: () => Promise<{ canClose: boolean; hasUnsaved?: boolean; error?: string }>
    ): (() => void) => {
      closeHandler = handler;
      return () => {
        if (closeHandler === handler) {
          closeHandler = null;
        }
      };
    },
  },
  file: {
    openDrawzFile: async (): Promise<IpcResult<{ project?: Project; canceled: boolean }>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_DRAWZ);
    },
    saveDrawzFile: async (
      project: Project
    ): Promise<IpcResult<{ saved: boolean; canceled: boolean; filePath?: string }>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE_DRAWZ, project);
    },
    importBackupFile: async (): Promise<IpcResult<FileBackupImportResult>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.FILE_IMPORT_BACKUP);
    },
  },
};

export type DesktopApi = typeof desktopApi;

contextBridge.exposeInMainWorld('desktopApi', desktopApi);
