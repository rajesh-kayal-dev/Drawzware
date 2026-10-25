'use client';

import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/stores/useToastStore';
import { useCollaborationStore } from '../stores/useCollaborationStore';

export function InvitationAcceptDialog() {
  const open = useCollaborationStore((s) => s.invitationAcceptModalOpen);
  const setOpen = useCollaborationStore((s) => s.setInvitationAcceptModalOpen);
  const invitationData = useCollaborationStore((s) => s.invitationData);
  const currentUser = useCollaborationStore((s) => s.currentUser);
  const setAuthModalOpen = useCollaborationStore((s) => s.setAuthModalOpen);

  const handleAccept = () => {
    if (!currentUser) {
      setOpen(false);
      setAuthModalOpen(true);
      toast({ message: 'Please sign in to accept workspace invitations.', tone: 'neutral' });
      return;
    }
    if (!currentUser.isEmailVerified) {
      setOpen(false);
      setAuthModalOpen(true);
      toast({ message: 'Please verify your email address before accepting invitations.', tone: 'neutral' });
      return;
    }
    toast({
      message: `Joined collaboration on "${invitationData.projectName}"!`,
      tone: 'ok',
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[420px] p-0 overflow-hidden border border-line bg-card/95 shadow-2xl backdrop-blur-md">
        <DialogHeader className="px-6 pt-6 pb-2 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            {/* DrawzWare Emblem */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/drawzware-emblem.png"
              alt="DrawzWare"
              className="size-7 rounded-[6px] object-contain shadow-xs"
            />
            <span className="text-[15px] font-semibold tracking-tight text-ink">DrawzWare</span>
          </div>
          <DialogCloseButton />
        </DialogHeader>

        <DialogBody className="px-6 pt-3 pb-6">
          <div className="space-y-3">
            <DialogTitle className="text-[19px] font-semibold text-ink tracking-tight">
              You&apos;re invited to collaborate
            </DialogTitle>

            <DialogDescription className="text-[13.5px] leading-relaxed text-ink-2">
              <strong className="font-semibold text-ink">{invitationData.inviterName}</strong> invited you to collaborate on a diagram:{' '}
              <strong className="font-semibold text-accent">{invitationData.projectName}</strong>
            </DialogDescription>

            <div className="pt-2">
              <Button
                type="button"
                onClick={handleAccept}
                className="w-full h-10 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[13.5px] rounded-[10px] shadow-sm transition-all cursor-pointer"
              >
                Accept invitation
              </Button>
            </div>

            <p className="pt-2 text-[11.5px] leading-relaxed text-ink-3">
              This link will expire in {invitationData.expiryDays} days. You&apos;ll need to sign in or create an account to access this diagram.
            </p>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
