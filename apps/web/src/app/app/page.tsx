'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { ImportDropZone } from '@/components/project/ImportDropZone';
import { MigrationBanner } from '@/components/project/MigrationBanner';
import { ProjectList } from '@/components/project/ProjectList';
import { useProjectImport } from '@/components/project/useProjectImport';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { openDrawzProject, importProjectBackup, exportAllProjectsBackup } from '@/lib/file-operations';
import { useProjectStore } from '@/stores/useProjectStore';
import { useDashboardIntro } from '@/components/transition/DashboardIntroProvider';

/** Dashboard at /app — the existing project list and canvas entry point. */
export default function AppDashboardPage() {
  useDocumentTitle('Drawzware');
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);
  const { handleFiles, importJson, importDockerCompose } = useProjectImport();
  const { signalDashboardReady, isIntroActive } = useDashboardIntro();
  const loaded = useProjectStore((s) => s.loaded);

  // Signal dashboard readiness once project store hydration completes
  useEffect(() => {
    if (loaded) {
      signalDashboardReady();
    }
  }, [loaded, signalDashboardReady]);

  const handleOpenDrawz = async () => {
    if (isOpening) return;
    setIsOpening(true);
    try {
      const project = await openDrawzProject();
      if (project) {
        router.push(`/canvas?id=${encodeURIComponent(project.id)}`);
      }
    } finally {
      setIsOpening(false);
    }
  };

  const handleImportBackup = async () => {
    await importProjectBackup();
  };

  const handleExportAll = () => {
    exportAllProjectsBackup(useProjectStore.getState().projects);
  };

  return (
    <div
      className={`min-h-screen bg-bg dot-grid [background-size:20px_20px] bg-fixed text-ink transition-opacity duration-500 ease-in-out ${
        isIntroActive ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <Header
        onOpenDrawz={handleOpenDrawz}
        onImportBackup={handleImportBackup}
        onExportAll={handleExportAll}
        onImportJson={importJson}
        onImportDockerCompose={importDockerCompose}
      />
      <main className="mx-auto w-full max-w-[1400px] px-6 sm:px-8 pt-8 pb-20">
        <MigrationBanner />
        <ProjectList />
      </main>
      <ImportDropZone onFiles={handleFiles} />
    </div>
  );
}
