'use client';

import { SimpleTooltip } from '@/shared/components/ui/tooltip';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import {
  formatCollaboratorName,
  getCollaboratorColor,
  getCollaboratorInitial,
} from '../utils/collaborator-helpers';

export function CollaboratorsAvatarStack() {
  const collaborators = useCollaborationStore((s) => s.collaborators);
  const currentUser = useCollaborationStore((s) => s.currentUser);
  const isLive = useCollaborationStore((s) => s.isLive);

  // Show if live or logged in
  if (!isLive && !currentUser) return null;

  // Build full active roster (self + any connected peers)
  const roster =
    collaborators.length > 0
      ? collaborators
      : currentUser
      ? [
          {
            id: currentUser.id,
            name: `${formatCollaboratorName(currentUser.name, currentUser.email)} (You)`,
            email: currentUser.email,
            role: useCollaborationStore.getState().myRole || 'owner',
            initials: getCollaboratorInitial(currentUser.name, currentUser.email),
            color: getCollaboratorColor(currentUser.id || currentUser.email),
            avatarBg: '',
            isCurrentUser: true,
            status: 'active' as const,
            lastActive: 'Just now',
          },
        ]
      : [];

  if (roster.length === 0) return null;

  const visible = roster.slice(0, 4);
  const overflow = roster.length - visible.length;

  return (
    <SimpleTooltip label={`Collaborators (${roster.length})`}>
      <div
        aria-label={`Collaborators (${roster.length})`}
        className="group flex items-center -space-x-1.5 p-0.5 rounded-full hover:opacity-95 transition-transform active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {visible.map((collab) => (
          <span
            key={collab.id}
            title={`${collab.name} (${collab.role})`}
            style={{ backgroundColor: collab.color }}
            className="relative flex size-7 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-bg select-none shadow-2xs"
          >
            {collab.initials}
            {(collab.isCurrentUser || collab.status === 'active') && (
              <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-ok ring-1.5 ring-bg animate-status-pulse" />
              </span>
            )}
          </span>
        ))}
        {overflow > 0 && (
          <span className="flex size-7 items-center justify-center rounded-full bg-surface-2 text-[10.5px] font-semibold text-ink-2 ring-2 ring-bg select-none shadow-2xs">
            +{overflow}
          </span>
        )}
      </div>
    </SimpleTooltip>
  );
}
