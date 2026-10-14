import { Box, DollarSign, Activity, LayoutGrid } from 'lucide-react';

export function LandingDarkValueSection() {
  return (
    <section className="relative w-full py-14 sm:py-20 lg:py-28 bg-[#09251a] text-white overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 lp-bg-grid-dots-dark opacity-40 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          {/* Left */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-6">
            <h2 className="lp-font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[46px] font-normal tracking-tight text-white leading-[1.15]">
              Build better systems, faster
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-emerald-100/80 font-normal leading-relaxed max-w-lg">
              From idea to architecture, Drawzware helps you design, discuss, document — all in one place.
            </p>
          </div>

          {/* Right: Dark Cards */}
          <div className="lg:col-span-6 space-y-3 sm:space-y-3.5 w-full overflow-hidden">
            <div className="p-3.5 sm:p-4 bg-emerald-950/60 backdrop-blur-md rounded-xl border border-emerald-500/20 shadow-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/80 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <Box className="w-4 h-4" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="h-2 w-20 sm:w-28 bg-emerald-400/30 rounded-full" />
                  <div className="h-1.5 w-14 sm:w-16 bg-emerald-500/20 rounded-full" />
                </div>
              </div>
              <div className="h-2 w-8 sm:w-12 bg-emerald-400/20 rounded-full shrink-0" />
            </div>

            <div className="p-3.5 sm:p-4 bg-emerald-900/50 backdrop-blur-md rounded-xl border border-emerald-400/30 shadow-2xl flex items-center justify-between gap-3 relative overflow-hidden">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-amber-300 font-bold text-sm shrink-0">
                  <DollarSign className="w-4 h-4 text-amber-300" />
                </div>
                <div className="space-y-2 min-w-0">
                  <div className="h-2.5 w-24 sm:w-36 bg-white/70 rounded-full" />
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-14 sm:w-20 bg-emerald-300/40 rounded-full" />
                    <div className="h-1.5 w-10 sm:w-14 bg-emerald-300/20 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-800/60 border border-emerald-600/30 flex items-center justify-center text-emerald-300">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 bg-emerald-950/60 backdrop-blur-md rounded-xl border border-emerald-500/20 shadow-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/80 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="h-2 w-24 sm:w-32 bg-emerald-400/30 rounded-full" />
                  <div className="h-1.5 w-16 sm:w-20 bg-emerald-500/20 rounded-full" />
                </div>
              </div>
              <div className="h-2 w-8 sm:w-10 bg-emerald-400/20 rounded-full shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
