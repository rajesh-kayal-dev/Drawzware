import { toast } from '@/stores/useToastStore';
import { useProjectStore } from '@/features/projects/stores/useProjectStore';
import type { Project } from '@/features/projects/types/project.types';
import type { BackupImportSummary } from '@/types/ipc';
import { downloadFile } from '@/shared/utils/utils';
import {
  parseProjectDocument,
  serializeDrawzDocument,
  parseBackupDocument,
  serializeDrawzBackup,
} from '@/types/document';

/**
 * Sanitizes a project name to produce a safe default filename.
 */
export function sanitizeFilename(name: string): string {
  const sanitized = name.replace(/[/\\?%*:|"<>]/g, '_').trim();
  return sanitized.length > 0 ? sanitized : 'untitled';
}

/**
 * Native or Web open dialog to import a .drawz or JSON project file.
 * Returns the imported Project, or null if canceled/failed.
 */
export async function openDrawzProject(): Promise<Project | null> {
  // 1. Electron Desktop Environment
  if (typeof window !== 'undefined' && window.desktopApi?.file) {
    try {
      const res = await window.desktopApi.file.openDrawzFile();

      if (!res.success) {
        toast({
          message: `Couldn't open project: ${res.error.message}`,
          tone: 'danger',
          duration: 5000,
        });
        return null;
      }

      if (res.data.canceled || !res.data.project) {
        return null;
      }

      const importedProject = res.data.project;

      // Update in-memory project store
      useProjectStore.setState((s) => ({
        projects: [importedProject, ...s.projects.filter((p) => p.id !== importedProject.id)],
      }));

      toast({
        message: `Opened "${importedProject.name}"`,
        tone: 'ok',
        duration: 3500,
      });

      return importedProject;
    } catch (err) {
      toast({
        message: `Error opening project: ${err instanceof Error ? err.message : String(err)}`,
        tone: 'danger',
      });
      return null;
    }
  }

  // 2. Web Browser Fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.drawz,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const text = await file.text();
        const parseResult = parseProjectDocument(text);

        if (!parseResult.success) {
          toast({
            message: `Couldn't import ${file.name}: ${parseResult.error}`,
            tone: 'danger',
            duration: 5000,
          });
          resolve(null);
          return;
        }

        let rawProj: Project;
        if (parseResult.format === 'canonical') {
          rawProj = parseResult.document.project;
        } else if (parseResult.format === 'legacy-project') {
          rawProj = parseResult.rawProject;
        } else {
          toast({
            message: 'Unsupported backup format for single-project import',
            tone: 'danger',
          });
          resolve(null);
          return;
        }

        const { importProjects } = useProjectStore.getState();
        const created = await importProjects([rawProj]);
        if (created && created.length > 0) {
          toast({
            message: `Imported "${created[0].name}"`,
            tone: 'ok',
          });
          resolve(created[0]);
        } else {
          resolve(null);
        }
      } catch (err) {
        toast({
          message: `Failed to read ${file.name}: ${err instanceof Error ? err.message : String(err)}`,
          tone: 'danger',
        });
        resolve(null);
      }
    };
    input.click();
  });
}

/**
 * Native or Web Save As to export the project as a canonical .drawz file.
 * Returns true if saved, false if canceled or failed.
 */
export async function saveAsDrawzProject(project: Project): Promise<boolean> {
  // 1. Electron Desktop Environment
  if (typeof window !== 'undefined' && window.desktopApi?.file) {
    try {
      const res = await window.desktopApi.file.saveDrawzFile(project);

      if (!res.success) {
        toast({
          message: `Save As failed: ${res.error.message}`,
          tone: 'danger',
          duration: 5000,
        });
        return false;
      }

      if (res.data.canceled) {
        return false;
      }

      const savedName = res.data.filePath
        ? res.data.filePath.split(/[\\/]/).pop()
        : `${project.name}.drawz`;

      toast({
        message: `Saved as ${savedName}`,
        tone: 'ok',
        duration: 3500,
      });

      return true;
    } catch (err) {
      toast({
        message: `Save error: ${err instanceof Error ? err.message : String(err)}`,
        tone: 'danger',
      });
      return false;
    }
  }

  // 2. Web Browser Fallback
  try {
    const filename = `${sanitizeFilename(project.name || 'project')}.drawz`;
    const serialized = serializeDrawzDocument(project);
    downloadFile(filename, new Blob([serialized], { type: 'application/json' }));

    toast({
      message: `Downloaded ${filename}`,
      tone: 'ok',
      duration: 3000,
    });
    return true;
  } catch (err) {
    toast({
      message: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
      tone: 'danger',
    });
    return false;
  }
}

/**
 * Exports all projects into a portable, versioned Drawzware backup file (.drawzbackup).
 * Preserves nodes, edges, viewport, and diagram settings without altering browser storage.
 */
export function exportAllProjectsBackup(projects: Project[]): boolean {
  if (!projects || projects.length === 0) {
    toast({
      message: 'No projects available to export.',
      tone: 'neutral',
      duration: 3000,
    });
    return false;
  }

  try {
    const filename = `drawzware-backup-${new Date().toISOString().slice(0, 10)}.drawzbackup`;
    const serialized = serializeDrawzBackup(projects);
    downloadFile(filename, new Blob([serialized], { type: 'application/json' }));

    toast({
      message: `Exported ${projects.length} ${projects.length === 1 ? 'project' : 'projects'} to ${filename}`,
      tone: 'ok',
      duration: 4000,
    });
    return true;
  } catch (err) {
    toast({
      message: `Failed to export backup: ${err instanceof Error ? err.message : String(err)}`,
      tone: 'danger',
    });
    return false;
  }
}

/**
 * Imports a project backup file into Drawzware (native dialog in Electron, file picker in Web).
 * Validates format and schema upfront, handles ID collisions, and persists via storage abstraction.
 */
export async function importProjectBackup(): Promise<BackupImportSummary | null> {
  // 1. Electron Desktop Environment
  if (typeof window !== 'undefined' && window.desktopApi?.file?.importBackupFile) {
    try {
      const res = await window.desktopApi.file.importBackupFile();

      if (!res.success) {
        toast({
          message: `Import failed: ${res.error.message}`,
          tone: 'danger',
          duration: 6000,
        });
        return null;
      }

      if (res.data.canceled || !res.data.summary) {
        return null;
      }

      const summary = res.data.summary;

      // Reload project list in store so dashboard displays imported projects
      await useProjectStore.getState().loadProjects();

      const renameMsg = summary.renamed > 0 ? ` (${summary.renamed} renamed to avoid duplicate IDs)` : '';
      const message = `Successfully imported ${summary.imported} of ${summary.total} projects${renameMsg}.`;

      toast({
        message,
        tone: summary.failed > 0 ? 'danger' : 'ok',
        duration: 5000,
      });

      return summary;
    } catch (err) {
      toast({
        message: `Import error: ${err instanceof Error ? err.message : String(err)}`,
        tone: 'danger',
        duration: 6000,
      });
      return null;
    }
  }

  // 2. Web Browser Fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.drawzbackup,.json,.drawz';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const text = await file.text();
        const parseResult = parseBackupDocument(text);

        if (!parseResult.success) {
          toast({
            message: `Couldn't import backup: ${parseResult.error}`,
            tone: 'danger',
            duration: 6000,
          });
          resolve(null);
          return;
        }

        const projectsToImport = parseResult.projects;
        if (projectsToImport.length === 0) {
          toast({
            message: 'Backup file contains no projects to import.',
            tone: 'neutral',
          });
          resolve(null);
          return;
        }

        const store = useProjectStore.getState();
        const existingIds = new Set(store.projects.map((p) => p.id));
        let renamed = 0;

        const preparedProjects = projectsToImport.map((p) => {
          if (existingIds.has(p.id)) {
            renamed++;
            return {
              ...p,
              id: crypto.randomUUID(),
              name: p.name ? `${p.name} (Imported)` : 'Imported Project',
            };
          }
          return p;
        });

        const created = await store.importProjects(preparedProjects);
        const summary: BackupImportSummary = {
          total: projectsToImport.length,
          imported: created.length,
          renamed,
          failed: projectsToImport.length - created.length,
          importedProjects: created,
        };

        const renameMsg = renamed > 0 ? ` (${renamed} renamed to avoid duplicate IDs)` : '';
        toast({
          message: `Successfully imported ${created.length} of ${projectsToImport.length} projects${renameMsg}.`,
          tone: 'ok',
          duration: 5000,
        });

        resolve(summary);
      } catch (err) {
        toast({
          message: `Failed to import ${file.name}: ${err instanceof Error ? err.message : String(err)}`,
          tone: 'danger',
          duration: 6000,
        });
        resolve(null);
      }
    };
    input.click();
  });
}
