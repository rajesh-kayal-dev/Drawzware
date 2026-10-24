'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LandingNavbar } from '@/features/marketing/components/LandingNavbar';
import { LandingHeroSection } from '@/features/marketing/components/LandingHeroSection';
import { LandingFeatureHighlights } from '@/features/marketing/components/LandingFeatureHighlights';
import { LandingWhyDrawzware } from '@/features/marketing/components/LandingWhyDrawzware';
import { LandingWorkflowIntegrations } from '@/features/marketing/components/LandingWorkflowIntegrations';
import { LandingExportSection } from '@/features/marketing/components/LandingExportSection';
import { LandingDarkValueSection } from '@/features/marketing/components/LandingDarkValueSection';
import { LandingHowItWorks } from '@/features/marketing/components/LandingHowItWorks';
import { LandingFinalCTA } from '@/features/marketing/components/LandingFinalCTA';
import { LandingFooter } from '@/features/marketing/components/LandingFooter';
import { LandingDesktopAppModal } from '@/features/marketing/components/LandingDesktopAppModal';
import { useDashboardIntro } from '@/shared/components/feedback/DashboardIntroProvider';
import { hasSeenDashboardIntro } from '@/shared/utils/intro-state';

const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Drawzware',
  url: 'https://drawzware.vercel.app',
  description:
    'Free, open-source tool for visually designing system architectures, microservices, sequence diagrams, and ER diagrams.',
};

/**
 * Public landing page at /
 * The actual canvas application lives at /app
 */
export default function LandingPage() {
  const router = useRouter();
  const [isDesktopAppModalOpen, setIsDesktopAppModalOpen] = useState(false);
  const { startIntroTransition } = useDashboardIntro();

  // If executing inside Electron, immediately redirect to /app dashboard
  useEffect(() => {
    if (typeof window !== 'undefined' && Boolean(window.desktopApi?.isDesktop)) {
      router.replace('/app');
    }
  }, [router]);

  const handleLandingClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('a[href="/app"], a[href="/app/"]');
    if (target && !hasSeenDashboardIntro()) {
      e.preventDefault();
      e.stopPropagation();
      startIntroTransition('/app');
    }
  };

  return (
    <div
      onClickCapture={handleLandingClickCapture}
      className="lp-root min-h-screen bg-[#faf8f5] text-neutral-900 flex flex-col font-sans overflow-x-hidden w-full"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
      />
      <LandingNavbar onOpenDesktopApp={() => setIsDesktopAppModalOpen(true)} />

      <main className="flex-1 w-full">
        <LandingHeroSection onOpenDesktopApp={() => setIsDesktopAppModalOpen(true)} />
        <LandingFeatureHighlights />
        <LandingWhyDrawzware />
        <LandingWorkflowIntegrations />
        <LandingExportSection />
        <LandingDarkValueSection />
        <LandingHowItWorks />
        <LandingFinalCTA />
      </main>

      <LandingFooter />

      <LandingDesktopAppModal
        isOpen={isDesktopAppModalOpen}
        onClose={() => setIsDesktopAppModalOpen(false)}
      />
    </div>
  );
}
