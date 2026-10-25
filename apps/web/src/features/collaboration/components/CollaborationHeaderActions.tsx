'use client';

import { Users, Mail, Globe, ImageIcon, Share2, UserPlus, ShieldAlert, Sparkles } from 'lucide-react';
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
import { cn } from '@/shared/utils/utils';
import { toast } from '@/stores/useToastStore';

interface CollaborationHeaderActionsProps {
  onExportPng?: () => void;
}

export function CollaborationHeaderActions({ onExportPng }: CollaborationHeaderActionsProps) {
  const isLive = useCollaborationStore((s) => s.isLive);
  const currentUser = useCollaborationStore((s) => s.currentUser);
  const setAuthModalOpen = useCollaborationStore((s) => s.setAuthModalOpen);
  const setInviteModalOpen = useCollaborationStore((s) => s.setInviteModalOpen);
  const setPublishEmbedModalOpen = useCollaborationStore((s) => s.setPublishEmbedModalOpen);
  const setAccessControlModalOpen = useCollaborationStore((s) => s.setAccessControlModalOpen);
  const setInvitationAcceptModalOpen = useCollaborationStore((s) => s.setInvitationAcceptModalOpen);
  const setShareOpen = useCanvasStore((s) => s.setShareOpen);
  const setExportOpen = useCanvasStore((s) => s.setExportOpen);

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
      toast({ message: 'Live collaboration session is active', tone: 'ok' });
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

  const handleExportImageClick = () => {
    if (onExportPng) {
      onExportPng();
    } else {
      setExportOpen(true);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* 1. Collaborators Avatar Stack & Popover (Panel 3: Collaborative Canvas) */}
      {isLive && <CollaboratorsPopover />}

      {/* 2. Invite Button (Panel 3: Collaborative Canvas) */}
      {isLive && (
        <SimpleTooltip label="Invite collaborators">
          <button
            type="button"
            onClick={() => setInviteModalOpen(true, 'invite')}
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

      {/* 3. Share Button with Dropdown (Panel 1 & Panel 3) */}
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
        <DropdownMenuContent align="end" className="w-[230px] p-1.5">
          <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium text-ink-3">
            Collaboration & Share
          </DropdownMenuLabel>

          {/* Option 1: Collaborate live */}
          <DropdownMenuItem
            onSelect={handleCollaborateLiveClick}
            className="flex items-start gap-2.5 p-2 rounded-[8px] cursor-pointer hover:bg-surface-2"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-accent-soft text-accent mt-0.5">
              <Users className="size-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12.5px] font-semibold text-ink">Collaborate live</span>
              <span className="text-[11px] text-ink-3">Work together in real time</span>
            </div>
          </DropdownMenuItem>

          {/* Option 2: Invite by email */}
          <DropdownMenuItem
            onSelect={handleInviteByEmailClick}
            className="flex items-start gap-2.5 p-2 rounded-[8px] cursor-pointer hover:bg-surface-2"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-line-2 text-ink mt-0.5">
              <Mail className="size-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12.5px] font-semibold text-ink">Invite by email</span>
              <span className="text-[11px] text-ink-3">Add specific people</span>
            </div>
          </DropdownMenuItem>

          {/* Option 3: Publish & embed */}
          <DropdownMenuItem
            onSelect={handlePublishEmbedClick}
            className="flex items-start gap-2.5 p-2 rounded-[8px] cursor-pointer hover:bg-surface-2"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-line-2 text-ink mt-0.5">
              <Globe className="size-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12.5px] font-semibold text-ink">Publish & embed</span>
              <span className="text-[11px] text-ink-3">Share read-only diagram</span>
            </div>
          </DropdownMenuItem>

          {/* Option 4: Export image */}
          <DropdownMenuItem
            onSelect={handleExportImageClick}
            className="flex items-start gap-2.5 p-2 rounded-[8px] cursor-pointer hover:bg-surface-2"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-line-2 text-ink mt-0.5">
              <ImageIcon className="size-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12.5px] font-semibold text-ink">Export image</span>
              <span className="text-[11px] text-ink-3">Download as PNG, SVG</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1" />

          {/* Existing Share Snapshot */}
          <DropdownMenuItem
            onSelect={() => setShareOpen(true)}
            className="px-2 py-1.5 text-[12px] text-ink-2 hover:text-ink cursor-pointer"
          >
            Share snapshot link…
          </DropdownMenuItem>

          {/* Prototype Quick Tests */}
          <DropdownMenuItem
            onSelect={() => setInvitationAcceptModalOpen(true)}
            className="px-2 py-1.5 text-[12px] text-ink-2 hover:text-ink cursor-pointer"
          >
            <Sparkles className="size-3.5 mr-1.5 text-accent" />
            Preview invitation email
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => setAccessControlModalOpen(true)}
            className="px-2 py-1.5 text-[12px] text-ink-2 hover:text-ink cursor-pointer"
          >
            <ShieldAlert className="size-3.5 mr-1.5 text-warn" />
            Preview access control states
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
