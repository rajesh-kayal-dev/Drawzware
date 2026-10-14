import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DesktopStorageAdapter,
  WebStorageAdapter,
  getStorageAdapter,
  setStorageAdapterForTesting,
  StorageAdapterError,
} from '../src/lib/adapters';
import type { DesktopStorageApi } from '../src/types/desktop';
import { sampleArchitectureProject } from './fixtures/projects';

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

describe('Storage Adapters (Desktop & Web)', () => {
  beforeEach(() => {
    mockLocalStorageStore.clear();
    vi.clearAllMocks();
    setStorageAdapterForTesting(null);
    delete (window as { desktopApi?: unknown }).desktopApi;
  });

  describe('DesktopStorageAdapter', () => {
    it('throws UNAUTHORIZED when desktopApi is not present in window', async () => {
      const adapter = new DesktopStorageAdapter();
      expect(adapter.mode).toBe('desktop');

      await expect(adapter.listProjects()).rejects.toThrowError(StorageAdapterError);
      await expect(adapter.readProject('proj-1')).rejects.toThrowError(StorageAdapterError);
      await expect(adapter.saveProject(sampleArchitectureProject)).rejects.toThrowError(StorageAdapterError);
      await expect(adapter.deleteProject('proj-1')).rejects.toThrowError(StorageAdapterError);
    });

    it('delegates listProjects to window.desktopApi.storage and unwraps result', async () => {
      const mockList = vi.fn().mockResolvedValue({
        success: true,
        data: [{ id: 'proj-1', name: 'Proj 1', fileName: 'proj-1.drawz', nodeCount: 1, edgeCount: 0 }],
      });

      window.desktopApi = {
        isDesktop: true,
        platform: 'win32',
        getAppVersion: vi.fn(),
        storage: {
          listProjects: mockList,
          readProject: vi.fn(),
          saveProject: vi.fn(),
          deleteProject: vi.fn(),
        },
        window: {
          registerCloseHandler: vi.fn(),
        },
        file: {
          openDrawzFile: vi.fn(),
          saveDrawzFile: vi.fn(),
          importBackupFile: vi.fn(),
        },
      };

      const adapter = new DesktopStorageAdapter();
      const projects = await adapter.listProjects();

      expect(mockList).toHaveBeenCalledTimes(1);
      expect(projects.length).toBe(1);
      expect(projects[0].id).toBe('proj-1');
    });

    it('delegates readProject, saveProject, and deleteProject with error translation', async () => {
      const mockRead = vi.fn().mockResolvedValue({
        success: true,
        data: sampleArchitectureProject,
      });
      const mockSave = vi.fn().mockResolvedValue({
        success: true,
        data: { saved: true },
      });
      const mockDelete = vi.fn().mockResolvedValue({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'Project not found' },
      });

      window.desktopApi = {
        isDesktop: true,
        platform: 'win32',
        getAppVersion: vi.fn(),
        storage: {
          listProjects: vi.fn(),
          readProject: mockRead,
          saveProject: mockSave,
          deleteProject: mockDelete,
        },
        window: {
          registerCloseHandler: vi.fn(),
        },
        file: {
          openDrawzFile: vi.fn(),
          saveDrawzFile: vi.fn(),
          importBackupFile: vi.fn(),
        },
      };

      const adapter = new DesktopStorageAdapter();

      // Read
      const loaded = await adapter.readProject(sampleArchitectureProject.id);
      expect(loaded.id).toBe(sampleArchitectureProject.id);

      // Save
      await expect(adapter.saveProject(sampleArchitectureProject)).resolves.toBeUndefined();
      expect(mockSave).toHaveBeenCalledWith(sampleArchitectureProject);

      // Delete (failure)
      await expect(adapter.deleteProject('non-existent')).rejects.toThrowError(StorageAdapterError);
      try {
        await adapter.deleteProject('non-existent');
      } catch (err) {
        expect((err as StorageAdapterError).code).toBe('FILE_NOT_FOUND');
      }
    });
  });

  describe('WebStorageAdapter', () => {
    it('operates with localStorage and maintains existing behavior', async () => {
      const adapter = new WebStorageAdapter();
      expect(adapter.mode).toBe('web');

      // 1. Initial list should be empty
      const initialList = await adapter.listProjects();
      expect(initialList).toEqual([]);

      // 2. Save a project
      await adapter.saveProject(sampleArchitectureProject);

      // 3. List should show saved project metadata
      const updatedList = await adapter.listProjects();
      expect(updatedList.length).toBe(1);
      expect(updatedList[0].id).toBe(sampleArchitectureProject.id);
      expect(updatedList[0].name).toBe(sampleArchitectureProject.name);
      expect(updatedList[0].nodeCount).toBe(2);

      // 4. Read saved project
      const loaded = await adapter.readProject(sampleArchitectureProject.id);
      expect(loaded.id).toBe(sampleArchitectureProject.id);
      expect(loaded.name).toBe(sampleArchitectureProject.name);

      // 5. Delete project
      await adapter.deleteProject(sampleArchitectureProject.id);

      // 6. Project should no longer be found
      await expect(adapter.readProject(sampleArchitectureProject.id)).rejects.toThrowError(StorageAdapterError);
      const postDeleteList = await adapter.listProjects();
      expect(postDeleteList.length).toBe(0);
    });

    it('throws FILE_NOT_FOUND when reading a non-existent project', async () => {
      const adapter = new WebStorageAdapter();
      await expect(adapter.readProject('does-not-exist')).rejects.toThrowError(StorageAdapterError);
      try {
        await adapter.readProject('does-not-exist');
      } catch (err) {
        expect((err as StorageAdapterError).code).toBe('FILE_NOT_FOUND');
      }
    });
  });

  describe('Adapter Selection Factory (getStorageAdapter)', () => {
    it('selects DesktopStorageAdapter when running inside Electron shell', () => {
      window.desktopApi = {
        isDesktop: true,
        platform: 'win32',
        getAppVersion: vi.fn(),
        storage: {} as DesktopStorageApi,
        window: {
          registerCloseHandler: vi.fn(),
        },
        file: {
          openDrawzFile: vi.fn(),
          saveDrawzFile: vi.fn(),
          importBackupFile: vi.fn(),
        },
      };

      const adapter = getStorageAdapter();
      expect(adapter.mode).toBe('desktop');
      expect(adapter instanceof DesktopStorageAdapter).toBe(true);
    });

    it('selects WebStorageAdapter when running in standard browser', () => {
      delete (window as { desktopApi?: unknown }).desktopApi;

      const adapter = getStorageAdapter();
      expect(adapter.mode).toBe('web');
      expect(adapter instanceof WebStorageAdapter).toBe(true);
    });
  });
});
