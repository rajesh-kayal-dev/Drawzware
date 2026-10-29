'use client';

import { InvitePeopleDialog } from './InvitePeopleDialog';
import { PublishEmbedDialog } from './PublishEmbedDialog';
import { InvitationAcceptDialog } from './InvitationAcceptDialog';
import { AccessControlDialog } from './AccessControlDialog';
import { PublishToCloudModal } from './PublishToCloudModal';
import { CollaborationStatusBanner } from './CollaborationStatusBanner';

/**
 * Controller container mounting all collaboration modal dialogs and overlays.
 */
export function CollaborationController() {
  return (
    <>
      <InvitePeopleDialog />
      <PublishEmbedDialog />
      <InvitationAcceptDialog />
      <AccessControlDialog />
      <PublishToCloudModal />
      <CollaborationStatusBanner />
    </>
  );
}
