'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Github, Menu, X, ExternalLink } from 'lucide-react';
import { DrawzwareLogo } from './DrawzwareLogo';

interface NavbarProps {
  onOpenDesktopApp: () => void;
}

export function LandingNavbar({ onOpenDesktopApp }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Templates', href: '#why-choose' },
    { label: 'How it works', href: '#how-it-works' },
  ];

  return (
    <header className="lp-navbar sticky top-0 z-40 w-full backdrop-blur-md bg-[#faf8f5]/90 border-b border-neutral-200/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3 sm:gap-8">
        {/* Brand Wordmark */}
        <Link
          href="/"
          className="flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg py-1 min-w-0"
          aria-label="Drawzware Homepage"
        >
          <DrawzwareLogo size="md" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600"
          aria-label="Main Navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-emerald-900 transition-colors whitespace-nowrap shrink-0 relative py-1 hover:underline underline-offset-4 decoration-emerald-500/40"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Action Zone (Desktop) */}
        <div className="hidden md:flex items-center gap-5 shrink-0">
          <a
            href="https://github.com/rajesh-kayal-dev/Drawzware"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-950 transition-colors whitespace-nowrap"
            aria-label="View on GitHub"
          >
            <Github className="w-4 h-4 text-neutral-800" />
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </a>

          <Link
            href="/app"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0b291d] hover:bg-[#071f16] active:scale-[0.98] rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            <span>Open Canvas</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </Link>
        </div>

        {/* Mobile Action Zone */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <Link
            href="/app"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0b291d] rounded-lg active:scale-95 transition-transform"
          >
            <span>Canvas</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 text-neutral-700 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-200/80 bg-[#faf8f5] px-5 py-4 space-y-1 shadow-lg">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-neutral-700 hover:text-emerald-900 py-2.5 px-2 rounded-lg hover:bg-neutral-100/60 transition-colors"
            >
              {link.label}
            </a>
          ))}
          {onOpenDesktopApp && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDesktopApp();
              }}
              className="block w-full text-left text-sm font-medium text-neutral-700 hover:text-emerald-900 py-2.5 px-2 rounded-lg hover:bg-neutral-100/60 transition-colors cursor-pointer"
            >
              Desktop App
            </button>
          )}
          <div className="pt-3 mt-2 border-t border-neutral-200/60 flex items-center justify-between gap-3 px-2">
            <a
              href="https://github.com/rajesh-kayal-dev/Drawzware"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-950 py-2"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </a>
            <Link
              href="/app"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0b291d] rounded-lg active:scale-95"
            >
              <span>Open Canvas</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
