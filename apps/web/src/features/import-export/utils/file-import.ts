import { parseDockerCompose } from '@/features/import-export/utils/docker-compose';
import { parseJsonImport, titleFromFilename, type JsonImportItem } from '@/features/import-export/utils/json-import';
import { toast } from '@/stores/useToastStore';
import type { SystemNode, SystemEdge } from '@/features/canvas/types/canvas.types';

/** Open the browser file picker. Resolves with the chosen file (never resolves on cancel). */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

/** Parse an exported file, a project backup, or an API endpoint list. Throws a readable error. */
export function parseProjectsFile(text: string): JsonImportItem[] {
  return parseJsonImport(text);
}

/** Danger toast with a Details action that reveals the underlying message. */
export function showReadError(fileName: string, error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  toast({
    message: `Couldn't read ${fileName}`,
    tone: 'danger',
    action: { label: 'Details', onClick: () => toast({ message: detail, tone: 'danger', duration: 6000 }) },
  });
}

/**
 * Parses an external file (Docker Compose YAML or JSON endpoints/projects) into normalized import items.
 * Pure format converter — does not mutate the project store.
 */
export async function parseImportFile(file: File): Promise<Array<{ name: string; description?: string; nodes: SystemNode[]; edges: SystemEdge[] }>> {
  try {
    const text = await file.text();
    if (/\.ya?ml$/i.test(file.name)) {
      const { nodes, edges } = parseDockerCompose(text);
      const name = file.name.replace(/\.ya?ml$/i, '');
      return [{ name, description: `Imported from ${file.name}`, nodes, edges }];
    }
    return parseProjectsFile(text).map((item) =>
      item.fromEndpoints ? { ...item, name: titleFromFilename(file.name) } : item
    );
  } catch (e) {
    showReadError(file.name, e);
    return [];
  }
}
