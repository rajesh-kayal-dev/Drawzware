'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Download,
  FileCode,
  FileJson,
  FileText,
  FolderOpen,
  Home,
  ImageIcon,
  Moon,
  Play,
  Check,
  Grid,
  Settings2,
  Sun,
  Workflow,
} from 'lucide-react';
import { useCanvasStore, type SaveStatus } from '@/features/canvas/stores/useCanvasStore';
import { useProjectStore } from '@/features/projects/stores/useProjectStore';
import { useSettingsStore, type CanvasBackground } from '@/features/settings/stores/useSettingsStore';
import { toast } from '@/stores/useToastStore';
import {
  exportToPng,
  exportToSvg,
  exportToJson,
  exportFilename,
} from '@/features/import-export/utils/export';
import { exportToMermaid } from '@/features/import-export/utils/mermaid';
import { downloadFile } from '@/shared/utils/utils';
import { openDrawzProject, saveAsDrawzProject } from '@/features/projects/utils/file-operations';
import type { Project } from '@/features/projects/types/project.types';
import { useTheme } from '@/shared/hooks/useTheme';
import { useIsNarrow, useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useIsDesktop } from '@/shared/hooks/useIsDesktop';
import { Button } from '@/shared/components/ui/button';
import { SimpleTooltip } from '@/shared/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { getShortcutKeys } from '@/features/canvas/utils/shortcuts';
import { cn } from '@/shared/utils/utils';

import { useCollaborationStore } from '@/features/collaboration/stores/useCollaborationStore';
import { CollaborationHeaderActions } from '@/features/collaboration/components/CollaborationHeaderActions';
import { CanvasMoreMenu } from './CanvasMoreMenu';

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
    if (next && next !== name) {
      renameProject(projectId, next);
      if (typeof document !== 'undefined') {
        document.title = next;
      }
    } else if (typeof document !== 'undefined') {
      document.title = name;
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        aria-label="Project name"
        onChange={(e) => {
          setDraft(e.target.value);
          const val = e.target.value.trim();
          if (typeof document !== 'undefined') {
            document.title = val || 'Untitled Design';
          }
        }}
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
            if (typeof document !== 'undefined') {
              document.title = name;
            }
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

const BACKGROUND_OPTIONS: { id: CanvasBackground; label: string; desc: string }[] = [
  { id: 'dots', label: 'Dots', desc: 'Dotted canvas pattern' },
  { id: 'grid', label: 'Grid', desc: 'Square grid lines' },
  { id: 'white', label: 'White', desc: 'Plain white background' },
  { id: 'dark', label: 'Dark', desc: 'Plain dark background' },
  { id: 'neutral', label: 'Neutral', desc: 'Plain neutral background' },
];

export function CanvasHeader({ projectId, projectName }: { projectId: string; projectName?: string }) {
  useDocumentTitle(projectName ? projectName : undefined);
  const narrow = useIsNarrow();
  const { theme, toggleTheme } = useTheme();
  const status = useDisplayedSaveStatus();
  const hasComponents = useCanvasStore((s) => s.nodes.some((n) => n.type === 'system'));
  const startPresentation = useCanvasStore((s) => s.startPresentation);
  const setExportOpen = useCanvasStore((s) => s.setExportOpen);
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const themeLabel = theme === 'dark' ? 'Light theme' : 'Dark theme';

  const isPwa = useMediaQuery('(display-mode: standalone)');
  const isDesktop = useIsDesktop();
  const canvasBackground = useSettingsStore((s) => s.canvasBackground);
  const setCanvasBackground = useSettingsStore((s) => s.setCanvasBackground);
  const isLive = useCollaborationStore((s) => s.isLive);
  const isReadOnly = useCollaborationStore((s) => s.isReadOnly);
  const currentUser = useCollaborationStore((s) => s.currentUser);
  const setAuthModalOpen = useCollaborationStore((s) => s.setAuthModalOpen);

  useEffect(() => {
    if (projectName) {
      useCollaborationStore.getState().invitationData.projectName = projectName;
    }
  }, [projectName]);

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

  const [isExportingDrawz, setIsExportingDrawz] = useState(false);
  const [isOpeningDrawz, setIsOpeningDrawz] = useState(false);
  const router = useRouter();

  const handleSaveAsDrawz = async () => {
    if (isExportingDrawz) return;
    const currentProject = useProjectStore.getState().projects.find((p) => p.id === projectId);
    const { nodes, edges, viewport, diagramType, diagramData } = useCanvasStore.getState();
    const projectToSave: Project = currentProject
      ? { ...currentProject, nodes, edges, viewport, diagramType, diagramData }
      : {
          id: projectId,
          name: projectName || 'Untitled Design',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          nodes,
          edges,
          viewport,
          diagramType,
          diagramData,
        };

    setIsExportingDrawz(true);
    try {
      await saveAsDrawzProject(projectToSave);
    } finally {
      setIsExportingDrawz(false);
    }
  };

  const handleOpenDrawz = async () => {
    if (isOpeningDrawz) return;
    setIsOpeningDrawz(true);
    try {
      const opened = await openDrawzProject();
      if (opened) {
        router.push(`/canvas?id=${encodeURIComponent(opened.id)}`);
      }
    } finally {
      setIsOpeningDrawz(false);
    }
  };

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2 bg-bg px-4">
      {/* Home button — Only shown in standard browser; hidden in Electron desktop and PWA */}
      {!isDesktop && !isPwa && (
        <SimpleTooltip label="Home">
          <Button variant="icon" asChild>
            <Link href="/" aria-label="Go to homepage">
              <Home className="size-4" />
            </Link>
          </Button>
        </SimpleTooltip>
      )}

      <SimpleTooltip label="Projects">
        <Button variant="icon" asChild>
          <Link href="/app" aria-label="Back to projects">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
      </SimpleTooltip>

      <SimpleTooltip label="Open .drawz file">
        <Button
          variant="icon"
          onClick={handleOpenDrawz}
          disabled={isOpeningDrawz}
          aria-label="Open .drawz project"
        >
          <FolderOpen className="size-4" />
        </Button>
      </SimpleTooltip>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
        {!narrow && (
          <>
            <Link
              href="/app"
              className="rounded-[6px] text-[13.5px] whitespace-nowrap text-ink-3 transition-colors duration-[120ms] hover:text-ink"
            >
              Projects
            </Link>
            <ChevronRight className="size-[13px] shrink-0 text-ink-3" aria-hidden />
          </>
        )}
        {projectName !== undefined && <ProjectName key={projectName} projectId={projectId} name={projectName} />}
      </nav>

      {isLive ? (
        <span
          className={cn(
            'ml-2 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium shadow-2xs select-none',
            isReadOnly
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
              : 'bg-ok/10 border border-ok/30 text-ok'
          )}
          role="status"
          aria-live="polite"
        >
          <span className="relative flex size-2">
            {!isReadOnly && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-75" />
            )}
            <span
              className={cn(
                'relative inline-flex size-2 rounded-full',
                isReadOnly ? 'bg-amber-500' : 'bg-ok'
              )}
            />
          </span>
          <span>{isReadOnly ? 'View Only' : 'Live'}</span>
        </span>
      ) : (
        <span
          className="ml-2 inline-flex shrink-0 items-center gap-[5px] text-[12px] whitespace-nowrap text-ink-3"
          role="status"
          aria-live="polite"
          title={narrow ? STATUS[status].label : undefined}
        >
          <span className={cn('size-1.5 rounded-full', STATUS[status].dot)} />
          {narrow ? <span className="sr-only">{STATUS[status].label}</span> : STATUS[status].label}
        </span>
      )}

      {/* ── TOP-RIGHT ACTION BUTTONS: COLLABORATION ACTIONS & MORE MENU ── */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* Share & Collaboration Actions (Live Avatar Stack, Invite, Share Dropdown) */}
        <CollaborationHeaderActions onExportPng={handleExportPng} />

        {/* Excalidraw-Style 3-Dots / Main Menu (Preferences, Theme, Background, Save/Export, Profile/Sign in) */}
        <CanvasMoreMenu projectId={projectId} projectName={projectName} />
      </div>
    </header>
  );
}
