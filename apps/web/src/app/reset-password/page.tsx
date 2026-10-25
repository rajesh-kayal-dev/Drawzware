'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Loader2, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { authClient } from '@/features/collaboration/services/auth.client';
import { sanitizeReturnUrl } from '@/shared/utils/routes';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const returnUrlParam = searchParams.get('returnUrl');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [destinationUrl, setDestinationUrl] = useState('/app');

  useEffect(() => {
    let savedReturnUrl: string | null = null;
    if (typeof window !== 'undefined') {
      savedReturnUrl = sessionStorage.getItem('drawzware_return_url');
    }
    setDestinationUrl(sanitizeReturnUrl(returnUrlParam || savedReturnUrl, '/app'));
  }, [returnUrlParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Missing password reset token in the URL. Please check your reset link.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authClient.resetPassword({
        token,
        newPassword,
      });
      setSuccess(true);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('drawzware_return_url');
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to reset password. The link may have expired or is invalid.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCanvasTarget = destinationUrl.startsWith('/canvas');

  return (
    <div className="w-full max-w-md p-8 rounded-2xl border border-line bg-card/90 backdrop-blur-md shadow-2xl">
      <div className="text-center mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/drawzware-emblem.png"
          alt="Drawzware"
          className="size-12 mx-auto mb-3 object-contain"
        />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Reset Your Password</h1>
        <p className="text-sm text-ink-2 mt-1">Set a new secure password for your Drawzware account</p>
      </div>

      {success ? (
        <div className="text-center py-6 space-y-5">
          <div className="size-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="size-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-ink">Password Reset Successfully!</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Your password has been updated. For security, all active sessions have been revoked. You can now log in with your new credentials.
            </p>
          </div>
          <Link href={destinationUrl} className="block w-full">
            <Button className="w-full h-11 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[14px] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
              <span>{isCanvasTarget ? 'Return to Canvas Studio' : 'Return to Workspace Dashboard'}</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!token && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-[13px] flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>
                No reset token provided. Please make sure you copied the entire link from your email.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-[13px] flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="new-password-input" className="text-[12px] font-medium text-ink-2">New Password (min 8 chars)</label>
            <div className="relative">
              <Lock className="size-4 text-ink-3 absolute left-3 top-3 pointer-events-none" />
              <Input
                id="new-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 pl-9 pr-10 text-[13px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-2.5 p-1 text-ink-3 hover:text-ink rounded cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-password-input" className="text-[12px] font-medium text-ink-2">Confirm New Password</label>
            <div className="relative">
              <Lock className="size-4 text-ink-3 absolute left-3 top-3 pointer-events-none" />
              <Input
                id="confirm-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 pl-9 pr-10 text-[13px]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-2.5 p-1 text-ink-3 hover:text-ink rounded cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !token}
            className="w-full h-11 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[14px] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Updating password…</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </Button>

          <div className="text-center pt-2">
            <Link href="/app" className="text-xs text-ink-3 hover:text-ink">
              Back to Workspace Dashboard
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-paper p-4">
      <Suspense
        fallback={
          <div className="p-8 text-center text-ink-3 flex items-center gap-2">
            <Loader2 className="size-5 animate-spin text-ink" />
            <span>Loading password reset…</span>
          </div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
