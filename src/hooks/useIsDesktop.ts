'use client';

import { useSyncExternalStore } from 'react';

/**
 * Returns true if running within the Electron desktop runtime environment.
 * Evaluates safely across SSR and client contexts.
 */
export function isDesktopEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.desktopApi?.isDesktop);
}

const emptySubscribe = () => () => {};

/**
 * React hook to detect if the current window is executing inside Electron.
 * Uses useSyncExternalStore to eliminate cascading renders and hydration mismatch.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    isDesktopEnvironment,
    () => false
  );
}
