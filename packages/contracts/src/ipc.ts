import type { Project, LibraryProjectMetadata } from './document';

export const IPC_CHANNELS = {
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

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export interface WindowCloseResponsePayload {
  canClose: boolean;
  hasUnsaved?: boolean;
  error?: string;
}

export interface FileOpenResult {
  project?: Project;
  canceled: boolean;
}

export interface FileSaveResult {
  saved: boolean;
  canceled: boolean;
  filePath?: string;
}

export interface BackupImportSummary {
  total: number;
  imported: number;
  renamed: number;
  failed: number;
  importedProjects: Project[];
  errors?: Array<{ id?: string; name?: string; message: string }>;
}

export interface FileBackupImportResult {
  canceled: boolean;
  summary?: BackupImportSummary;
}

export type IpcErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_ID'
  | 'VALIDATION_FAILED'
  | 'FILE_NOT_FOUND'
  | 'CORRUPTED_DOCUMENT'
  | 'UNSUPPORTED_VERSION'
  | 'WRITE_FAILED'
  | 'READ_FAILED'
  | 'MALFORMED_JSON'
  | 'EMPTY_BACKUP'
  | 'INVALID_PROJECTS'
  | 'IO_ERROR'
  | 'UNKNOWN_ERROR';

export interface IpcErrorPayload {
  code: IpcErrorCode;
  message: string;
  details?: unknown;
}

export type IpcResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: IpcErrorPayload;
    };

/**
 * Strongly typed interface for internal library IPC invocations.
 */
export interface LibraryStorageIpcApi {
  listProjects(): Promise<IpcResult<LibraryProjectMetadata[]>>;
  readProject(id: string): Promise<IpcResult<Project>>;
  saveProject(project: Project): Promise<IpcResult<{ saved: boolean }>>;
  deleteProject(id: string): Promise<IpcResult<{ deleted: boolean }>>;
}

/**
 * Strongly typed interface for native standalone file operations.
 */
export interface FileIpcApi {
  openDrawzFile(): Promise<IpcResult<FileOpenResult>>;
  saveDrawzFile(project: Project): Promise<IpcResult<FileSaveResult>>;
  importBackupFile(): Promise<IpcResult<FileBackupImportResult>>;
}
