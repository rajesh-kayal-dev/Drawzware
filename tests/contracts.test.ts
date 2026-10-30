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
  SaveDiagramSnapshotInputSchema,
  DiagramSnapshotResponseSchema,
  DiagramSnapshotConflictErrorSchema,
  UserPresenceSchema,
  CollabClientMessageSchema,
  CollabServerMessageSchema,
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

  it('validates SaveDiagramSnapshotInputSchema with project or state, and clientVersion', () => {
    const validProject = {
      id: 'proj-snap-1',
      name: 'Cloud Snapshot Project',
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    // Valid with project field
    const resWithProject = SaveDiagramSnapshotInputSchema.safeParse({
      project: validProject,
      clientVersion: 3,
    });
    expect(resWithProject.success).toBe(true);

    // Valid with state field
    const resWithState = SaveDiagramSnapshotInputSchema.safeParse({
      state: validProject,
    });
    expect(resWithState.success).toBe(true);

    // Invalid when neither project nor state provided
    const resEmpty = SaveDiagramSnapshotInputSchema.safeParse({
      clientVersion: 2,
    });
    expect(resEmpty.success).toBe(false);

    // Invalid clientVersion (must be positive integer)
    const resInvalidVer = SaveDiagramSnapshotInputSchema.safeParse({
      project: validProject,
      clientVersion: -1,
    });
    expect(resInvalidVer.success).toBe(false);
  });

  it('validates DiagramSnapshotResponseSchema and ConflictErrorSchema', () => {
    const validResponse = {
      diagramId: 'diag-001',
      version: 2,
      state: {
        id: 'proj-snap-1',
        name: 'Cloud Snapshot Project',
        createdAt: '2026-10-25T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
    };
    expect(DiagramSnapshotResponseSchema.safeParse(validResponse).success).toBe(true);

    const conflictPayload = {
      error: 'VERSION_CONFLICT',
      message: 'Cloud snapshot version conflict.',
      currentVersion: 5,
    };
    expect(DiagramSnapshotConflictErrorSchema.safeParse(conflictPayload).success).toBe(true);
  });

  it('validates UserPresenceSchema and CollabMessage schemas', () => {
    const validPresence = {
      userId: 'usr-123',
      userName: 'Alice Engineer',
      cursor: { x: 100, y: 200 },
      selectedNodeIds: ['node-1', 'node-2'],
    };
    expect(UserPresenceSchema.safeParse(validPresence).success).toBe(true);

    const clientMsg = {
      type: 'cursor_move',
      diagramId: 'diag-001',
      payload: { x: 150, y: 300 },
    };
    expect(CollabClientMessageSchema.safeParse(clientMsg).success).toBe(true);

    const serverMsg = {
      type: 'presence_batch',
      diagramId: 'diag-001',
      payload: { users: [validPresence] },
    };
    expect(CollabServerMessageSchema.safeParse(serverMsg).success).toBe(true);
  });
});

