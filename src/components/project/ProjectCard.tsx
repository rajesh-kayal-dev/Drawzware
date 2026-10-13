'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Clock, Copy, Download, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MinimapThumb } from '@/components/shared/MinimapThumb';
import { formatRelative, plural } from '@/lib/utils';
import type { Project } from '@/types';
import { countComponents } from './project-io';
import { canvasPath } from '@/lib/routes';

export interface ProjectCardProps {
  project: Project;
  onRename: (project: Project) => void;
  onDuplicate: (project: Project) => void;
  onExport: (project: Project) => void;
  onDelete: (project: Project) => void;
}

function ProjectCardComponent({ project, onRename, onDuplicate, onExport, onDelete }: ProjectCardProps) {
  const components = countComponents(project.nodes);
  const connections = project.edges.length;

  return (
    <div className="group relative flex flex-col rounded-xl border border-line bg-paper transition-all duration-150 hover:border-ink-3 hover:shadow-lg overflow-hidden">
      {/* Thumbnail with Canvas Dotted Background */}
      <Link
        href={canvasPath(project.id)}
        className="dot-grid relative flex h-[180px] w-full items-center justify-center overflow-hidden border-b border-line-2 bg-bg p-3 [background-size:16px_16px] outline-none"
      >
        <div className="h-full w-full transition-transform duration-200 group-hover:scale-[1.03]">
          <MinimapThumb
            nodes={project.nodes}
            edges={project.edges}
            opacity={0.9}
            empty={<div className="flex h-full items-center justify-center text-xs text-ink-3">Empty canvas</div>}
          />
        </div>
      </Link>

      {/* Footer Info */}
      <div className="flex items-center justify-between gap-3 p-3.5">
        <div className="min-w-0 flex-1">
          <Link
            href={canvasPath(project.id)}
            className="block truncate text-sm font-semibold text-ink tracking-tight hover:text-accent transition-colors"
          >
            {project.name}
          </Link>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">
            <Clock className="size-3 text-ink-3 shrink-0" />
            <span className="truncate">Edited {formatRelative(project.updatedAt)}</span>
            <span className="text-ink-3">·</span>
            <span className="font-mono text-[11px] text-ink-3 truncate">
              {plural(connections, 'connection')}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${project.name}`}
              className="relative z-10 shrink-0 text-ink-3 hover:text-ink hover:bg-line-2 rounded-lg"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-paper border-line text-ink">
            <DropdownMenuItem onSelect={() => onRename(project)}>
              <Pencil className="size-3.5 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDuplicate(project)}>
              <Copy className="size-3.5 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onExport(project)}>
              <Download className="size-3.5 mr-2" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-line" />
            <DropdownMenuItem
              onSelect={() => onDelete(project)}
              className="text-danger focus:bg-[color-mix(in_oklch,var(--danger)_10%,transparent)]"
            >
              <Trash2 className="size-3.5 mr-2 text-danger" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function ProjectListItem({ project, onRename, onDuplicate, onExport, onDelete }: ProjectCardProps) {
  const components = countComponents(project.nodes);
  const connections = project.edges.length;

  return (
    <div className="group flex items-center justify-between gap-4 rounded-xl border border-line bg-paper p-3 transition-all hover:border-ink-3">
      <Link href={canvasPath(project.id)} className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="dot-grid relative size-12 shrink-0 rounded-lg border border-line bg-bg overflow-hidden p-1 [background-size:8px_8px]">
          <MinimapThumb nodes={project.nodes} edges={project.edges} opacity={0.9} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-ink tracking-tight group-hover:text-accent transition-colors">
            {project.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-2">
            <span>Edited {formatRelative(project.updatedAt)}</span>
            <span className="text-ink-3">·</span>
            <span className="font-mono text-[11px] text-ink-3">{plural(components, 'component')}</span>
            <span className="text-ink-3">·</span>
            <span className="font-mono text-[11px] text-ink-3">{plural(connections, 'connection')}</span>
          </div>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${project.name}`}
            className="shrink-0 text-ink-3 hover:text-ink hover:bg-line-2 rounded-lg"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-paper border-line text-ink">
          <DropdownMenuItem onSelect={() => onRename(project)}>
            <Pencil className="size-3.5 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onDuplicate(project)}>
            <Copy className="size-3.5 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onExport(project)}>
            <Download className="size-3.5 mr-2" />
            Export JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-line" />
          <DropdownMenuItem
            onSelect={() => onDelete(project)}
            className="text-danger focus:bg-[color-mix(in_oklch,var(--danger)_10%,transparent)]"
          >
            <Trash2 className="size-3.5 mr-2 text-danger" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export const ProjectCard = memo(
  ProjectCardComponent,
  (prev, next) =>
    prev.project.id === next.project.id &&
    prev.project.updatedAt === next.project.updatedAt &&
    prev.project.name === next.project.name &&
    prev.onRename === next.onRename &&
    prev.onDuplicate === next.onDuplicate &&
    prev.onExport === next.onExport &&
    prev.onDelete === next.onDelete
);
