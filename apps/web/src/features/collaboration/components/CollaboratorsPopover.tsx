'use client';

import { Settings, X, LogOut, MousePointer, Activity } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import { CollaboratorsAvatarStack } from './CollaboratorsAvatarStack';
import { toast } from '@/stores/useToastStore';

export function CollaboratorsPopover() {
  const isLive = useCollaborationStore((s) => s.isLive);
  const collaborators = useCollaborationStore((s) => s.collaborators);
  const open = useCollaborationStore((s) => s.collaboratorsPopoverOpen);
  const setOpen = useCollaborationStore((s) => s.setCollaboratorsPopoverOpen);
  const setInviteModalOpen = useCollaborationStore((s) => s.setInviteModalOpen);
  const showLiveCursors = useCollaborationStore((s) => s.showLiveCursors);
  const toggleLiveCursors = useCollaborationStore((s) => s.toggleLiveCursors);
  const activeEditorName = useCollaborationStore((s) => s.activeEditorName);
  const setActiveEditorName = useCollaborationStore((s) => s.setActiveEditorName);
  const signOut = useCollaborationStore((s) => s.signOut);

  if (!isLive) return null;

  const handleManageAccess = () => {
    setOpen(false);
    setInviteModalOpen(true, 'manage');
  };

  const handleToggleActiveEditor = () => {
    if (activeEditorName) {
      setActiveEditorName(null);
      toast({ message: 'Live editing indicator hidden', tone: 'neutral' });
    } else {
      setActiveEditorName('Aman');
      toast({ message: 'Live editing indicator active (Aman)', tone: 'ok' });
    }
  };

  const handleSignOut = () => {
    signOut();
    toast({ message: 'Exited collaboration. Canvas is in personal offline mode.', tone: 'neutral' });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div>
          <CollaboratorsAvatarStack />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[280px] p-0 overflow-hidden rounded-[14px] border border-line bg-card/95 shadow-xl backdrop-blur-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
          <span className="text-[13px] font-semibold text-ink">
            Collaborators ({collaborators.length})
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
          {collaborators.map((collab) => (
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
                    {collab.isCurrentUser && (
                      <span className="size-1.5 shrink-0 rounded-full bg-ok" title="Active now" />
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

        {/* Action & Manage Access */}
        <div className="border-t border-line bg-surface-2/40 p-2 space-y-1">
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

          {/* Prototype Controls */}
          <div className="pt-1 border-t border-line/60">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-ink-3">
              Prototype Controls
            </div>
            <button
              type="button"
              onClick={toggleLiveCursors}
              className="w-full flex items-center justify-between px-2.5 py-1 rounded-[6px] text-[11.5px] text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <MousePointer className="size-3" />
                Live cursors
              </span>
              <span className={`text-[10.5px] font-mono ${showLiveCursors ? 'text-ok' : 'text-ink-3'}`}>
                {showLiveCursors ? 'Visible' : 'Hidden'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleActiveEditor}
              className="w-full flex items-center justify-between px-2.5 py-1 rounded-[6px] text-[11.5px] text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Activity className="size-3" />
                Editing indicator
              </span>
              <span className={`text-[10.5px] font-mono ${activeEditorName ? 'text-ok' : 'text-ink-3'}`}>
                {activeEditorName ? 'Aman' : 'Off'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11.5px] text-danger hover:bg-danger/10 transition-colors cursor-pointer mt-0.5"
            >
              <LogOut className="size-3" />
              Sign out (Personal canvas)
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
