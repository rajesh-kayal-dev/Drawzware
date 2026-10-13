'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Download,
  FileCode,
  FileJson,
  ImageIcon,
  Link as LinkIcon,
  Moon,
  Play,
  Settings2,
  Share2,
  Sun,
  Workflow,
} from 'lucide-react';
import { useCanvasStore, type SaveStatus } from '@/stores/useCanvasStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useToastStore, toast } from '@/stores/useToastStore';
import {
  exportToPng,
  exportToSvg,
  exportToJson,
  exportFilename,
  copyPngToClipboard,
} from '@/lib/export';
import { exportToMermaid } from '@/lib/mermaid';
import { encodeCanvasToUrl } from '@/lib/share';
import { downloadFile } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useIsNarrow } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getShortcutKeys } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';

const STATUS: Record<SaveStatus, { label: string; dot: string }> = {
  saved: { label: 'Saved', dot: 'bg-ok' },
  saving: { label: 'Saving…', dot: 'bg-warn animate-status-pulse' },
  error: { label: 'Offline · retrying', dot: 'bg-danger' },
};

/** "Saving…" only when a save takes longer than 300ms; otherwise stay on "Saved". */
function useDisplayedSaveStatus(): SaveStatus {
  const status = useCanvasStore((s) => s.saveStatus);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(status === 'saving'), status === 'saving' ? 300 : 0);
    return () => clearTimeout(t);
  }, [status]);
  if (status === 'saving') return slow ? 'saving' : 'saved';
  return status;
}

function ProjectName({ projectId, name }: { projectId: string; name: string }) {
  const renameProject = useProjectStore((s) => s.renameProject);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const cancelled = useRef(false);

  const start = () => {
    cancelled.current = false;
    setDraft(name);
    setEditing(true);
  };

  const commit = () => {
    if (cancelled.current) return;
    cancelled.current = true;
    setEditing(false);
    const next = draft.trim();
    if (next && next !== name) renameProject(projectId, next);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        aria-label="Project name"
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            cancelled.current = true;
            setEditing(false);
          }
        }}
        style={{ width: `${Math.max(draft.length, 6) + 2}ch` }}
        className="-mx-1.5 h-7 max-w-[min(360px,50vw)] min-w-0 rounded-[7px] border border-accent bg-paper px-1.5 text-[13.5px] font-semibold text-ink shadow-[0_0_0_3px_var(--accent-soft)] outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      title="Rename"
      className="focus-ring -mx-1.5 h-7 max-w-[min(360px,50vw)] min-w-0 truncate rounded-[7px] border border-transparent px-1.5 text-[13.5px] font-semibold text-ink transition-colors duration-[120ms] hover:bg-line-2"
    >
      {name}
    </button>
  );
}

export function CanvasHeader({ projectId, projectName }: { projectId: string; projectName?: string }) {
  const narrow = useIsNarrow();
  const { theme, toggleTheme } = useTheme();
  const status = useDisplayedSaveStatus();
  const hasComponents = useCanvasStore((s) => s.nodes.some((n) => n.type === 'system'));
  const startPresentation = useCanvasStore((s) => s.startPresentation);
  const setExportOpen = useCanvasStore((s) => s.setExportOpen);
  const setShareOpen = useCanvasStore((s) => s.setShareOpen);
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const themeLabel = theme === 'dark' ? 'Light theme' : 'Dark theme';

  const handleExportPng = async () => {
    try {
      await exportToPng(exportFilename(projectName));
      toast({ message: 'PNG downloaded', tone: 'ok' });
    } catch {
      toast({ message: 'Export failed', tone: 'danger' });
    }
  };

  const handleExportSvg = async () => {
    try {
      await exportToSvg(exportFilename(projectName));
      toast({ message: 'SVG downloaded', tone: 'ok' });
    } catch {
      toast({ message: 'Export failed', tone: 'danger' });
    }
  };

  const handleExportJson = () => {
    try {
      const { nodes, edges } = useCanvasStore.getState();
      exportToJson(nodes, edges, exportFilename(projectName));
      toast({ message: 'JSON downloaded', tone: 'ok' });
    } catch {
      toast({ message: 'Export failed', tone: 'danger' });
    }
  };

  const handleExportMermaid = () => {
    try {
      const { nodes, edges } = useCanvasStore.getState();
      const code = exportToMermaid(nodes, edges);
      downloadFile(`${exportFilename(projectName)}.mmd`, code);
      toast({ message: 'Mermaid downloaded', tone: 'ok' });
    } catch {
      toast({ message: 'Export failed', tone: 'danger' });
    }
  };

  const handleCopyShareLink = async () => {
    const { nodes, edges } = useCanvasStore.getState();
    const url = nodes.length > 0 ? encodeCanvasToUrl(nodes, edges) : (typeof window !== 'undefined' ? window.location.href : '');
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: 'Share link copied to clipboard', tone: 'ok' });
    } catch {
      toast({ message: "Couldn't copy link", tone: 'danger' });
    }
  };

  const handleCopyCanvasImage = async () => {
    try {
      await copyPngToClipboard();
      toast({ message: 'Diagram image copied to clipboard', tone: 'ok' });
    } catch {
      toast({ message: "Couldn't copy image to clipboard", tone: 'danger' });
    }
  };

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2 bg-bg px-4">
      <SimpleTooltip label="Projects">
        <Button variant="icon" asChild>
          <Link href="/" aria-label="Back to projects">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
      </SimpleTooltip>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
        {!narrow && (
          <>
            <Link
              href="/"
              className="rounded-[6px] text-[13.5px] whitespace-nowrap text-ink-3 transition-colors duration-[120ms] hover:text-ink"
            >
              Projects
            </Link>
            <ChevronRight className="size-[13px] shrink-0 text-ink-3" aria-hidden />
          </>
        )}
        {projectName !== undefined && <ProjectName key={projectName} projectId={projectId} name={projectName} />}
      </nav>

      <span
        className="ml-2 inline-flex shrink-0 items-center gap-[5px] text-[12px] whitespace-nowrap text-ink-3"
        role="status"
        aria-live="polite"
        title={narrow ? STATUS[status].label : undefined}
      >
        <span className={cn('size-1.5 rounded-full', STATUS[status].dot)} />
        {narrow ? <span className="sr-only">{STATUS[status].label}</span> : STATUS[status].label}
      </span>

      {/* ── TOP-RIGHT ACTION BUTTONS: PRESENT, EXPORT, SHARE, THEME ── */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {/* 1. Present (Play Icon) */}
        <SimpleTooltip label="Present" keys={getShortcutKeys('present')}>
          <button
            type="button"
            onClick={startPresentation}
            disabled={!hasComponents}
            aria-label="Present"
            className={cn(
              'group relative flex size-8 items-center justify-center rounded-[8px] border border-line/70 bg-card/60 backdrop-blur-xs text-ink-2 shadow-2xs transition-all duration-150',
              'hover:-translate-y-0.5 hover:border-line-hover hover:bg-surface-2 hover:text-ink hover:shadow-xs active:translate-y-0 active:scale-95 cursor-pointer',
              'disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none'
            )}
          >
            <Play className="size-3.5 fill-current/20 stroke-[2.2] translate-x-[0.5px] transition-transform duration-150 group-hover:scale-110" />
          </button>
        </SimpleTooltip>

        {/* 2. Download / Export (Submenu for export formats) */}
        <DropdownMenu>
          <SimpleTooltip label="Export">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Export options"
                className={cn(
                  'group relative flex size-8 items-center justify-center rounded-[8px] border border-line/70 bg-card/60 backdrop-blur-xs text-ink-2 shadow-2xs transition-all duration-150',
                  'hover:-translate-y-0.5 hover:border-line-hover hover:bg-surface-2 hover:text-ink hover:shadow-xs active:translate-y-0 active:scale-95 cursor-pointer',
                  'data-[state=open]:border-accent/40 data-[state=open]:bg-surface-2 data-[state=open]:text-ink data-[state=open]:shadow-xs'
                )}
              >
                <Download className="size-3.5 stroke-[2] transition-transform duration-150 group-hover:scale-110" />
              </button>
            </DropdownMenuTrigger>
          </SimpleTooltip>
          <DropdownMenuContent align="end" className="w-[190px]">
            <DropdownMenuLabel>Export Formats</DropdownMenuLabel>
            <DropdownMenuItem onSelect={handleExportPng} className="cursor-pointer">
              <ImageIcon className="size-3.5 mr-2 text-ink-2" />
              PNG image
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleExportSvg} className="cursor-pointer">
              <FileCode className="size-3.5 mr-2 text-ink-2" />
              SVG vector
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleExportJson} className="cursor-pointer">
              <FileJson className="size-3.5 mr-2 text-ink-2" />
              JSON data
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleExportMermaid} className="cursor-pointer">
              <Workflow className="size-3.5 mr-2 text-ink-2" />
              Mermaid diagram
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setExportOpen(true)} className="cursor-pointer">
              <Settings2 className="size-3.5 mr-2 text-ink-2" />
              Customize & export…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 3. Share (Share menu) */}
        <DropdownMenu>
          <SimpleTooltip label="Share">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Share options"
                className={cn(
                  'group relative flex h-8 px-3 items-center justify-center rounded-full border border-[#818cf8]/40 bg-[#818cf8]/20 text-[#a5b4fc] shadow-2xs transition-all duration-150',
                  'hover:-translate-y-0.5 hover:border-[#818cf8]/60 hover:bg-[#818cf8]/30 hover:text-white hover:shadow-xs active:translate-y-0 active:scale-95 cursor-pointer',
                  'data-[state=open]:border-[#818cf8] data-[state=open]:bg-[#818cf8]/35 data-[state=open]:text-white data-[state=open]:shadow-xs'
                )}
              >
                <Share2 className="size-3.5 stroke-[2.2] transition-transform duration-150 group-hover:scale-110" />
              </button>
            </DropdownMenuTrigger>
          </SimpleTooltip>
          <DropdownMenuContent align="end" className="w-[205px]">
            <DropdownMenuLabel>Share Canvas</DropdownMenuLabel>
            <DropdownMenuItem onSelect={handleCopyShareLink} className="cursor-pointer">
              <LinkIcon className="size-3.5 mr-2 text-ink-2" />
              Copy share link
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleCopyCanvasImage} className="cursor-pointer">
              <Copy className="size-3.5 mr-2 text-ink-2" />
              Copy diagram image
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setShareOpen(true)} className="cursor-pointer">
              <Share2 className="size-3.5 mr-2 text-ink-2" />
              Share snapshot dialog…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 4. Theme Toggle */}
        <SimpleTooltip label={themeLabel}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={themeLabel}
            className={cn(
              'group relative flex size-8 items-center justify-center rounded-[8px] border border-line/70 bg-card/60 backdrop-blur-xs text-ink-2 shadow-2xs transition-all duration-150 ml-0.5',
              'hover:-translate-y-0.5 hover:border-line-hover hover:bg-surface-2 hover:text-ink hover:shadow-xs active:translate-y-0 active:scale-95 cursor-pointer'
            )}
          >
            <ThemeIcon className="size-3.5 stroke-[2] transition-transform duration-200 group-hover:rotate-45 group-hover:scale-110" />
          </button>
        </SimpleTooltip>
      </div>
    </header>
  );
}
