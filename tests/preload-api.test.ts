import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { IPC_CHANNELS } from '../electron/types/ipc';
import { sampleArchitectureProject } from './fixtures/projects';
import type { DesktopApi } from '../src/types/desktop';

// Mock electron contextBridge and ipcRenderer
const exposedApis = new Map<string, unknown>();
const mockIpcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  send: vi.fn(),
};

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (apiKey: string, apiValue: unknown) => {
      exposedApis.set(apiKey, apiValue);
    },
  },
  ipcRenderer: {
    invoke: (...args: unknown[]) => mockIpcRenderer.invoke(...args),
    on: (...args: unknown[]) => mockIpcRenderer.on(...args),
    send: (...args: unknown[]) => mockIpcRenderer.send(...args),
  },
}));

function getDesktopApi(): DesktopApi & Record<string, unknown> {
  return exposedApis.get('desktopApi') as DesktopApi & Record<string, unknown>;
}

describe('Preload Bridge Security & API Surface', () => {
  beforeAll(async () => {
    // Dynamically import preload to trigger exposeInMainWorld once
    await import('../electron/preload');
  });

  beforeEach(() => {
    mockIpcRenderer.invoke.mockReset();
    mockIpcRenderer.on.mockReset();
    mockIpcRenderer.send.mockReset();
  });

  it('exposes desktopApi in main world with minimal, approved surface', () => {
    expect(exposedApis.has('desktopApi')).toBe(true);
    const desktopApi = getDesktopApi();

    expect(desktopApi.isDesktop).toBe(true);
    expect(typeof desktopApi.platform).toBe('string');
    expect(typeof desktopApi.getAppVersion).toBe('function');
    expect(typeof desktopApi.storage).toBe('object');
    expect(typeof desktopApi.window).toBe('object');
    expect(typeof desktopApi.window.registerCloseHandler).toBe('function');
    expect(typeof desktopApi.file).toBe('object');
    expect(typeof desktopApi.file.openDrawzFile).toBe('function');
    expect(typeof desktopApi.file.saveDrawzFile).toBe('function');
    expect(typeof desktopApi.file.importBackupFile).toBe('function');
  });

  it('does NOT expose raw ipcRenderer, generic invoke, or node modules', () => {
    const desktopApi = getDesktopApi();

    // Forbidden exposures
    expect(desktopApi.ipcRenderer).toBeUndefined();
    expect(desktopApi.invoke).toBeUndefined();
    expect(desktopApi.send).toBeUndefined();
    expect(desktopApi.fs).toBeUndefined();
    expect(desktopApi.require).toBeUndefined();
    expect(desktopApi.process).toBeUndefined();

    // Verify storage object exposes strictly the 4 library methods
    const storageKeys = Object.keys(desktopApi.storage).sort();
    expect(storageKeys).toEqual(['deleteProject', 'listProjects', 'readProject', 'saveProject'].sort());

    // Verify file object exposes strictly the 3 native file methods
    const fileKeys = Object.keys(desktopApi.file).sort();
    expect(fileKeys).toEqual(['importBackupFile', 'openDrawzFile', 'saveDrawzFile'].sort());
  });

  it('storage.listProjects invokes LIBRARY_LIST channel', async () => {
    const desktopApi = getDesktopApi();
    mockIpcRenderer.invoke.mockResolvedValueOnce({ success: true, data: [] });

    const result = await desktopApi.storage.listProjects();
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.LIBRARY_LIST);
    expect(result).toEqual({ success: true, data: [] });
  });

  it('storage.readProject invokes LIBRARY_READ channel with ID', async () => {
    const desktopApi = getDesktopApi();
    mockIpcRenderer.invoke.mockResolvedValueOnce({ success: true, data: sampleArchitectureProject });

    const result = await desktopApi.storage.readProject('proj-123');
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.LIBRARY_READ, 'proj-123');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(sampleArchitectureProject.id);
    }
  });

  it('storage.saveProject invokes LIBRARY_SAVE channel with project payload', async () => {
    const desktopApi = getDesktopApi();
    mockIpcRenderer.invoke.mockResolvedValueOnce({ success: true, data: { saved: true } });

    const result = await desktopApi.storage.saveProject(sampleArchitectureProject);
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.LIBRARY_SAVE, sampleArchitectureProject);
    expect(result).toEqual({ success: true, data: { saved: true } });
  });

  it('storage.deleteProject invokes LIBRARY_DELETE channel with ID', async () => {
    const desktopApi = getDesktopApi();
    mockIpcRenderer.invoke.mockResolvedValueOnce({ success: true, data: { deleted: true } });

    const result = await desktopApi.storage.deleteProject('proj-123');
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.LIBRARY_DELETE, 'proj-123');
    expect(result).toEqual({ success: true, data: { deleted: true } });
  });

  it('file.openDrawzFile invokes FILE_OPEN_DRAWZ channel', async () => {
    const desktopApi = getDesktopApi();
    mockIpcRenderer.invoke.mockResolvedValueOnce({ success: true, data: { canceled: true } });

    const result = await desktopApi.file.openDrawzFile();
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.FILE_OPEN_DRAWZ);
    expect(result).toEqual({ success: true, data: { canceled: true } });
  });

  it('file.saveDrawzFile invokes FILE_SAVE_DRAWZ channel with project', async () => {
    const desktopApi = getDesktopApi();
    mockIpcRenderer.invoke.mockResolvedValueOnce({ success: true, data: { saved: true, canceled: false } });

    const result = await desktopApi.file.saveDrawzFile(sampleArchitectureProject);
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.FILE_SAVE_DRAWZ, sampleArchitectureProject);
    expect(result).toEqual({ success: true, data: { saved: true, canceled: false } });
  });

  it('file.importBackupFile invokes FILE_IMPORT_BACKUP channel', async () => {
    const desktopApi = getDesktopApi();
    mockIpcRenderer.invoke.mockResolvedValueOnce({
      success: true,
      data: {
        canceled: false,
        summary: { total: 1, imported: 1, renamed: 0, failed: 0, importedProjects: [sampleArchitectureProject] },
      },
    });

    const result = await desktopApi.file.importBackupFile();
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.FILE_IMPORT_BACKUP);
    expect(result.success).toBe(true);
  });
});
