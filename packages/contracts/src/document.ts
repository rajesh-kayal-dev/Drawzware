import { z } from 'zod';

export const DRAWZ_FILE_TYPE = 'drawzware-project' as const;
export const CURRENT_DOCUMENT_SCHEMA_VERSION = 1;

/**
 * Strict regex for internal library project IDs.
 * Restricts to alphanumeric, hyphen, and underscore (1-128 chars).
 * Prevents directory traversal, path injection, and control characters.
 */
export const PROJECT_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export function isValidProjectId(id: string): boolean {
  return typeof id === 'string' && PROJECT_ID_REGEX.test(id);
}

/**
 * Domain project schema matching src/types/index.ts.
 * Preserves all diagram modes (architecture, sequence, er),
 * nodes, edges, viewport, and diagramData.
 */
export const ProjectSchema = z.object({
  id: z.string().refine(isValidProjectId, {
    message: 'Project id must contain only alphanumeric characters, underscores, and hyphens (max 128 chars)',
  }),
  name: z.string().min(1, 'Project name is required').max(256),
  description: z.string().max(4096).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  nodes: z
    .array(
      z.any().refine((val) => val !== null && typeof val === 'object', {
        message: 'Node must be an object',
      })
    )
    .max(10000)
    .default([]),
  edges: z
    .array(
      z.any().refine((val) => val !== null && typeof val === 'object', {
        message: 'Edge must be an object',
      })
    )
    .max(20000)
    .default([]),
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    })
    .default({ x: 0, y: 0, zoom: 1 }),
  diagramType: z.enum(['architecture', 'sequence', 'er']).optional(),
  diagramData: z.record(z.string(), z.unknown()).optional(),
  cloudDiagramId: z.string().optional(),
  cloudWorkspaceId: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Canonical standalone .drawz document format.
 * Encapsulates version metadata in an outer envelope so domain Project
 * schema evolution does not silently strip version or envelope metadata.
 */
export const DrawzDocumentSchema = z.object({
  fileType: z.literal(DRAWZ_FILE_TYPE),
  schemaVersion: z.number().int().positive(),
  appVersion: z.string().optional(),
  exportedAt: z.string().optional(),
  project: ProjectSchema,
});

export type DrawzDocument = z.infer<typeof DrawzDocumentSchema>;

export const DRAWZ_BACKUP_TYPE = 'drawzware-backup' as const;
export const CURRENT_BACKUP_SCHEMA_VERSION = 1;

/**
 * Canonical multi-project backup document format.
 */
export const DrawzBackupDocumentSchema = z.object({
  fileType: z.literal(DRAWZ_BACKUP_TYPE),
  schemaVersion: z.number().int().positive(),
  appVersion: z.string().optional(),
  exportedAt: z.string().optional(),
  projects: z.array(ProjectSchema),
});

export type DrawzBackupDocument = z.infer<typeof DrawzBackupDocumentSchema>;

/**
 * Legacy Web Backup / AppData schema (persisted in localStorage).
 */
export const LegacyAppDataSchema = z.object({
  version: z.number().default(1),
  projects: z.array(ProjectSchema).default([]),
  lastOpenedProjectId: z.string().nullable().default(null),
});

export type LegacyAppData = z.infer<typeof LegacyAppDataSchema>;

/**
 * Metadata stored in the library index (userData/library/index.json).
 */
export const LibraryProjectMetadataSchema = z.object({
  id: z.string().regex(PROJECT_ID_REGEX),
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  diagramType: z.enum(['architecture', 'sequence', 'er']).optional(),
  nodeCount: z.number().int().nonnegative().default(0),
  edgeCount: z.number().int().nonnegative().default(0),
  fileName: z.string(),
});

export type LibraryProjectMetadata = z.infer<typeof LibraryProjectMetadataSchema>;

/**
 * Library index document schema.
 */
export const LibraryIndexSchema = z.object({
  version: z.number().int().positive().default(1),
  lastOpenedProjectId: z.string().nullable().default(null),
  projects: z.array(LibraryProjectMetadataSchema).default([]),
});

export type LibraryIndex = z.infer<typeof LibraryIndexSchema>;

/**
 * Result of document parsing.
 */
export type DocumentParseResult =
  | {
      success: true;
      format: 'canonical';
      document: DrawzDocument;
    }
  | {
      success: true;
      format: 'legacy-project';
      document: DrawzDocument;
      rawProject: Project;
    }
  | {
      success: true;
      format: 'legacy-backup';
      backup: LegacyAppData;
    }
  | {
      success: false;
      error: string;
      code:
        | 'MALFORMED_JSON'
        | 'UNSUPPORTED_VERSION'
        | 'INVALID_ENVELOPE'
        | 'INVALID_PROJECT'
        | 'UNRECOGNIZED_FORMAT';
      details?: unknown;
    };

/**
 * Parses raw JSON string or object into a validated DrawzDocument or recognized legacy format.
 * Never throws; returns structured result.
 */
export function parseProjectDocument(rawInput: unknown): DocumentParseResult {
  let parsed: unknown = rawInput;

  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch (err) {
      return {
        success: false,
        error: `Malformed JSON: ${(err as Error).message}`,
        code: 'MALFORMED_JSON',
      };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      success: false,
      error: 'Input must be a valid JSON object',
      code: 'UNRECOGNIZED_FORMAT',
    };
  }

  const record = parsed as Record<string, unknown>;

  // 1. Check for canonical .drawz envelope
  if (record.fileType === DRAWZ_FILE_TYPE) {
    if (typeof record.schemaVersion === 'number' && record.schemaVersion > CURRENT_DOCUMENT_SCHEMA_VERSION) {
      return {
        success: false,
        error: `Document schema version ${record.schemaVersion} is newer than supported version ${CURRENT_DOCUMENT_SCHEMA_VERSION}. Please upgrade Drawzware.`,
        code: 'UNSUPPORTED_VERSION',
        details: { schemaVersion: record.schemaVersion, maxSupported: CURRENT_DOCUMENT_SCHEMA_VERSION },
      };
    }

    const envelopeResult = DrawzDocumentSchema.safeParse(record);
    if (!envelopeResult.success) {
      return {
        success: false,
        error: 'Invalid .drawz document structure',
        code: 'INVALID_PROJECT',
        details: envelopeResult.error.format(),
      };
    }

    return {
      success: true,
      format: 'canonical',
      document: envelopeResult.data,
    };
  }

  // 2. Check for legacy web backup bundle (AppData: { version, projects, lastOpenedProjectId })
  if (Array.isArray(record.projects) && (record.version !== undefined || record.lastOpenedProjectId !== undefined)) {
    const backupResult = LegacyAppDataSchema.safeParse(record);
    if (backupResult.success) {
      return {
        success: true,
        format: 'legacy-backup',
        backup: backupResult.data,
      };
    }
  }

  // 3. Check for standalone legacy project (raw Project object from exportProject())
  if (typeof record.id === 'string' && typeof record.name === 'string' && Array.isArray(record.nodes)) {
    const projectResult = ProjectSchema.safeParse(record);
    if (projectResult.success) {
      const canonicalDoc: DrawzDocument = {
        fileType: DRAWZ_FILE_TYPE,
        schemaVersion: CURRENT_DOCUMENT_SCHEMA_VERSION,
        appVersion: 'legacy-import',
        exportedAt: new Date().toISOString(),
        project: projectResult.data,
      };
      return {
        success: true,
        format: 'legacy-project',
        document: canonicalDoc,
        rawProject: projectResult.data,
      };
    } else {
      return {
        success: false,
        error: 'Legacy project payload failed domain validation',
        code: 'INVALID_PROJECT',
        details: projectResult.error.format(),
      };
    }
  }

  return {
    success: false,
    error: 'Unrecognized file format or missing required project fields',
    code: 'UNRECOGNIZED_FORMAT',
  };
}

/**
 * Helper to serialize a Project into a canonical .drawz document JSON string.
 */
export function serializeDrawzDocument(project: Project, appVersion = '0.1.0'): string {
  const doc: DrawzDocument = {
    fileType: DRAWZ_FILE_TYPE,
    schemaVersion: CURRENT_DOCUMENT_SCHEMA_VERSION,
    appVersion,
    exportedAt: new Date().toISOString(),
    project,
  };
  return JSON.stringify(doc, null, 2);
}

/**
 * Result of multi-project backup parsing.
 */
export type BackupParseResult =
  | {
      success: true;
      format: 'canonical-backup';
      projects: Project[];
      metadata?: { appVersion?: string; exportedAt?: string; schemaVersion: number };
    }
  | {
      success: true;
      format: 'legacy-backup';
      projects: Project[];
      metadata?: { version: number };
    }
  | {
      success: true;
      format: 'project-array';
      projects: Project[];
    }
  | {
      success: false;
      error: string;
      code:
        | 'MALFORMED_JSON'
        | 'UNSUPPORTED_VERSION'
        | 'EMPTY_BACKUP'
        | 'INVALID_PROJECTS'
        | 'UNRECOGNIZED_FORMAT';
      details?: unknown;
    };

/**
 * Parses raw JSON string or object into a validated array of projects from either:
 * 1. Canonical Drawzware Backup ({ fileType: 'drawzware-backup', schemaVersion, projects })
 * 2. Legacy AppData format ({ version, projects })
 * 3. Raw array of projects ([ Project, Project ])
 *
 * Validates every project before returning. Never throws; returns structured result.
 */
export function parseBackupDocument(rawInput: unknown): BackupParseResult {
  let parsed: unknown = rawInput;

  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch (err) {
      return {
        success: false,
        error: `Malformed JSON: ${(err as Error).message}`,
        code: 'MALFORMED_JSON',
      };
    }
  }

  if (!parsed || (typeof parsed !== 'object' && !Array.isArray(parsed))) {
    return {
      success: false,
      error: 'Backup file must contain a valid JSON object or array.',
      code: 'UNRECOGNIZED_FORMAT',
    };
  }

  // 1. Array of projects directly: [ Project, Project, ... ]
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return {
        success: false,
        error: 'Backup file contains no projects to import.',
        code: 'EMPTY_BACKUP',
      };
    }

    const projects: Project[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const projResult = ProjectSchema.safeParse(parsed[i]);
      if (!projResult.success) {
        return {
          success: false,
          error: `Project at index ${i} failed validation: ${projResult.error.message}`,
          code: 'INVALID_PROJECTS',
          details: projResult.error.format(),
        };
      }
      projects.push(projResult.data);
    }

    return {
      success: true,
      format: 'project-array',
      projects,
    };
  }

  const record = parsed as Record<string, unknown>;

  // 2. Canonical backup format: { fileType: 'drawzware-backup', ... }
  if (record.fileType === DRAWZ_BACKUP_TYPE) {
    if (typeof record.schemaVersion === 'number' && record.schemaVersion > CURRENT_BACKUP_SCHEMA_VERSION) {
      return {
        success: false,
        error: `Backup schema version ${record.schemaVersion} is newer than supported version ${CURRENT_BACKUP_SCHEMA_VERSION}. Please upgrade Drawzware.`,
        code: 'UNSUPPORTED_VERSION',
        details: { schemaVersion: record.schemaVersion, maxSupported: CURRENT_BACKUP_SCHEMA_VERSION },
      };
    }

    const backupResult = DrawzBackupDocumentSchema.safeParse(record);
    if (!backupResult.success) {
      return {
        success: false,
        error: 'Invalid Drawzware backup document structure.',
        code: 'INVALID_PROJECTS',
        details: backupResult.error.format(),
      };
    }

    if (backupResult.data.projects.length === 0) {
      return {
        success: false,
        error: 'Backup file contains no projects to import.',
        code: 'EMPTY_BACKUP',
      };
    }

    return {
      success: true,
      format: 'canonical-backup',
      projects: backupResult.data.projects,
      metadata: {
        appVersion: backupResult.data.appVersion,
        exportedAt: backupResult.data.exportedAt,
        schemaVersion: backupResult.data.schemaVersion,
      },
    };
  }

  // 3. Legacy web backup bundle: { version, projects, lastOpenedProjectId }
  if (Array.isArray(record.projects)) {
    if (record.projects.length === 0) {
      return {
        success: false,
        error: 'Backup file contains no projects to import.',
        code: 'EMPTY_BACKUP',
      };
    }

    const projects: Project[] = [];
    for (let i = 0; i < record.projects.length; i++) {
      const projResult = ProjectSchema.safeParse(record.projects[i]);
      if (!projResult.success) {
        return {
          success: false,
          error: `Project at index ${i} failed validation: ${projResult.error.message}`,
          code: 'INVALID_PROJECTS',
          details: projResult.error.format(),
        };
      }
      projects.push(projResult.data);
    }

    return {
      success: true,
      format: 'legacy-backup',
      projects,
      metadata: {
        version: typeof record.version === 'number' ? record.version : 1,
      },
    };
  }

  return {
    success: false,
    error: 'Unrecognized backup format. Expected a Drawzware backup envelope, legacy backup bundle, or project list.',
    code: 'UNRECOGNIZED_FORMAT',
  };
}

/**
 * Serializes an array of projects into a canonical .drawzware-backup JSON string.
 */
export function serializeDrawzBackup(projects: Project[], appVersion = '0.1.0'): string {
  const doc: DrawzBackupDocument = {
    fileType: DRAWZ_BACKUP_TYPE,
    schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    appVersion,
    exportedAt: new Date().toISOString(),
    projects,
  };
  return JSON.stringify(doc, null, 2);
}
