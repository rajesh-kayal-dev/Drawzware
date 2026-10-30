'use client';

import { useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Download, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { usePwaInstall } from '@/features/pwa/hooks/usePwaInstall';

const DISMISSED_KEY = 'sdc.pwa.install_prompt_dismissed';

function subscribeToStorage(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getDismissedSnapshot(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const lastDismissed = localStorage.getItem(DISMISSED_KEY);
    return Boolean(lastDismissed && Date.now() - Number(lastDismissed) < 7 * 24 * 60 * 60 * 1000);
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return true;
}

export function InstallPromptBanner() {
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const isStorageDismissed = useSyncExternalStore(subscribeToStorage, getDismissedSnapshot, getServerSnapshot);

  const dismissed = sessionDismissed || isStorageDismissed;

  if (dismissed || !isInstallable || isInstalled) return null;

  const handleDismiss = () => {
    setSessionDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    } catch {
      // ignore
    }
  };

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setSessionDismissed(true);
    }
  };

  return (
    <div
      role="region"
      aria-label="Install App Banner"
      className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3.5 rounded-2xl border border-line bg-paper/95 p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#12281c] border border-[#1d6f42]/40 shadow-md overflow-hidden">
        <Image src="/drawzware-emblem.png" alt="Drawzware" width={28} height={28} className="size-6 object-contain" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-ink tracking-tight">Install Drawzware</h4>
          <span className="rounded-full bg-[#1d6f42]/20 px-1.5 py-0.2 text-[10px] font-medium text-[#22c55e]">PWA</span>
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-ink-2">
          Fast offline launch & native desktop/mobile window experience.
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          onClick={handleInstall}
          className="h-8 gap-1.5 rounded-lg bg-accent px-3 text-xs font-medium text-accent-ink shadow-xs hover:bg-accent/90"
        >
          <Download className="size-3.5" />
          <span>Install</span>
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="flex size-7 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-line-2 hover:text-ink cursor-pointer"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
