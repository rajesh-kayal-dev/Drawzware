import type { StorageAdapter } from './storage-adapter.interface';
import { StorageAdapterError } from './storage-adapter.interface';
import type { Project, LibraryProjectMetadata, IpcErrorCode } from '@drawzware/contracts';

export interface DesktopStorageApiLike {
  listProjects(): Promise<{ success: true; data: LibraryProjectMetadata[] } | { success: false; error: { code: IpcErrorCode; message: string; details?: unknown } }>;
  readProject(id: string): Promise<{ success: true; data: Project } | { success: false; error: { code: IpcErrorCode; message: string; details?: unknown } }>;
  saveProject(project: Project): Promise<{ success: true; data: { saved: boolean } } | { success: false; error: { code: IpcErrorCode; message: string; details?: unknown } }>;
  deleteProject(id: string): Promise<{ success: true; data: { deleted: boolean } } | { success: false; error: { code: IpcErrorCode; message: string; details?: unknown } }>;
}

export class DesktopStorageAdapter implements StorageAdapter {
  public readonly mode = 'desktop' as const;

  private getApi(): DesktopStorageApiLike {
    const win = typeof window !== 'undefined' ? (window as unknown as { desktopApi?: { storage?: DesktopStorageApiLike } }) : undefined;
    if (!win || !win.desktopApi?.storage) {
      throw new StorageAdapterError(
        'UNAUTHORIZED',
        'Desktop storage API is not available. Ensure the application is running inside Electron.'
      );
    }
    return win.desktopApi.storage;
  }

  public async listProjects(): Promise<LibraryProjectMetadata[]> {
    const api = this.getApi();
    const res = await api.listProjects();
    if (!res.success) {
      throw new StorageAdapterError(res.error.code, res.error.message, res.error.details);
    }
    return res.data;
  }

  public async readProject(id: string): Promise<Project> {
    const api = this.getApi();
    const res = await api.readProject(id);
    if (!res.success) {
      throw new StorageAdapterError(res.error.code, res.error.message, res.error.details);
    }
    return res.data;
  }

  public async saveProject(project: Project): Promise<void> {
    const api = this.getApi();
    const res = await api.saveProject(project);
    if (!res.success) {
      throw new StorageAdapterError(res.error.code, res.error.message, res.error.details);
    }
  }

  public async deleteProject(id: string): Promise<void> {
    const api = this.getApi();
    const res = await api.deleteProject(id);
    if (!res.success) {
      throw new StorageAdapterError(res.error.code, res.error.message, res.error.details);
    }
  }
}
