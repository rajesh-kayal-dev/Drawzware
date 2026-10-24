'use client';

import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasSeenDashboardIntro, markDashboardIntroSeen } from '@/lib/intro-state';
import { BrandedLoadingTransition } from './BrandedLoadingTransition';

interface DashboardIntroContextValue {
  /** True while the transition overlay is actively displaying. */
  isIntroActive: boolean;
  /** Signals that the dashboard has completed store hydration and is ready for interaction. */
  signalDashboardReady: () => void;
  /**
   * Starts the branded loading transition if not yet seen in this session, then navigates to targetUrl.
   * If already seen, navigates immediately without transition.
   */
  startIntroTransition: (targetUrl?: string) => void;
}

const DashboardIntroContext = createContext<DashboardIntroContextValue | null>(null);

export function useDashboardIntro(): DashboardIntroContextValue {
  const ctx = useContext(DashboardIntroContext);
  if (!ctx) {
    throw new Error('useDashboardIntro must be used within a DashboardIntroProvider');
  }
  return ctx;
}

export function DashboardIntroProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Initialize to true on cold start so the loading screen renders on the very first frame without dashboard flash
  const [isIntroActive, setIsIntroActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !hasSeenDashboardIntro();
  });
  const [isDashboardReady, setIsDashboardReady] = useState(false);
  const transitionStartedRef = useRef(isIntroActive);

  useEffect(() => {
    if (isIntroActive) {
      transitionStartedRef.current = true;
      markDashboardIntroSeen();
    }
  }, [isIntroActive]);

  const signalDashboardReady = useCallback(() => {
    setIsDashboardReady(true);
  }, []);

  const startIntroTransition = useCallback((targetUrl = '/app') => {
    // If already seen in this session, navigate immediately without showing intro
    if (hasSeenDashboardIntro()) {
      if (typeof window !== 'undefined' && window.location.pathname !== targetUrl && window.location.pathname !== `${targetUrl}/`) {
        router.push(targetUrl);
      }
      return;
    }

    // Guard against duplicate simultaneous clicks
    if (transitionStartedRef.current) {
      return;
    }
    transitionStartedRef.current = true;

    // Immediately mark as seen so refreshes or quick exits never replay it in this session
    markDashboardIntroSeen();

    setIsDashboardReady(false);
    setIsIntroActive(true);

    try {
      router.prefetch(targetUrl);
    } catch {
      // Ignore prefetch errors
    }

    if (typeof window !== 'undefined' && (window.location.pathname === targetUrl || window.location.pathname === `${targetUrl}/`)) {
      // Already on the target route (e.g. initial desktop app cold start directly at /app)
    } else {
      router.push(targetUrl);
    }
  }, [router]);

  const handleTransitionComplete = useCallback(() => {
    setIsIntroActive(false);
    transitionStartedRef.current = false;
  }, []);

  return (
    <DashboardIntroContext.Provider
      value={{
        isIntroActive,
        signalDashboardReady,
        startIntroTransition,
      }}
    >
      {children}
      {isIntroActive && (
        <BrandedLoadingTransition
          isReady={isDashboardReady}
          minDurationMs={2600}
          maxTimeoutMs={5000}
          onComplete={handleTransitionComplete}
        />
      )}
    </DashboardIntroContext.Provider>
  );
}
