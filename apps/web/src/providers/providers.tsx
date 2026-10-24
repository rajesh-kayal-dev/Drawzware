'use client';

import { useEffect } from 'react';
import { hydrateSettings } from '@/features/settings/stores/useSettingsStore';
import { useApplyTheme } from '@/shared/hooks/useTheme';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { Toaster } from '@/shared/components/ui/toast';
import { PwaRegister } from '@/features/pwa/components/PwaRegister';
import { InstallPromptBanner } from '@/features/pwa/components/InstallPromptBanner';
import { DashboardIntroProvider } from '@/shared/components/feedback/DashboardIntroProvider';

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
