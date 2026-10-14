'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingHeroSection } from '@/components/landing/LandingHeroSection';
import { LandingFeatureHighlights } from '@/components/landing/LandingFeatureHighlights';
import { LandingWhyDrawzware } from '@/components/landing/LandingWhyDrawzware';
import { LandingWorkflowIntegrations } from '@/components/landing/LandingWorkflowIntegrations';
import { LandingExportSection } from '@/components/landing/LandingExportSection';
import { LandingDarkValueSection } from '@/components/landing/LandingDarkValueSection';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingFinalCTA } from '@/components/landing/LandingFinalCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingDesktopAppModal } from '@/components/landing/LandingDesktopAppModal';
import { useDashboardIntro } from '@/components/transition/DashboardIntroProvider';
import { hasSeenDashboardIntro } from '@/lib/intro-state';

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
