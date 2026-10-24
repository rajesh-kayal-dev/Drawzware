'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { plural } from '@/shared/utils/utils';
import { toast } from '@/stores/useToastStore';
import type { Project } from '@/features/projects/types/project.types';
import { useProjectStore } from '@/features/projects/stores/useProjectStore';
import { parseImportFile, pickFile } from '@/features/import-export/utils/file-import';
import { canvasPath } from '@/shared/utils/routes';

/** Dashboard import: picker menus + dropped files. A single import opens the new project. */
export function useProjectImport() {
  const router = useRouter();

  const handleFiles = useCallback(
    async (files: File[]) => {
      const store = useProjectStore.getState();
      if (!store.loaded && !store.loading) {
        await store.loadProjects();
      }

      const imported: Project[] = [];
      for (const file of files) {
        const items = await parseImportFile(file);
        if (items.length > 0) {
          const created = await store.importProjects(items);
          imported.push(...created);
        }
      }

      if (imported.length === 1) {
        router.push(canvasPath(imported[0].id));
      } else if (imported.length > 1) {
        toast({ message: `Imported ${plural(imported.length, 'project')}`, tone: 'ok' });
      }
    },
    [router]
  );

  const importJson = useCallback(async () => {
    const file = await pickFile('.json,application/json');
    if (file) handleFiles([file]);
  }, [handleFiles]);

  const importDockerCompose = useCallback(async () => {
    const file = await pickFile('.yml,.yaml');
    if (file) handleFiles([file]);
  }, [handleFiles]);

  return { handleFiles, importJson, importDockerCompose };
}
