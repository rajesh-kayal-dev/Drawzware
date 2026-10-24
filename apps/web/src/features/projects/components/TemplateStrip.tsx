'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Boxes } from 'lucide-react';
import { MinimapThumb } from '@/features/canvas/components/MinimapThumb';
import { TEMPLATES } from '@/features/canvas/templates/templates';
import { cn, plural } from '@/shared/utils/utils';
import { countComponents } from '@/features/projects/utils/project-templates';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'microservices', label: 'Microservices' },
  { id: 'monolith', label: 'Monolith' },
  { id: 'event-driven', label: 'Event-driven' },
  { id: 'client-server', label: 'Client-server' },
  { id: 'serverless', label: 'Serverless' },
] as const;

interface TemplateStripProps {
  onSelect: (templateId: string) => void;
  defaultExpanded?: boolean;
}

export function TemplateStrip({ onSelect, defaultExpanded = false }: TemplateStripProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expanded, setExpanded] = useState(defaultExpanded);

  const filtered = useMemo(() => {
    if (selectedCategory === 'all') return TEMPLATES;
    return TEMPLATES.filter((t) => {
      const id = t.id.toLowerCase();
      const name = t.name.toLowerCase();
      const target = selectedCategory.toLowerCase();
      return id.includes(target) || name.includes(target);
    });
  }, [selectedCategory]);

  const visible = expanded || selectedCategory !== 'all' ? filtered : filtered.slice(0, 5);
  const hasMore = selectedCategory === 'all' && filtered.length > 5;

  return (
    <section aria-labelledby="templates-heading" className="w-full">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 id="templates-heading" className="text-base font-semibold text-ink tracking-tight">
          Start from a template
        </h2>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-medium text-accent hover:opacity-85 transition-opacity cursor-pointer group"
          >
            <span>{expanded ? 'Show less' : 'View all'}</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'rounded-full px-3.5 py-1 text-xs font-medium transition-all cursor-pointer',
                active
                  ? 'bg-line-2 text-ink border border-line shadow-xs font-semibold'
                  : 'bg-paper text-ink-2 border border-line hover:border-ink-3 hover:text-ink'
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Templates Grid - 5 cards on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {visible.map((template) => {
          const componentsCount = countComponents(template.nodes);
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className="group flex flex-col justify-between text-left rounded-xl border border-line bg-paper hover:border-ink-3 p-3 transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md"
            >
              {/* Thumbnail Container with Canvas Dotted Background */}
              <div className="dot-grid relative h-[120px] w-full rounded-lg border border-line-2 bg-bg overflow-hidden flex items-center justify-center p-2 [background-size:14px_14px]">
                <div className="h-full w-full transition-transform duration-200 group-hover:scale-[1.04]">
                  <MinimapThumb nodes={template.nodes} edges={template.edges} opacity={0.9} />
                </div>
              </div>

              {/* Info */}
              <div className="mt-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-ink tracking-tight truncate group-hover:text-accent transition-colors">
                    {template.name}
                  </h3>
                  <p className="mt-1 text-xs text-ink-2 line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                </div>

                <div className="mt-3.5 pt-2 border-t border-line-2 flex items-center gap-1.5 font-mono text-[11px] text-ink-3">
                  <Boxes className="size-3.5 text-ink-3" />
                  <span>{plural(componentsCount, 'component')}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
