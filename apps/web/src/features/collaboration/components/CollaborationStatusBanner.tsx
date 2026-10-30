'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { useCollaborationStore } from '../stores/useCollaborationStore';

export function CollaborationStatusBanner() {
  const isLive = useCollaborationStore((s) => s.isLive);
  const connectionStatus = useCollaborationStore((s) => s.connectionStatus);
  const publishError = useCollaborationStore((s) => s.publishError);
  const invitationError = useCollaborationStore((s) => s.invitationError);
  const lastFailedInvitationParams = useCollaborationStore((s) => s.lastFailedInvitationParams);
  const publishCurrentCanvas = useCollaborationStore((s) => s.publishCurrentCanvas);
  const retryLastInvitation = useCollaborationStore((s) => s.retryLastInvitation);
  const retryConnection = useCollaborationStore((s) => s.retryConnection);
  const setPublishError = useCollaborationStore((s) => s.setPublishError);
  const setInvitationError = useCollaborationStore((s) => s.setInvitationError);

  const [connectedDismissed, setConnectedDismissed] = useState(false);
  const [retryingPublish, setRetryingPublish] = useState(false);
  const [retryingInvitation, setRetryingInvitation] = useState(false);

  // Auto-dismiss "Connected" card after 4 seconds
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const timer = setTimeout(() => {
        setConnectedDismissed(true);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setConnectedDismissed(false);
    }
  }, [connectionStatus]);

  const handleRetryPublish = async () => {
    setRetryingPublish(true);
    try {
      await publishCurrentCanvas();
    } finally {
      setRetryingPublish(false);
    }
  };

  const handleRetryInvitation = async () => {
    setRetryingInvitation(true);
    try {
      await retryLastInvitation();
    } finally {
      setRetryingInvitation(false);
    }
  };

  const collaborators = useCollaborationStore((s) => s.collaborators);
  const remoteCollaborators = collaborators.filter((c) => !c.isCurrentUser);
  const hasPeers = remoteCollaborators.length > 0;
  const peerNames = remoteCollaborators.map((c) => c.name).filter(Boolean);
  const connectedSubtitle =
    peerNames.length === 1
      ? `Collaborating in real time with ${peerNames[0]}.`
      : peerNames.length > 1
        ? `Collaborating with ${peerNames[0]} and ${peerNames.length - 1} others.`
        : 'You are collaborating in real time.';

  // Select single active state by priority — NEVER stack multiple banners!
  let activeKind: 'invitation-error' | 'publish-error' | 'conn-error' | 'reconnecting' | 'connected' | 'connecting' | null = null;
  if (invitationError) {
    activeKind = 'invitation-error';
  } else if (publishError) {
    activeKind = 'publish-error';
  } else if (isLive && connectionStatus === 'error') {
    activeKind = 'conn-error';
  } else if (isLive && connectionStatus === 'reconnecting') {
    activeKind = 'reconnecting';
  } else if (isLive && connectionStatus === 'connected' && hasPeers && !connectedDismissed) {
    activeKind = 'connected';
  } else if (isLive && connectionStatus === 'connecting' && hasPeers) {
    activeKind = 'connecting';
  }

  if (!activeKind) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 pointer-events-auto select-none max-w-[360px] animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/92 text-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
        
        {/* State 1: Invitation Failed */}
        {activeKind === 'invitation-error' && (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full rounded-full bg-red-400 opacity-75 animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
              </span>
              <div className="min-w-0">
                <h4 className="text-[12.5px] font-medium text-white leading-tight">Invitation failed</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight truncate">
                  {lastFailedInvitationParams?.email ? `Could not invite ${lastFailedInvitationParams.email}` : (invitationError || 'Failed to send invite.')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleRetryInvitation}
                disabled={retryingInvitation}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[11px] font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {retryingInvitation && <Loader2 className="size-3 animate-spin" />}
                <span>{retryingInvitation ? 'Retrying…' : 'Retry'}</span>
              </button>
              <button
                type="button"
                onClick={() => setInvitationError(null)}
                aria-label="Dismiss"
                className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </>
        )}

        {/* State 2: Publish Failed */}
        {activeKind === 'publish-error' && (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex size-2 shrink-0">
                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
              </span>
              <div className="min-w-0">
                <h4 className="text-[12.5px] font-medium text-white leading-tight">Publish failed</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight truncate">
                  {publishError || 'Could not save diagram to cloud.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleRetryPublish}
                disabled={retryingPublish}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[11px] font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {retryingPublish && <Loader2 className="size-3 animate-spin" />}
                <span>{retryingPublish ? 'Retrying…' : 'Retry'}</span>
              </button>
              <button
                type="button"
                onClick={() => setPublishError(null)}
                aria-label="Dismiss"
                className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </>
        )}

        {/* State 3: Connection Failed */}
        {activeKind === 'conn-error' && (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex size-2 shrink-0">
                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
              </span>
              <div className="min-w-0">
                <h4 className="text-[12.5px] font-medium text-white leading-tight">Connection failed</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight truncate">Please check your network and try again.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={retryConnection}
              className="shrink-0 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[11px] font-medium text-white transition-colors cursor-pointer"
            >
              Retry
            </button>
          </>
        )}

        {/* State 4: Reconnecting */}
        {activeKind === 'reconnecting' && (
          <div className="flex items-center gap-2.5 min-w-0">
            <RefreshCw className="size-3.5 animate-spin text-amber-400 shrink-0 stroke-[2]" />
            <div className="min-w-0">
              <h4 className="text-[12.5px] font-medium text-white leading-tight">Reconnecting</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight truncate">Connection lost. Reconnecting to server…</p>
            </div>
          </div>
        )}

        {/* State 5: Connected (Peers present) */}
        {activeKind === 'connected' && (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex size-2 shrink-0">
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20" />
              </span>
              <div className="min-w-0">
                <h4 className="text-[12.5px] font-medium text-white leading-tight">Connected</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight truncate">{connectedSubtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConnectedDismissed(true)}
              aria-label="Dismiss"
              className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="size-3.5" />
            </button>
          </>
        )}

        {/* State 6: Connecting */}
        {activeKind === 'connecting' && (
          <div className="flex items-center gap-2.5 min-w-0">
            <Loader2 className="size-3.5 animate-spin text-blue-400 shrink-0 stroke-[2]" />
            <div className="min-w-0">
              <h4 className="text-[12.5px] font-medium text-white leading-tight">Connecting</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight truncate">Connecting to collaboration session…</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
