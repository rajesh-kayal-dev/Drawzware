import { downloadFile } from '@/shared/utils/utils';
import type { Project } from '@/features/projects/types/project.types';

/** Download one project as JSON. Returns the file name. */
export function exportProjectFile(project: Project): string {
  const filename = `${project.name || 'project'}.json`;
  downloadFile(filename, new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }));
  return filename;
}

/** Download every project as `{ version: 1, projects }`. Returns the file name. */
export function exportAllProjectsFile(projects: Project[]): string {
  const filename = `drawzware-${new Date().toISOString().slice(0, 10)}.json`;
  const json = JSON.stringify({ version: 1, projects }, null, 2);
  downloadFile(filename, new Blob([json], { type: 'application/json' }));
  return filename;
}
