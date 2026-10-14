'use client';

import { Header } from '@/components/layout/Header';
import { ImportDropZone } from '@/components/project/ImportDropZone';
import { MigrationBanner } from '@/components/project/MigrationBanner';
import { ProjectList } from '@/components/project/ProjectList';
import { useProjectImport } from '@/components/project/useProjectImport';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** Dashboard at /app — the existing project list and canvas entry point. */
export default function AppDashboardPage() {
  useDocumentTitle('Drawzware');
  const { handleFiles, importJson, importDockerCompose } = useProjectImport();

  return (
    <div className="min-h-screen bg-bg dot-grid [background-size:20px_20px] bg-fixed text-ink">
      <Header onImportJson={importJson} onImportDockerCompose={importDockerCompose} />
      <main className="mx-auto w-full max-w-[1400px] px-6 sm:px-8 pt-8 pb-20">
        <MigrationBanner />
        <ProjectList />
      </main>
      <ImportDropZone onFiles={handleFiles} />
    </div>
  );
}
