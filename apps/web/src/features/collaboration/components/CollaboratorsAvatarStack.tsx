'use client';

import { SimpleTooltip } from '@/shared/components/ui/tooltip';
import { useCollaborationStore } from '../stores/useCollaborationStore';

export function CollaboratorsAvatarStack() {
  const collaborators = useCollaborationStore((s) => s.collaborators);
  const isLive = useCollaborationStore((s) => s.isLive);
  const popoverOpen = useCollaborationStore((s) => s.collaboratorsPopoverOpen);
  const setPopoverOpen = useCollaborationStore((s) => s.setCollaboratorsPopoverOpen);

  if (!isLive) return null;

  const visible = collaborators.slice(0, 3);
  const overflow = collaborators.length - visible.length;

  return (
    <SimpleTooltip label="View active collaborators">
      <button
        type="button"
        onClick={() => setPopoverOpen(!popoverOpen)}
        aria-label={`Collaborators (${collaborators.length})`}
        className="group flex items-center -space-x-1.5 p-0.5 rounded-full hover:opacity-90 transition-transform active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {visible.map((collab) => (
          <span
            key={collab.id}
            title={`${collab.name} (${collab.role})`}
            style={{ backgroundColor: collab.color }}
            className="relative flex size-7 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-bg select-none shadow-2xs"
          >
            {collab.initials}
            {collab.isCurrentUser && (
              <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-ok ring-1 ring-bg" />
            )}
          </span>
        ))}
        {overflow > 0 && (
          <span className="flex size-7 items-center justify-center rounded-full bg-surface-2 text-[10.5px] font-semibold text-ink-2 ring-2 ring-bg select-none shadow-2xs">
            +{overflow}
          </span>
        )}
      </button>
    </SimpleTooltip>
  );
}
