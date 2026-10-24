'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, ChevronDown, LayoutGrid, List, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn, plural } from '@/shared/utils/utils';
import { useProjectStore } from '@/features/projects/stores/useProjectStore';
import { toast } from '@/stores/useToastStore';
import type { Project } from '@/features/projects/types/project.types';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { ProjectCard, ProjectListItem } from './ProjectCard';
import { ProjectModal } from './ProjectModal';
import { TemplateStrip } from './TemplateStrip';
import { createFromTemplate } from '@/features/projects/utils/project-templates';
import { exportProjectFile } from '@/features/projects/utils/project-export';
import { canvasPath } from '@/shared/utils/routes';

type SortKey = 'edited' | 'name' | 'created';

const SORT_LABEL: Record<SortKey, string> = {
  edited: 'Last edited',
  name: 'Name',
  created: 'Created',
};

type ModalState = { mode: 'create'; name: string } | { mode: 'rename'; project: Project } | null;

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

function latest(project: Project) {
  return useProjectStore.getState().projects.find((p) => p.id === project.id) ?? project;
}

export function ProjectList() {
  const router = useRouter();
  const projects = useProjectStore((s) => s.projects);
  const loaded = useProjectStore((s) => s.loaded);
  const loading = useProjectStore((s) => s.loading);
  const error = useProjectStore((s) => s.error);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const createProject = useProjectStore((s) => s.createProject);
  const renameProject = useProjectStore((s) => s.renameProject);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('edited');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [modal, setModal] = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loaded && !loading) {
      loadProjects();
    }
  }, [loaded, loading, loadProjects]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target) || document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const q = query.trim();
  const visible = useMemo(() => {
    const needle = q.toLowerCase();
    const list = needle ? projects.filter((p) => p.name.toLowerCase().includes(needle)) : projects;
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'created') return b.createdAt.localeCompare(a.createdAt);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [projects, q, sort]);

  const openCreate = useCallback((name = '') => setModal({ mode: 'create', name }), []);
  const handleRename = useCallback((project: Project) => setModal({ mode: 'rename', project }), []);
  const handleDelete = useCallback((project: Project) => setDeleteTarget(latest(project)), []);

  const handleDuplicate = useCallback(async (project: Project) => {
    try {
      const copy = await useProjectStore.getState().duplicateProject(project.id);
      if (copy) toast({ message: `Duplicated “${project.name}”`, tone: 'ok' });
    } catch (err) {
      toast({ message: `Failed to duplicate: ${(err as Error).message}`, tone: 'danger' });
    }
  }, []);

  const handleExport = useCallback((project: Project) => {
    const filename = exportProjectFile(latest(project));
    toast({ message: `Exported ${filename}`, tone: 'ok' });
  }, []);

  const handleUseTemplate = useCallback(
    async (templateId: string) => {
      try {
        const project = await createFromTemplate(templateId);
        if (project) router.push(canvasPath(project.id));
      } catch (err) {
        toast({ message: `Failed to create from template: ${(err as Error).message}`, tone: 'danger' });
      }
    },
    [router]
  );

  const handleModalSubmit = async (name: string, description: string) => {
    if (modal?.mode === 'rename') {
      try {
        await renameProject(modal.project.id, name);
        setModal(null);
        toast({ message: `Renamed to “${name}”`, tone: 'ok' });
      } catch (err) {
        toast({ message: `Failed to rename: ${(err as Error).message}`, tone: 'danger' });
      }
      return;
    }
    try {
      const project = await createProject(name, description);
      setModal(null);
      router.push(canvasPath(project.id));
    } catch (err) {
      toast({ message: `Failed to create project: ${(err as Error).message}`, tone: 'danger' });
    }
  };

  const confirmDelete = async (project: Project) => {
    try {
      await useProjectStore.getState().deleteProject(project.id);
      setDeleteTarget(null);
      toast({
        message: `Deleted “${project.name}”`,
        icon: Trash2,
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await useProjectStore.getState().restoreProject(project);
            } catch (err) {
              toast({ message: `Failed to restore: ${(err as Error).message}`, tone: 'danger' });
            }
          },
        },
      });
    } catch (err) {
      toast({ message: `Failed to delete project: ${(err as Error).message}`, tone: 'danger' });
    }
  };

  return (
    <div className="space-y-10">
      {/* ── Main Hero Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">Projects</h1>
          <p className="mt-1 text-sm text-ink-2">Your diagrams, all in one place</p>
          {loaded && (
            <div className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-2 font-medium shadow-2xs">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{plural(projects.length, 'project')}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => openCreate()}
          className="inline-flex items-center gap-2 rounded-full bg-accent hover:opacity-90 px-5 py-2.5 text-sm font-medium text-accent-ink shadow-sm transition-all duration-150 cursor-pointer active:scale-95"
        >
          <Plus className="size-4 stroke-[2.5]" />
          <span>New project</span>
        </button>
      </div>

      {/* ── Error Banner with Retry ── */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 shrink-0 text-red-500" />
            <div>
              <p className="font-semibold text-ink">Failed to load projects</p>
              <p className="text-xs text-ink-2">{error}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadProjects()}
            className="cursor-pointer shrink-0"
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* ── Loading Skeletons ── */}
      {loading && !loaded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[250px] rounded-xl border border-line bg-paper/40" />
          ))}
        </div>
      )}

      {/* ── Start from a template ── */}
      {!loading && (
        <div>
          <TemplateStrip onSelect={handleUseTemplate} defaultExpanded={loaded && projects.length === 0} />
        </div>
      )}

      {/* ── Your Projects Section ── */}
      {loaded && !error && (
        <section aria-labelledby="your-projects-heading" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="your-projects-heading" className="text-base font-semibold text-ink tracking-tight">
              Your projects
            </h2>

            {/* Controls: Search, Sort, View mode */}
            <div className="flex items-center gap-2.5">
              {/* Search input */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-ink-3" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setQuery('');
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="Search projects…"
                  aria-label="Search projects"
                  className="h-8 w-44 sm:w-60 rounded-lg border border-line bg-paper pl-8 pr-3 text-xs text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </div>

              {/* Sort dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 text-xs font-medium text-ink-2 hover:border-ink-3 hover:text-ink transition-colors cursor-pointer"
                  >
                    <span>{SORT_LABEL[sort]}</span>
                    <ChevronDown className="size-3 text-ink-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-paper border-line text-ink min-w-[140px]">
                  {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                    <DropdownMenuItem
                      key={key}
                      onSelect={() => setSort(key)}
                      className="cursor-pointer text-xs"
                    >
                      {SORT_LABEL[key]}
                      <Check className={cn('ml-auto size-3.5 text-accent', key !== sort && 'invisible')} />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View toggle (Grid / List) */}
              <div className="flex items-center rounded-lg border border-line bg-paper p-0.5">
                <button
                  type="button"
                  aria-label="Grid view"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md transition-colors cursor-pointer',
                    viewMode === 'grid'
                      ? 'bg-line-2 text-ink shadow-2xs'
                      : 'text-ink-3 hover:text-ink'
                  )}
                >
                  <LayoutGrid className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md transition-colors cursor-pointer',
                    viewMode === 'list'
                      ? 'bg-line-2 text-ink shadow-2xs'
                      : 'text-ink-3 hover:text-ink'
                  )}
                >
                  <List className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Cards content */}
          {visible.length === 0 && q ? (
            <NoResults query={q} onCreate={() => openCreate(q)} />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {visible.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onRename={handleRename}
                  onDuplicate={handleDuplicate}
                  onExport={handleExport}
                  onDelete={handleDelete}
                />
              ))}
              {!q && <CreateNewProjectDashedCard onCreate={() => openCreate()} />}
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((project) => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  onRename={handleRename}
                  onDuplicate={handleDuplicate}
                  onExport={handleExport}
                  onDelete={handleDelete}
                />
              ))}
              {!q && (
                <button
                  type="button"
                  onClick={() => openCreate()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-xs font-medium text-ink-2 hover:border-ink-3 hover:text-ink transition-colors cursor-pointer bg-paper/30"
                >
                  <Plus className="size-3.5 text-accent" />
                  <span>Create a new project</span>
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* Modals */}
      <ProjectModal
        open={!!modal}
        onClose={() => setModal(null)}
        mode={modal?.mode ?? 'create'}
        defaultName={modal?.mode === 'rename' ? modal.project.name : modal?.name}
        onSubmit={handleModalSubmit}
        onUseTemplate={handleUseTemplate}
      />

      <DeleteProjectDialog
        project={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        onExport={handleExport}
      />
    </div>
  );
}

function CreateNewProjectDashedCard({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="group flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line hover:border-ink-3 bg-paper/20 hover:bg-paper/50 p-6 text-center transition-all duration-150 cursor-pointer"
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-accent/15 border border-accent/30 text-accent group-hover:scale-105 group-hover:bg-accent/25 transition-all">
        <Plus className="size-5 stroke-[2.5]" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-ink tracking-tight group-hover:text-accent transition-colors">
          Create a new project
        </h3>
        <p className="mt-1 text-xs text-ink-2 max-w-[220px] leading-relaxed">
          Start with a blank canvas or use a template to get going.
        </p>
      </div>
    </button>
  );
}

function NoResults({ query, onCreate }: { query: string; onCreate: () => void }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line p-6 text-center bg-paper/20">
      <span className="flex size-10 items-center justify-center rounded-xl bg-paper border border-line text-ink-3">
        <Search className="size-4" />
      </span>
      <div className="grid gap-1">
        <div className="text-sm font-semibold text-ink">Nothing for “{query}”</div>
        <div className="text-xs text-ink-2">Try another name, or create a project with it.</div>
      </div>
      <Button variant="secondary" onClick={onCreate} className="mt-2 text-xs">
        <span>Create “{query}”</span>
      </Button>
    </div>
  );
}
