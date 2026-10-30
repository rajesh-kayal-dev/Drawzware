'use client';

import { useState, useEffect, Suspense, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Shield,
  Clock,
  ArrowRight,
  LogOut,
  UserCheck,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { authClient } from '@/features/collaboration/services/auth.client';
import { useCollaborationStore } from '@/features/collaboration/stores/useCollaborationStore';
import { AuthModal } from '@/features/collaboration/components/AuthModal';
import { sanitizeReturnUrl } from '@/shared/utils/routes';
import type { InvitationPreview } from '@drawzware/contracts';

function InvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get('id') || searchParams.get('token');
  const pathId =
    typeof window !== 'undefined'
      ? window.location.pathname.split('/invitations/')[1]?.split('?')[0]
      : null;
  const invitationId = queryId || pathId || null;

  const currentUser = useCollaborationStore((s) => s.currentUser);
  const signOut = useCollaborationStore((s) => s.signOut);
  const setAuthModalOpen = useCollaborationStore((s) => s.setAuthModalOpen);
  const checkAuth = useCollaborationStore((s) => s.checkAuth);

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<string | null>(null);

  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Seamless inline signup/signin state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Load preview data and sync authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!invitationId) {
      setLoading(false);
      setFetchError('Missing invitation ID in the link. Please check the URL.');
      return;
    }

    let isMounted = true;
    setLoading(true);
    setFetchError(null);

    authClient
      .getInvitationPreview(invitationId)
      .then((data) => {
        if (isMounted) {
          setPreview(data);
          if (data.accountExists) {
            setAuthMode('signin');
          } else {
            setAuthMode('signup');
          }
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setFetchError(
            err instanceof Error ? err.message : 'Invitation not found or has been removed.'
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [invitationId]);

  const handleAccept = async () => {
    if (!invitationId) return;

    setAccepting(true);
    setAcceptError(null);

    try {
      const res = await authClient.acceptInvitation(invitationId);
      setAcceptSuccess(`Invitation accepted successfully! You joined as ${res.role}.`);
      const returnUrlParam = searchParams.get('returnUrl');
      let savedReturnUrl: string | null = null;
      if (typeof window !== 'undefined') {
        savedReturnUrl = sessionStorage.getItem('drawzware_return_url');
      }
      const target = sanitizeReturnUrl(
        res.canvasUrl || preview?.canvasUrl || returnUrlParam || savedReturnUrl || preview?.returnUrl,
        '/app'
      );
      setTimeout(() => {
        startTransition(() => {
          router.push(target);
        });
      }, 1200);
    } catch (err: unknown) {
      setAcceptError(err instanceof Error ? err.message : 'Failed to accept invitation.');
    } finally {
      setAccepting(false);
    }
  };

  const handleInvitationAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim() || !invitationId || !preview) return;

    setIsSubmitting(true);
    setAuthError(null);

    if (authMode === 'signup') {
      try {
        const res = await authClient.invitationSignup(invitationId, password);
        setAcceptSuccess(`Welcome to Drawzware! You joined as ${res.role}.`);

        await useCollaborationStore.getState().refreshCurrentUser();

        if (typeof window !== 'undefined') {
          localStorage.setItem('drawzware_auth_event', String(Date.now()));
        }

        const returnUrlParam = searchParams.get('returnUrl');
        const target = sanitizeReturnUrl(
          res.canvasUrl || preview.canvasUrl || preview.returnUrl || returnUrlParam,
          '/app'
        );

        setTimeout(() => {
          startTransition(() => {
            router.push(target);
          });
        }, 1200);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to complete signup.';
        if (msg.includes('Account already exists')) {
          setAuthMode('signin');
          setAuthError('An account already exists with this email. Please enter your existing password to sign in.');
        } else {
          setAuthError(msg);
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Sign in mode
      try {
        await authClient.login({ email: preview.email, password });
        await useCollaborationStore.getState().refreshCurrentUser();

        const acceptRes = await authClient.acceptInvitation(invitationId);
        setAcceptSuccess(`Signed in successfully! You joined as ${acceptRes.role}.`);

        if (typeof window !== 'undefined') {
          localStorage.setItem('drawzware_auth_event', String(Date.now()));
        }

        const returnUrlParam = searchParams.get('returnUrl');
        const target = sanitizeReturnUrl(
          acceptRes.canvasUrl || preview.canvasUrl || preview.returnUrl || returnUrlParam,
          '/app'
        );

        setTimeout(() => {
          startTransition(() => {
            router.push(target);
          });
        }, 1200);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid password or sign in failed.';
        setAuthError(msg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleResendVerification = async () => {
    if (!currentUser?.email) return;

    setResending(true);
    setResendStatus(null);
    try {
      const res = await authClient.resendVerification({ email: currentUser.email });
      setResendStatus(res.message || 'Verification email sent. Please check your inbox.');
    } catch (err: unknown) {
      setResendStatus(
        err instanceof Error ? err.message : 'Failed to resend verification email.'
      );
    } finally {
      setResending(false);
    }
  };

  const isExpired = preview ? new Date(preview.expiresAt).getTime() < Date.now() : false;
  const isRevoked = preview?.status === 'revoked';
  const isAlreadyAccepted = preview?.status === 'accepted';
  const isEmailMatch =
    currentUser && preview
      ? currentUser.email.toLowerCase() === preview.email.toLowerCase()
      : false;

  useEffect(() => {
    if (isAlreadyAccepted && currentUser && isEmailMatch && preview && !loading) {
      const target = sanitizeReturnUrl(preview.canvasUrl || preview.returnUrl, '/app');
      const timer = setTimeout(() => {
        router.push(target);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAlreadyAccepted, currentUser, isEmailMatch, preview, loading, router]);

  return (
    <>
      <AuthModal />
      <div className="w-full max-w-lg p-8 rounded-2xl border border-line bg-card/90 backdrop-blur-md shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/drawzware-emblem.png"
            alt="Drawzware"
            className="size-12 mx-auto mb-1 object-contain"
          />
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Workspace Invitation
          </h1>
          <p className="text-sm text-ink-2">Collaborative Architecture Studio</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12 space-y-4">
            <Loader2 className="size-9 animate-spin text-[#6366f1] mx-auto" />
            <p className="text-[14px] font-medium text-ink">Retrieving invitation details…</p>
          </div>
        )}

        {/* Error Fetching Invitation */}
        {!loading && fetchError && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-[13px] flex items-start gap-3">
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Invalid Invitation</span>
                <span>{fetchError}</span>
              </div>
            </div>
            <Link href="/app" className="block">
              <Button className="w-full h-10 bg-paper border border-line hover:bg-line-2 text-ink text-[13px] font-medium rounded-lg">
                Return to Workspace Dashboard
              </Button>
            </Link>
          </div>
        )}

        {/* Successful Preview Display */}
        {!loading && preview && (
          <div className="space-y-5">
            {/* Invitation Details Card */}
            <div className="p-5 rounded-xl border border-line bg-surface-2/40 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-ink-3">Workspace</span>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20">
                  {preview.role}
                </span>
              </div>

              <div className="text-lg font-bold text-ink tracking-tight">
                {preview.workspaceName}
              </div>

              <div className="text-[13px] text-ink-2 space-y-1 pt-1 border-t border-line/40">
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 text-ink-3" />
                  <span>
                    Invited by <strong className="text-ink">{preview.inviterName || preview.inviterEmail}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="size-3.5 text-ink-3" />
                  <span>
                    Recipient email: <strong className="text-ink">{preview.email}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5 text-ink-3" />
                  <span>
                    Expires: {new Date(preview.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Accept Success Feedback */}
            {acceptSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[13px] flex items-center gap-3">
                <CheckCircle2 className="size-5 shrink-0" />
                <div>
                  <span className="font-semibold block">Invitation Accepted!</span>
                  <span>{acceptSuccess} Redirecting to your workspace canvas…</span>
                </div>
              </div>
            )}

            {/* Accept Error Feedback */}
            {acceptError && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-[13px] flex items-start gap-3">
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Could Not Accept</span>
                  <span>{acceptError}</span>
                </div>
              </div>
            )}

            {/* Invalidation Status: Revoked */}
            {isRevoked && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-[13px] flex items-start gap-3">
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Invitation Revoked</span>
                  <span>This invitation has been revoked by the workspace owner.</span>
                </div>
              </div>
            )}

            {/* Invalidation Status: Expired */}
            {isExpired && !isRevoked && (
              <div className="p-4 rounded-xl bg-warn/10 border border-warn/25 text-warn text-[13px] flex items-start gap-3">
                <Clock className="size-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Invitation Expired</span>
                  <span>
                    This invitation expired on {new Date(preview.expiresAt).toLocaleDateString()}. Please ask the workspace owner to send a new invite.
                  </span>
                </div>
              </div>
            )}

            {/* Invalidation Status: Already Accepted */}
            {isAlreadyAccepted && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-accent-soft border border-accent/25 text-accent text-[13px] flex items-start gap-3">
                  <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Already Joined Workspace</span>
                    <span>
                      {currentUser
                        ? 'You have already joined this workspace and have access to this diagram canvas. Redirecting to canvas…'
                        : 'This invitation has already been accepted. Sign in with your account to access your canvas.'}
                    </span>
                  </div>
                </div>

                {currentUser ? (
                  <Button
                    onClick={() => {
                      const target = sanitizeReturnUrl(preview.canvasUrl || preview.returnUrl, '/app');
                      router.push(target);
                    }}
                    className="w-full h-11 bg-accent hover:bg-accent/90 text-white font-semibold text-[13.5px] rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Open Canvas Now</span>
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        const target = sanitizeReturnUrl(preview.canvasUrl || preview.returnUrl, '/app');
                        sessionStorage.setItem('drawzware_return_url', target);
                        localStorage.setItem('drawzware_return_url', target);
                      }
                      setAuthModalOpen(true);
                    }}
                    className="w-full h-11 bg-accent hover:bg-accent/90 text-white font-semibold text-[13.5px] rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Sign In & Open Canvas</span>
                    <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Active Pending Invitation User Flow */}
            {!isRevoked && !isExpired && !isAlreadyAccepted && !acceptSuccess && (
              <div className="space-y-4">
                {/* 1. Case: Not logged in — Seamless Inline Setup */}
                {!currentUser && (
                  <form onSubmit={handleInvitationAuth} className="space-y-4 p-5 rounded-xl border border-line bg-paper/70 shadow-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-ink">
                          {authMode === 'signup' ? 'Set a password to join' : 'Sign in to join'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
                            setAuthError(null);
                          }}
                          className="text-[11.5px] text-accent font-medium hover:underline cursor-pointer"
                        >
                          {authMode === 'signup' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                        </button>
                      </div>
                      <p className="text-[12px] text-ink-2 leading-relaxed">
                        {authMode === 'signup'
                          ? `Create your account with ${preview.email} and immediately access this canvas.`
                          : `Enter your password for ${preview.email} to accept this invitation and access this canvas.`}
                      </p>
                    </div>

                    {authError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-[12px] flex items-start gap-2">
                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                        <span>{authError}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label htmlFor="invitation-password-input" className="text-[12px] font-medium text-ink-2 block">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
                        <input
                          id="invitation-password-input"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={authMode === 'signup' ? 'Set your password (min 6 characters)' : 'Enter your password'}
                          className="w-full h-10 rounded-lg border border-line bg-surface-2 pl-9 pr-10 text-[13px] text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink cursor-pointer"
                          tabIndex={-1}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting || !password.trim()}
                      className="w-full h-10 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[13px] rounded-lg shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span>{authMode === 'signup' ? 'Creating account…' : 'Signing in…'}</span>
                        </>
                      ) : (
                        <span>{authMode === 'signup' ? 'Create Account & Open Canvas' : 'Sign In & Open Canvas'}</span>
                      )}
                    </Button>
                  </form>
                )}

                {/* 2. Case: Logged in, but email MISMATCH */}
                {currentUser && !isEmailMatch && (
                  <div className="p-4 rounded-xl bg-warn/10 border border-warn/30 text-[13px] space-y-3">
                    <div className="flex items-start gap-2.5 text-warn">
                      <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block mb-0.5">Email Mismatch</span>
                        <span>
                          You are currently signed in as <strong className="text-ink">{currentUser.email}</strong>, but this invitation was sent to <strong className="text-ink">{preview.email}</strong>.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        onClick={() => {
                          signOut();
                          setAuthModalOpen(true);
                        }}
                        className="h-8 px-3 bg-paper border border-line hover:bg-line-2 text-ink text-[12px] font-medium rounded-md cursor-pointer flex items-center gap-1.5"
                      >
                        <LogOut className="size-3.5" />
                        <span>Switch Account</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* 3. Case: Logged in with MATCHING EMAIL -> READY TO ACCEPT IMMEDIATELY */}
                {currentUser && isEmailMatch && (
                  <div className="space-y-4 p-5 rounded-xl border border-line bg-paper/70 shadow-xs">
                    <div className="space-y-1">
                      <span className="text-[13.5px] font-semibold text-ink block">
                        Welcome back, {currentUser.name || preview.email.split('@')[0]}!
                      </span>
                      <p className="text-[12px] text-ink-2 leading-relaxed">
                        You are signed in as <strong className="text-ink">{currentUser.email}</strong>. Click below to accept this invitation and immediately open the collaborative canvas.
                      </p>
                    </div>

                    <Button
                      type="button"
                      disabled={accepting}
                      onClick={handleAccept}
                      className="w-full h-11 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[14px] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {accepting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span>Joining canvas…</span>
                        </>
                      ) : (
                        <>
                          <span>Accept & Open Canvas</span>
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Back link */}
            <div className="text-center pt-2">
              <Link href="/app" className="text-xs text-ink-3 hover:text-ink">
                Return to Workspace Dashboard (Offline Mode)
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function InvitationsPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-paper p-4">
      <Suspense
        fallback={
          <div className="p-8 text-center text-ink-3 flex items-center gap-2">
            <Loader2 className="size-5 animate-spin text-ink" />
            <span>Loading invitation…</span>
          </div>
        }
      >
        <InvitationContent />
      </Suspense>
    </div>
  );
}
