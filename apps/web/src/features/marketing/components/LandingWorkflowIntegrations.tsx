'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Github,
  FileCode2,
  FileImage,
  FileType,
  Users2,
  MoreHorizontal,
  ExternalLink,
  X,
} from 'lucide-react';

export function LandingWorkflowIntegrations() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);

  const integrations = [
    {
      id: 'github',
      icon: <Github className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-800" />,
      label: 'GitHub',
      details: 'Sync diagrams directly to repository READMEs or RFC markdown docs with automated SVG rendering.',
      actionLabel: 'View GitHub repo',
      actionUrl: 'https://github.com/rajesh-kayal-dev/Drawzware',
    },
    {
      id: 'markdown',
      icon: <FileCode2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-800" />,
      label: 'Markdown',
      details: 'Export lightweight Mermaid and PlantUML compatible text definitions directly into your documentation.',
      actionLabel: 'Open Canvas to test',
      actionCanvas: true,
    },
    {
      id: 'png-svg',
      icon: <FileImage className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-800" />,
      label: 'PNG / SVG',
      details: 'Pixel-perfect vector SVG and high-DPI raster PNG exports ready for keynotes, papers, and wiki pages.',
      actionLabel: 'Try SVG export',
      actionCanvas: true,
    },
    {
      id: 'pdf',
      icon: <FileType className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-800" />,
      label: 'PDF',
      details: 'Multi-page architecture documentation packages formatted for engineering reviews and architecture review boards.',
      actionLabel: 'Learn more in Canvas',
      actionCanvas: true,
    },
    {
      id: 'team',
      icon: <Users2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-800" />,
      label: 'Team workflow',
      details: 'Share persistent diagram URLs, collaborate on design proposals, and maintain living system architectures.',
      actionLabel: 'Explore collaboration',
      actionCanvas: true,
    },
    {
      id: 'more',
      icon: <MoreHorizontal className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-600" />,
      label: 'More integrations',
      details: 'Native integrations for Notion, Jira, Confluence, and VS Code extensions are actively underway.',
      actionLabel: 'Request integration',
      actionUrl: 'mailto:rajeshkayal8001@gmail.com',
    },
  ] as const;

  return (
    <section id="workflow" className="w-full py-14 sm:py-20 bg-[#faf8f5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 space-y-2 sm:space-y-3">
          <h2 className="lp-font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-normal tracking-tight text-[#0b291d]">
            Works with your workflow
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 font-normal">
            Bring your diagrams into the tools and processes you already use.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {integrations.map((item) => (
            <button
              key={item.label}
              onClick={() => setSelectedWorkflow(item.id)}
              className={`flex flex-col items-center justify-center p-4 sm:p-5 lg:p-6 bg-white rounded-2xl border transition-all duration-200 text-center cursor-pointer group touch-manipulation ${
                selectedWorkflow === item.id
                  ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                  : 'border-neutral-200/90 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] hover:border-emerald-300 hover:shadow-md'
              }`}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-neutral-50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-emerald-50/70 transition-all duration-200">
                {item.icon}
              </div>
              <span className="text-xs sm:text-sm font-semibold text-neutral-800 group-hover:text-emerald-900 transition-colors truncate w-full">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {selectedWorkflow && (
          <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-white rounded-2xl border border-emerald-200/80 shadow-md max-w-2xl mx-auto lp-slide-in">
            {(() => {
              const item = integrations.find((i) => i.id === selectedWorkflow);
              if (!item) return null;
              return (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-900">{item.label} Support</h4>
                      <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{item.details}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                    {'actionCanvas' in item && item.actionCanvas ? (
                      <Link
                        href="/app"
                        className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold text-white bg-[#0b291d] hover:bg-[#071f16] rounded-lg transition-colors whitespace-nowrap text-center"
                      >
                        {item.actionLabel}
                      </Link>
                    ) : (
                      <a
                        href={'actionUrl' in item ? item.actionUrl : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <span>{item.actionLabel}</span>
                        <ExternalLink className="w-3 h-3 text-neutral-500" />
                      </a>
                    )}
                    <button
                      onClick={() => setSelectedWorkflow(null)}
                      aria-label="Dismiss details"
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </section>
  );
}
