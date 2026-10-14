'use client';

import { useState, type ReactElement, type ReactNode } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import {
  ChevronDown,
  Container,
  Eraser,
  FileJson,
  LayoutDashboard,
  Lock,
  LockOpen,
  Minus,
  MoreHorizontal,
  MousePointerSquareDashed,
  Pencil,
  Plus,
  Redo2,
  SquareDashed,
  StickyNote,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { useIsNarrow } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/stores/useToastStore';
import { importFromJson } from '@/lib/export';
import { importDockerCompose } from '@/lib/docker-compose';
import { getLayoutedElements } from '@/lib/auto-layout';
import { getShortcutKeys } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';
import type { SystemEdge, SystemNode } from '@/types';
import { BRUSH_COLORS } from '@/types';
import { AddComponentSubmenus } from './AddComponentMenu';
import { getFitViewOptions, shortcutLabel, useAddNodeAtCenter } from './canvas-helpers';
import { ContextualDrawingToolbar } from './ContextualDrawingToolbar';

const COARSE_HIT = '[@media(pointer:coarse)]:size-11';

function Divider() {
  return <div aria-hidden className="mx-1.5 h-[18px] w-px shrink-0 bg-line" />;
}

/** Icon button inside the pill. Disabled keeps its tooltip: opacity .35 + not-allowed. */
function ToolbarIconButton({
  label,
  keys,
  onClick,
  disabled,
  children,
  className,
}: {
  label: string;
  keys?: string[];
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <SimpleTooltip label={label} keys={keys} side="top">
      <Button
        variant="icon"
        size="icon-toolbar"
        aria-label={label}
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onClick}
        className={cn(disabled && 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-ink-2', className)}
      >
        {children}
      </Button>
    </SimpleTooltip>
  );
}

function useToolbarActions() {
  const { fitView } = useReactFlow();

  const refit = () => requestAnimationFrame(() => fitView(getFitViewOptions(300)));

  const autoLayout = () => {
    const { nodes, edges, pushHistory, setNodes, setEdges } = useCanvasStore.getState();
    if (nodes.length === 0) return;
    pushHistory();
    const layouted = getLayoutedElements(nodes, edges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    refit();
  };

  const runImport = async (
    kind: string,
    read: () => Promise<{ nodes: SystemNode[]; edges: SystemEdge[] }>
  ) => {
    try {
      const imported = await read();
      const { pushHistory, setNodes, setEdges } = useCanvasStore.getState();
      pushHistory();
      setNodes(imported.nodes);
      setEdges(imported.edges);
      refit();
    } catch (err) {
      if (err instanceof Error && err.message === 'No file selected') return;
      const detail = err instanceof Error ? err.message : String(err);
      toast({
        message: `Couldn't read ${kind}`,
        tone: 'danger',
        action: { label: 'Details', onClick: () => toast({ message: detail, tone: 'danger' }) },
      });
    }
  };

  return {
    autoLayout,
    importJson: () => runImport('JSON', importFromJson),
    importCompose: () => runImport('docker-compose.yml', importDockerCompose),
  };
}

function MoreMenu({
  narrow,
  trigger,
  onAddNote,
  onAutoLayout,
  onImportJson,
  onImportCompose,
  onClear,
}: {
  narrow: boolean;
  trigger: ReactElement;
  onAddNote: () => void;
  onAutoLayout: () => void;
  onImportJson: () => void;
  onImportCompose: () => void;
  onClear: () => void;
}) {
  const hasNodes = useCanvasStore((s) => s.nodes.length > 0);
  const canUndo = useCanvasStore((s) => s.historyIndex > 0);
  const canRedo = useCanvasStore((s) => s.historyIndex < s.history.length - 1);
  const selectedCount = useCanvasStore((s) => s.nodes.reduce((n, node) => n + (node.selected ? 1 : 0), 0));
  const allLocked = useCanvasStore((s) => {
    const selected = s.nodes.filter((n) => n.selected);
    return selected.length > 0 && selected.every((n) => n.draggable === false);
  });

  const withStore = (fn: (s: ReturnType<typeof useCanvasStore.getState>) => void) => () => fn(useCanvasStore.getState());

  return (
    <DropdownMenu modal={false}>
      <SimpleTooltip label="More" side="top">
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      </SimpleTooltip>
      <DropdownMenuContent side={narrow ? 'bottom' : 'top'} align="end" sideOffset={10} className="w-[220px]">
        {narrow && (
          <>
            <DropdownMenuItem onSelect={onAddNote}>
              <StickyNote />
              Add note
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onAutoLayout} disabled={!hasNodes}>
              <LayoutDashboard />
              Auto layout
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={withStore((s) => s.undo())} disabled={!canUndo}>
              <Undo2 />
              Undo
              <DropdownMenuShortcut>{shortcutLabel('undo')}</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={withStore((s) => s.redo())} disabled={!canRedo}>
              <Redo2 />
              Redo
              <DropdownMenuShortcut>{shortcutLabel('redo')}</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={withStore((s) => s.selectAll())} disabled={!hasNodes}>
          <MousePointerSquareDashed />
          Select all
          <DropdownMenuShortcut>{shortcutLabel('select-all')}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={withStore((s) => s.groupSelection())} disabled={selectedCount === 0}>
          <SquareDashed />
          Group selection
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={withStore((s) => s.toggleLock(s.nodes.filter((n) => n.selected).map((n) => n.id)))}
          disabled={selectedCount === 0}
        >
          {allLocked ? <LockOpen /> : <Lock />}
          {allLocked ? 'Unlock selection' : 'Lock selection'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onImportJson}>
          <FileJson />
          Import JSON
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onImportCompose}>
          <Container />
          Import docker-compose
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onClear} disabled={!hasNodes}>
          <Trash2 />
          Clear canvas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClearCanvasDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Clear canvas?</DialogTitle>
        </DialogHeader>
        <DialogBody className="pt-1.5">
          <DialogDescription className="mt-0 text-[13px]">
            Removes every component and connection. You can undo this.
          </DialogDescription>
        </DialogBody>
        <DialogFooter className="justify-end border-t-0 pt-0">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="danger-solid"
            onClick={() => {
              clearCanvas();
              onOpenChange(false);
            }}
          >
            Clear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PENCIL_SIZE_PRESETS = [
  { label: 'Small', value: 1.5, dotSize: 3.5 },
  { label: 'Medium', value: 2.5, dotSize: 5.5 },
  { label: 'Large', value: 5, dotSize: 9 },
  { label: 'Extra Large', value: 8, dotSize: 13 },
] as const;

const ERASER_SIZE_PRESETS = [
  { label: 'Small', value: 10, dotSize: 3.5 },
  { label: 'Medium', value: 18, dotSize: 5.5 },
  { label: 'Large', value: 28, dotSize: 9 },
  { label: 'Extra Large', value: 42, dotSize: 13 },
] as const;

function DrawingToolbar() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const brushColor = useCanvasStore((s) => s.brushColor);
  const setBrushColor = useCanvasStore((s) => s.setBrushColor);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);
  const setStrokeWidth = useCanvasStore((s) => s.setStrokeWidth);
  const eraserRadius = useCanvasStore((s) => s.eraserRadius);
  const setEraserRadius = useCanvasStore((s) => s.setEraserRadius);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const canUndo = useCanvasStore((s) => s.historyIndex >= 0);
  const canRedo = useCanvasStore((s) => s.historyIndex < s.history.length - 1);

  const isPencil = activeTool === 'pencil';
  const presets = isPencil ? PENCIL_SIZE_PRESETS : ERASER_SIZE_PRESETS;

  // Active preset index
  const activePresetIndex = isPencil
    ? strokeWidth <= 1.8
      ? 0
      : strokeWidth <= 3.5
      ? 1
      : strokeWidth <= 6.5
      ? 2
      : 3
    : eraserRadius <= 14
    ? 0
    : eraserRadius <= 23
    ? 1
    : eraserRadius <= 35
    ? 2
    : 3;

  return (
    <div
      role="toolbar"
      aria-label="Drawing toolbar"
      className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-line bg-paper/95 p-1.5 text-text shadow-[var(--shadow-xl)] backdrop-blur-md whitespace-nowrap cursor-default"
    >
      {/* 1. Pencil button */}
      <SimpleTooltip label="Draw Tab" keys={['Tab']} side="top">
        <button
          type="button"
          onClick={() => setActiveTool('pencil')}
          aria-label="Draw Tab"
          className={cn(
            'flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer',
            isPencil
              ? 'bg-surface-2 text-text font-semibold shadow-2xs ring-1 ring-line-hover'
              : 'text-text-muted hover:bg-surface-2 hover:text-text'
          )}
        >
          <Pencil className="size-[15px]" />
        </button>
      </SimpleTooltip>

      {/* 2. Eraser button */}
      <SimpleTooltip label="Erase Tab" keys={['Tab']} side="top">
        <button
          type="button"
          onClick={() => setActiveTool('eraser')}
          aria-label="Erase Tab"
          className={cn(
            'flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer',
            activeTool === 'eraser'
              ? 'bg-surface-2 text-text font-semibold shadow-2xs ring-1 ring-line-hover'
              : 'text-text-muted hover:bg-surface-2 hover:text-text'
          )}
        >
          <Eraser className="size-[15px]" />
        </button>
      </SimpleTooltip>

      {/* 3. Color dropdown with current preview (shown when pencil is active) */}
      {isPencil && (
        <Popover>
          <SimpleTooltip label="Color" side="top">
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Color"
                className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-text-muted transition-colors hover:bg-surface-2 hover:text-text cursor-pointer"
              >
                <span
                  className="size-3.5 rounded-full border border-line-hover shadow-xs"
                  style={{
                    backgroundColor: brushColor === 'var(--ink)' ? 'var(--ink)' : brushColor,
                  }}
                />
                <ChevronDown className="size-3 text-text-muted" />
              </button>
            </PopoverTrigger>
          </SimpleTooltip>
          <PopoverContent
            side="top"
            align="center"
            sideOffset={12}
            className="w-auto border border-line bg-paper p-3 text-text shadow-[var(--shadow-xl)] backdrop-blur-md rounded-xl"
          >
            <div className="grid grid-cols-5 gap-2">
              {BRUSH_COLORS.map((c) => {
                const isSelected =
                  brushColor === c.value ||
                  (c.name === 'Black' && (brushColor === '#000000' || brushColor === 'var(--ink)')) ||
                  (c.name === 'White' && brushColor === '#ffffff');
                return (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    onClick={() => setBrushColor(c.value)}
                    className={cn(
                      'relative flex size-6 items-center justify-center rounded-md transition-transform hover:scale-110 cursor-pointer border border-line/60',
                      isSelected && 'ring-2 ring-accent ring-offset-2 ring-offset-paper'
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                );
              })}
              {/* Rainbow / Custom color picker swatch */}
              <label
                className="relative flex size-6 cursor-pointer items-center justify-center rounded-md bg-[conic-gradient(at_center,_red,_orange,_yellow,_green,_blue,_purple,_red)] shadow-xs transition-transform hover:scale-110 border border-line/60"
                title="Custom Color"
              >
                <input
                  type="color"
                  value={brushColor.startsWith('#') ? brushColor : '#ffffff'}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* 4. Four quick size presets: Small, Medium, Large, Extra Large */}
      <div className="flex items-center gap-0.5">
        {presets.map((preset, index) => {
          const isActive = index === activePresetIndex;
          return (
            <SimpleTooltip key={preset.label} label={preset.label} side="top">
              <button
                type="button"
                onClick={() => {
                  if (isPencil) setStrokeWidth(preset.value);
                  else setEraserRadius(preset.value);
                }}
                aria-label={preset.label}
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer',
                  isActive
                    ? 'bg-surface-2 text-text font-semibold shadow-2xs ring-1 ring-line-hover'
                    : 'text-text-muted hover:bg-surface-2 hover:text-text'
                )}
              >
                <span
                  className={cn(
                    'rounded-full transition-colors',
                    isActive ? 'bg-text' : 'bg-text-muted/60'
                  )}
                  style={{
                    width: preset.dotSize,
                    height: preset.dotSize,
                  }}
                />
              </button>
            </SimpleTooltip>
          );
        })}
      </div>

      {/* Vertical divider */}
      <div aria-hidden className="mx-1 h-4 w-px bg-line" />

      {/* 5. Three-dot More menu */}
      <DropdownMenu>
        <SimpleTooltip label="Drawing options" side="top">
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Drawing options"
              className="flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text cursor-pointer"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
        </SimpleTooltip>
        <DropdownMenuContent
          side="top"
          align="end"
          sideOffset={12}
          className="w-56 border border-line bg-paper p-2 text-text shadow-[var(--shadow-xl)] backdrop-blur-md rounded-xl"
        >
          {isPencil ? (
            <div className="px-2 py-1.5">
              <div className="flex items-center justify-between pb-1 text-[11px] font-medium text-text-muted">
                <span>Stroke Width</span>
                <span className="font-mono text-text">{strokeWidth}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="16"
                step="0.5"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="my-1.5 h-1.5 w-full cursor-pointer accent-accent"
              />
            </div>
          ) : (
            <div className="px-2 py-1.5">
              <div className="flex items-center justify-between pb-1 text-[11px] font-medium text-text-muted">
                <span>Eraser Size</span>
                <span className="font-mono text-text">{eraserRadius * 2}px</span>
              </div>
              <input
                type="range"
                min="6"
                max="48"
                step="2"
                value={eraserRadius}
                onChange={(e) => setEraserRadius(Number(e.target.value))}
                className="my-1.5 h-1.5 w-full cursor-pointer accent-accent"
              />
            </div>
          )}

          <DropdownMenuSeparator className="my-1.5 bg-line" />

          <DropdownMenuItem
            onClick={() => setActiveTool('select')}
            className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-text hover:bg-surface-2 hover:text-text"
          >
            <span>Exit drawing mode</span>
            <DropdownMenuShortcut className="text-text-muted">Esc</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setActiveTool('hand')}
            className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-text hover:bg-surface-2 hover:text-text"
          >
            <span>Hand (Pan) mode</span>
            <DropdownMenuShortcut className="text-text-muted">H</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1.5 bg-line" />

          <DropdownMenuItem
            onClick={undo}
            disabled={!canUndo}
            className={cn(
              'flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-text hover:bg-surface-2 hover:text-text',
              !canUndo && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-text'
            )}
          >
            <span>Undo</span>
            <DropdownMenuShortcut className="text-text-muted">Ctrl+Z</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={redo}
            disabled={!canRedo}
            className={cn(
              'flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-text hover:bg-surface-2 hover:text-text',
              !canRedo && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-text'
            )}
          >
            <span>Redo</span>
            <DropdownMenuShortcut className="text-text-muted">Ctrl+Y</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function CanvasToolbar() {
  const narrow = useIsNarrow();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const addAtCenter = useAddNodeAtCenter();
  const { autoLayout, importJson, importCompose } = useToolbarActions();
  const hasNodes = useCanvasStore((s) => s.nodes.length > 0);
  const canUndo = useCanvasStore((s) => s.historyIndex > 0);
  const canRedo = useCanvasStore((s) => s.historyIndex < s.history.length - 1);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const setLibraryCollapsed = useCanvasStore((s) => s.setLibraryCollapsed);
  const [clearOpen, setClearOpen] = useState(false);

  const zoomPct = `${Math.round(zoom * 100)}%`;
  const fit = () => fitView(getFitViewOptions(200));

  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);
  const nodes = useCanvasStore((s) => s.nodes);
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  const isShapeDrawingTool =
    activeTool === 'rectangle' ||
    activeTool === 'circle' ||
    activeTool === 'arrow' ||
    activeTool === 'line';

  // When Pencil or Eraser mode is active, show the compact drawing toolbar
  if (activeTool === 'pencil' || activeTool === 'eraser') {
    return <DrawingToolbar />;
  }

  // Contextual toolbar for shapes, lines, arrows, drawings, and edges
  if (
    activeTool !== 'hand' && (
      isShapeDrawingTool ||
      selectedNode?.type === 'shape' ||
      selectedNode?.type === 'drawing' ||
      (selectedEdgeId && activeTool === 'select')
    )
  ) {
    return <ContextualDrawingToolbar />;
  }

  const moreProps = {
    narrow,
    onAddNote: () => addAtCenter('note'),
    onAutoLayout: autoLayout,
    onImportJson: importJson,
    onImportCompose: importCompose,
    onClear: () => setClearOpen(true),
  };

  if (narrow) {
    return (
      <>
        <div
          role="toolbar"
          aria-label="Canvas toolbar"
          className="absolute top-3 right-3 z-10 flex items-center gap-0.5 rounded-full border border-line bg-paper p-1 whitespace-nowrap shadow-[var(--shadow-lg)]"
        >
          <Button
            variant="toolbar"
            size="icon"
            aria-label="Add component"
            onClick={() => setLibraryCollapsed(false)}
            className={COARSE_HIT}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            aria-label="Fit view"
            onClick={fit}
            className="h-8 px-2 text-[12px] font-normal tabular-nums [@media(pointer:coarse)]:h-11"
          >
            {zoomPct}
          </Button>
          <MoreMenu
            {...moreProps}
            trigger={
              <Button variant="icon" aria-label="More" className={COARSE_HIT}>
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
        </div>
        <ClearCanvasDialog open={clearOpen} onOpenChange={setClearOpen} />
      </>
    );
  }

  return (
    <>
      <div
        role="toolbar"
        aria-label="Canvas toolbar"
        className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-line bg-paper p-[5px] whitespace-nowrap shadow-[var(--shadow-lg)] cursor-default"
      >
        <DropdownMenu>
          <SimpleTooltip label="Add component" side="top">
            <DropdownMenuTrigger asChild>
              <Button variant="toolbar" size="toolbar">
                <Plus />
                Add
              </Button>
            </DropdownMenuTrigger>
          </SimpleTooltip>
          <DropdownMenuContent side="top" align="start" sideOffset={10} className="w-[200px]">
            <DropdownMenuItem onSelect={() => addAtCenter('note')}>
              <StickyNote />
              Note
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AddComponentSubmenus onAdd={addAtCenter} />
          </DropdownMenuContent>
        </DropdownMenu>


        <SimpleTooltip label="Text" keys={['T']} side="top">
          <Button
            variant="ghost"
            size="toolbar"
            onClick={() => setActiveTool(activeTool === 'text' ? 'select' : 'text')}
            className={cn(
              activeTool === 'text' &&
                'bg-accent/15 text-accent ring-1 ring-accent/30 font-semibold hover:bg-accent/20 hover:text-accent'
            )}
          >
            <Type />
            Text
          </Button>
        </SimpleTooltip>

        <Divider />

        <ToolbarIconButton label="Zoom out" onClick={() => zoomOut({ duration: 150 })}>
          <Minus />
        </ToolbarIconButton>
        <SimpleTooltip label="Fit view" keys={getShortcutKeys('fit-view')} side="top">
          <Button
            variant="ghost"
            size="toolbar"
            onClick={fit}
            className="min-w-[46px] px-2 text-[12.5px] font-normal tabular-nums"
          >
            {zoomPct}
          </Button>
        </SimpleTooltip>
        <ToolbarIconButton label="Zoom in" onClick={() => zoomIn({ duration: 150 })}>
          <Plus />
        </ToolbarIconButton>

        <Divider />

        <ToolbarIconButton label="Auto layout" onClick={autoLayout} disabled={!hasNodes}>
          <LayoutDashboard />
        </ToolbarIconButton>
        <ToolbarIconButton label="Undo" keys={getShortcutKeys('undo')} onClick={undo} disabled={!canUndo}>
          <Undo2 />
        </ToolbarIconButton>
        <ToolbarIconButton label="Redo" keys={getShortcutKeys('redo')} onClick={redo} disabled={!canRedo}>
          <Redo2 />
        </ToolbarIconButton>
        <MoreMenu
          {...moreProps}
          trigger={
            <Button variant="icon" size="icon-toolbar" aria-label="More">
              <MoreHorizontal />
            </Button>
          }
        />
      </div>
      <ClearCanvasDialog open={clearOpen} onOpenChange={setClearOpen} />
    </>
  );
}
