'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { authClient } from '@/features/collaboration/services/auth.client';
import { useCollaborationStore } from '@/features/collaboration/stores/useCollaborationStore';
import { sanitizeReturnUrl } from '@/shared/utils/routes';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const returnUrlParam = searchParams.get('returnUrl');

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'already-verified' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [destinationUrl, setDestinationUrl] = useState<string>('/app');

  useEffect(() => {
    let savedReturnUrl: string | null = null;
    if (typeof window !== 'undefined') {
      savedReturnUrl = sessionStorage.getItem('drawzware_return_url');
    }
    const safeTarget = sanitizeReturnUrl(returnUrlParam || savedReturnUrl, '/app');
    setDestinationUrl(safeTarget);
  }, [returnUrlParam]);

  const handleVerify = async (tokenToVerify: string) => {
    setStatus('verifying');
    setErrorMessage(null);
    try {
      const res = await authClient.verifyEmail({ token: tokenToVerify });
      if ((res as { alreadyVerified?: boolean }).alreadyVerified) {
        setStatus('already-verified');
      } else {
        setStatus('success');
      }

      // Refresh store from trusted server endpoint and notify other tabs
      await useCollaborationStore.getState().refreshCurrentUser();
      if (typeof window !== 'undefined') {
        localStorage.setItem('drawzware_auth_event', String(Date.now()));
        sessionStorage.removeItem('drawzware_return_url');
      }
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Verification link is invalid or has expired. Please request a new link.'
      );
    }
  };

  useEffect(() => {
    if (token) {
      handleVerify(token);
    } else {
      setStatus('error');
      setErrorMessage('Missing verification token in the URL. Please check your email link.');
    }
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResending(true);
    setResendSuccess(null);
    try {
      const res = await authClient.resendVerification({ email: resendEmail.trim() });
      setResendSuccess(res.message);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to resend verification email.'
      );
    } finally {
      setResending(false);
    }
  };

  const isCanvasTarget = destinationUrl.startsWith('/canvas');

  return (
    <div className="w-full max-w-md p-8 rounded-2xl border border-line bg-card/90 backdrop-blur-md shadow-2xl">
      <div className="text-center mb-6">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/drawzware-emblem.png"
          alt="Drawzware"
          className="size-12 mx-auto mb-3 object-contain"
        />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Email Verification</h1>
        <p className="text-sm text-ink-2 mt-1">Drawzware System Design Canvas</p>
      </div>

      {status === 'verifying' && (
        <div className="text-center py-8 space-y-4">
          <Loader2 className="size-10 animate-spin text-[#6366f1] mx-auto" />
          <p className="text-[14px] font-medium text-ink">Verifying your email address…</p>
          <p className="text-[12.5px] text-ink-3">Please wait a moment while we confirm your account.</p>
        </div>
      )}

      {(status === 'success' || status === 'already-verified') && (
        <div className="text-center py-6 space-y-5">
          <div className="size-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="size-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-ink">
              {status === 'already-verified' ? 'Email Already Verified' : 'Email Verified Successfully!'}
            </h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              {status === 'already-verified'
                ? 'Your email address is already confirmed. You have full access to cloud collaboration and workspace sync.'
                : 'Your email address has been confirmed. You now have full access to real-time cloud collaboration, workspace invites, and diagram synchronization.'}
            </p>
          </div>
          <Link href={destinationUrl} className="block w-full">
            <Button className="w-full h-11 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[14px] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
              <span>{isCanvasTarget ? 'Return to Canvas Studio' : 'Open Workspace Dashboard'}</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-[13px] flex items-start gap-2.5">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold block mb-0.5">Verification Failed</span>
              <span>{errorMessage}</span>
            </div>
          </div>

          <div className="border-t border-line/60 pt-5 space-y-3">
            <h3 className="text-sm font-medium text-ink">Request a new verification link</h3>
            <form onSubmit={handleResend} className="space-y-3">
              <div className="relative">
                <Mail className="size-4 text-ink-3 absolute left-3 top-3 pointer-events-none" />
                <Input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your account email"
                  className="h-10 pl-9 text-[13px]"
                />
              </div>

              {resendSuccess && (
                <p className="text-[12px] text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" />
                  <span>{resendSuccess}</span>
                </p>
              )}

              <Button
                type="submit"
                disabled={resending}
                className="w-full h-10 bg-paper border border-line hover:bg-line-2 text-ink font-medium text-[13px] rounded-lg cursor-pointer"
              >
                {resending ? 'Sending link…' : 'Resend Verification Email'}
              </Button>
            </form>
          </div>

          <div className="text-center pt-2">
            <Link href="/app" className="text-xs text-ink-3 hover:text-ink">
              Return to Workspace Dashboard (Offline mode available)
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-paper p-4">
      <Suspense
        fallback={
          <div className="p-8 text-center text-ink-3 flex items-center gap-2">
            <Loader2 className="size-5 animate-spin text-ink" />
            <span>Loading verification page…</span>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
