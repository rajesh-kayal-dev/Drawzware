'use client';

import { useEffect } from 'react';
import { hydrateSettings } from '@/features/settings/stores/useSettingsStore';
import { useCollaborationStore } from '@/features/collaboration/stores/useCollaborationStore';
import { useApplyTheme } from '@/shared/hooks/useTheme';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { Toaster } from '@/shared/components/ui/toast';
import { AuthModal } from '@/features/collaboration/components/AuthModal';
import { PwaRegister } from '@/features/pwa/components/PwaRegister';
import { InstallPromptBanner } from '@/features/pwa/components/InstallPromptBanner';
import { DashboardIntroProvider } from '@/shared/components/feedback/DashboardIntroProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrateSettings();
    useCollaborationStore.getState().checkAuth();
  }, []);
  useApplyTheme();

  return (
    <TooltipProvider>
      <DashboardIntroProvider>
        <PwaRegister />
        {children}
        <InstallPromptBanner />
        <Toaster />
        <AuthModal />
      </DashboardIntroProvider>
    </TooltipProvider>
  );
}
