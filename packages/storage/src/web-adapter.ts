import type { StorageAdapter } from './storage-adapter.interface';
import { StorageAdapterError } from './storage-adapter.interface';
import type { Project, LibraryProjectMetadata } from '@drawzware/contracts';

const STORAGE_KEY = 'system-design-canvas';
const CURRENT_VERSION = 1;

export interface WebAppData {
  version: number;
  projects: Project[];
  lastOpenedProjectId: string | null;
}

function loadAppData(): WebAppData {
  if (typeof window === 'undefined') {
    return { version: CURRENT_VERSION, projects: [], lastOpenedProjectId: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { version: CURRENT_VERSION, projects: [], lastOpenedProjectId: null };
    }
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.projects)) {
      return parsed as WebAppData;
    }
    return { version: CURRENT_VERSION, projects: [], lastOpenedProjectId: null };
  } catch {
    return { version: CURRENT_VERSION, projects: [], lastOpenedProjectId: null };
  }
}

function saveAppData(data: WebAppData): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * Web storage adapter wrapping browser localStorage persistence.
 */
export class WebStorageAdapter implements StorageAdapter {
  public readonly mode = 'web' as const;

  public async listProjects(): Promise<LibraryProjectMetadata[]> {
    const data = loadAppData();
    return data.projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      diagramType: p.diagramType,
      nodeCount: Array.isArray(p.nodes) ? p.nodes.length : 0,
      edgeCount: Array.isArray(p.edges) ? p.edges.length : 0,
      fileName: `${p.id}.drawz`,
    }));
  }

  public async readProject(id: string): Promise<Project> {
    const data = loadAppData();
    const found = data.projects.find((p) => p.id === id);
    if (!found) {
      throw new StorageAdapterError('FILE_NOT_FOUND', `Project "${id}" was not found in browser storage.`);
    }
    return found;
  }

  public async saveProject(project: Project): Promise<void> {
    const data = loadAppData();
    const existingIndex = data.projects.findIndex((p) => p.id === project.id);

    let updatedProjects: Project[];
    if (existingIndex >= 0) {
      updatedProjects = [...data.projects];
      updatedProjects[existingIndex] = project;
    } else {
      updatedProjects = [...data.projects, project];
    }

    const success = saveAppData({
      ...data,
      projects: updatedProjects,
    });

    if (!success) {
      throw new StorageAdapterError(
        'WRITE_FAILED',
        'Browser localStorage write failed (quota exceeded or private browsing restriction).'
      );
    }
  }

  public async deleteProject(id: string): Promise<void> {
    const data = loadAppData();
    const updatedProjects = data.projects.filter((p) => p.id !== id);
    const updatedLastOpened = data.lastOpenedProjectId === id ? null : data.lastOpenedProjectId;

    const success = saveAppData({
      ...data,
      projects: updatedProjects,
      lastOpenedProjectId: updatedLastOpened,
    });

    if (!success) {
      throw new StorageAdapterError('WRITE_FAILED', 'Failed to update browser storage on project deletion.');
    }
  }
}
