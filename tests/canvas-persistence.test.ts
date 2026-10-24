import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { useProjectStore } from '@/stores/useProjectStore';
import {
  setStorageAdapterForTesting,
  WebStorageAdapter,
} from '@drawzware/storage';
import type { DesktopStorageApi } from '@/types/desktop';
import type { Project, SystemNode, SystemEdge, DiagramType } from '@/types';
import { sampleArchitectureProject } from './fixtures/projects';
import { persistCanvasSnapshot, type CanvasSnapshot } from '@/hooks/useAutoSave';

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
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

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

function resetStores() {
  useProjectStore.setState({
    projects: [],
    lastOpenedProjectId: null,
    loaded: false,
    loading: false,
    error: null,
  });

  useCanvasStore.setState({
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedNodeId: null,
    selectedEdgeId: null,
    projectId: null,
    diagramType: 'architecture',
    diagramData: {
      architecture: { nodes: [], edges: [] },
      sequence: { nodes: [], edges: [] },
      er: { nodes: [], edges: [] },
    },
    saveStatus: 'saved',
  });
}

describe('Milestone 2B2B2 — Reliable Canvas Persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockLocalStorageStore.clear();
    vi.clearAllMocks();
    delete (window as unknown as WindowWithDesktopApi).desktopApi;
    setStorageAdapterForTesting(null);
    resetStores();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial Canvas Hydration', () => {
    it('loads the project document from desktop storage when opening canvas in Electron', async () => {
      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn(),
        readProject: vi.fn().mockResolvedValue({
          success: true,
          data: sampleArchitectureProject,
        }),
        saveProject: vi.fn(),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      const project = await useProjectStore.getState().getOrLoadProject(sampleArchitectureProject.id);

      expect(project).not.toBeNull();
      expect(project!.id).toBe(sampleArchitectureProject.id);
      expect(mockStorage.readProject).toHaveBeenCalledWith(sampleArchitectureProject.id);

      // Hydrate into canvas store
      useCanvasStore.getState().initCanvas(
        project!.id,
        project!.nodes as SystemNode[],
        project!.edges as SystemEdge[],
        project!.viewport,
        project!.diagramType || 'architecture',
        project!.diagramData as unknown as Record<DiagramType, { nodes: SystemNode[]; edges: SystemEdge[]; }> | undefined
      );

      const canvas = useCanvasStore.getState();
      expect(canvas.projectId).toBe(sampleArchitectureProject.id);
      expect(canvas.nodes).toHaveLength(sampleArchitectureProject.nodes.length);
      expect(canvas.edges).toHaveLength(sampleArchitectureProject.edges.length);
      expect(canvas.viewport).toEqual(sampleArchitectureProject.viewport);
      expect(canvas.saveStatus).toBe('saved');
    });

    it('returns null and does not hydrate when project is not found in storage', async () => {
      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn(),
        readProject: vi.fn().mockResolvedValue({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Project not found on disk' },
        }),
        saveProject: vi.fn(),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      const project = await useProjectStore.getState().getOrLoadProject('non-existent-id');

      expect(project).toBeNull();
      expect(useCanvasStore.getState().projectId).toBeNull();
    });

    it('loads project from web storage adapter when running in browser mode', async () => {
      // Seed web localStorage
      const adapter = new WebStorageAdapter();
      await adapter.saveProject(sampleArchitectureProject as unknown as Project);

      // Verify getOrLoadProject loads it from web adapter
      const project = await useProjectStore.getState().getOrLoadProject(sampleArchitectureProject.id);
      expect(project).not.toBeNull();
      expect(project!.name).toBe(sampleArchitectureProject.name);
    });
  });

  describe('Asynchronous Canvas Persistence & Status Tracking', () => {
    it('persists canvas snapshot to desktop storage and updates saveStatus to saved', async () => {
      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn(),
        readProject: vi.fn(),
        saveProject: vi.fn().mockResolvedValue({ success: true }),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      const snapshot: CanvasSnapshot = {
        version: 1,
        projectId: 'test-canvas-proj',
        nodes: [{ id: 'n1', type: 'system', position: { x: 50, y: 50 }, data: { label: 'Auth', nodeType: 'service', techStack: [] } }],
        edges: [],
        viewport: { x: 10, y: 20, zoom: 1.2 },
        diagramType: 'architecture',
        diagramData: {
          architecture: { nodes: [], edges: [] },
          sequence: { nodes: [], edges: [] },
          er: { nodes: [], edges: [] },
        },
      };

      const success = await persistCanvasSnapshot(snapshot);
      expect(success).toBe(true);

      expect(mockStorage.saveProject).toHaveBeenCalledTimes(1);
      expect(mockStorage.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-canvas-proj',
          viewport: { x: 10, y: 20, zoom: 1.2 },
          nodes: expect.arrayContaining([expect.objectContaining({ id: 'n1' })]),
        })
      );
    });

    it('handles persistence failures accurately without clearing valid project data', async () => {
      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn(),
        readProject: vi.fn(),
        saveProject: vi.fn().mockResolvedValue({
          success: false,
          error: { code: 'IO_FAILURE', message: 'EACCES: permission denied' },
        }),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      // Pre-seed canvas store with nodes
      useCanvasStore.setState({
        projectId: 'test-proj',
        nodes: [{ id: 'node-keep', type: 'system', position: { x: 0, y: 0 }, data: { label: 'KeepMe', nodeType: 'service', techStack: [] } }],
      });

      const snapshot: CanvasSnapshot = {
        version: 1,
        projectId: 'test-proj',
        nodes: useCanvasStore.getState().nodes,
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        diagramType: 'architecture',
        diagramData: {
          architecture: { nodes: [], edges: [] },
          sequence: { nodes: [], edges: [] },
          er: { nodes: [], edges: [] },
        },
      };

      const success = await persistCanvasSnapshot(snapshot);
      expect(success).toBe(false);

      // Verify existing in-memory nodes were preserved
      expect(useCanvasStore.getState().nodes).toHaveLength(1);
      expect(useCanvasStore.getState().nodes[0].id).toBe('node-keep');
    });
  });

  describe('Overlapping Edits, Ordering and Stale Write Prevention', () => {
    it('ensures newer edits are persisted after an in-flight save resolves', async () => {
      let resolveFirstSave: (val: { success: boolean }) => void;
      const firstSavePromise = new Promise<{ success: boolean }>((resolve) => {
        resolveFirstSave = resolve;
      });

      const saveCalls: Project[] = [];
      const mockStorage: DesktopStorageApi = {
        listProjects: vi.fn(),
        readProject: vi.fn(),
        saveProject: vi.fn().mockImplementation((project) => {
          saveCalls.push(project);
          if (saveCalls.length === 1) {
            return firstSavePromise;
          }
          return Promise.resolve({ success: true });
        }),
        deleteProject: vi.fn(),
      };
      setupDesktopApi(mockStorage);

      // Edit 1: move node to (100, 100)
      const snapshot1: CanvasSnapshot = {
        version: 1,
        projectId: 'proj-overlap',
        nodes: [{ id: 'n1', type: 'system', position: { x: 100, y: 100 }, data: { label: 'V1', nodeType: 'service', techStack: [] } }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        diagramType: 'architecture',
        diagramData: { architecture: { nodes: [], edges: [] }, sequence: { nodes: [], edges: [] }, er: { nodes: [], edges: [] } },
      };

      // Start save 1 (in-flight)
      const save1Promise = persistCanvasSnapshot(snapshot1);
      expect(mockStorage.saveProject).toHaveBeenCalledTimes(1);

      // Edit 2: arrives while save 1 is in-flight: move node to (250, 250)
      const snapshot2: CanvasSnapshot = {
        version: 2,
        projectId: 'proj-overlap',
        nodes: [{ id: 'n1', type: 'system', position: { x: 250, y: 250 }, data: { label: 'V2', nodeType: 'service', techStack: [] } }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        diagramType: 'architecture',
        diagramData: { architecture: { nodes: [], edges: [] }, sequence: { nodes: [], edges: [] }, er: { nodes: [], edges: [] } },
      };

      // Resolve save 1
      resolveFirstSave!({ success: true });
      await save1Promise;

      // Save 2 is executed next
      const save2Result = await persistCanvasSnapshot(snapshot2);
      expect(save2Result).toBe(true);
      expect(mockStorage.saveProject).toHaveBeenCalledTimes(2);

      // Final state on disk reflects Edit 2
      const lastSavedProject = saveCalls[1];
      expect(lastSavedProject.nodes[0].position).toEqual({ x: 250, y: 250 });
      expect(lastSavedProject.nodes[0].data.label).toBe('V2');
    });

    it('persists changes to localStorage in web mode', async () => {
      // In web mode without desktopApi
      const snapshot: CanvasSnapshot = {
        version: 1,
        projectId: 'web-canvas-proj',
        nodes: [{ id: 'node-web', type: 'system', position: { x: 10, y: 10 }, data: { label: 'Web Component', nodeType: 'service', techStack: [] } }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        diagramType: 'architecture',
        diagramData: { architecture: { nodes: [], edges: [] }, sequence: { nodes: [], edges: [] }, er: { nodes: [], edges: [] } },
      };

      const success = await persistCanvasSnapshot(snapshot);
      expect(success).toBe(true);

      // Verify that localStorage contains the saved project
      const raw = mockLocalStorageStore.get('system-design-canvas');
      expect(raw).toBeDefined();
      const stored = JSON.parse(raw!);
      expect(stored.projects).toHaveLength(1);
      expect(stored.projects[0].id).toBe('web-canvas-proj');
      expect(stored.projects[0].nodes[0].id).toBe('node-web');
    });
  });
});
