import type { IpcResult, FileOpenResult, FileSaveResult, FileBackupImportResult } from './ipc';
import type { Project, LibraryProjectMetadata } from './document';

export interface DesktopStorageApi {
  listProjects(): Promise<IpcResult<LibraryProjectMetadata[]>>;
  readProject(id: string): Promise<IpcResult<Project>>;
  saveProject(project: Project): Promise<IpcResult<{ saved: boolean }>>;
  deleteProject(id: string): Promise<IpcResult<{ deleted: boolean }>>;
}

export interface WindowCloseHandlerResult {
  canClose: boolean;
  hasUnsaved?: boolean;
  error?: string;
}

export interface DesktopWindowApi {
  registerCloseHandler(handler: () => Promise<WindowCloseHandlerResult>): () => void;
}

export interface DesktopFileApi {
  openDrawzFile(): Promise<IpcResult<FileOpenResult>>;
  saveDrawzFile(project: Project): Promise<IpcResult<FileSaveResult>>;
  importBackupFile(): Promise<IpcResult<FileBackupImportResult>>;
}

export interface DesktopApi {
  readonly isDesktop: true;
  readonly platform: string;
  getAppVersion(): Promise<string>;
  readonly storage: DesktopStorageApi;
  readonly window: DesktopWindowApi;
  readonly file: DesktopFileApi;
}

declare global {
  interface Window {
    desktopApi?: DesktopApi;
  }
}
