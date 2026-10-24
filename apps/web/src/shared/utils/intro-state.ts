/**
 * Manages branded loading transition flag for Drawzware Dashboard entry.
 *
 * Invariants:
 * - Shows when opening the app (per application launch / session).
 * - Preserves state across page refreshes and subsequent dashboard visits (never replays on refresh or back-navigation).
 * - Versioned key ensures upgrade safety.
 * - Safely handles sessionStorage / localStorage access restrictions (e.g. Incognito restrictions, quota limits, SSR).
 * - Safe fallback returns `true` (already seen) on storage read exception to prevent infinite loops.
 */

export const DASHBOARD_INTRO_STORAGE_KEY = 'drawzware_dashboard_intro_v1';

export interface IntroStateRecord {
  seenAt: string;
  version: number;
}

let memoryFallbackSeen = false;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    // Prefer sessionStorage so each app launch / window open presents the transition,
    // while refreshes and internal route changes within the session do not replay it.
    if (typeof window.sessionStorage !== 'undefined' && window.sessionStorage !== null) {
      return window.sessionStorage;
    }
    if (typeof window.localStorage !== 'undefined' && window.localStorage !== null) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Checks whether the dashboard intro transition has already been seen in this session.
 * Safe for SSR and resilient to storage exceptions.
 */
export function hasSeenDashboardIntro(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const storage = getStorage();
    if (!storage) {
      return memoryFallbackSeen;
    }
    const raw = storage.getItem(DASHBOARD_INTRO_STORAGE_KEY);
    if (!raw) return false;
    return true;
  } catch {
    // If storage is inaccessible or restricted, default to true to avoid trapping the user
    return true;
  }
}

/**
 * Marks the dashboard intro as started / completed so it will not replay.
 * Must be called early in the transition lifecycle.
 */
export function markDashboardIntroSeen(): void {
  memoryFallbackSeen = true;
  if (typeof window === 'undefined') return;

  try {
    const storage = getStorage();
    if (!storage) return;

    const record: IntroStateRecord = {
      seenAt: new Date().toISOString(),
      version: 1,
    };
    storage.setItem(DASHBOARD_INTRO_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage write failure is handled gracefully without blocking navigation
  }
}

/**
 * Resets the intro state for testing or debug environments.
 */
export function resetDashboardIntroForTesting(): void {
  memoryFallbackSeen = false;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.removeItem(DASHBOARD_INTRO_STORAGE_KEY);
  } catch {
    // Ignore
  }
  try {
    window.localStorage?.removeItem(DASHBOARD_INTRO_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
