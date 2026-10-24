import { describe, it, expect } from 'vitest';
import {
  DRAWZ_FILE_TYPE,
  CURRENT_DOCUMENT_SCHEMA_VERSION,
  isValidProjectId,
  parseProjectDocument,
  serializeDrawzDocument,
  ProjectSchema,
  LibraryIndexSchema,
  LibraryProjectMetadataSchema,
} from '@drawzware/contracts';
import {
  sampleArchitectureProject,
  sampleLegacyBackupBundle,
} from './fixtures/projects';

describe('Project Document Contract & Serialization', () => {
  it('serializes and parses a canonical .drawz document with perfect round-trip fidelity', () => {
    const serialized = serializeDrawzDocument(sampleArchitectureProject, '0.1.0');
    expect(typeof serialized).toBe('string');

    const result = parseProjectDocument(serialized);
    expect(result.success).toBe(true);
    if (!result.success || result.format !== 'canonical') return;

    expect(result.format).toBe('canonical');
    expect(result.document.fileType).toBe(DRAWZ_FILE_TYPE);
    expect(result.document.schemaVersion).toBe(CURRENT_DOCUMENT_SCHEMA_VERSION);
    expect(result.document.appVersion).toBe('0.1.0');

    // Verify domain fields are preserved exactly
    const parsedProject = result.document.project;
    expect(parsedProject.id).toBe(sampleArchitectureProject.id);
    expect(parsedProject.name).toBe(sampleArchitectureProject.name);
    expect(parsedProject.description).toBe(sampleArchitectureProject.description);
    expect(parsedProject.viewport).toEqual(sampleArchitectureProject.viewport);
    expect(parsedProject.diagramType).toBe('architecture');
    expect(parsedProject.nodes).toEqual(sampleArchitectureProject.nodes);
    expect(parsedProject.edges).toEqual(sampleArchitectureProject.edges);
    expect(parsedProject.diagramData).toEqual(sampleArchitectureProject.diagramData);
  });

  it('preserves multi-diagram mode state (architecture, sequence, and er)', () => {
    const serialized = serializeDrawzDocument(sampleArchitectureProject);
    const result = parseProjectDocument(serialized);
    expect(result.success).toBe(true);
    if (!result.success || result.format !== 'canonical') return;

    const data = result.document.project.diagramData as Record<string, unknown>;
    expect(data.architecture).toBeDefined();
    expect(data.sequence).toBeDefined();
    expect(data.er).toBeDefined();
  });

  it('recognizes and wraps legacy standalone Project JSON export into a canonical envelope', () => {
    // Legacy export from web app: direct JSON of Project
    const legacyJson = JSON.stringify(sampleArchitectureProject);

    const result = parseProjectDocument(legacyJson);
    expect(result.success).toBe(true);
    if (!result.success || result.format !== 'legacy-project') return;

    expect(result.format).toBe('legacy-project');
    expect(result.document.fileType).toBe(DRAWZ_FILE_TYPE);
    expect(result.document.schemaVersion).toBe(CURRENT_DOCUMENT_SCHEMA_VERSION);
    expect(result.document.project.id).toBe(sampleArchitectureProject.id);
    expect(result.document.project.name).toBe(sampleArchitectureProject.name);
    expect(result.document.project.nodes.length).toBe(2);
  });

  it('recognizes legacy web backup bundles (AppData with version and projects array)', () => {
    const backupJson = JSON.stringify(sampleLegacyBackupBundle);

    const result = parseProjectDocument(backupJson);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.format).toBe('legacy-backup');
    if (result.format === 'legacy-backup') {
      expect(result.backup.version).toBe(1);
      expect(result.backup.lastOpenedProjectId).toBe('arch-sample-001');
      expect(result.backup.projects.length).toBe(2);
      expect(result.backup.projects[0].id).toBe('arch-sample-001');
    }
  });

  it('rejects unsupported future schema versions with structured UNSUPPORTED_VERSION error', () => {
    const futureDoc = {
      fileType: DRAWZ_FILE_TYPE,
      schemaVersion: 99,
      appVersion: '9.0.0',
      project: sampleArchitectureProject,
    };

    const result = parseProjectDocument(JSON.stringify(futureDoc));
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.code).toBe('UNSUPPORTED_VERSION');
    expect(result.error).toContain('newer than supported version');
  });

  it('rejects malformed JSON strings gracefully without throwing', () => {
    const result = parseProjectDocument('{ "fileType": "drawzware-project", broken');
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.code).toBe('MALFORMED_JSON');
    expect(result.error).toContain('Malformed JSON');
  });

  it('rejects non-object or null input', () => {
    const result1 = parseProjectDocument(null);
    expect(result1.success).toBe(false);

    const result2 = parseProjectDocument('12345');
    expect(result2.success).toBe(false);
  });

  it('validates ProjectSchema correctly: rejects missing required fields', () => {
    const invalidProject = {
      // missing id
      name: 'Invalid Project',
      nodes: [],
      edges: [],
    };

    const parseRes = ProjectSchema.safeParse(invalidProject);
    expect(parseRes.success).toBe(false);
  });

  it('enforces strict project ID rules to prevent path traversal', () => {
    expect(isValidProjectId('valid-project-id_123')).toBe(true);
    expect(isValidProjectId('project-456')).toBe(true);
    expect(isValidProjectId('12345')).toBe(true);

    // Traversal attacks
    expect(isValidProjectId('../escape')).toBe(false);
    expect(isValidProjectId('../../etc/passwd')).toBe(false);
    expect(isValidProjectId('..\\windows\\system32')).toBe(false);
    expect(isValidProjectId('/root/test')).toBe(false);
    expect(isValidProjectId('project*name')).toBe(false);
    expect(isValidProjectId('')).toBe(false);
    expect(isValidProjectId('a'.repeat(129))).toBe(false);
  });

  it('validates library index metadata schema', () => {
    const validMeta = {
      id: 'proj-1',
      name: 'Test Project',
      description: 'A test project',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      diagramType: 'architecture',
      nodeCount: 5,
      edgeCount: 4,
      fileName: 'proj-1.drawz',
    };

    const metaRes = LibraryProjectMetadataSchema.safeParse(validMeta);
    expect(metaRes.success).toBe(true);

    const validIndex = {
      version: 1,
      lastOpenedProjectId: 'proj-1',
      projects: [validMeta],
    };

    const indexRes = LibraryIndexSchema.safeParse(validIndex);
    expect(indexRes.success).toBe(true);
  });
});
