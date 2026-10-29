'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/shared/components/layout/Header';
import { ImportDropZone } from '@/features/import-export/components/ImportDropZone';
import { MigrationBanner } from '@/features/projects/components/MigrationBanner';
import { ProjectList } from '@/features/projects/components/ProjectList';
import { useProjectImport } from '@/features/projects/hooks/useProjectImport';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { openDrawzProject, importProjectBackup, exportAllProjectsBackup } from '@/features/projects/utils/file-operations';
import { useProjectStore } from '@/features/projects/stores/useProjectStore';
import { useDashboardIntro } from '@/shared/components/feedback/DashboardIntroProvider';

/** Dashboard at /app — the existing project list and canvas entry point. */
export default function AppDashboardPage() {
  useDocumentTitle('Drawzware');
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const { handleFiles, importJson, importDockerCompose } = useProjectImport();
  const { signalDashboardReady, isIntroActive } = useDashboardIntro();
  const loaded = useProjectStore((s) => s.loaded);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) {
    return (
      <div
        suppressHydrationWarning
        className="min-h-screen bg-bg dot-grid [background-size:20px_20px] bg-fixed text-ink"
      />
    );
  }

  return (
    <div
      suppressHydrationWarning
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
