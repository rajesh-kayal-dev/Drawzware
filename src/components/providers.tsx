'use client';

import { useEffect } from 'react';
import { hydrateSettings } from '@/stores/useSettingsStore';
import { useApplyTheme } from '@/hooks/useTheme';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toast';
import { PwaRegister } from '@/components/pwa/PwaRegister';
import { InstallPromptBanner } from '@/components/pwa/InstallPromptBanner';
import { DashboardIntroProvider } from '@/components/transition/DashboardIntroProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrateSettings();
  }, []);
  useApplyTheme();

  return (
    <TooltipProvider>
      <DashboardIntroProvider>
        <PwaRegister />
        {children}
        <InstallPromptBanner />
        <Toaster />
      </DashboardIntroProvider>
    </TooltipProvider>
  );
}
