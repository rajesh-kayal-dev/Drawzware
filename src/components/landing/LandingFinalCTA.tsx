import Link from 'next/link';
import { ArrowRight, Github, ExternalLink } from 'lucide-react';

export function LandingFinalCTA() {
  return (
    <section className="relative w-full py-16 sm:py-24 lg:py-32 bg-[#faf8f5] overflow-hidden">
      {/* Floating crystals */}
      <div className="hidden lg:block absolute left-4 sm:left-12 -bottom-10 pointer-events-none w-44 h-44 opacity-80 lp-float-slow -rotate-45">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/emerald-crystal.jpg"
          alt=""
          role="presentation"
          className="w-full h-full object-contain drop-shadow-2xl"
        />
      </div>
      <div className="hidden lg:block absolute right-4 sm:right-12 -bottom-10 pointer-events-none w-48 h-48 opacity-80 lp-float-reverse rotate-30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/emerald-crystal.jpg"
          alt=""
          role="presentation"
          className="w-full h-full object-contain drop-shadow-2xl"
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 sm:space-y-5">
        <h2 className="lp-font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight text-[#0b291d]">
          Get started in minutes
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-neutral-600 font-normal max-w-xl mx-auto leading-relaxed">
          Turn complex systems into clear, understandable diagrams.
        </p>

        <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">
          <Link
            href="/app"
            className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#0b291d] hover:bg-[#071f16] active:scale-[0.98] rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto"
          >
            <span>Open Canvas</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </Link>

          <a
            href="https://github.com/rajesh-kayal-dev/Drawzware"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium text-neutral-800 bg-white hover:bg-neutral-50 border border-neutral-300/80 active:scale-[0.98] rounded-xl shadow-sm transition-all whitespace-nowrap w-full sm:w-auto"
          >
            <Github className="w-4 h-4 text-neutral-700" />
            <span>View on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
          </a>
        </div>
      </div>
    </section>
  );
}
