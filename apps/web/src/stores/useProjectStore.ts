import { create } from 'zustand';
import { clearAppData, loadAppData, saveAppData } from '@/lib/storage';
import { getStorageAdapter } from '@/lib/adapters';
import type { Project, AppData } from '@/types';

interface ProjectStore {
  projects: Project[];
  lastOpenedProjectId: string | null;
  loaded: boolean;
  loading: boolean;
  error: string | null;

  /** Asynchronously loads projects using the active StorageAdapter (desktop or web). */
  loadProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<Project | null>;
  importProject: (json: string) => Promise<Project | null>;
  exportProject: (id: string) => string | null;
  /** Synchronous save method preserving backward compatibility. */
  saveProject: (project: Project) => boolean;
  /** Asynchronous save method for callers requiring awaited persistence. */
  saveProjectAsync: (project: Project) => Promise<boolean>;
  /** Load a specific project from storage if not already in memory. */
  getOrLoadProject: (id: string) => Promise<Project | null>;
  setLastOpened: (id: string | null) => void;
  /** Put a deleted project back (same id). No-op if it still exists. */
  restoreProject: (project: Project) => Promise<void>;
  /** Add projects from an exported file. Each gets a fresh id; timestamps are kept when present. */
  importProjects: (items: Partial<Project>[]) => Promise<Project[]>;
  /** Remove every project from memory and storage. */
  clearAllProjects: () => Promise<void>;
  /** Add projects moved from another origin, keeping ids and timestamps. Existing ids are skipped. */
  mergeProjects: (items: Project[]) => Promise<{ added: number; skipped: number }>;
}

// Track project IDs deleted in the current session to prevent in-flight loads from resurrecting them
const deletedProjectIds = new Set<string>();

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  lastOpenedProjectId: null,
  loaded: false,
  loading: false,
  error: null,

  loadProjects: async () => {
    // Guard against duplicate concurrent reads
    if (get().loading) return;

    set({ loading: true, error: null });

    try {
      const adapter = getStorageAdapter();

      if (adapter.mode === 'web') {
        const data = loadAppData();
        set((current) => {
          const validLoaded = data.projects.filter((p) => !deletedProjectIds.has(p.id));
          const loadedIds = new Set(validLoaded.map((p) => p.id));
          const newlyAdded = current.projects.filter((p) => !loadedIds.has(p.id) && !deletedProjectIds.has(p.id));
          return {
            projects: [...newlyAdded, ...validLoaded],
            lastOpenedProjectId: data.lastOpenedProjectId,
            loaded: true,
            loading: false,
            error: null,
          };
        });
      } else {
        // Desktop adapter: read metadata list and hydrate projects
        const metadataList = await adapter.listProjects();
        const loadedProjects = await Promise.all(
          metadataList.map(async (meta) => {
            return await adapter.readProject(meta.id);
          })
        );

        // Sort by updatedAt descending
        loadedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        set((current) => {
          // Reconcile: Filter out any projects deleted while load was in-flight
          const validLoaded = loadedProjects.filter((p) => !deletedProjectIds.has(p.id));
          // Preserve any projects created in-memory while load was in-flight
          const loadedIds = new Set(validLoaded.map((p) => p.id));
          const newlyAdded = current.projects.filter((p) => !loadedIds.has(p.id) && !deletedProjectIds.has(p.id));

          return {
            projects: [...newlyAdded, ...validLoaded],
            loaded: true,
            loading: false,
            error: null,
          };
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load projects from storage.';
      console.error('[useProjectStore] Failed to load projects:', err);
      set({
        loading: false,
        error: message,
        // Invariant: Do NOT clear existing projects when a read fails
      });
    }
  },

  createProject: async (name, description) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Untitled Project',
      description: description?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    const adapter = getStorageAdapter();
    await adapter.saveProject(project);

    // Update in-memory state only after successful persistence
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },

  deleteProject: async (id) => {
    deletedProjectIds.add(id);
    const adapter = getStorageAdapter();
    try {
      await adapter.deleteProject(id);

      // Reconcile in-memory state after successful persistence
      set((s) => ({
        projects: s.projects.filter((p) => p.id !== id),
        lastOpenedProjectId: s.lastOpenedProjectId === id ? null : s.lastOpenedProjectId,
      }));
    } catch (err) {
      deletedProjectIds.delete(id);
      throw err;
    }
  },

  duplicateProject: async (id) => {
    const original = get().projects.find((p) => p.id === id);
    if (!original) return null;

    const now = new Date().toISOString();
    const project: Project = {
      ...structuredClone(original),
      id: crypto.randomUUID(),
      name: `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    const adapter = getStorageAdapter();
    await adapter.saveProject(project);

    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },

  importProject: async (json) => {
    try {
      const parsed = JSON.parse(json);
      const now = new Date().toISOString();
      const project: Project = {
        id: crypto.randomUUID(),
        name: parsed.name || 'Imported Project',
        description: parsed.description || '',
        createdAt: now,
        updatedAt: now,
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : [],
        viewport: parsed.viewport || { x: 0, y: 0, zoom: 1 },
        diagramType: parsed.diagramType,
        diagramData: parsed.diagramData,
      };

      const adapter = getStorageAdapter();
      await adapter.saveProject(project);

      set((s) => ({ projects: [project, ...s.projects] }));
      return project;
    } catch (err) {
      console.error('[useProjectStore] Failed to import project:', err);
      return null;
    }
  },

  exportProject: (id) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project) return null;
    return JSON.stringify(project, null, 2);
  },

  renameProject: async (id, name) => {
    const original = get().projects.find((p) => p.id === id);
    if (!original) return;

    const updated: Project = {
      ...original,
      name: name.trim() || original.name,
      updatedAt: new Date().toISOString(),
    };

    const adapter = getStorageAdapter();
    await adapter.saveProject(updated);

    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? updated : p)),
    }));
  },

  saveProject: (project) => {
    const updated: Project = { ...project, updatedAt: new Date().toISOString() };

    // Update in-memory state immediately
    set((s) => ({
      projects: s.projects.map((p) => (p.id === project.id ? updated : p)),
    }));

    const adapter = getStorageAdapter();
    if (adapter.mode === 'web') {
      const data: AppData = {
        version: 1,
        projects: get().projects,
        lastOpenedProjectId: get().lastOpenedProjectId,
      };
      return saveAppData(data);
    } else {
      // Desktop adapter: dispatch asynchronous save
      adapter.saveProject(updated).catch((err) => {
        console.error('[useProjectStore] Background save failed:', err);
      });
      return true;
    }
  },

  saveProjectAsync: async (project) => {
    const updated: Project = { ...project, updatedAt: new Date().toISOString() };
    try {
      const adapter = getStorageAdapter();
      await adapter.saveProject(updated);
      set((s) => ({
        projects: s.projects.some((p) => p.id === project.id)
          ? s.projects.map((p) => (p.id === project.id ? updated : p))
          : [updated, ...s.projects],
      }));
      return true;
    } catch (err) {
      console.error('[useProjectStore] saveProjectAsync failed:', err);
      return false;
    }
  },

  getOrLoadProject: async (id: string) => {
    // 1. Check in-memory store
    const existing = get().projects.find((p) => p.id === id);
    if (existing) return existing;

    // 2. Fetch directly from active storage adapter (desktop or web)
    try {
      const adapter = getStorageAdapter();
      const project = await adapter.readProject(id);
      set((s) => {
        if (s.projects.some((p) => p.id === id)) return s;
        return { projects: [project, ...s.projects] };
      });
      return project;
    } catch (err) {
      console.warn(`[useProjectStore] Failed to load project ${id}:`, err);
      return null;
    }
  },

  setLastOpened: (id) => {
    set({ lastOpenedProjectId: id });
    const adapter = getStorageAdapter();
    if (adapter.mode === 'web') {
      const data: AppData = {
        version: 1,
        projects: get().projects,
        lastOpenedProjectId: id,
      };
      saveAppData(data);
    }
  },

  restoreProject: async (project) => {
    deletedProjectIds.delete(project.id);
    if (get().projects.some((p) => p.id === project.id)) return;
    const adapter = getStorageAdapter();
    await adapter.saveProject(project);
    set((s) => ({ projects: [...s.projects, project] }));
  },

  mergeProjects: async (items) => {
    const existing = new Set(get().projects.map((p) => p.id));
    const fresh = items.filter((p) => !existing.has(p.id));
    if (fresh.length > 0) {
      const adapter = getStorageAdapter();
      for (const project of fresh) {
        await adapter.saveProject(project);
      }
      set((s) => ({ projects: [...s.projects, ...fresh] }));
    }
    return { added: fresh.length, skipped: items.length - fresh.length };
  },

  importProjects: async (items) => {
    const now = new Date().toISOString();
    const imported: Project[] = items.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name || 'Imported Project',
      description: item.description || '',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : now,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : now,
      nodes: Array.isArray(item.nodes) ? item.nodes : [],
      edges: Array.isArray(item.edges) ? item.edges : [],
      viewport: item.viewport ?? { x: 0, y: 0, zoom: 1 },
      diagramType: item.diagramType,
      diagramData: item.diagramData,
    }));

    if (imported.length === 0) return imported;

    const adapter = getStorageAdapter();
    for (const project of imported) {
      await adapter.saveProject(project);
    }

    set((s) => ({ projects: [...s.projects, ...imported] }));
    return imported;
  },

  clearAllProjects: async () => {
    const currentProjects = get().projects;
    const adapter = getStorageAdapter();

    if (adapter.mode === 'web') {
      clearAppData();
    } else {
      for (const p of currentProjects) {
        await adapter.deleteProject(p.id).catch((err) => {
          console.error('[useProjectStore] Failed to delete project during clearAll:', err);
        });
      }
    }

    set({ projects: [], lastOpenedProjectId: null });
  },
}));
