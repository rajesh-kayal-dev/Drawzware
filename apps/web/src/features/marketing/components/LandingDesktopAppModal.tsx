'use client';

import { useState, useEffect } from 'react';
import { X, Monitor, CheckCircle, Terminal } from 'lucide-react';

interface DesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type OS = 'macos' | 'windows' | 'linux';

// Apple icon as SVG since lucide's Apple is sometimes unavailable
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

export function LandingDesktopAppModal({ isOpen, onClose }: DesktopAppModalProps) {
  const [email, setEmail] = useState('');
  const [os, setOs] = useState<OS>('macos');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid email address');
      return;
    }
    setError('');
    try {
      const waitlist = JSON.parse(localStorage.getItem('drawzware_desktop_waitlist') || '[]');
      waitlist.push({ email, os, date: new Date().toISOString() });
      localStorage.setItem('drawzware_desktop_waitlist', JSON.stringify(waitlist));
    } catch {
      // fallback silently
    }
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="desktop-modal-title"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 sm:h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-6 md:p-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mb-3 sm:mb-4">
            <Monitor className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <h3
            id="desktop-modal-title"
            className="lp-font-serif text-xl sm:text-2xl text-[#0b291d] tracking-tight mb-1.5 sm:mb-2"
          >
            Drawzware for Desktop
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 mb-5 sm:mb-6 leading-relaxed">
            The native desktop application with full offline-first storage, local Git integration,
            and hardware-accelerated rendering is currently in private testing.
          </p>

          {submitted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 text-center">
              <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-semibold text-emerald-900 text-sm sm:text-base mb-1">
                You&apos;re on the priority list!
              </h4>
              <p className="text-xs text-emerald-700">
                We&apos;ll send an invite link to{' '}
                <strong className="text-emerald-950">{email}</strong> as soon as the{' '}
                {os.toUpperCase()} build is available.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Select your operating system:
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {([
                    { id: 'macos', label: 'macOS', Icon: AppleIcon },
                    { id: 'windows', label: 'Windows', Icon: Monitor },
                    { id: 'linux', label: 'Linux', Icon: Terminal },
                  ] as const).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setOs(id)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-1.5 sm:px-3 text-[11px] sm:text-xs font-medium rounded-lg border transition-all ${
                        os === id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold shadow-sm'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="lp-email-input" className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Your work email for early access:
                </label>
                <input
                  id="lp-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                  required
                />
                {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0b291d] hover:bg-[#082017] rounded-lg shadow-sm transition-colors text-center"
                >
                  Notify Me When Ready
                </button>
              </div>
            </form>
          )}

          <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-neutral-100 flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400">
            <span>Offline-first · Zero telemetry</span>
            <span>Est. Q3 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
