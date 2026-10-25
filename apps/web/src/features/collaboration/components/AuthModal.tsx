'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  RotateCw,
} from 'lucide-react';
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
import { Input } from '@/shared/components/ui/input';
import { toast } from '@/stores/useToastStore';
import { sanitizeReturnUrl } from '@/shared/utils/routes';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import { authClient } from '../services/auth.client';

export type AuthMode = 'login' | 'signup' | 'forgot';
export type AuthStep = 'form' | 'verify-confirmation';

function getCurrentReturnUrl(): string {
  if (typeof window === 'undefined') return '/app';
  const url = window.location.pathname + window.location.search;
  return sanitizeReturnUrl(url, '/app');
}

export function AuthModal() {
  const open = useCollaborationStore((s) => s.authModalOpen);
  const setOpen = useCollaborationStore((s) => s.setAuthModalOpen);
  const signIn = useCollaborationStore((s) => s.signIn);
  const currentUser = useCollaborationStore((s) => s.currentUser);

  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<AuthStep>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [emailDelivery, setEmailDelivery] = useState<'sent' | 'fallback' | 'failed' | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setShowSignupPassword(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setStep('form');
    setEmailDelivery(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
      setMode('login');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const result = await authClient.login({ email, password });
      signIn(result.user);
      toast({
        message: `Welcome back, ${result.user.name}!`,
        tone: 'ok',
      });
      handleOpenChange(false);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to sign in. Please verify your email and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const returnUrl = getCurrentReturnUrl();
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('drawzware_return_url', returnUrl);
      }
      const result = await authClient.register({ name, email, password, returnUrl });
      signIn(result.user, undefined, { keepModalOpen: true });
      setRegisteredEmail(email);
      setEmailDelivery(result.emailDelivery ?? 'sent');
      setStep('verify-confirmation');
      setResendCooldown(30);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to create account. Email may already be registered.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const returnUrl = getCurrentReturnUrl();
      const result = await authClient.forgotPassword({ email, returnUrl });
      setSuccessMessage(result.message || 'Password reset link sent! Please check your inbox.');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to send password reset link.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = registeredEmail || currentUser?.email || email;
    if (!targetEmail || resendCooldown > 0) return;

    setResendingEmail(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const returnUrl = getCurrentReturnUrl();
      const res = await authClient.resendVerification({ email: targetEmail, returnUrl });
      setSuccessMessage(res.message);
      setResendCooldown(30);
      toast({ message: res.message, tone: 'ok' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend verification email.';
      setErrorMessage(msg);
      toast({
        message: msg,
        tone: 'danger',
      });
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[440px] p-0 overflow-hidden border border-line bg-card/95 backdrop-blur-md shadow-2xl">
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

        <DialogBody className="px-6 pt-2 pb-6">
          {step === 'verify-confirmation' ? (
            /* Persistent Verification Confirmation Screen */
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="mx-auto size-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-3">
                  <Mail className="size-6 text-accent" />
                </div>
                <DialogTitle className="text-[20px] font-semibold text-ink tracking-tight">
                  Check your inbox
                </DialogTitle>
                <DialogDescription className="text-[13px] text-ink-2 mt-1 leading-relaxed">
                  We sent a secure verification link to:
                </DialogDescription>
                <div className="mt-2.5 inline-block px-3 py-1.5 rounded-md bg-surface-2 border border-line font-mono text-[13px] font-medium text-ink">
                  {registeredEmail}
                </div>
              </div>

              {/* Delivery notice */}
              {emailDelivery === 'failed' ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[12.5px] leading-relaxed flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Your account is active, but the verification email could not be delivered immediately by our mail relay. You can resend it below whenever you are ready.
                  </span>
                </div>
              ) : emailDelivery === 'fallback' ? (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[12.5px] leading-relaxed flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-blue-400" />
                  <span>
                    Development relay active: the verification email has been simulated and logged to the server console.
                  </span>
                </div>
              ) : (
                <p className="text-[12.5px] text-ink-2 leading-relaxed text-center px-2">
                  Click the verification link in the email to activate cloud workspaces and real-time collaboration. The link expires in 24 hours.
                </p>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[12.5px] flex items-start gap-2"
                >
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-[12.5px] flex items-start gap-2"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <p className="text-[11.5px] text-ink-3 text-center">
                Didn&apos;t receive it? Check your spam folder or resend the link below.
              </p>

              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="w-full h-10 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[13.5px] rounded-[10px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Continue to Canvas (Personal Mode)</span>
                  <ArrowRight className="size-4" />
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleResendVerification}
                  disabled={resendingEmail || resendCooldown > 0}
                  className="w-full h-9 border-line text-ink-2 hover:text-ink text-[12.5px] rounded-[10px] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {resendingEmail ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Sending verification link…</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <RotateCw className="size-3.5" />
                      <span>Resend link in {resendCooldown}s</span>
                    </>
                  ) : (
                    <>
                      <RotateCw className="size-3.5" />
                      <span>Resend verification email</span>
                    </>
                  )}
                </Button>
              </div>

              <p className="text-center text-[11px] text-ink-3 pt-2">
                You can start diagramming offline right now. Cloud collaboration syncs automatically once verified.
              </p>
            </div>
          ) : (
            /* Standard Login / Signup / Forgot Password Form */
            <>
              {/* Header Title & Subtitle */}
              <div className="text-center mt-1 mb-5">
                <DialogTitle className="text-[19px] font-semibold text-ink tracking-tight">
                  {mode === 'login' && 'Sign in to your account'}
                  {mode === 'signup' && 'Create your Drawzware account'}
                  {mode === 'forgot' && 'Reset your password'}
                </DialogTitle>
                <DialogDescription className="text-[13px] text-ink-2 mt-1">
                  {mode === 'login' && 'Sign in to access cloud workspaces and collaborate in real-time.'}
                  {mode === 'signup' && 'Personal canvas is 100% offline. Sign up to enable cloud collaboration.'}
                  {mode === 'forgot' && 'Enter your account email to receive a secure password reset link.'}
                </DialogDescription>
              </div>

              {/* Mode Switch Tabs (Sign In / Create Account) */}
              {mode !== 'forgot' && (
                <div className="flex rounded-lg bg-surface-2 p-1 mb-5 border border-line">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setMode('login');
                    }}
                    className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all cursor-pointer ${
                      mode === 'login'
                        ? 'bg-card text-ink shadow-xs font-semibold'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setMode('signup');
                    }}
                    className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all cursor-pointer ${
                      mode === 'signup'
                        ? 'bg-card text-ink shadow-xs font-semibold'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Unverified Email Warning Banner (if signed in but unverified) */}
              {currentUser && currentUser.isEmailVerified === false && (
                <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[12.5px] flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="size-4 shrink-0 text-amber-400" />
                    <span>Email verification pending</span>
                  </div>
                  <p className="text-[12px] text-amber-300/90 leading-relaxed">
                    Your email ({currentUser.email}) has not been verified yet. Real-time cloud collaboration is paused until verified.
                  </p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingEmail || resendCooldown > 0}
                    className="mt-1 text-left text-amber-300 underline underline-offset-2 hover:text-white cursor-pointer text-[12px] font-medium"
                  >
                    {resendingEmail
                      ? 'Sending verification link…'
                      : resendCooldown > 0
                      ? `Resend link available in ${resendCooldown}s`
                      : 'Resend verification email'}
                  </button>
                </div>
              )}

              {/* Feedback Messages */}
              {errorMessage && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-[12.5px] flex items-start gap-2"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    <p>{errorMessage}</p>
                    {mode === 'login' && errorMessage.toLowerCase().includes('invalid email or password') && (
                      <p className="mt-1 text-[11.5px] text-ink-2">
                        Need to create your account first?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMessage(null);
                            setMode('signup');
                          }}
                          className="text-accent underline font-medium hover:text-ink cursor-pointer"
                        >
                          Click here to Create Account
                        </button>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[12.5px] flex items-start gap-2"
                >
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{successMessage}</span>
                </div>
              )}

              {/* Mode Form */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div>
                    <label htmlFor="login-email" className="block text-[12px] font-medium text-ink-2 mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="size-4 text-ink-3 absolute left-3 top-3 pointer-events-none" />
                      <Input
                        id="login-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-10 pl-9 text-[13.5px]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="login-password" className="block text-[12px] font-medium text-ink-2">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setSuccessMessage(null);
                          setMode('forgot');
                        }}
                        className="text-[11.5px] text-accent hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="size-4 text-ink-3 absolute left-3 top-3 pointer-events-none" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 pl-9 pr-10 text-[13.5px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-2.5 text-ink-3 hover:text-ink cursor-pointer p-0.5 rounded transition-colors"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[13.5px] rounded-[10px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Signing in…</span>
                      </>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </Button>

                  <div className="text-center pt-2 text-[12.5px] text-ink-2">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setMode('signup');
                      }}
                      className="font-medium text-accent hover:underline cursor-pointer"
                    >
                      Create account
                    </button>
                  </div>
                </form>
              )}

              {mode === 'signup' && (
                <form onSubmit={handleSignup} className="space-y-3.5">
                  <div>
                    <label htmlFor="signup-name" className="block text-[12px] font-medium text-ink-2 mb-1">
                      Full name
                    </label>
                    <div className="relative">
                      <User className="size-4 text-ink-3 absolute left-3 top-3 pointer-events-none" />
                      <Input
                        id="signup-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alice Smith"
                        className="h-10 pl-9 text-[13.5px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-email" className="block text-[12px] font-medium text-ink-2 mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="size-4 text-ink-3 absolute left-3 top-3 pointer-events-none" />
                      <Input
                        id="signup-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-10 pl-9 text-[13.5px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-password" className="block text-[12px] font-medium text-ink-2 mb-1">
                      Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <Lock className="size-4 text-ink-3 absolute left-3 top-3 pointer-events-none" />
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 pl-9 pr-10 text-[13.5px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-2.5 text-ink-3 hover:text-ink cursor-pointer p-0.5 rounded transition-colors"
                      >
                        {showSignupPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[13.5px] rounded-[10px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Creating account…</span>
                      </>
                    ) : (
                      <span>Create Account</span>
                    )}
                  </Button>

                  <div className="text-center pt-2 text-[12.5px] text-ink-2">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setMode('login');
                      }}
                      className="font-medium text-accent hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </div>
                </form>
              )}

              {mode === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-3.5">
                  <div>
                    <label htmlFor="forgot-email" className="block text-[12px] font-medium text-ink-2 mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="size-4 text-ink-3 absolute left-3 top-3 pointer-events-none" />
                      <Input
                        id="forgot-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-10 pl-9 text-[13.5px]"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[13.5px] rounded-[10px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Sending link…</span>
                      </>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setMode('login');
                      }}
                      className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-ink cursor-pointer"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Local-First Guarantee Footer */}
              <p className="mt-5 text-center text-[11px] leading-relaxed text-ink-3 border-t border-line/60 pt-3">
                Personal canvas is 100% offline and always free. Cloud collaboration is opt-in.
              </p>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
