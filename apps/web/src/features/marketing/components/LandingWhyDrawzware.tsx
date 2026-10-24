import { Box, GitFork, Link2, Code2, Zap, LayoutGrid } from 'lucide-react';

export function LandingWhyDrawzware() {
  const features = [
    {
      icon: <Box className="w-5 h-5 text-emerald-800" />,
      title: 'Architecture-first',
      description: 'Create system diagrams around real components and services.',
    },
    {
      icon: <GitFork className="w-5 h-5 text-emerald-800" />,
      title: 'Multiple diagram types',
      description: 'Switch between architecture, sequence, and ER diagrams.',
    },
    {
      icon: <Link2 className="w-5 h-5 text-emerald-800" />,
      title: 'Clear connections',
      description: 'Show relationships and data flow between components.',
    },
    {
      icon: <Code2 className="w-5 h-5 text-emerald-800" />,
      title: 'Made for developers',
      description: 'Keep technical diagrams readable and structured.',
    },
    {
      icon: <Zap className="w-5 h-5 text-emerald-800" />,
      title: 'Fast to get started',
      description: 'Start from a blank canvas or a useful template.',
    },
    {
      icon: <LayoutGrid className="w-5 h-5 text-emerald-800" />,
      title: 'Simple workspace',
      description: 'Focus on designing, not fighting the interface.',
    },
  ];

  return (
    <section id="why-choose" className="w-full py-14 sm:py-20 lg:py-28 bg-[#faf8f5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-2 sm:space-y-3">
          <h2 className="lp-font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-normal tracking-tight text-[#0b291d]">
            Why choose Drawzware?
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 font-normal">
            Everything you need to communicate software architecture clearly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-5 sm:p-6 lg:p-7 bg-white rounded-2xl border border-neutral-200/90 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(11,41,29,0.08)] hover:border-emerald-300/80 transition-all duration-200"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50/90 border border-emerald-100 flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-105 transition-transform duration-200">
                {feature.icon}
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-[#0b291d] tracking-tight mb-1.5 sm:mb-2">
                {feature.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
