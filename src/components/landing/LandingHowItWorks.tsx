export function LandingHowItWorks() {
  const steps = [
    { num: '01', title: 'Start', desc: 'Open a blank canvas or choose a template.' },
    { num: '02', title: 'Design', desc: 'Add components and connect them visually.' },
    { num: '03', title: 'Refine', desc: 'Organize, adjust and collaborate.' },
    { num: '04', title: 'Export', desc: 'Export as PNG, SVG or PDF.' },
  ];

  const trustHighlights = [
    { stat: '100% Local', label: 'Your diagrams stay on your device.' },
    { stat: 'Privacy First', label: 'Your data stays yours.' },
    { stat: 'Easy to Use', label: 'Design system architectures with a simple, intuitive workspace.' },
  ];

  return (
    <section id="how-it-works" className="w-full py-14 sm:py-20 lg:py-28 bg-[#faf8f5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16 space-y-2 sm:space-y-3">
          <h2 className="lp-font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-normal tracking-tight text-[#0b291d]">
            How it works
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 font-normal">
            From idea to a complete diagram, in a few simple steps.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mb-14 sm:mb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-6 relative z-10">
            {steps.map((step) => (
              <div key={step.num} className="flex flex-col text-left">
                <div className="flex items-center gap-3 mb-2.5 sm:mb-4">
                  <span className="lp-font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-[#f26522] tracking-tight shrink-0">
                    {step.num}
                  </span>
                  <div className="h-[1px] flex-1 bg-neutral-200/80" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-[#0b291d] tracking-tight mb-1 sm:mb-1.5">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust highlights */}
        <div className="pt-10 sm:pt-12 border-t border-neutral-200/70">
          <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12 space-y-1.5 sm:space-y-2">
            <h3 className="lp-font-serif text-xl sm:text-2xl md:text-3xl font-normal text-[#0b291d] tracking-tight">
              Trusted by developers and teams
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 font-normal">
              Simple, powerful and built for real-world systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-6 divide-y md:divide-y-0 md:divide-x divide-neutral-200/80">
            {trustHighlights.map((item, index) => (
              <div
                key={item.stat}
                className={`text-center ${index !== 0 ? 'pt-6 md:pt-0 md:pl-6' : ''}`}
              >
                <div className="lp-font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-[#f26522] tracking-tight mb-1 sm:mb-1.5">
                  {item.stat}
                </div>
                <div className="text-xs sm:text-sm text-neutral-600 font-medium max-w-xs mx-auto leading-relaxed">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
