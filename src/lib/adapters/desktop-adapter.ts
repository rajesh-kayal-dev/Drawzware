import type { StorageAdapter } from './storage-adapter.interface';
import { StorageAdapterError } from './storage-adapter.interface';
import type { Project, LibraryProjectMetadata } from '@/types/document';
import type { DesktopStorageApi } from '@/types/desktop';

export class DesktopStorageAdapter implements StorageAdapter {
  public readonly mode = 'desktop' as const;

  private getApi(): DesktopStorageApi {
    if (typeof window === 'undefined' || !window.desktopApi?.storage) {
      throw new StorageAdapterError(
        'UNAUTHORIZED',
        'Desktop storage API is not available. Ensure the application is running inside Electron.'
      );
    }
    return window.desktopApi.storage;
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
