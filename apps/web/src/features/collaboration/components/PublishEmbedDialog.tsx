'use client';

import { useState, useMemo } from 'react';
import { Globe, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { toast } from '@/stores/useToastStore';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import { useProjectStore } from '@/features/projects/stores/useProjectStore';

export function PublishEmbedDialog() {
  const open = useCollaborationStore((s) => s.publishEmbedModalOpen);
  const setOpen = useCollaborationStore((s) => s.setPublishEmbedModalOpen);
  const activeDiagramId = useCollaborationStore((s) => s.activeDiagramId);
  const lastOpenedProjectId = useProjectStore((s) => s.lastOpenedProjectId);
  const projects = useProjectStore((s) => s.projects);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Dynamically resolve real canvas ID from active URL, cloud diagram, or last opened project
  const canvasId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get('id');
      if (urlId) return urlId;
    }
    if (activeDiagramId) return activeDiagramId;
    if (lastOpenedProjectId) return lastOpenedProjectId;
    if (projects.length > 0 && projects[0].id) return projects[0].id;
    return 'canvas';
  }, [activeDiagramId, lastOpenedProjectId, projects]);

  // Generate dynamic public link format with real canvas ID
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${canvasId}`
    : `https://drawzware.app/p/${canvasId}`;

  const embedCode = `<iframe src="${publicUrl}" width="100%" height="500" frameborder="0"></iframe>`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      toast({ message: 'Public link copied to clipboard', tone: 'ok' });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({ message: "Couldn't copy link", tone: 'danger' });
    }
  };

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      toast({ message: 'Embed code copied to clipboard', tone: 'ok' });
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      toast({ message: "Couldn't copy embed code", tone: 'danger' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[460px] p-0 overflow-hidden border border-line bg-card/95 shadow-2xl backdrop-blur-md">
        <DialogHeader className="px-6 pt-6 pb-2 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
              <Globe className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-[17px] font-semibold text-ink tracking-tight">
                Publish & Embed
              </DialogTitle>
              <DialogDescription className="text-[12.5px] text-ink-2 mt-0.5">
                Share a read-only version of this diagram with anyone on the web.
              </DialogDescription>
            </div>
          </div>
          <DialogCloseButton />
        </DialogHeader>

        <DialogBody className="px-6 py-5 space-y-4">
          {/* Section 1: Public Link */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-ink-2">
              Public link (view only)
            </label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={publicUrl}
                className="h-9 font-mono text-[12px] bg-paper"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] bg-surface-2 hover:bg-line-2 px-3 text-[12px] font-medium text-ink border border-line transition-all active:scale-95 cursor-pointer"
              >
                {copiedLink ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5 text-ink-3" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Section 2: Embed Code */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-ink-2">
              Embed code
            </label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={embedCode}
                className="h-9 font-mono text-[11.5px] bg-paper"
              />
              <button
                type="button"
                onClick={handleCopyEmbed}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] bg-surface-2 hover:bg-line-2 px-3 text-[12px] font-medium text-ink border border-line transition-all active:scale-95 cursor-pointer"
              >
                {copiedEmbed ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5 text-ink-3" />}
                {copiedEmbed ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Read-only Information Notice */}
          <div className="rounded-[10px] bg-surface-2/60 border border-line/60 p-3 text-[11.5px] leading-relaxed text-ink-3">
            This is a read-only view. People can see but cannot edit the diagram.
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
