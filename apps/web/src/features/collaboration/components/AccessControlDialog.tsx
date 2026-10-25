'use client';

import { useState } from 'react';
import { Lock, User, Mail, CheckCircle2 } from 'lucide-react';
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

export function AccessControlDialog() {
  const open = useCollaborationStore((s) => s.accessControlModalOpen);
  const setOpen = useCollaborationStore((s) => s.setAccessControlModalOpen);
  const accessState = useCollaborationStore((s) => s.accessControlState);
  const setAccessState = useCollaborationStore((s) => s.setAccessControlState);
  const setAuthModalOpen = useCollaborationStore((s) => s.setAuthModalOpen);

  const [requested, setRequested] = useState(false);
  const [resending, setResending] = useState(false);

  const handleRequestAccess = () => {
    setRequested(true);
    toast({ message: 'Access request sent to workspace owner', tone: 'ok' });
  };

  const handleSignInClick = () => {
    setOpen(false);
    setAuthModalOpen(true);
  };

  const handleResendVerification = () => {
    setResending(true);
    setTimeout(() => {
      setResending(false);
      toast({ message: 'Verification link resent to your email inbox', tone: 'ok' });
    }, 500);
  };

  const handleVerifiedConfirm = () => {
    setOpen(false);
    toast({ message: 'Email confirmed! Access granted.', tone: 'ok' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[440px] p-0 overflow-hidden border border-line bg-card/95 shadow-2xl backdrop-blur-md">
        <DialogHeader className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-line/60">
          <DialogTitle className="text-[16px] font-semibold text-ink tracking-tight">
            Access Control Preview
          </DialogTitle>
          <DialogDescription className="sr-only">
            Preview access control and permissions.
          </DialogDescription>
          <DialogCloseButton />
        </DialogHeader>

        {/* State Tab Switcher */}
        <div className="flex border-b border-line bg-surface-2/30 px-6 pt-2 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setAccessState('denied');
              setRequested(false);
            }}
            className={`pb-2 px-2.5 text-[12px] font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              accessState === 'denied'
                ? 'border-danger text-danger font-semibold'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            Access denied
          </button>
          <button
            type="button"
            onClick={() => setAccessState('sign-in-required')}
            className={`pb-2 px-2.5 text-[12px] font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              accessState === 'sign-in-required'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            Sign in required
          </button>
          <button
            type="button"
            onClick={() => setAccessState('email-verification')}
            className={`pb-2 px-2.5 text-[12px] font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              accessState === 'email-verification'
                ? 'border-warn text-warn font-semibold'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            Email verification
          </button>
        </div>

        <DialogBody className="p-6">
          {accessState === 'denied' && (
            <div className="flex flex-col items-center text-center py-4 px-2 space-y-3 rounded-[14px] bg-danger/5 border border-danger/15">
              <div className="flex size-11 items-center justify-center rounded-full bg-danger/15 text-danger">
                <Lock className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[17px] font-semibold text-ink">Access denied</h3>
                <p className="text-[13px] text-ink-2 max-w-[280px]">
                  You&apos;re signed in, but don&apos;t have access to this diagram.
                </p>
              </div>
              <div className="pt-2 w-full max-w-[240px]">
                <Button
                  type="button"
                  onClick={handleRequestAccess}
                  disabled={requested}
                  className="w-full h-9 bg-paper hover:bg-line-2 text-ink border border-line font-medium text-[13px] rounded-[8px] transition-all cursor-pointer"
                >
                  {requested ? (
                    <span className="flex items-center gap-1.5 text-ok">
                      <CheckCircle2 className="size-3.5" />
                      Access requested
                    </span>
                  ) : (
                    'Request access'
                  )}
                </Button>
              </div>
            </div>
          )}

          {accessState === 'sign-in-required' && (
            <div className="flex flex-col items-center text-center py-4 px-2 space-y-3 rounded-[14px] bg-accent/5 border border-accent/15">
              <div className="flex size-11 items-center justify-center rounded-full bg-accent/15 text-accent">
                <User className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[17px] font-semibold text-ink">Sign in required</h3>
                <p className="text-[13px] text-ink-2 max-w-[280px]">
                  Sign in to view or collaborate on this diagram.
                </p>
              </div>
              <div className="pt-2 w-full max-w-[240px]">
                <Button
                  type="button"
                  onClick={handleSignInClick}
                  className="w-full h-9 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[13px] rounded-[8px] shadow-sm transition-all cursor-pointer"
                >
                  Sign in
                </Button>
              </div>
            </div>
          )}

          {accessState === 'email-verification' && (
            <div className="flex flex-col items-center text-center py-4 px-2 space-y-3 rounded-[14px] bg-warn/5 border border-warn/15">
              <div className="flex size-11 items-center justify-center rounded-full bg-warn/15 text-warn">
                <Mail className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[17px] font-semibold text-ink">Verify your email</h3>
                <p className="text-[13px] text-ink-2 max-w-[300px]">
                  We&apos;ve sent a verification link to your email. Please check your inbox and verify your email to collaborate.
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2 w-full max-w-[240px]">
                <Button
                  type="button"
                  onClick={handleVerifiedConfirm}
                  className="w-full h-9 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[13px] rounded-[8px] shadow-sm transition-all cursor-pointer"
                >
                  I&apos;ve verified my email
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={resending}
                  onClick={handleResendVerification}
                  className="w-full h-8 text-[12px]"
                >
                  {resending ? 'Sending…' : 'Resend verification link'}
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
