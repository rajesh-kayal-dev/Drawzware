import type { Project, LibraryProjectMetadata } from '@/types/document';
import type { IpcErrorCode } from '@/types/ipc';

export class StorageAdapterError extends Error {
  public readonly code: IpcErrorCode;
  public readonly details?: unknown;

  constructor(code: IpcErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'StorageAdapterError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, StorageAdapterError.prototype);
  }
}

/**
 * Universal asynchronous storage adapter interface.
 * Abstracts the persistence backend (Electron filesystem library vs. browser localStorage).
 */
export interface StorageAdapter {
  readonly mode: 'desktop' | 'web';

  /**
   * Lists metadata for all projects in the workspace or library.
   */
  listProjects(): Promise<LibraryProjectMetadata[]>;

  /**
   * Reads a project by its validated unique identifier.
   */
  readProject(id: string): Promise<Project>;

  /**
   * Persists a project (creates or updates).
   */
  saveProject(project: Project): Promise<void>;

  /**
   * Deletes a project by ID.
   */
  deleteProject(id: string): Promise<void>;
}
