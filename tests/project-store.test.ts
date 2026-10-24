import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '@/features/projects/stores/useProjectStore';
import {
  setStorageAdapterForTesting,
  DesktopStorageAdapter,
  WebStorageAdapter,
  getStorageAdapter,
} from '@drawzware/storage';
import type { DesktopStorageApi } from '@/types/desktop';
import type { Project } from '@drawzware/contracts';
import { sampleArchitectureProject } from './fixtures/projects';
import { createFromTemplate } from '@/features/projects/utils/project-templates';
import { TEMPLATES } from '@/features/canvas/templates/templates';

// Mock localStorage for WebStorageAdapter testing
const mockLocalStorageStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockLocalStorageStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorageStore.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    mockLocalStorageStore.delete(key);
  }),
  clear: vi.fn(() => {
    mockLocalStorageStore.clear();
  }),
};

// Polyfill window and localStorage in test environment
Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: mockLocalStorage,
  },
  writable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

function resetStore() {
  useProjectStore.setState({
    projects: [],
    lastOpenedProjectId: null,
    loaded: false,
    loading: false,
    error: null,
  });
}

interface WindowWithDesktopApi {
  desktopApi?: {
    isDesktop: boolean;
    storage: DesktopStorageApi;
  };
}

function setupDesktopApi(mockStorage: DesktopStorageApi) {
  (window as unknown as WindowWithDesktopApi).desktopApi = {
    isDesktop: true,
    storage: mockStorage,
  };
  setStorageAdapterForTesting(null);
}

describe('useProjectStore — Asynchronous Project Store Integration', () => {
  beforeEach(() => {
    mockLocalStorageStore.clear();
    vi.clearAllMocks();
    delete (window as unknown as WindowWithDesktopApi).desktopApi;
    setStorageAdapterForTesting(null);
    resetStore();
  });

  describe('Storage Adapter Selection', () => {
    it('uses WebStorageAdapter when window.desktopApi is undefined', () => {
      const adapter = getStorageAdapter();
      expect(adapter.mode).toBe('web');
      expect(adapter).toBeInstanceOf(WebStorageAdapter);
    });

    it('uses DesktopStorageAdapter when window.desktopApi is present with isDesktop: true', () => {
      setupDesktopApi({
        listProjects: vi.fn(),
        readProject: vi.fn(),
        saveProject: vi.fn(),
        deleteProject: vi.fn(),
      });

      const adapter = getStorageAdapter();
      expect(adapter.mode).toBe('desktop');
      expect(adapter).toBeInstanceOf(DesktopStorageAdapter);
    });
  });

  describe('Initial Loading & Empty State vs Error State', () => {
    it('handles empty project library on desktop without reporting an error', async () => {
      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn().mockResolvedValue({ success: true, data: [] }),
        readProject: vi.fn(),
        saveProject: vi.fn(),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      const { loadProjects } = useProjectStore.getState();
      await loadProjects();

      const state = useProjectStore.getState();
      expect(state.projects).toEqual([]);
      expect(state.loaded).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('handles empty project library on web without reporting an error', async () => {
      // Empty localStorage
      const { loadProjects } = useProjectStore.getState();
      await loadProjects();

      const state = useProjectStore.getState();
      expect(state.projects).toEqual([]);
      expect(state.loaded).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('distinguishes storage failure from an empty library and retains existing projects', async () => {
      // Pre-seed in-memory store with an existing project
      useProjectStore.setState({
        projects: [sampleArchitectureProject as unknown as Project],
        loaded: true,
      });

      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn().mockResolvedValue({
          success: false,
          error: { code: 'IO_FAILURE', message: 'EACCES: permission denied' },
        }),
        readProject: vi.fn(),
        saveProject: vi.fn(),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      const { loadProjects } = useProjectStore.getState();
      await loadProjects();

      const state = useProjectStore.getState();
      // Invariant: Do NOT clear existing projects when a read fails
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].id).toBe(sampleArchitectureProject.id);
      expect(state.loading).toBe(false);
      expect(state.error).toContain('EACCES');
    });

    it('supports retrying a failed load operation successfully', async () => {
      let failFirst = true;
      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn().mockImplementation(async () => {
          if (failFirst) {
            failFirst = false;
            return {
              success: false,
              error: { code: 'IO_FAILURE', message: 'Temporary disk failure' },
            };
          }
          return {
            success: true,
            data: [
              {
                id: sampleArchitectureProject.id,
                name: sampleArchitectureProject.name,
                updatedAt: sampleArchitectureProject.updatedAt,
                createdAt: sampleArchitectureProject.createdAt,
              },
            ],
          };
        }),
        readProject: vi.fn().mockResolvedValue({
          success: true,
          data: sampleArchitectureProject,
        }),
        saveProject: vi.fn(),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      // First attempt fails
      await useProjectStore.getState().loadProjects();
      expect(useProjectStore.getState().error).toBe('Temporary disk failure');
      expect(useProjectStore.getState().projects).toHaveLength(0);

      // Retry succeeds
      await useProjectStore.getState().loadProjects();
      const state = useProjectStore.getState();
      expect(state.error).toBeNull();
      expect(state.loaded).toBe(true);
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].id).toBe(sampleArchitectureProject.id);
    });

    it('prevents concurrent duplicate loads while loading is in-flight', async () => {
      let resolveList: (val: { success: boolean; data: unknown[] }) => void;
      const listPromise = new Promise<{ success: boolean; data: unknown[] }>((resolve) => {
        resolveList = resolve;
      });

      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn().mockReturnValue(listPromise),
        readProject: vi.fn(),
        saveProject: vi.fn(),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      const p1 = useProjectStore.getState().loadProjects();
      const p2 = useProjectStore.getState().loadProjects();

      expect(mockStorage.listProjects).toHaveBeenCalledTimes(1);

      resolveList!({ success: true, data: [] });
      await Promise.all([p1, p2]);
      expect(mockStorage.listProjects).toHaveBeenCalledTimes(1);
    });
  });

  describe('Project CRUD Operations', () => {
    it('creates a project, persists via adapter, and prepends to store', async () => {
      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn(),
        readProject: vi.fn(),
        saveProject: vi.fn().mockResolvedValue({ success: true }),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      const project = await useProjectStore.getState().createProject('New Service', 'Service description');

      expect(project.id).toBeDefined();
      expect(project.name).toBe('New Service');
      expect(project.description).toBe('Service description');
      expect(mockStorage.saveProject).toHaveBeenCalledTimes(1);
      expect(mockStorage.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          id: project.id,
          name: 'New Service',
        })
      );

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].id).toBe(project.id);
    });

    it('does not update in-memory state if createProject fails on persistence', async () => {
      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn(),
        readProject: vi.fn(),
        saveProject: vi.fn().mockResolvedValue({
          success: false,
          error: { code: 'IO_FAILURE', message: 'Disk is full' },
        }),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      await expect(
        useProjectStore.getState().createProject('Failing Project')
      ).rejects.toThrow('Disk is full');

      expect(useProjectStore.getState().projects).toHaveLength(0);
    });

    it('renames a project and persists the updated project document', async () => {
      const initialProject = { ...(sampleArchitectureProject as unknown as Project) };
      useProjectStore.setState({ projects: [initialProject] });

      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn(),
        readProject: vi.fn(),
        saveProject: vi.fn().mockResolvedValue({ success: true }),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      await useProjectStore.getState().renameProject(initialProject.id, 'Renamed Architecture');

      expect(mockStorage.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          id: initialProject.id,
          name: 'Renamed Architecture',
        })
      );

      const state = useProjectStore.getState();
      expect(state.projects[0].name).toBe('Renamed Architecture');
    });

    it('duplicates a project with new ID and (Copy) title', async () => {
      const initialProject = { ...(sampleArchitectureProject as unknown as Project) };
      useProjectStore.setState({ projects: [initialProject] });

      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn(),
        readProject: vi.fn(),
        saveProject: vi.fn().mockResolvedValue({ success: true }),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      const duplicate = await useProjectStore.getState().duplicateProject(initialProject.id);

      expect(duplicate).not.toBeNull();
      expect(duplicate!.id).not.toBe(initialProject.id);
      expect(duplicate!.name).toBe(`${initialProject.name} (Copy)`);
      expect(mockStorage.saveProject).toHaveBeenCalledTimes(1);

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(2);
      expect(state.projects[0].id).toBe(duplicate!.id);
      expect(state.projects[1].id).toBe(initialProject.id);
    });

    it('deletes a project and clears lastOpenedProjectId if it was open', async () => {
      const initialProject = { ...(sampleArchitectureProject as unknown as Project) };
      useProjectStore.setState({
        projects: [initialProject],
        lastOpenedProjectId: initialProject.id,
      });

      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn(),
        readProject: vi.fn(),
        saveProject: vi.fn(),
        deleteProject: vi.fn().mockResolvedValue({ success: true }),
      };
      setupDesktopApi(mockStorage);

      await useProjectStore.getState().deleteProject(initialProject.id);

      expect(mockStorage.deleteProject).toHaveBeenCalledWith(initialProject.id);
      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(0);
      expect(state.lastOpenedProjectId).toBeNull();
    });

    it('does not remove from in-memory state if deleteProject persistence fails', async () => {
      const initialProject = { ...(sampleArchitectureProject as unknown as Project) };
      useProjectStore.setState({
        projects: [initialProject],
        lastOpenedProjectId: initialProject.id,
      });

      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn(),
        readProject: vi.fn(),
        saveProject: vi.fn(),
        deleteProject: vi.fn().mockResolvedValue({
          success: false,
          error: { code: 'IO_FAILURE', message: 'EPERM: operation not permitted' },
        }),
      };
      setupDesktopApi(mockStorage);

      await expect(
        useProjectStore.getState().deleteProject(initialProject.id)
      ).rejects.toThrow('EPERM');

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.lastOpenedProjectId).toBe(initialProject.id);
    });

    it('restores a deleted project with same id and persists', async () => {
      const initialProject = { ...(sampleArchitectureProject as unknown as Project) };
      useProjectStore.setState({ projects: [] });

      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn(),
        readProject: vi.fn(),
        saveProject: vi.fn().mockResolvedValue({ success: true }),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      await useProjectStore.getState().restoreProject(initialProject);

      expect(mockStorage.saveProject).toHaveBeenCalledWith(initialProject);
      expect(useProjectStore.getState().projects).toHaveLength(1);
    });
  });

  describe('Template-based Project Creation', () => {
    it('creates and persists a project with template nodes and edges', async () => {
      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn().mockResolvedValue({ success: true, data: [] }),
        readProject: vi.fn(),
        saveProject: vi.fn().mockResolvedValue({ success: true }),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      const sampleTemplate = TEMPLATES[0];
      const project = await createFromTemplate(sampleTemplate.id);

      expect(project).not.toBeNull();
      expect(project!.id).toBeDefined();
      expect(project!.name).toBe(sampleTemplate.name);
      expect(project!.nodes.length).toBeGreaterThan(0);
      expect(mockStorage.saveProject).toHaveBeenCalledTimes(2); // once for create, once for save with nodes/edges

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].id).toBe(project!.id);
    });
  });

  describe('Canvas Autosave Synchronous Contract', () => {
    it('saveProject maintains synchronous boolean return value for useAutoSave', () => {
      const initialProject = { ...(sampleArchitectureProject as unknown as Project) };
      useProjectStore.setState({ projects: [initialProject] });

      const updatedProject = {
        ...initialProject,
        name: 'Autosaved Title',
      };

      const result = useProjectStore.getState().saveProject(updatedProject);
      expect(result).toBe(true);
      expect(useProjectStore.getState().projects[0].name).toBe('Autosaved Title');
    });

    it('saveProjectAsync returns a Promise resolving to boolean', async () => {
      const initialProject = { ...(sampleArchitectureProject as unknown as Project) };
      useProjectStore.setState({ projects: [initialProject] });

      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn(),
        readProject: vi.fn(),
        saveProject: vi.fn().mockResolvedValue({ success: true }),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      const result = await useProjectStore.getState().saveProjectAsync({
        ...initialProject,
        name: 'Async Saved Title',
      });

      expect(result).toBe(true);
      expect(mockStorage.saveProject).toHaveBeenCalled();
      expect(useProjectStore.getState().projects[0].name).toBe('Async Saved Title');
    });
  });

  describe('Web Storage Adapter Regression & Persistence', () => {
    it('persists changes to localStorage when running in web mode', async () => {
      // In web mode (no window.desktopApi)
      const project = await useProjectStore.getState().createProject('Web App Project', 'Web description');
      expect(project.name).toBe('Web App Project');

      // Verify that localStorage contains the project
      const rawStored = mockLocalStorageStore.get('system-design-canvas');
      expect(rawStored).toBeDefined();
      const stored = JSON.parse(rawStored!);
      expect(stored.projects).toHaveLength(1);
      expect(stored.projects[0].id).toBe(project.id);

      // Loading projects in web mode reads from localStorage
      resetStore();
      await useProjectStore.getState().loadProjects();
      expect(useProjectStore.getState().projects).toHaveLength(1);
      expect(useProjectStore.getState().projects[0].name).toBe('Web App Project');
    });
  });

  describe('Concurrent Operations and Stale Async Results', () => {
    it('does not resurrect a deleted project if deleteProject races with an in-flight loadProjects', async () => {
      let resolveList: (val: { success: boolean; data: unknown[] }) => void;
      const listPromise = new Promise<{ success: boolean; data: unknown[] }>((resolve) => {
        resolveList = resolve;
      });

      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn().mockReturnValue(listPromise),
        readProject: vi.fn().mockResolvedValue({
          success: true,
          data: sampleArchitectureProject,
        }),
        saveProject: vi.fn(),
        deleteProject: vi.fn().mockResolvedValue({ success: true }),
      };
      setupDesktopApi(mockStorage);

      // Start asynchronous library load
      const loadPromise = useProjectStore.getState().loadProjects();

      // Concurrently delete the project before load resolves
      await useProjectStore.getState().deleteProject(sampleArchitectureProject.id);

      // Now resolve the in-flight list reading
      resolveList!({
        success: true,
        data: [
          {
            id: sampleArchitectureProject.id,
            name: sampleArchitectureProject.name,
            updatedAt: sampleArchitectureProject.updatedAt,
            createdAt: sampleArchitectureProject.createdAt,
          },
        ],
      });

      await loadPromise;

      const state = useProjectStore.getState();
      // The deleted project must NOT be resurrected
      expect(state.projects.find((p) => p.id === sampleArchitectureProject.id)).toBeUndefined();
    });

    it('does not wipe out a newly created project if createProject races with an in-flight loadProjects', async () => {
      let resolveList: (val: { success: boolean; data: unknown[] }) => void;
      const listPromise = new Promise<{ success: boolean; data: unknown[] }>((resolve) => {
        resolveList = resolve;
      });

      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn().mockReturnValue(listPromise),
        readProject: vi.fn(),
        saveProject: vi.fn().mockResolvedValue({ success: true }),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      // Start asynchronous library load
      const loadPromise = useProjectStore.getState().loadProjects();

      // Concurrently create a project before load resolves
      const created = await useProjectStore.getState().createProject('Concurrent New Project');

      // Now resolve list with empty library
      resolveList!({ success: true, data: [] });
      await loadPromise;

      const state = useProjectStore.getState();
      // The newly created project must still be present
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].id).toBe(created.id);
    });
  });
});
