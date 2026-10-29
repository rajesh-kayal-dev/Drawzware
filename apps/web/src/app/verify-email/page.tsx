'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Loader2, Mail, ArrowRight, Sparkles, X } from 'lucide-react';
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
  const [existingTabFound, setExistingTabFound] = useState(false);
  const [autoRedirectCountdown, setAutoRedirectCountdown] = useState<number | null>(null);

  useEffect(() => {
    let savedReturnUrl: string | null = null;
    if (typeof window !== 'undefined') {
      savedReturnUrl =
        localStorage.getItem('drawzware_return_url') ||
        localStorage.getItem('drawzware_last_canvas_url') ||
        sessionStorage.getItem('drawzware_return_url');
    }
    const safeTarget = sanitizeReturnUrl(returnUrlParam || savedReturnUrl, '/app');
    setDestinationUrl(safeTarget);
  }, [returnUrlParam]);

  const handleVerify = async (tokenToVerify: string) => {
    setStatus('verifying');
    setErrorMessage(null);
    try {
      const res = await authClient.verifyEmail({ token: tokenToVerify });
      const isAlready = Boolean((res as { alreadyVerified?: boolean }).alreadyVerified);
      setStatus(isAlready ? 'already-verified' : 'success');

      // Refresh store from trusted server endpoint and notify other tabs
      await useCollaborationStore.getState().refreshCurrentUser();

      if (typeof window !== 'undefined') {
        localStorage.setItem('drawzware_auth_event', String(Date.now()));
        sessionStorage.removeItem('drawzware_return_url');
        localStorage.removeItem('drawzware_return_url');

        if ('BroadcastChannel' in window) {
          const authChannel = new BroadcastChannel('drawzware_auth_channel');

          authChannel.onmessage = (event) => {
            if (event.data?.type === 'VERIFICATION_ACK') {
              setExistingTabFound(true);
              if (event.data.canvasUrl) {
                setDestinationUrl(sanitizeReturnUrl(event.data.canvasUrl, destinationUrl));
              }
              // If the original canvas tab acknowledged, attempt closing this verification tab cleanly
              try {
                window.close();
              } catch {
                // Browser might prevent closing external tabs
              }
            }
          };

          // Notify open canvas tab (Tab A)
          authChannel.postMessage({
            type: 'VERIFICATION_SUCCESS',
            user: res.user,
            returnUrl: destinationUrl,
          });

          // Wait a brief tick then attempt close if permitted
          setTimeout(() => {
            try {
              window.close();
            } catch {
              // Safe ignore
            }
          }, 800);
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto-redirect if user opened this page independently and no canvas tab was found
  useEffect(() => {
    if ((status === 'success' || status === 'already-verified') && !existingTabFound) {
      setAutoRedirectCountdown(3);
      const interval = setInterval(() => {
        setAutoRedirectCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            window.location.href = destinationUrl;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, existingTabFound, destinationUrl]);

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

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-ink">
              {status === 'already-verified' ? 'Email Already Verified' : '🎉 Email Verified Successfully!'}
            </h2>

            {existingTabFound ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[13px] leading-relaxed text-left flex items-start gap-3 mt-3">
                <Sparkles className="size-5 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <span className="font-semibold block text-emerald-200 mb-1">Your existing canvas is unlocked!</span>
                  <span>We&apos;ve automatically verified your account and closed the login dialog in your open canvas tab. You can safely switch back to that tab now.</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-2 leading-relaxed">
                {status === 'already-verified'
                  ? 'Your email address is already confirmed. You have full access to cloud collaboration and workspace sync.'
                  : 'Your email address has been confirmed. You now have full access to real-time cloud collaboration, workspace invites, and diagram synchronization.'}
              </p>
            )}
          </div>

          <div className="pt-2 space-y-2.5">
            {existingTabFound ? (
              <>
                <Button
                  onClick={() => {
                    try {
                      window.close();
                    } catch {
                      // Browser blocked close
                    }
                  }}
                  className="w-full h-11 bg-paper border border-line hover:bg-line-2 text-ink font-medium text-[13.5px] rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <X className="size-4 text-ink-3" />
                  <span>Close this verification tab</span>
                </Button>

                <Link href={destinationUrl} className="block w-full">
                  <Button className="w-full h-11 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[13.5px] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <span>Continue to canvas in this tab</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href={destinationUrl} className="block w-full">
                  <Button className="w-full h-11 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[14px] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <span>Continue to Canvas</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                {autoRedirectCountdown !== null && autoRedirectCountdown > 0 && (
                  <p className="text-xs text-ink-3 pt-1">
                    Redirecting to your canvas in {autoRedirectCountdown}s…
                  </p>
                )}
              </>
            )}
          </div>
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
