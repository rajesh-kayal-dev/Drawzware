import { describe, it, expect } from 'vitest';
import {
  IPC_CHANNELS,
  type IpcResult,
  type IpcErrorCode,
  type LibraryStorageIpcApi,
} from '../apps/desktop/types/ipc';
import { sampleArchitectureProject } from './fixtures/projects';

describe('IPC Contracts & Channel Definitions', () => {
  it('defines exact and unique library IPC channels', () => {
    expect(IPC_CHANNELS.LIBRARY_LIST).toBe('library:list');
    expect(IPC_CHANNELS.LIBRARY_READ).toBe('library:read');
    expect(IPC_CHANNELS.LIBRARY_SAVE).toBe('library:save');
    expect(IPC_CHANNELS.LIBRARY_DELETE).toBe('library:delete');

    const values = Object.values(IPC_CHANNELS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('structures successful IPC results with success: true and data payload', () => {
    const successResult: IpcResult<{ saved: boolean }> = {
      success: true,
      data: { saved: true },
    };

    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.data.saved).toBe(true);
    }
  });

  it('structures failed IPC results with structured error codes and messages', () => {
    const errorCodes: IpcErrorCode[] = [
      'UNAUTHORIZED',
      'INVALID_ID',
      'VALIDATION_FAILED',
      'FILE_NOT_FOUND',
      'CORRUPTED_DOCUMENT',
      'UNSUPPORTED_VERSION',
      'WRITE_FAILED',
      'IO_ERROR',
      'UNKNOWN_ERROR',
    ];

    for (const code of errorCodes) {
      const errorResult: IpcResult<never> = {
        success: false,
        error: {
          code,
          message: `Testing error code ${code}`,
          details: { sample: 123 },
        },
      };

      expect(errorResult.success).toBe(false);
      if (!errorResult.success) {
        expect(errorResult.error.code).toBe(code);
        expect(errorResult.error.message).toContain(code);
        expect(errorResult.error.details).toEqual({ sample: 123 });
      }
    }
  });

  it('enforces LibraryStorageIpcApi contract type conformity', async () => {
    // Mock implementation validating interface compliance
    const mockApi: LibraryStorageIpcApi = {
      listProjects: async () => ({
        success: true,
        data: [
          {
            id: 'sample-1',
            name: 'Sample',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
            nodeCount: 1,
            edgeCount: 0,
            fileName: 'sample-1.drawz',
          },
        ],
      }),
      readProject: async (id: string) => ({
        success: true,
        data: { ...sampleArchitectureProject, id },
      }),
      saveProject: async () => ({
        success: true,
        data: { saved: true },
      }),
      deleteProject: async () => ({
        success: true,
        data: { deleted: true },
      }),
    };

    const listRes = await mockApi.listProjects();
    expect(listRes.success).toBe(true);

    const readRes = await mockApi.readProject('sample-1');
    expect(readRes.success).toBe(true);

    const saveRes = await mockApi.saveProject(sampleArchitectureProject);
    expect(saveRes.success).toBe(true);

    const deleteRes = await mockApi.deleteProject('sample-1');
    expect(deleteRes.success).toBe(true);
  });
});
