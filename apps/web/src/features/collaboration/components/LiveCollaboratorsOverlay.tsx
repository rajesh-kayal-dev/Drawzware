'use client';

import { useState, useEffect } from 'react';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { cn } from '@/shared/utils/utils';

function CursorPointerIcon({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="drop-shadow-sm select-none"
    >
      <path
        d="M2.5 1.5L6.5 14L8.7 9L13.7 6.8L2.5 1.5Z"
        fill={color}
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LiveCollaboratorsOverlay() {
  const isLive = useCollaborationStore((s) => s.isLive);
  const showLiveCursors = useCollaborationStore((s) => s.showLiveCursors);
  const activeEditorName = useCollaborationStore((s) => s.activeEditorName);
  const liveCursors = useCollaborationStore((s) => s.liveCursors);
  const viewport = useCanvasStore((s) => s.viewport);

  const [now, setNow] = useState<number>(0);

  // Periodically check for idle cursors to gracefully fade out inactive pointers
  useEffect(() => {
    if (!isLive || (!showLiveCursors && !activeEditorName)) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive, showLiveCursors, liveCursors.length, activeEditorName]);

  if (!isLive) return null;

  return (
    <>
      {/* 1. Live Cursors Overlay on Canvas (Pointer Events None) */}
      {showLiveCursors && (
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden select-none">
          {liveCursors.length > 0 ? (
            liveCursors
              .filter((cursor) => !cursor.lastActiveAt || now === 0 || now - cursor.lastActiveAt < 10000)
              .map((cursor) => {
              const screenX = cursor.x * viewport.zoom + viewport.x;
              const screenY = cursor.y * viewport.zoom + viewport.y;
              const isIdle = cursor.lastActiveAt && now > 0 ? now - cursor.lastActiveAt > 4000 : false;

              return (
                <div
                  key={cursor.id}
                  className={cn(
                    'absolute top-0 left-0 flex flex-col items-start will-change-transform',
                    'transition-all duration-150 ease-out',
                    isIdle ? 'opacity-40 transition-opacity duration-500' : 'opacity-100'
                  )}
                  style={{
                    transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
                  }}
                >
                  <CursorPointerIcon color={cursor.color} />
                  <div
                    className="ml-3 -mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-sm flex items-center gap-1"
                    style={{ backgroundColor: cursor.color }}
                  >
                    <span>{cursor.name}</span>
                    {cursor.role === 'viewer' && (
                      <span className="text-[9px] opacity-75 font-normal">(viewer)</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : null}
        </div>
      )}

      {/* 2. Floating Editing Status Indicator */}
      {(() => {
        if (!activeEditorName) return null;
        const matchingCursor = liveCursors.find((c) => c.name === activeEditorName);
        const isEditorActive = matchingCursor?.lastActiveAt && now > 0 ? now - matchingCursor.lastActiveAt < 4000 : false;
        if (!isEditorActive) return null;
        return (
        <div className="pointer-events-auto fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-line bg-card/90 px-3.5 py-1.5 text-[12px] font-medium text-ink shadow-[var(--shadow-lg)] backdrop-blur-md animate-fade-in">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          <span className="text-ink-2">
            <strong className="font-semibold text-ink">{activeEditorName}</strong> is editing…
          </span>
        </div>
        );
      })()}
    </>
  );
}
