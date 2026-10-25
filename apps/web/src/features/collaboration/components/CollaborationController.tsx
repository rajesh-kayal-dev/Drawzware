'use client';

import { AuthModal } from './AuthModal';
import { InvitePeopleDialog } from './InvitePeopleDialog';
import { PublishEmbedDialog } from './PublishEmbedDialog';
import { InvitationAcceptDialog } from './InvitationAcceptDialog';
import { AccessControlDialog } from './AccessControlDialog';

/**
 * Controller container mounting all collaboration modal dialogs and overlays.
 */
export function CollaborationController() {
  return (
    <>
      <AuthModal />
      <InvitePeopleDialog />
      <PublishEmbedDialog />
      <InvitationAcceptDialog />
      <AccessControlDialog />
    </>
  );
}
