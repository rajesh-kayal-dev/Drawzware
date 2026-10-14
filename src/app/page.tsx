'use client';

import { useState } from 'react';
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

/**
 * Public landing page at /
 * The actual canvas application lives at /app
 */
export default function LandingPage() {
  const [isDesktopAppModalOpen, setIsDesktopAppModalOpen] = useState(false);

  return (
    <div className="lp-root min-h-screen bg-[#faf8f5] text-neutral-900 flex flex-col font-sans overflow-x-hidden w-full">
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
