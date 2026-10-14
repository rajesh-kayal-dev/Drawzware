'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized?: boolean;
      init?: () => void;
      destroy?: () => void;
    };
  }
}

export interface BrandedLoadingTransitionProps {
  /**
   * External signal indicating the destination is ready (e.g. project store hydrated).
   * Defaults to true if not supplied.
   */
  isReady?: boolean;
  /**
   * Minimum duration in milliseconds the transition should stay visible (default: 2600ms, targeting 2.5–3s).
   */
  minDurationMs?: number;
  /**
   * Safety timeout in milliseconds to prevent stalling if destination loading hangs (default: 5000ms).
   */
  maxTimeoutMs?: number;
  /**
   * Callback invoked once the transition has completed and faded out.
   */
  onComplete?: () => void;
  /**
   * Optional custom wrapper class name.
   */
  className?: string;
}

export function BrandedLoadingTransition({
  isReady = true,
  minDurationMs = 2600,
  maxTimeoutMs = 5000,
  onComplete,
  className = '',
}: BrandedLoadingTransitionProps) {
  // Staged reveal animation steps: 0 = backdrop, 1 = transparent emblem, 2 = title & dual-spinner
  const [animStage, setAnimStage] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 2;
    }
    return 0;
  });

  const [progress, setProgress] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 100;
    }
    return 0;
  });

  const [isFadingOut, setIsFadingOut] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // ── 1. UnicornStudio Script Loader & Initialization with Offline Fallback ──
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    let isSubscribed = true;

    const initStudio = () => {
      if (typeof window !== 'undefined' && window.UnicornStudio?.init) {
        try {
          window.UnicornStudio.init();
        } catch {
          // Graceful fallback to CSS Aura animation
        }
      }
    };

    try {
      if (window.UnicornStudio?.init) {
        initStudio();
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js';
        script.async = true;
        script.onload = () => {
          if (isSubscribed) {
            initStudio();
            if (window.UnicornStudio) {
              window.UnicornStudio.isInitialized = true;
            }
          }
        };
        script.onerror = () => {
          // Fallback to CSS Aura animation silently
        };
        (document.head || document.body).appendChild(script);
      }
    } catch {
      // Offline or CSP blocked; gracefully fallback to CSS
    }

    return () => {
      isSubscribed = false;
      if (window.UnicornStudio?.destroy) {
        try {
          window.UnicornStudio.destroy();
        } catch {
          // Safe cleanup
        }
      }
    };
  }, []);

  // ── 2. Subtle Staged Reveal & Coordinated Percentage Timing ─────────────────
  useEffect(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
    completedRef.current = false;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          if (!completedRef.current) {
            completedRef.current = true;
            onCompleteRef.current?.();
          }
        }, 150);
      }, 200);
      return () => clearTimeout(timer);
    }

    // Stage 1: Reveal transparent emblem at 150ms
    const timerStage1 = setTimeout(() => {
      setAnimStage((prev) => Math.max(prev, 1));
    }, 150);

    // Stage 2: Reveal title text and dual-spinner at 450ms
    const timerStage2 = setTimeout(() => {
      setAnimStage((prev) => Math.max(prev, 2));
    }, 450);

    // Periodic interval to interpolate percentage and coordinate exit
    const interval = setInterval(() => {
      const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
      const minMet = elapsed >= minDurationMs;
      const timeoutReached = elapsed >= maxTimeoutMs;
      const destinationReady = isReady || timeoutReached;

      if (minMet && destinationReady) {
        setProgress(100);
        clearInterval(interval);
        if (!completedRef.current) {
          setIsFadingOut(true);
          setTimeout(() => {
            if (!completedRef.current) {
              completedRef.current = true;
              onCompleteRef.current?.();
            }
          }, 500);
        }
        return;
      }

      // Smooth percentage interpolation towards 92% while waiting for destination
      const timeRatio = Math.min(elapsed / minDurationMs, 1);
      let nextProgress: number;

      if (!destinationReady) {
        nextProgress = Math.min(Math.round(timeRatio * 90), 92);
      } else {
        nextProgress = Math.min(Math.round(timeRatio * 100), 99);
      }

      setProgress((prev) => Math.max(prev, nextProgress));
    }, 28);

    return () => {
      clearTimeout(timerStage1);
      clearTimeout(timerStage2);
      clearInterval(interval);
    };
  }, [isReady, minDurationMs, maxTimeoutMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Drawzware workspace"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07090e] text-white select-none transition-opacity duration-500 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${className}`}
    >
      {/* ── Ambient Animated Aura Background ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          data-us-project="yaha7Bz5f3cRBAa5js9K"
          className="absolute inset-0 w-full h-full"
        />
        {/* CSS Aura Fallback & Ambient Lighting */}
        <div className="aura-fallback-mesh absolute inset-0 -z-10 pointer-events-none" />
      </div>

      {/* ── Center Brand Stage ── */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6">
        {/* Transparent Brand Emblem with Ambient Halo Glow (Stage 1) */}
        <div
          className={`relative mb-4 flex items-center justify-center transition-all duration-700 ease-out ${
            animStage >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Ambient emerald / cyan aura glow behind the floating transparent emblem */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-emerald-500/25 via-teal-400/20 to-cyan-500/25 blur-2xl opacity-90 animate-pulse pointer-events-none" />

          {/* Floating Transparent Emblem */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/drawzware-emblem.png"
            alt="Drawzware"
            className="relative h-18 sm:h-22 w-auto object-contain drop-shadow-[0_0_24px_rgba(16,185,129,0.45)]"
          />
        </div>

        {/* Clean Brand Typography: "Drawzware: Your System Design Studio" (Stage 2) */}
        <div
          className={`flex flex-col items-center mb-7 text-center transition-all duration-700 ease-out ${
            animStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <h1 className="text-xl sm:text-2xl font-semibold tracking-wide text-white drop-shadow-sm mb-1">
            Drawzware
          </h1>
          <span className="text-[11px] sm:text-xs font-medium tracking-[0.24em] text-emerald-400 uppercase select-none">
            Your System Design Studio
          </span>
        </div>

        {/* ── Dual Concentric Spinners with Center Percentage Counter (Stage 2) ── */}
        <div
          className={`relative flex items-center justify-center w-14 h-14 transition-opacity duration-500 ease-out ${
            animStage >= 2 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Outer ring: rotates clockwise */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 border-r-teal-400/60 spinner-clockwise shadow-[0_0_12px_rgba(16,185,129,0.3)]" />

          {/* Inner ring: rotates anti-clockwise */}
          <div className="absolute w-9 h-9 rounded-full border-2 border-cyan-500/20 border-b-cyan-400 border-l-emerald-400/60 spinner-anticlockwise shadow-[0_0_8px_rgba(6,182,212,0.25)]" />

          {/* Center percentage counter */}
          <span className="relative z-10 text-[10px] sm:text-[11px] font-mono font-medium text-emerald-300/90 tabular-nums tracking-tighter select-none">
            {progress}%
          </span>
        </div>
      </div>
    </div>
  );
}
