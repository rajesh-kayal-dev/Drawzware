'use client';

import { useState } from 'react';
import {
  Menu,
  FolderOpen,
  FileDown,
  Download,
  Play,
  RotateCcw,
  LogIn,
  LogOut,
  UserPen,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { SimpleTooltip } from '@/shared/components/ui/tooltip';
import { useSettingsStore, type CanvasBackground, type ThemePreference } from '@/features/settings/stores/useSettingsStore';
import { useTheme } from '@/shared/hooks/useTheme';
import { useCollaborationStore } from '@/features/collaboration/stores/useCollaborationStore';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { useProjectStore } from '@/features/projects/stores/useProjectStore';
import { exportToPng, exportToSvg, exportToJson, exportFilename } from '@/features/import-export/utils/export';
import { openDrawzProject, saveAsDrawzProject } from '@/features/projects/utils/file-operations';
import { downloadFile, cn } from '@/shared/utils/utils';
import { toast } from '@/stores/useToastStore';
import {
  formatCollaboratorName,
  getCollaboratorColor,
  getCollaboratorInitial,
} from '@/features/collaboration/utils/collaborator-helpers';
import { EditProfileModal } from '@/features/collaboration/components/EditProfileModal';
import type { Project } from '@drawzware/contracts';

interface CanvasMoreMenuProps {
  projectId: string;
  projectName?: string;
}

export function CanvasMoreMenu({ projectId, projectName }: CanvasMoreMenuProps) {
  const { preference, setPreference } = useTheme();
  const canvasBackground = useSettingsStore((s) => s.canvasBackground);
  const setCanvasBackground = useSettingsStore((s) => s.setCanvasBackground);

  const currentUser = useCollaborationStore((s) => s.currentUser);
  const setAuthModalOpen = useCollaborationStore((s) => s.setAuthModalOpen);
  const signOut = useCollaborationStore((s) => s.signOut);

  const startPresentation = useCanvasStore((s) => s.startPresentation);
  const setExportOpen = useCanvasStore((s) => s.setExportOpen);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [isExportingDrawz, setIsExportingDrawz] = useState(false);
  const [isOpeningDrawz, setIsOpeningDrawz] = useState(false);

  // 1. Export Handlers
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
      toast({ message: 'Saved as .drawz file', tone: 'ok' });
    } catch {
      toast({ message: 'Failed to save project', tone: 'danger' });
    } finally {
      setIsExportingDrawz(false);
    }
  };

  const handleOpenDrawz = async () => {
    if (isOpeningDrawz) return;
    setIsOpeningDrawz(true);
    try {
      const openedProject = await openDrawzProject();
      if (openedProject) {
        window.location.href = `/canvas?id=${encodeURIComponent(openedProject.id)}`;
        toast({ message: `Opened "${openedProject.name}"`, tone: 'ok' });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      toast({ message: 'Failed to open .drawz file', tone: 'danger' });
    } finally {
      setIsOpeningDrawz(false);
    }
  };

  const handleExportPng = async () => {
    try {
      await exportToPng(exportFilename(projectName));
      toast({ message: 'PNG image exported', tone: 'ok' });
    } catch {
      toast({ message: 'Export failed', tone: 'danger' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      message: 'Signed out successfully. Canvas is now in personal offline mode.',
      tone: 'neutral',
    });
  };

  const formattedName = currentUser ? formatCollaboratorName(currentUser.name, currentUser.email) : null;
  const userInitial = formattedName ? getCollaboratorInitial(formattedName, currentUser?.email) : null;
  const userColor = currentUser ? getCollaboratorColor(currentUser.id || currentUser.email) : '#6366f1';
  const isVerified = Boolean(currentUser?.isEmailVerified);

  return (
    <>
      <EditProfileModal open={editProfileOpen} onOpenChange={setEditProfileOpen} />

      <DropdownMenu>
        <SimpleTooltip label="Menu">
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Canvas menu"
              className={cn(
                'group relative flex size-8 items-center justify-center rounded-[9px] border border-line/70 bg-card/60 backdrop-blur-xs text-ink-2 shadow-2xs transition-all duration-150',
                'hover:-translate-y-0.5 hover:border-line-hover hover:bg-surface-2 hover:text-ink hover:shadow-xs active:translate-y-0 active:scale-95 cursor-pointer',
                'data-[state=open]:border-accent data-[state=open]:bg-surface-2 data-[state=open]:text-ink'
              )}
            >
              <Menu className="size-4 stroke-[2.2] transition-transform duration-150 group-hover:scale-110" />
            </button>
          </DropdownMenuTrigger>
        </SimpleTooltip>

        <DropdownMenuContent align="end" className="w-[260px] p-2 space-y-1 rounded-2xl border border-line bg-card/95 shadow-2xl backdrop-blur-md">
          {/* 1. Account Section */}
          {!currentUser ? (
            <div className="p-1 pb-2">
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 h-9 px-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold text-[13px] shadow-sm transition-all cursor-pointer"
              >
                <LogIn className="size-4" />
                <span>Sign in</span>
              </button>
              <p className="mt-1 text-[10.5px] text-center text-ink-3">
                Sign in to save to cloud & collaborate
              </p>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-surface-2/60 border border-line/60 space-y-2 mb-1">
              <div className="flex items-center gap-2.5">
                <span
                  style={{ backgroundColor: userColor }}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-2xs"
                >
                  {userInitial}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink leading-tight">
                    {formattedName}
                  </span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {currentUser.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-line/50 text-[11px]">
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(true)}
                  className="flex items-center gap-1.5 text-accent hover:underline font-medium cursor-pointer"
                >
                  <UserPen className="size-3" />
                  <span>Edit profile</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-destructive hover:underline font-medium cursor-pointer"
                >
                  <LogOut className="size-3" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}

          <DropdownMenuSeparator className="my-1" />

          {/* 2. File & Action Commands */}
          <DropdownMenuItem
            onSelect={handleOpenDrawz}
            disabled={isOpeningDrawz}
            className="cursor-pointer flex items-center justify-between px-2.5 py-1.5 text-[12.5px] font-medium text-ink rounded-lg hover:bg-surface-2"
          >
            <span className="flex items-center gap-2">
              <FolderOpen className="size-3.5 text-ink-2" />
              Open file…
            </span>
            <span className="text-[10px] text-ink-3 font-mono">Ctrl+O</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={handleSaveAsDrawz}
            disabled={isExportingDrawz}
            className="cursor-pointer flex items-center justify-between px-2.5 py-1.5 text-[12.5px] font-medium text-ink rounded-lg hover:bg-surface-2"
          >
            <span className="flex items-center gap-2">
              <FileDown className="size-3.5 text-ink-2" />
              Save As .drawz…
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => setExportOpen(true)}
            className="cursor-pointer flex items-center justify-between px-2.5 py-1.5 text-[12.5px] font-medium text-ink rounded-lg hover:bg-surface-2"
          >
            <span className="flex items-center gap-2">
              <Download className="size-3.5 text-ink-2" />
              Export image…
            </span>
            <span className="text-[10px] text-ink-3 font-mono">Ctrl+Shift+E</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={startPresentation}
            className="cursor-pointer flex items-center gap-2 px-2.5 py-1.5 text-[12.5px] font-medium text-ink rounded-lg hover:bg-surface-2"
          >
            <Play className="size-3.5 text-ink-2" />
            <span>Presentation mode</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1" />

          {/* 3. Theme Preferences (Segmented 3-Way Control matching reference image) */}
          <div className="px-2.5 py-1.5 space-y-1.5" onPointerDown={(e) => e.stopPropagation()}>
            <span className="text-[11px] font-medium text-ink-2 block">Theme</span>
            <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-surface-2 border border-line">
              <button
                type="button"
                onClick={() => setPreference('light')}
                title="Light theme"
                className={cn(
                  'flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                  preference === 'light'
                    ? 'bg-[#6366f1] text-white shadow-xs'
                    : 'text-ink-3 hover:text-ink'
                )}
              >
                <Sun className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreference('dark')}
                title="Dark theme"
                className={cn(
                  'flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                  preference === 'dark'
                    ? 'bg-[#6366f1] text-white shadow-xs'
                    : 'text-ink-3 hover:text-ink'
                )}
              >
                <Moon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreference('system')}
                title="System theme"
                className={cn(
                  'flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                  preference === 'system'
                    ? 'bg-[#6366f1] text-white shadow-xs'
                    : 'text-ink-3 hover:text-ink'
                )}
              >
                <Monitor className="size-3.5" />
              </button>
            </div>
          </div>

          {/* 4. Canvas Background Swatches (Row matching reference image) */}
          <div className="px-2.5 py-1.5 space-y-1.5" onPointerDown={(e) => e.stopPropagation()}>
            <span className="text-[11px] font-medium text-ink-2 block">Canvas background</span>
            <div className="flex items-center gap-1.5">
              {/* Dots */}
              <button
                type="button"
                onClick={() => setCanvasBackground('dots')}
                title="Dotted canvas"
                className={cn(
                  'size-7 rounded-[8px] border transition-all cursor-pointer flex items-center justify-center text-[10px] font-bold',
                  canvasBackground === 'dots'
                    ? 'ring-2 ring-accent border-accent scale-105 bg-surface-2 text-accent'
                    : 'border-line/70 bg-card/60 text-ink-3 hover:border-line-hover'
                )}
              >
                :::
              </button>

              {/* Grid */}
              <button
                type="button"
                onClick={() => setCanvasBackground('grid')}
                title="Grid lines"
                className={cn(
                  'size-7 rounded-[8px] border transition-all cursor-pointer flex items-center justify-center text-[11px] font-bold',
                  canvasBackground === 'grid'
                    ? 'ring-2 ring-accent border-accent scale-105 bg-surface-2 text-accent'
                    : 'border-line/70 bg-card/60 text-ink-3 hover:border-line-hover'
                )}
              >
                #
              </button>

              {/* White */}
              <button
                type="button"
                onClick={() => setCanvasBackground('white')}
                title="Plain white"
                className={cn(
                  'size-7 rounded-[8px] border transition-all cursor-pointer bg-white',
                  canvasBackground === 'white'
                    ? 'ring-2 ring-accent border-accent scale-105'
                    : 'border-zinc-300 dark:border-zinc-700 hover:scale-102'
                )}
              />

              {/* Neutral */}
              <button
                type="button"
                onClick={() => setCanvasBackground('neutral')}
                title="Neutral"
                className={cn(
                  'size-7 rounded-[8px] border transition-all cursor-pointer bg-[#fcfbf9] dark:bg-[#1f232d]',
                  canvasBackground === 'neutral'
                    ? 'ring-2 ring-accent border-accent scale-105'
                    : 'border-line/70 hover:scale-102'
                )}
              />

              {/* Dark */}
              <button
                type="button"
                onClick={() => setCanvasBackground('dark')}
                title="Plain dark"
                className={cn(
                  'size-7 rounded-[8px] border transition-all cursor-pointer bg-[#12141c]',
                  canvasBackground === 'dark'
                    ? 'ring-2 ring-accent border-accent scale-105'
                    : 'border-zinc-800 hover:scale-102'
                )}
              />
            </div>
          </div>

          <DropdownMenuSeparator className="my-1" />

          {/* 5. Canvas Reset */}
          <DropdownMenuItem
            onSelect={() => {
              if (window.confirm('Are you sure you want to reset the canvas? All unsaved nodes will be cleared.')) {
                clearCanvas();
                toast({ message: 'Canvas reset', tone: 'neutral' });
              }
            }}
            className="cursor-pointer flex items-center gap-2 px-2.5 py-1.5 text-[12px] font-medium text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset the canvas</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
