import { describe, it, expect } from 'vitest';
import {
  DRAWZ_FILE_TYPE,
  CURRENT_DOCUMENT_SCHEMA_VERSION,
  DRAWZ_BACKUP_TYPE,
  CURRENT_BACKUP_SCHEMA_VERSION,
  PROJECT_ID_REGEX,
  isValidProjectId,
  ProjectSchema,
  DrawzDocumentSchema,
  DrawzBackupDocumentSchema,
  LegacyAppDataSchema,
  LibraryProjectMetadataSchema,
  LibraryIndexSchema,
  parseProjectDocument,
  serializeDrawzDocument,
  parseBackupDocument,
  serializeDrawzBackup,
  IPC_CHANNELS,
} from '@drawzware/contracts';

describe('packages/contracts — Canonical Package Exports', () => {
  it('exports canonical document constants', () => {
    expect(DRAWZ_FILE_TYPE).toBe('drawzware-project');
    expect(CURRENT_DOCUMENT_SCHEMA_VERSION).toBe(1);
    expect(DRAWZ_BACKUP_TYPE).toBe('drawzware-backup');
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(1);
  });

  it('exports project ID validator and regex', () => {
    expect(isValidProjectId('valid-project-id_123')).toBe(true);
    expect(isValidProjectId('../malicious/path')).toBe(false);
    expect(PROJECT_ID_REGEX.test('sample_id')).toBe(true);
  });

  it('validates canonical document serialization and roundtrip parsing', () => {
    const sampleProject = {
      id: 'proj-001',
      name: 'Sample Architecture',
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    const serialized = serializeDrawzDocument(sampleProject);
    const parsed = parseProjectDocument(serialized);

    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.format === 'canonical') {
      expect(parsed.document.project.id).toBe('proj-001');
      expect(parsed.document.fileType).toBe(DRAWZ_FILE_TYPE);
    }
  });

  it('exports and validates all canonical schemas', () => {
    expect(ProjectSchema).toBeDefined();
    expect(DrawzDocumentSchema).toBeDefined();
    expect(DrawzBackupDocumentSchema).toBeDefined();
    expect(LegacyAppDataSchema).toBeDefined();
    expect(LibraryProjectMetadataSchema).toBeDefined();
    expect(LibraryIndexSchema).toBeDefined();

    const sampleProject = {
      id: 'proj-001',
      name: 'Sample Architecture',
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    expect(ProjectSchema.safeParse(sampleProject).success).toBe(true);

    const backupSerialized = serializeDrawzBackup([sampleProject]);
    const parsedBackup = parseBackupDocument(backupSerialized);
    expect(parsedBackup.success).toBe(true);
    if (parsedBackup.success) {
      expect(parsedBackup.projects).toHaveLength(1);
      expect(parsedBackup.projects[0].id).toBe('proj-001');
    }
  });

  it('exports all canonical IPC channel names', () => {
    expect(IPC_CHANNELS.LIBRARY_LIST).toBe('library:list');
    expect(IPC_CHANNELS.LIBRARY_READ).toBe('library:read');
    expect(IPC_CHANNELS.LIBRARY_SAVE).toBe('library:save');
    expect(IPC_CHANNELS.LIBRARY_DELETE).toBe('library:delete');
    expect(IPC_CHANNELS.FILE_OPEN_DRAWZ).toBe('file:open-drawz');
    expect(IPC_CHANNELS.FILE_SAVE_DRAWZ).toBe('file:save-drawz');
    expect(IPC_CHANNELS.FILE_IMPORT_BACKUP).toBe('file:import-backup');
  });
});

