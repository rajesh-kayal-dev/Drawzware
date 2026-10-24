import LZString from 'lz-string';
import { ProjectSchema, type Project } from '@drawzware/contracts';

export const MAX_MIGRATION_URL_LENGTH = 1_900_000;

export interface MigrationPayload {
  v: 1;
  projects: Project[];
  settings: unknown;
  onboarded: boolean;
}

/** Decode `location.hash` from the import page. Null when missing or corrupt. */
export function decodeMigrationHash(hash: string): MigrationPayload | null {
  const encoded = hash.replace(/^#/, '');
  if (!encoded) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const data = JSON.parse(json);
    if (data?.v !== 1 || !Array.isArray(data.projects)) return null;
    const projects = data.projects.flatMap((item: unknown) => {
      const parsed = ProjectSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
    return { v: 1, projects, settings: data.settings ?? null, onboarded: !!data.onboarded };
  } catch {
    return null;
  }
}

export function encodeMigrationPayload(payload: MigrationPayload): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}
