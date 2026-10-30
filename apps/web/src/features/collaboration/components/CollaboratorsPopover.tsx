'use client';

import { Settings, X, MousePointer, UserPlus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import { CollaboratorsAvatarStack } from './CollaboratorsAvatarStack';
import {
  formatCollaboratorName,
  getCollaboratorColor,
  getCollaboratorInitial,
} from '../utils/collaborator-helpers';

export function CollaboratorsPopover() {
  const isLive = useCollaborationStore((s) => s.isLive);
  const currentUser = useCollaborationStore((s) => s.currentUser);
  const collaborators = useCollaborationStore((s) => s.collaborators);
  const open = useCollaborationStore((s) => s.collaboratorsPopoverOpen);
  const setOpen = useCollaborationStore((s) => s.setCollaboratorsPopoverOpen);
  const setInviteModalOpen = useCollaborationStore((s) => s.setInviteModalOpen);
  const showLiveCursors = useCollaborationStore((s) => s.showLiveCursors);
  const toggleLiveCursors = useCollaborationStore((s) => s.toggleLiveCursors);

  const myRole = useCollaborationStore((s) => s.myRole);
  const isOwner = !myRole || myRole === 'owner';

  if (!isLive && !currentUser) return null;

  const roster =
    collaborators.length > 0
      ? collaborators
      : currentUser
      ? [
          {
            id: currentUser.id,
            name: `${formatCollaboratorName(currentUser.name, currentUser.email)} (You)`,
            email: currentUser.email,
            role: myRole || 'owner',
            initials: getCollaboratorInitial(currentUser.name, currentUser.email),
            color: getCollaboratorColor(currentUser.id || currentUser.email),
            avatarBg: '',
            isCurrentUser: true,
            status: 'active' as const,
            lastActive: 'Just now',
          },
        ]
      : [];

  const handleManageAccess = () => {
    setOpen(false);
    setInviteModalOpen(true, 'manage');
  };

  const handleInviteNew = () => {
    setOpen(false);
    setInviteModalOpen(true, 'invite');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="View collaborators"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
        >
          <CollaboratorsAvatarStack />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[280px] p-0 overflow-hidden rounded-[14px] border border-line bg-card/95 shadow-xl backdrop-blur-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
          <span className="text-[13px] font-semibold text-ink">
            Collaborators ({roster.length})
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-line-2 hover:text-ink transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Collaborators List */}
        <div className="divide-y divide-line/40 max-h-[260px] overflow-y-auto px-1">
          {roster.map((collab) => (
            <div
              key={collab.id}
              className="flex items-center justify-between gap-2.5 px-2.5 py-2 hover:bg-surface-2/60 rounded-[8px] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  style={{ backgroundColor: collab.color }}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-2xs select-none"
                >
                  {collab.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="truncate text-[12.5px] font-medium text-ink">
                      {collab.name}
                    </span>
                    {(collab.isCurrentUser || collab.status === 'active') ? (
                      <span className="relative flex size-2 shrink-0 items-center justify-center" title="Active now">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-ok animate-status-pulse" />
                      </span>
                    ) : (
                      <span className="size-2 shrink-0 rounded-full bg-ink-3/40" title="Offline" />
                    )}
                  </div>
                  <span className="block truncate text-[11px] text-ink-3">
                    {collab.email}
                  </span>
                </div>
              </div>

              <span className="shrink-0 text-[11px] font-medium capitalize text-ink-2 bg-line-2/70 px-2 py-0.5 rounded-[5px]">
                {collab.role}
              </span>
            </div>
          ))}
        </div>

        {/* Actions (Owner Only) */}
        {isOwner && (
          <div className="border-t border-line bg-surface-2/40 p-2 space-y-1">
            <button
              type="button"
              onClick={handleInviteNew}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[7px] text-[12px] font-medium text-ink hover:bg-surface-2 hover:text-accent transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <UserPlus className="size-3.5 text-accent" />
                Invite people
              </span>
              <span className="text-[10.5px] text-accent">New invite</span>
            </button>

            <button
              type="button"
              onClick={handleManageAccess}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[7px] text-[12px] font-medium text-ink hover:bg-surface-2 hover:text-accent transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Settings className="size-3.5 text-ink-2" />
                Manage access
              </span>
              <span className="text-[10.5px] text-ink-3">Roles & invites</span>
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="border-t border-line bg-surface-2/20 p-2">
          <button
            type="button"
            onClick={toggleLiveCursors}
            className="w-full flex items-center justify-between px-2.5 py-1 rounded-[6px] text-[11.5px] text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <MousePointer className="size-3" />
              Live cursors
            </span>
            <span className={showLiveCursors ? 'text-ok font-medium' : 'text-ink-3'}>
              {showLiveCursors ? 'Visible' : 'Hidden'}
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
