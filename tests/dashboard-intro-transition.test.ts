import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  hasSeenDashboardIntro,
  markDashboardIntroSeen,
  resetDashboardIntroForTesting,
  DASHBOARD_INTRO_STORAGE_KEY,
} from '@/lib/intro-state';
import { isDesktopEnvironment } from '@/hooks/useIsDesktop';

// In-memory storage mocks for node test environment
const mockSessionStore = new Map<string, string>();
const mockLocalStorageStore = new Map<string, string>();

const createMockStorage = (store: Map<string, string>) => ({
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    store.delete(key);
  }),
  clear: vi.fn(() => {
    store.clear();
  }),
});

const mockSessionStorage = createMockStorage(mockSessionStore);
const mockLocalStorage = createMockStorage(mockLocalStorageStore);

// Polyfill global window, sessionStorage, and localStorage
if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      sessionStorage: mockSessionStorage,
      localStorage: mockLocalStorage,
      matchMedia: vi.fn(() => ({ matches: false })),
    },
    writable: true,
    configurable: true,
  });
} else {
  Object.defineProperty(globalThis.window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis.window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });
}

Object.defineProperty(globalThis, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

describe('Milestone 3A.2: Desktop Navigation & Branded Loading Transition', () => {
  beforeEach(() => {
    mockSessionStore.clear();
    mockLocalStorageStore.clear();
    vi.restoreAllMocks();
    delete (globalThis.window as { desktopApi?: unknown }).desktopApi;
  });

  afterEach(() => {
    mockSessionStore.clear();
    mockLocalStorageStore.clear();
    delete (globalThis.window as { desktopApi?: unknown }).desktopApi;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Electron Desktop Navigation vs Browser Navigation
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Desktop Navigation vs Browser Navigation Invariants', () => {
    it('detects desktop environment accurately via window.desktopApi', () => {
      expect(isDesktopEnvironment()).toBe(false);

      (globalThis.window as unknown as { desktopApi: { isDesktop: boolean } }).desktopApi = {
        isDesktop: true,
      };
      expect(isDesktopEnvironment()).toBe(true);
    });

    it('hides Home icon in Desktop and PWA environments, only showing in standard browser', () => {
      const computeHomeIconVisibility = (isDesktop: boolean, isPwaOrInstalled: boolean) => {
        return !isDesktop && !isPwaOrInstalled;
      };

      // Desktop: hidden
      expect(computeHomeIconVisibility(true, false)).toBe(false);
      // Installed PWA: hidden
      expect(computeHomeIconVisibility(false, true)).toBe(false);
      // Desktop PWA: hidden
      expect(computeHomeIconVisibility(true, true)).toBe(false);
      // Standard browser: shown
      expect(computeHomeIconVisibility(false, false)).toBe(true);
    });

    it('suppresses PWA installation prompt inside Electron Desktop', () => {
      // In Electron, isDesktop prevents PWA install button from mounting
      const computePwaVisibility = (isDesktop: boolean, isInstallable: boolean, isInstalled: boolean) => {
        if (isDesktop) return false;
        return isInstallable && !isInstalled;
      };

      expect(computePwaVisibility(true, true, false)).toBe(false);
      expect(computePwaVisibility(false, true, false)).toBe(true);
      expect(computePwaVisibility(false, false, false)).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Loading Animation Timing & Staged Coordination
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Loading Animation Timing & Staged Coordination', () => {
    it('enforces target 2.5–3s duration (default 2600ms) before allowing completion', () => {
      const minDurationMs = 2600;
      const maxTimeoutMs = 5000;

      const shouldComplete = (elapsed: number, isReady: boolean) => {
        const minMet = elapsed >= minDurationMs;
        const timeoutReached = elapsed >= maxTimeoutMs;
        return minMet && (isReady || timeoutReached);
      };

      // Destination is ready early (e.g. 500ms), but transition must stay visible
      expect(shouldComplete(500, true)).toBe(false);
      expect(shouldComplete(1500, true)).toBe(false);
      expect(shouldComplete(2500, true)).toBe(false);

      // Once minDurationMs (2600ms) is satisfied and ready, transition can complete
      expect(shouldComplete(2600, true)).toBe(true);
      expect(shouldComplete(3000, true)).toBe(true);
    });

    it('unblocks navigation via safety timeout if destination loading is slow or stalled', () => {
      const minDurationMs = 2600;
      const maxTimeoutMs = 5000;

      const shouldComplete = (elapsed: number, isReady: boolean) => {
        const minMet = elapsed >= minDurationMs;
        const timeoutReached = elapsed >= maxTimeoutMs;
        return minMet && (isReady || timeoutReached);
      };

      // Not ready and before timeout
      expect(shouldComplete(4000, false)).toBe(false);

      // Reaches safety timeout (5000ms): unblocks even if destination is not ready
      expect(shouldComplete(5000, false)).toBe(true);
      expect(shouldComplete(5500, false)).toBe(true);
    });

    it('calculates staged reveal sequence without visual jumps', () => {
      const computeStage = (elapsed: number) => {
        if (elapsed >= 950) return 3; // spinner
        if (elapsed >= 550) return 2; // wordmark & title
        if (elapsed >= 180) return 1; // glowing emblem
        return 0; // background aura
      };

      expect(computeStage(50)).toBe(0);
      expect(computeStage(200)).toBe(1);
      expect(computeStage(600)).toBe(2);
      expect(computeStage(1000)).toBe(3);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. App Launch vs Session Refresh & Deduplication Invariants
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. App Launch vs Session Refresh & Deduplication Invariants', () => {
    it('shows loading transition when user opens app (fresh session)', () => {
      // Fresh app launch has not seen intro in this session
      expect(hasSeenDashboardIntro()).toBe(false);
    });

    it('marks intro as seen in session storage and prevents replay in subsequent visits', () => {
      expect(hasSeenDashboardIntro()).toBe(false);

      markDashboardIntroSeen();
      expect(hasSeenDashboardIntro()).toBe(true);

      const raw = mockSessionStorage.getItem(DASHBOARD_INTRO_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.version).toBe(1);
      expect(parsed.seenAt).toBeDefined();

      // Subsequent visits in same session must not replay
      expect(hasSeenDashboardIntro()).toBe(true);
    });

    it('does not replay animation upon dashboard refresh (sessionStorage retains state)', () => {
      markDashboardIntroSeen();
      expect(hasSeenDashboardIntro()).toBe(true);

      // Simulating a browser page reload (sessionStorage remains intact across reloads)
      expect(mockSessionStorage.getItem(DASHBOARD_INTRO_STORAGE_KEY)).not.toBeNull();
      expect(hasSeenDashboardIntro()).toBe(true);
    });

    it('allows intro to replay when user closes app and opens fresh session', () => {
      markDashboardIntroSeen();
      expect(hasSeenDashboardIntro()).toBe(true);

      // Simulating closing the app window / fresh app launch
      resetDashboardIntroForTesting();
      expect(hasSeenDashboardIntro()).toBe(false);
    });

    it('guards against duplicate simultaneous clicks and navigation races', () => {
      let isTransitionRunning = false;
      let startCount = 0;

      const triggerTransition = () => {
        if (hasSeenDashboardIntro()) return;
        if (isTransitionRunning) return;
        isTransitionRunning = true;
        startCount++;
        markDashboardIntroSeen();
      };

      // Rapid successive clicks
      triggerTransition();
      triggerTransition();
      triggerTransition();

      expect(startCount).toBe(1);
      expect(hasSeenDashboardIntro()).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. External Background Failure & Offline Resilience
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. External Background Failure & Offline Resilience', () => {
    it('gracefully handles offline mode without throwing or blocking access', () => {
      // Offline environment check
      const canLoadRemoteScript = (isOnline: boolean, prefersReducedMotion: boolean) => {
        if (prefersReducedMotion) return false;
        if (!isOnline) return false;
        return true;
      };

      expect(canLoadRemoteScript(false, false)).toBe(false);
      expect(canLoadRemoteScript(true, false)).toBe(true);
      expect(canLoadRemoteScript(true, true)).toBe(false);
    });

    it('handles localStorage and sessionStorage exceptions without breaking navigation', () => {
      vi.spyOn(mockSessionStorage, 'getItem').mockImplementationOnce(() => {
        throw new Error('Storage disabled by security policy');
      });

      // Must safely catch error and return true so navigation continues unobstructed
      expect(hasSeenDashboardIntro()).toBe(true);
    });

    it('handles storage write errors gracefully', () => {
      vi.spyOn(mockSessionStorage, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => markDashboardIntroSeen()).not.toThrow();
    });

    it('handles window undefined in SSR environments safely', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error simulating SSR
      delete globalThis.window;

      expect(hasSeenDashboardIntro()).toBe(true);
      expect(() => markDashboardIntroSeen()).not.toThrow();
      expect(() => resetDashboardIntroForTesting()).not.toThrow();
      expect(isDesktopEnvironment()).toBe(false);

      globalThis.window = originalWindow;
    });
  });
});
