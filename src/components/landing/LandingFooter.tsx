'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Github, ExternalLink, Heart } from 'lucide-react';
import { DrawzwareLogo } from './DrawzwareLogo';

export function LandingFooter() {
  const [aboutModalOpen, setAboutModalOpen] = useState(false);

  const productLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Diagram Types', href: '#why-choose' },
    { label: 'Templates', href: '#why-choose' },
  ];

  const resourceLinks = [
    { label: 'GitHub', href: 'https://github.com/rajesh-kayal-dev/Drawzware', external: true },
    { label: 'Getting Started', href: '#how-it-works' },
    { label: 'Roadmap', href: '#workflow' },
  ];

  return (
    <footer className="relative w-full overflow-hidden text-neutral-300">
      {/* Background mountain */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/banner-mountain.jpg"
          alt=""
          role="presentation"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#061c14]/92 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-8 sm:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12 pb-8 sm:pb-12 border-b border-emerald-900/60">
          {/* Brand */}
          <div className="md:col-span-5 space-y-3 sm:space-y-4">
            <DrawzwareLogo variant="light" size="md" />
            <p className="text-xs sm:text-sm text-neutral-300 font-normal max-w-sm leading-relaxed">
              Design better systems, together. A focused visual workspace for software architecture
              diagrams, sequence flows, and component models.
            </p>
            <div className="pt-1">
              <a
                href="https://github.com/rajesh-kayal-dev/Drawzware"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Drawzware GitHub Repository"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3 text-neutral-400" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8">
            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold text-white tracking-wider uppercase mb-3 sm:mb-3.5">
                Product
              </h4>
              <ul className="space-y-2 sm:space-y-2.5 text-xs text-neutral-400">
                {productLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="hover:text-emerald-400 transition-colors py-0.5 inline-block"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link
                    href="/app"
                    className="hover:text-emerald-400 transition-colors py-0.5 inline-block"
                  >
                    Open Canvas
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-xs font-semibold text-white tracking-wider uppercase mb-3 sm:mb-3.5">
                Resources
              </h4>
              <ul className="space-y-2 sm:space-y-2.5 text-xs text-neutral-400">
                {resourceLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                      className="hover:text-emerald-400 transition-colors py-0.5 inline-flex items-center gap-1"
                    >
                      <span>{link.label}</span>
                      {link.external && <ExternalLink className="w-2.5 h-2.5 opacity-60" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* About */}
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-xs font-semibold text-white tracking-wider uppercase mb-3 sm:mb-3.5">
                About
              </h4>
              <ul className="space-y-2 sm:space-y-2.5 text-xs text-neutral-400">
                <li>
                  <button
                    onClick={() => setAboutModalOpen(true)}
                    className="hover:text-emerald-400 transition-colors py-0.5 text-left cursor-pointer"
                  >
                    About Drawzware
                  </button>
                </li>
                <li>
                  <a
                    href="mailto:rajeshkayal8001@gmail.com"
                    className="hover:text-emerald-400 transition-colors py-0.5 inline-block"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-3 sm:gap-4 text-center sm:text-left">
          <p>© 2026 Drawzware. All rights reserved.</p>
          <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
            <span>Built with care by</span>
            <span className="text-emerald-400 font-semibold">Rajesh Kayal</span>
          </div>
        </div>
      </div>

      {/* About Dialog */}
      {aboutModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setAboutModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-modal-title"
        >
          <div
            className="w-full max-w-md bg-white text-neutral-900 rounded-2xl p-6 sm:p-7 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 mb-4">
              <Heart className="w-5 h-5 text-emerald-700" />
            </div>

            <h3
              id="about-modal-title"
              className="lp-font-serif text-xl text-[#0b291d] mb-2 font-semibold"
            >
              About Drawzware
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-5">
              Drawzware is a dedicated system design canvas crafted to make software architecture
              visual, clear, and frictionless. Designed for engineers and technical teams to
              communicate microservices, sequence flows, and infrastructure models without clunky
              enterprise bloat.
            </p>
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                Created by <strong className="text-neutral-800">Rajesh Kayal</strong>
              </span>
              <button
                onClick={() => setAboutModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0b291d] hover:bg-[#071f16] rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
