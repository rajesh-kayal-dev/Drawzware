'use client';

import { useState, useEffect } from 'react';
import { UploadCloud, LayoutGrid, Loader2, AlertCircle, RefreshCw, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/shared/components/ui/dialog';
import { useCollaborationStore } from '../stores/useCollaborationStore';

export function PublishToCloudModal() {
  const open = useCollaborationStore((s) => s.publishModalOpen);
  const setOpen = useCollaborationStore((s) => s.setPublishModalOpen);
  const publishLoading = useCollaborationStore((s) => s.publishLoading);
  const publishError = useCollaborationStore((s) => s.publishError);
  const savedToCloudConnectionFailed = useCollaborationStore(
    (s) => s.savedToCloudConnectionFailed
  );
  const workspaces = useCollaborationStore((s) => s.workspaces);
  const loadWorkspaces = useCollaborationStore((s) => s.loadWorkspaces);
  const publishCurrentCanvas = useCollaborationStore((s) => s.publishCurrentCanvas);
  const retryConnection = useCollaborationStore((s) => s.retryConnection);

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');

  // Load workspaces when modal opens
  useEffect(() => {
    if (open) {
      loadWorkspaces().then((list) => {
        if (list.length > 0 && !selectedWorkspaceId) {
          setSelectedWorkspaceId(list[0].id);
        }
      });
    }
  }, [open, loadWorkspaces, selectedWorkspaceId]);

  const handlePublish = async () => {
    await publishCurrentCanvas(selectedWorkspaceId || undefined);
  };

  const handleRetryConnection = () => {
    retryConnection();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="relative max-w-[390px] p-6 overflow-hidden border border-[#272b3b] bg-[#12141c] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] rounded-[22px] text-center">
        {/* Close Button at top-right */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={publishLoading}
          aria-label="Close"
          className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {/* Circular Cloud Upload Icon Badge */}
        <div className="flex justify-center mb-3 pt-1">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#1b1f2e] border border-[#2f374e] text-[#6366f1] shadow-inner">
            <UploadCloud className="size-6 stroke-[2]" />
          </div>
        </div>

        {/* Heading & Subtitle */}
        <h2 className="text-[17px] font-bold text-white tracking-tight">
          Publish to Cloud
        </h2>
        <p className="text-[12.5px] text-zinc-400 mt-1.5 leading-relaxed max-w-[320px] mx-auto">
          This diagram is currently saved on your device. Publish it to your workspace to enable live collaboration and sharing.
        </p>

        {/* Info Card with 4-square grid icon */}
        <div className="flex items-start gap-3 p-3.5 mt-4 rounded-[14px] border border-[#262b3a] bg-[#181a24] text-left">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-lg text-[#38bdf8] mt-0.5">
            <LayoutGrid className="size-5 stroke-[2]" />
          </div>
          <p className="text-[12px] text-zinc-300 leading-relaxed">
            Your local diagram will be uploaded and linked to your account. The current canvas will remain open.
          </p>
        </div>

        {/* Workspace Selection if multiple exist */}
        {workspaces.length > 1 && (
          <div className="mt-3.5 text-left">
            <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Target Workspace</label>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              disabled={publishLoading}
              className="w-full h-9 px-3 rounded-[10px] border border-[#262b3a] bg-[#181a24] text-xs text-zinc-200 focus:outline-none focus:border-[#6366f1]"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-[#12141c]">
                  {ws.name} ({ws.role || 'member'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Publish Error / Retry State */}
        {publishError && !savedToCloudConnectionFailed && (
          <div className="flex items-center justify-between p-3 mt-3 rounded-xl border border-red-500/30 bg-red-950/30 text-red-300 text-xs text-left">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-red-400" />
              <span className="line-clamp-2">{publishError}</span>
            </div>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishLoading}
              className="ml-2 px-2.5 py-1 rounded-lg bg-red-900/50 hover:bg-red-900 border border-red-500/40 text-xs font-medium text-white transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Saved to cloud connection error */}
        {savedToCloudConnectionFailed && (
          <div className="flex items-center justify-between p-3 mt-3 rounded-xl border border-amber-500/30 bg-amber-950/30 text-amber-300 text-xs text-left">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-amber-400" />
              <span>Saved to cloud — connection failed. Your local data is safe.</span>
            </div>
            <button
              type="button"
              onClick={handleRetryConnection}
              className="ml-2 px-2.5 py-1 rounded-lg bg-amber-900/50 hover:bg-amber-900 border border-amber-500/40 text-xs font-medium text-white transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Bottom Actions Buttons */}
        <div className="flex items-center gap-2.5 mt-5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={publishLoading}
            className="flex-1 h-10 rounded-[12px] bg-[#1d202d] hover:bg-[#25293a] border border-[#2f3549] text-zinc-300 text-[13px] font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishLoading}
            className="flex-1 h-10 rounded-[12px] bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13px] font-semibold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {publishLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <span>Publish & Continue</span>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
