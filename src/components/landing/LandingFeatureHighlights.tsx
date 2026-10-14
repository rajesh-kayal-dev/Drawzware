import { Box, Users, FileCheck } from 'lucide-react';

export function LandingFeatureHighlights() {
  const highlights = [
    {
      icon: <Box className="w-5 h-5 sm:w-6 sm:h-6 text-[#0b291d]" strokeWidth={1.75} />,
      title: 'Architecture diagrams',
      description: 'Design and visualize complex systems',
    },
    {
      icon: <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#0b291d]" strokeWidth={1.75} />,
      title: 'Developer-focused',
      description: 'Built for modern teams',
    },
    {
      icon: <FileCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#0b291d]" strokeWidth={1.75} />,
      title: 'Export-ready',
      description: 'PNG, SVG and PDF',
    },
  ];

  return (
    <section id="features" className="w-full py-6 sm:py-8 border-y border-neutral-200/60 bg-[#fbf9f6]/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-neutral-200/70">
          {highlights.map((item, index) => (
            <div
              key={item.title}
              className={`flex items-center gap-3.5 sm:gap-4 ${
                index !== 0 ? 'pt-5 md:pt-0 md:pl-8' : ''
              }`}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white border border-neutral-200/90 shadow-sm flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-[#0b291d] tracking-tight truncate sm:whitespace-normal">
                  {item.title}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 font-normal leading-normal">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
