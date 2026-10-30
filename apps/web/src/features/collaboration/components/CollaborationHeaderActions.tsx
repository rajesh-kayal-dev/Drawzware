'use client';

import { Users, Mail, Globe, Share2, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { SimpleTooltip } from '@/shared/components/ui/tooltip';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import { CollaboratorsPopover } from './CollaboratorsPopover';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { useProjectStore } from '@/features/projects/stores/useProjectStore';
import { cn } from '@/shared/utils/utils';
import { toast } from '@/stores/useToastStore';

interface CollaborationHeaderActionsProps {
  onExportPng?: () => void;
}

export function CollaborationHeaderActions({}: CollaborationHeaderActionsProps = {}) {
  const isLive = useCollaborationStore((s) => s.isLive);
  const currentUser = useCollaborationStore((s) => s.currentUser);
  const activeDiagramId = useCollaborationStore((s) => s.activeDiagramId);
  const setAuthModalOpen = useCollaborationStore((s) => s.setAuthModalOpen);
  const setInviteModalOpen = useCollaborationStore((s) => s.setInviteModalOpen);
  const setPublishModalOpen = useCollaborationStore((s) => s.setPublishModalOpen);
  const setPublishEmbedModalOpen = useCollaborationStore((s) => s.setPublishEmbedModalOpen);
  const setShareOpen = useCanvasStore((s) => s.setShareOpen);

  const handleCollaborateLiveClick = () => {
    if (!currentUser) {
      setAuthModalOpen(true);
    } else if (!currentUser.isEmailVerified) {
      toast({
        message: 'Please verify your email address to enable live cloud collaboration.',
        tone: 'neutral',
      });
      setAuthModalOpen(true);
    } else {
      const projectStore = useProjectStore.getState();
      const currentProj =
        projectStore.projects.find((p) => p.id === projectStore.lastOpenedProjectId) ||
        projectStore.projects[0];

      if (currentProj?.cloudDiagramId || activeDiagramId) {
        useCollaborationStore.getState().setLive(true);
        toast({ message: 'Live collaboration session is active', tone: 'ok' });
      } else {
        // First-time publish: open Publish to Cloud modal (Target Step 8)
        setPublishModalOpen(true);
      }
    }
  };

  const handleInviteByEmailClick = () => {
    if (!currentUser) {
      setAuthModalOpen(true);
    } else if (!currentUser.isEmailVerified) {
      toast({
        message: 'Please verify your email address before inviting collaborators.',
        tone: 'neutral',
      });
      setAuthModalOpen(true);
    } else {
      setInviteModalOpen(true, 'invite');
    }
  };

  const handlePublishEmbedClick = () => {
    setPublishEmbedModalOpen(true);
  };

  const myRole = useCollaborationStore((s) => s.myRole);
  const isOwner = !myRole || myRole === 'owner';

  return (
    <div className="flex items-center gap-1.5">
      {/* 1. Collaborators Avatar Stack & Popover (Panel 3: Collaborative Canvas) */}
      {(isLive || currentUser) && <CollaboratorsPopover />}

      {/* 2. Invite Button (Visible ONLY to Owner when logged in) */}
      {currentUser && isOwner && (
        <SimpleTooltip label="Invite collaborators">
          <button
            type="button"
            onClick={handleInviteByEmailClick}
            className={cn(
              'group relative flex h-8 items-center gap-1.5 px-3 rounded-full border border-[#818cf8]/50 bg-[#818cf8]/20 text-[#a5b4fc] shadow-2xs transition-all duration-150',
              'hover:-translate-y-0.5 hover:border-[#818cf8]/70 hover:bg-[#818cf8]/35 hover:text-white hover:shadow-xs active:translate-y-0 active:scale-95 cursor-pointer font-medium text-[12.5px]'
            )}
          >
            <UserPlus className="size-3.5 stroke-[2.2]" />
            <span>Invite</span>
          </button>
        </SimpleTooltip>
      )}

      {/* 3. Share Button with Dropdown (Visible only before login) */}
      {!currentUser && (
        <DropdownMenu>
        <SimpleTooltip label="Share options">
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Share options"
              className={cn(
                'group relative flex h-8 items-center gap-1.5 px-3 rounded-full border border-[#818cf8]/40 bg-[#818cf8]/20 text-[#a5b4fc] shadow-2xs transition-all duration-150',
                'hover:-translate-y-0.5 hover:border-[#818cf8]/60 hover:bg-[#818cf8]/30 hover:text-white hover:shadow-xs active:translate-y-0 active:scale-95 cursor-pointer font-medium text-[12.5px]',
                'data-[state=open]:border-[#818cf8] data-[state=open]:bg-[#818cf8]/35 data-[state=open]:text-white data-[state=open]:shadow-xs'
              )}
            >
              <Share2 className="size-3.5 stroke-[2.2] transition-transform duration-150 group-hover:scale-110" />
              <span>Share</span>
            </button>
          </DropdownMenuTrigger>
        </SimpleTooltip>
        <DropdownMenuContent align="end" className="w-[260px] p-1.5 bg-card/95 border border-line rounded-2xl shadow-2xl backdrop-blur-md">
          <DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            Collaboration & Share
          </DropdownMenuLabel>

          <div className="space-y-0.5">
            {/* Option 1: Collaborate live */}
            <DropdownMenuItem
              onSelect={handleCollaborateLiveClick}
              className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-surface-2 transition-colors min-h-[52px]"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Users className="size-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-semibold text-ink leading-tight">Collaborate live</span>
                <span className="text-[11.5px] text-ink-3 mt-0.5 leading-tight">Work together in real time</span>
              </div>
            </DropdownMenuItem>

            {/* Option 2: Invite by email */}
            <DropdownMenuItem
              onSelect={handleInviteByEmailClick}
              className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-surface-2 transition-colors min-h-[52px]"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 border border-line text-ink">
                <Mail className="size-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-semibold text-ink leading-tight">Invite by email</span>
                <span className="text-[11.5px] text-ink-3 mt-0.5 leading-tight">Add specific people</span>
              </div>
            </DropdownMenuItem>

            {/* Option 3: Publish & embed */}
            <DropdownMenuItem
              onSelect={handlePublishEmbedClick}
              className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-surface-2 transition-colors min-h-[52px]"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 border border-line text-ink">
                <Globe className="size-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-semibold text-ink leading-tight">Publish & embed</span>
                <span className="text-[11.5px] text-ink-3 mt-0.5 leading-tight">Share read-only diagram</span>
              </div>
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator className="my-1.5" />

          {/* Share Snapshot */}
          <DropdownMenuItem
            onSelect={() => setShareOpen(true)}
            className="flex items-center gap-2.5 px-2.5 py-2 text-[12.5px] text-ink-2 hover:text-ink cursor-pointer rounded-lg hover:bg-surface-2"
          >
            <Share2 className="size-3.5 text-ink-3" />
            <span>Share snapshot link…</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      )}
    </div>
  );
}
