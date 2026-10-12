'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  Check,
  ChevronDown,
  Eraser,
  Hand,
  MousePointer2,
  PanelLeft,
  Pencil,
  Type,
  Milestone,
  Shapes as ShapesIcon,
  Search,
  Square,
  Circle,
  ArrowUpRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CATEGORY_ICONS,
  getNodesByCategory,
  type NodeCategory,
  type NodeTypeConfig,
} from '@/components/nodes/node-registry';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { useIsNarrow } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import { IconChip, Panel } from '@/components/ui/panel';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { getShortcutKeys } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';
import type { SystemNodeType, PlacementItem } from '@/types';
import { useAddNodeAtCenter } from './canvas-helpers';
import {
  SHAPE_LIBRARY_CATEGORIES,
  type ShapeLibraryItem,
  type ShapeCategoryGroup,
} from '@/lib/shapes-registry';
import {
  SYSTEM_DESIGN_STEPS,
  type SystemDesignStepConfig,
} from '@/lib/steps-registry';

export type LibraryTab = 'components' | 'shapes' | 'steps';

type CategoryGroup = ReturnType<typeof getNodesByCategory>[number];
const ALL_CATEGORIES = getNodesByCategory();

function matchesComponent(config: NodeTypeConfig, q: string) {
  return (
    config.label.toLowerCase().includes(q) ||
    config.defaultTechStack.some((t) => t.toLowerCase().includes(q)) ||
    config.suggestedTech.some((t) => t.toLowerCase().includes(q))
  );
}

function filterCategories(query: string): CategoryGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_CATEGORIES;
  return ALL_CATEGORIES.map(({ category, types }) => ({
    category,
    types: types.filter(({ config }) => matchesComponent(config, q)),
  })).filter((g) => g.types.length > 0);
}

function filterShapeGroups(query: string): ShapeCategoryGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return SHAPE_LIBRARY_CATEGORIES as ShapeCategoryGroup[];
  return SHAPE_LIBRARY_CATEGORIES.map((group) => ({
    category: group.category,
    items: group.items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    ),
  })).filter((g) => g.items.length > 0);
}

function filterSteps(query: string): SystemDesignStepConfig[] {
  const q = query.trim().toLowerCase();
  if (!q) return SYSTEM_DESIGN_STEPS as SystemDesignStepConfig[];
  return SYSTEM_DESIGN_STEPS.filter(
    (step) =>
      step.title.toLowerCase().includes(q) ||
      step.subtitle.toLowerCase().includes(q) ||
      step.defaultContent.toLowerCase().includes(q)
  );
}

function onDragStartComponent(event: DragEvent, nodeType: SystemNodeType) {
  event.dataTransfer.setData('application/reactflow-nodetype', nodeType);
  event.dataTransfer.effectAllowed = 'move';
}

function onDragStartPlacementItem(event: DragEvent, item: PlacementItem) {
  event.dataTransfer.setData('application/system-design-item', JSON.stringify(item));
  if (item.kind === 'component' && item.type) {
    event.dataTransfer.setData('application/reactflow-nodetype', item.type);
  } else if (item.kind === 'group') {
    event.dataTransfer.setData('application/reactflow-nodetype', 'group');
  }
  event.dataTransfer.effectAllowed = 'move';
}

function EmptySearch({ query, type }: { query: string; type: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <Search className="size-5 text-ink-3 mb-2 opacity-50" />
      <p className="text-[12.5px] font-medium text-ink-2">No {type} found</p>
      <p className="text-[11px] text-ink-3 mt-0.5">No match for &ldquo;{query.trim()}&rdquo;</p>
    </div>
  );
}

interface ScrollTarget {
  category: NodeCategory;
  nonce: number;
}

function ShapeMiniPreview({ item }: { item: ShapeLibraryItem }) {
  const Icon = item.icon;
  const stroke = 'currentColor';

  switch (item.shapeType) {
    case 'rectangle':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <rect x="2" y="4" width="16" height="12" rx="1.5" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'rounded-rectangle':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <rect x="2" y="4" width="16" height="12" rx="4" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'circle':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <circle cx="10" cy="10" r="7" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'ellipse':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <ellipse cx="10" cy="10" rx="8" ry="5.5" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'diamond':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <polygon points="10,2 18,10 10,18 2,10" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <polygon points="10,3 18,17 2,17" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case 'hexagon':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <polygon points="5.5,3 14.5,3 19,10 14.5,17 5.5,17 1,10" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case 'pill':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <rect x="2" y="5" width="16" height="10" rx="5" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'parallelogram':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <polygon points="5,4 18,4 15,16 2,16" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'document':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <path d="M3 4 h14 v9 c-3.5 0 -5.5 2 -7 2 s-3.5 -2 -7 -2 Z" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'callout':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <path d="M3 4 h14 v9 h-6 l-3 3 v-3 h-5 Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case 'divider':
    case 'line':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <line x1="2" y1="10" x2="18" y2="10" stroke={stroke} strokeWidth="1.8" />
        </svg>
      );
    case 'arrow':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <line x1="3" y1="10" x2="17" y2="10" stroke={stroke} strokeWidth="1.5" />
          <polyline points="12,5 17,10 12,15" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-2" fill="none">
          <polygon points="10,1 12.5,7 19,7 13.8,11.2 16,17.5 10,13.5 4,17.5 6.2,11.2 1,7 7.5,7" stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      );
    default:
      return <Icon className="size-4 shrink-0 text-ink-2" />;
  }
}

function SidebarDrawingToolsMenu({ size = 'toolbar' }: { size?: 'toolbar' | 'sm' }) {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  const onMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(true);
  };

  const onMouseLeave = () => {
    hoverTimer.current = setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  const isDrawing = activeTool === 'pencil' || activeTool === 'eraser';

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative flex items-center justify-center"
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <SimpleTooltip label="Drawing tools" keys={['D']} side="right">
          <DropdownMenuTrigger asChild>
            <Button
              variant="icon"
              size={size === 'toolbar' ? 'icon-toolbar' : 'icon-sm'}
              aria-label="Drawing tools"
              onClick={() => {
                if (isDrawing) {
                  setActiveTool('select');
                } else {
                  setActiveTool('pencil');
                }
              }}
              className={cn(
                'relative',
                isDrawing && 'bg-ink text-paper hover:bg-ink hover:text-paper'
              )}
            >
              {activeTool === 'eraser' ? (
                <Eraser className={size === 'sm' ? 'size-[15px]' : undefined} />
              ) : (
                <Pencil className={size === 'sm' ? 'size-[15px]' : undefined} />
              )}
              <span
                className={cn(
                  'absolute bottom-0.5 right-1 text-[8.5px] font-mono leading-none select-none pointer-events-none',
                  isDrawing ? 'text-paper/60' : 'text-ink-3'
                )}
              >
                D
              </span>
            </Button>
          </DropdownMenuTrigger>
        </SimpleTooltip>

        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-[150px] p-1.5"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <DropdownMenuItem
            onClick={() => {
              setActiveTool('pencil');
              setOpen(false);
            }}
            className={cn(
              'flex cursor-pointer items-center justify-between rounded-[7px] px-2 py-1.5 text-[12.5px]',
              activeTool === 'pencil'
                ? 'bg-line-2 font-medium text-ink'
                : 'text-ink-2 hover:text-ink'
            )}
          >
            <span className="flex items-center gap-2">
              <Pencil className="size-3.5 text-ink-2" />
              Pencil
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-ink-3">D</span>
              {activeTool === 'pencil' && <Check className="size-3.5 text-accent" />}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setActiveTool('eraser');
              setOpen(false);
            }}
            className={cn(
              'flex cursor-pointer items-center justify-between rounded-[7px] px-2 py-1.5 text-[12.5px]',
              activeTool === 'eraser'
                ? 'bg-line-2 font-medium text-ink'
                : 'text-ink-2 hover:text-ink'
            )}
          >
            <span className="flex items-center gap-2">
              <Eraser className="size-3.5 text-ink-2" />
              Eraser
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-ink-3">E</span>
              {activeTool === 'eraser' && <Check className="size-3.5 text-accent" />}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function LibraryPanel({
  activeTab,
  onTabChange,
  query,
  onQueryChange,
  expandedCategory,
  onToggleCategory,
  scrollTarget,
  onAdd,
  onCollapse,
}: {
  activeTab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
  query: string;
  onQueryChange: (q: string) => void;
  expandedCategory: NodeCategory | null;
  onToggleCategory: (c: NodeCategory) => void;
  scrollTarget: ScrollTarget | null;
  onAdd: (type: SystemNodeType) => void;
  onCollapse: () => void;
}) {
  const sections = useRef(new Map<NodeCategory, HTMLElement>());
  const placementItem = useCanvasStore((s) => s.placementItem);
  const setPlacementItem = useCanvasStore((s) => s.setPlacementItem);

  const filteredComponents = useMemo(() => filterCategories(query), [query]);
  const filteredShapes = useMemo(() => filterShapeGroups(query), [query]);
  const filteredSteps = useMemo(() => filterSteps(query), [query]);

  const [expandedShapeGroups, setExpandedShapeGroups] = useState<Record<string, boolean>>({
    'Basic Shapes': true,
    Flowchart: true,
    Containers: true,
    'Data & Storage': true,
    Infrastructure: true,
    Messaging: true,
    Connections: true,
    Annotations: true,
  });

  const toggleShapeGroup = (cat: string) => {
    setExpandedShapeGroups((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const searching = query.trim().length > 0;

  useEffect(() => {
    if (!scrollTarget) return;
    sections.current.get(scrollTarget.category)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [scrollTarget]);

  const handleShapeItemClick = (item: ShapeLibraryItem) => {
    const isCurrentlyActive =
      placementItem?.kind === item.kind &&
      placementItem?.shapeType === item.shapeType &&
      placementItem?.type === item.componentType &&
      placementItem?.edgeType === item.edgeType;

    if (isCurrentlyActive) {
      setPlacementItem(null);
    } else {
      setPlacementItem({
        kind: item.kind,
        shapeType: item.shapeType,
        type: item.componentType,
        edgeType: item.edgeType,
        label: item.label,
      });
    }
  };

  const handleStepClick = (step: SystemDesignStepConfig) => {
    const isCurrentlyActive = placementItem?.kind === 'step' && placementItem?.stepId === step.id;
    if (isCurrentlyActive) {
      setPlacementItem(null);
    } else {
      setPlacementItem({
        kind: 'step',
        stepId: step.id,
        label: step.title,
      });
    }
  };

  return (
    <Panel className="animate-panel-in absolute top-4 bottom-4 left-4 z-10 flex w-[284px] flex-col overflow-hidden shadow-[var(--shadow-xl)] border border-line bg-card">
      {/* Header */}
      <div className="flex items-center justify-between pt-2.5 pr-2 pb-1.5 pl-3.5 border-b border-line/60">
        <div className="flex items-center gap-1.5">
          <h2 className="text-[13.5px] font-semibold text-text tracking-tight">Design Library</h2>
        </div>
        <SimpleTooltip label="Collapse" keys={getShortcutKeys('toggle-library')} side="right">
          <Button variant="icon" size="icon-sm" aria-label="Collapse library" onClick={onCollapse}>
            <PanelLeft className="size-[15px]" />
          </Button>
        </SimpleTooltip>
      </div>

      {/* Tabs Switcher */}
      <div className="px-2.5 pt-2 pb-1.5">
        <div className="flex items-center rounded-lg bg-surface-2 p-0.5 text-[12px] font-medium text-text-muted">
          <button
            type="button"
            onClick={() => onTabChange('components')}
            className={cn(
              'flex-1 rounded-[6px] py-1 text-center transition-all duration-150',
              activeTab === 'components'
                ? 'bg-card text-text font-semibold shadow-xs'
                : 'hover:text-text'
            )}
          >
            Components
          </button>
          <button
            type="button"
            onClick={() => onTabChange('shapes')}
            className={cn(
              'flex-1 rounded-[6px] py-1 text-center transition-all duration-150',
              activeTab === 'shapes'
                ? 'bg-card text-text font-semibold shadow-xs'
                : 'hover:text-text'
            )}
          >
            Shapes
          </button>
          <button
            type="button"
            onClick={() => onTabChange('steps')}
            className={cn(
              'flex-1 rounded-[6px] py-1 text-center transition-all duration-150',
              activeTab === 'steps'
                ? 'bg-card text-text font-semibold shadow-xs'
                : 'hover:text-text'
            )}
          >
            Steps
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-2.5 pb-2">
        <SearchInput
          variant="inset"
          placeholder={
            activeTab === 'components'
              ? 'Search components...'
              : activeTab === 'shapes'
                ? 'Search shapes & symbols...'
                : 'Search design steps...'
          }
          aria-label="Search items"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      {/* Content Area */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {/* ── TAB 1: COMPONENTS ─────────────────────────────────────── */}
        {activeTab === 'components' && (
          <div>
            {filteredComponents.length === 0 && <EmptySearch query={query} type="components" />}
            {filteredComponents.map(({ category, types }) => {
              const open = searching || expandedCategory === category;
              return (
                <section
                  key={category}
                  ref={(el) => {
                    if (el) sections.current.set(category, el);
                    else sections.current.delete(category);
                  }}
                  className="scroll-mt-1 pb-1"
                >
                  <button
                    type="button"
                    onClick={() => onToggleCategory(category)}
                    aria-expanded={open}
                    className="focus-ring flex h-7 w-full items-center gap-1 rounded-[7px] px-2 text-left text-[11.5px] font-medium text-text-muted transition-colors duration-[120ms] hover:text-text"
                  >
                    {category}
                    <ChevronDown
                      className={cn('ml-auto size-3.5 transition-transform duration-[120ms]', !open && '-rotate-90')}
                    />
                  </button>
                  {open && (
                    <div className="grid gap-px">
                      {types.map(({ type, config }) => {
                        const Icon = config.icon;
                        const isPlaced = placementItem?.kind === 'component' && placementItem.type === type;
                        return (
                          <div
                            key={type}
                            role="button"
                            tabIndex={0}
                            draggable
                            onDragStart={(e) => onDragStartComponent(e, type)}
                            onClick={() => {
                              if (isPlaced) setPlacementItem(null);
                              else setPlacementItem({ kind: 'component', type, label: config.label });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onAdd(type);
                              }
                            }}
                            aria-label={`Place ${config.label}`}
                            className={cn(
                              'focus-ring flex h-9 cursor-grab items-center gap-2.5 rounded-[9px] px-2 text-[13px] text-text transition-colors duration-[120ms] select-none hover:bg-surface-2 active:cursor-grabbing border border-transparent',
                              isPlaced && 'bg-accent/10 border-accent/40 font-medium text-accent'
                            )}
                          >
                            <IconChip color={config.color} size={22}>
                              <Icon className="size-[13px]" />
                            </IconChip>
                            <span className="truncate">{config.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* ── TAB 2: SHAPES ────────────────────────────────────────── */}
        {activeTab === 'shapes' && (
          <div>
            {filteredShapes.length === 0 && <EmptySearch query={query} type="shapes" />}
            {filteredShapes.map((group) => {
              const isOpen = searching || !!expandedShapeGroups[group.category];
              return (
                <section key={group.category} className="pb-1.5">
                  <button
                    type="button"
                    onClick={() => toggleShapeGroup(group.category)}
                    aria-expanded={isOpen}
                    className="focus-ring flex h-7 w-full items-center gap-1.5 rounded-[7px] px-2 text-left text-[11.5px] font-medium text-text-muted transition-colors duration-[120ms] hover:text-text"
                  >
                    <span>{group.category}</span>
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.2 text-[10px] text-text-muted">
                      {group.items.length}
                    </span>
                    <ChevronDown
                      className={cn('ml-auto size-3.5 transition-transform duration-[120ms]', !isOpen && '-rotate-90')}
                    />
                  </button>

                  {isOpen && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1 px-1">
                      {group.items.map((item) => {
                        const isPlaced =
                          placementItem?.kind === item.kind &&
                          placementItem?.shapeType === item.shapeType &&
                          placementItem?.type === item.componentType &&
                          placementItem?.edgeType === item.edgeType;

                        const placementData: PlacementItem = {
                          kind: item.kind,
                          shapeType: item.shapeType,
                          type: item.componentType,
                          edgeType: item.edgeType,
                          label: item.label,
                        };

                        return (
                          <SimpleTooltip key={item.id} label={`${item.label}: ${item.description}`} side="right">
                            <div
                              role="button"
                              tabIndex={0}
                              draggable
                              onDragStart={(e) => onDragStartPlacementItem(e, placementData)}
                              onClick={() => handleShapeItemClick(item)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleShapeItemClick(item);
                                }
                              }}
                              aria-label={`Place ${item.label}`}
                              className={cn(
                                'focus-ring group relative flex flex-col items-center justify-center gap-1.5 rounded-[9px] border border-line bg-card p-2 text-center transition-all duration-[120ms] select-none hover:border-line-hover hover:bg-surface-2 cursor-grab active:cursor-grabbing',
                                isPlaced && 'border-accent bg-accent/10 shadow-xs ring-1 ring-accent/30'
                              )}
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2/80 group-hover:bg-surface-3 transition-colors">
                                <ShapeMiniPreview item={item} />
                              </div>
                              <span className="truncate w-full text-[11.5px] font-medium text-text leading-tight">
                                {item.label}
                              </span>
                            </div>
                          </SimpleTooltip>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* ── TAB 3: SYSTEM DESIGN STEPS ───────────────────────────── */}
        {activeTab === 'steps' && (
          <div className="space-y-2 pt-0.5 px-0.5">
            {filteredSteps.length === 0 && <EmptySearch query={query} type="steps" />}
            {filteredSteps.map((step) => {
              const StepIcon = step.icon;
              const isPlaced = placementItem?.kind === 'step' && placementItem?.stepId === step.id;
              const placementData: PlacementItem = {
                kind: 'step',
                stepId: step.id,
                label: step.title,
              };

              return (
                <div
                  key={step.id}
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={(e) => onDragStartPlacementItem(e, placementData)}
                  onClick={() => handleStepClick(step)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStepClick(step);
                    }
                  }}
                  aria-label={`Place ${step.title} card`}
                  className={cn(
                    'focus-ring group relative flex flex-col gap-1 rounded-[10px] border border-line bg-card p-2.5 text-left transition-all duration-[120ms] select-none hover:border-line-hover hover:bg-surface-2 cursor-grab active:cursor-grabbing',
                    isPlaced && 'border-accent bg-accent/10 shadow-xs ring-1 ring-accent/30'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/15 text-[10px] font-bold text-accent">
                      {step.stepNumber}
                    </span>
                    <StepIcon className="size-3.5 text-accent shrink-0" />
                    <span className="text-[12.5px] font-semibold text-text truncate">
                      {step.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-snug line-clamp-2 pl-7">
                    {step.subtitle}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}

function LibraryRail({
  onExpand,
  onOpenCategory,
  onOpenTab,
}: {
  onExpand: () => void;
  onOpenCategory: (c: NodeCategory) => void;
  onOpenTab: (tab: LibraryTab) => void;
}) {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);

  return (
    <Panel className="animate-panel-in absolute top-4 left-4 z-10 flex flex-col gap-0.5 p-[5px] shadow-[var(--shadow-xl)] border border-line bg-card">
      <SimpleTooltip label="Library" keys={getShortcutKeys('toggle-library')} side="right">
        <Button
          variant="icon"
          size="icon-toolbar"
          aria-label="Open library"
          onClick={onExpand}
          className="bg-surface-2 text-text"
        >
          <PanelLeft />
        </Button>
      </SimpleTooltip>

      <div aria-hidden className="mx-1.5 my-[3px] h-px bg-line" />

      {/* 1. Select (V) */}
      <SimpleTooltip label="Select" keys={['V']} side="right">
        <Button
          variant="icon"
          size="icon-toolbar"
          aria-label="Select"
          onClick={() => setActiveTool('select')}
          className={cn('relative', activeTool === 'select' && 'bg-ink text-paper hover:bg-ink hover:text-paper')}
        >
          <MousePointer2 className="size-[15px]" />
          <span
            className={cn(
              'absolute bottom-0.5 right-1 text-[8.5px] font-mono leading-none select-none pointer-events-none',
              activeTool === 'select' ? 'text-paper/60' : 'text-ink-3'
            )}
          >
            V
          </span>
        </Button>
      </SimpleTooltip>

      {/* 2. Rectangle (R) */}
      <SimpleTooltip label="Rectangle" keys={['R']} side="right">
        <Button
          variant="icon"
          size="icon-toolbar"
          aria-label="Rectangle"
          onClick={() => setActiveTool(activeTool === 'rectangle' ? 'select' : 'rectangle')}
          className={cn('relative', activeTool === 'rectangle' && 'bg-ink text-paper hover:bg-ink hover:text-paper')}
        >
          <Square className="size-[15px]" />
          <span
            className={cn(
              'absolute bottom-0.5 right-1 text-[8.5px] font-mono leading-none select-none pointer-events-none',
              activeTool === 'rectangle' ? 'text-paper/60' : 'text-ink-3'
            )}
          >
            R
          </span>
        </Button>
      </SimpleTooltip>

      {/* 3. Circle (O) */}
      <SimpleTooltip label="Circle" keys={['O']} side="right">
        <Button
          variant="icon"
          size="icon-toolbar"
          aria-label="Circle"
          onClick={() => setActiveTool(activeTool === 'circle' ? 'select' : 'circle')}
          className={cn('relative', activeTool === 'circle' && 'bg-ink text-paper hover:bg-ink hover:text-paper')}
        >
          <Circle className="size-[15px]" />
          <span
            className={cn(
              'absolute bottom-0.5 right-1 text-[8.5px] font-mono leading-none select-none pointer-events-none',
              activeTool === 'circle' ? 'text-paper/60' : 'text-ink-3'
            )}
          >
            O
          </span>
        </Button>
      </SimpleTooltip>

      {/* 4. Arrow (A) */}
      <SimpleTooltip label="Arrow" keys={['A']} side="right">
        <Button
          variant="icon"
          size="icon-toolbar"
          aria-label="Arrow"
          onClick={() => setActiveTool(activeTool === 'arrow' ? 'select' : 'arrow')}
          className={cn('relative', activeTool === 'arrow' && 'bg-ink text-paper hover:bg-ink hover:text-paper')}
        >
          <ArrowUpRight className="size-[16px]" />
          <span
            className={cn(
              'absolute bottom-0.5 right-1 text-[8.5px] font-mono leading-none select-none pointer-events-none',
              activeTool === 'arrow' ? 'text-paper/60' : 'text-ink-3'
            )}
          >
            A
          </span>
        </Button>
      </SimpleTooltip>

      {/* 5. Straight Line (L) */}
      <SimpleTooltip label="Straight Line" keys={['L']} side="right">
        <Button
          variant="icon"
          size="icon-toolbar"
          aria-label="Straight Line"
          onClick={() => setActiveTool(activeTool === 'line' ? 'select' : 'line')}
          className={cn('relative', activeTool === 'line' && 'bg-ink text-paper hover:bg-ink hover:text-paper')}
        >
          <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="none">
            <line x1="3" y1="17" x2="17" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span
            className={cn(
              'absolute bottom-0.5 right-1 text-[8.5px] font-mono leading-none select-none pointer-events-none',
              activeTool === 'line' ? 'text-paper/60' : 'text-ink-3'
            )}
          >
            L
          </span>
        </Button>
      </SimpleTooltip>

      {/* 6. Pencil (D) */}
      <SidebarDrawingToolsMenu size="toolbar" />

      <div aria-hidden className="mx-1.5 my-[3px] h-px bg-line" />

      {/* Hand / Pan tool (H) */}
      <SimpleTooltip label="Hand / Pan" keys={['H']} side="right">
        <Button
          variant="icon"
          size="icon-toolbar"
          aria-label="Hand / Pan"
          onClick={() => setActiveTool(activeTool === 'hand' ? 'select' : 'hand')}
          className={cn('relative', activeTool === 'hand' && 'bg-ink text-paper hover:bg-ink hover:text-paper')}
        >
          <Hand className="size-[15px]" />
          <span
            className={cn(
              'absolute bottom-0.5 right-1 text-[8.5px] font-mono leading-none select-none pointer-events-none',
              activeTool === 'hand' ? 'text-paper/60' : 'text-ink-3'
            )}
          >
            H
          </span>
        </Button>
      </SimpleTooltip>

      {/* Text tool (T) */}
      <SimpleTooltip label="Text" keys={['T']} side="right">
        <Button
          variant="icon"
          size="icon-toolbar"
          aria-label="Text"
          onClick={() => setActiveTool(activeTool === 'text' ? 'select' : 'text')}
          className={cn('relative', activeTool === 'text' && 'bg-ink text-paper hover:bg-ink hover:text-paper')}
        >
          <Type className="size-[15px]" />
          <span
            className={cn(
              'absolute bottom-0.5 right-1 text-[8.5px] font-mono leading-none select-none pointer-events-none',
              activeTool === 'text' ? 'text-paper/60' : 'text-ink-3'
            )}
          >
            T
          </span>
        </Button>
      </SimpleTooltip>

      <div aria-hidden className="mx-1.5 my-[3px] h-px bg-line" />

      {/* Component Categories */}
      {ALL_CATEGORIES.filter((c) => c.category !== 'Shapes').map(({ category }) => {
        const Icon = CATEGORY_ICONS[category];
        return (
          <SimpleTooltip key={category} label={category} side="right">
            <Button
              variant="icon"
              size="icon-toolbar"
              aria-label={category}
              onClick={() => onOpenCategory(category)}
            >
              <Icon />
            </Button>
          </SimpleTooltip>
        );
      })}

      <div aria-hidden className="mx-1.5 my-[3px] h-px bg-line" />

      {/* Categorized Shapes rail button */}
      <SimpleTooltip label="Shapes Library" side="right">
        <Button
          variant="icon"
          size="icon-toolbar"
          aria-label="Shapes Library"
          onClick={() => onOpenTab('shapes')}
        >
          <ShapesIcon />
        </Button>
      </SimpleTooltip>

      {/* System Design Steps rail button */}
      <SimpleTooltip label="System Design Steps" side="right">
        <Button
          variant="icon"
          size="icon-toolbar"
          aria-label="System Design Steps"
          onClick={() => onOpenTab('steps')}
        >
          <Milestone />
        </Button>
      </SimpleTooltip>
    </Panel>
  );
}

function LibrarySheet({
  open,
  onOpenChange,
  query,
  onQueryChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onAdd: (type: SystemNodeType) => void;
}) {
  const [sheetTab, setSheetTab] = useState<LibraryTab>('components');
  const setPlacementItem = useCanvasStore((s) => s.setPlacementItem);

  const filteredComponents = useMemo(() => filterCategories(query), [query]);
  const filteredShapes = useMemo(() => filterShapeGroups(query), [query]);
  const filteredSteps = useMemo(() => filterSteps(query), [query]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()} className="max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-2 px-3.5 pt-1 pb-2 border-b border-line">
          <SheetTitle className="text-base font-semibold">Library</SheetTitle>
          <SearchInput
            variant="inset"
            placeholder="Search items..."
            aria-label="Search library"
            containerClassName="ml-auto w-[min(220px,60%)]"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>

        {/* Tab Pills */}
        <div className="flex shrink-0 gap-2 px-3.5 py-2">
          <button
            type="button"
            onClick={() => setSheetTab('components')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              sheetTab === 'components' ? 'bg-ink text-paper' : 'bg-surface-2 text-text-muted hover:text-text'
            )}
          >
            Components
          </button>
          <button
            type="button"
            onClick={() => setSheetTab('shapes')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              sheetTab === 'shapes' ? 'bg-ink text-paper' : 'bg-surface-2 text-text-muted hover:text-text'
            )}
          >
            Shapes
          </button>
          <button
            type="button"
            onClick={() => setSheetTab('steps')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              sheetTab === 'steps' ? 'bg-ink text-paper' : 'bg-surface-2 text-text-muted hover:text-text'
            )}
          >
            Design Steps
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-3.5">
          {sheetTab === 'components' && (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
              {filteredComponents.flatMap((g) => g.types).map(({ type, config }) => {
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      onAdd(type);
                      onOpenChange(false);
                    }}
                    className="focus-ring flex h-11 items-center gap-2 rounded-[10px] border border-line bg-card px-2.5 text-left text-[12.5px] text-text transition-colors duration-[120ms] hover:bg-surface-2"
                  >
                    <IconChip color={config.color} size={24}>
                      <Icon className="size-[14px]" />
                    </IconChip>
                    <span className="truncate">{config.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {sheetTab === 'shapes' && (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
              {filteredShapes.flatMap((g) => g.items).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPlacementItem({
                      kind: item.kind,
                      shapeType: item.shapeType,
                      type: item.componentType,
                      edgeType: item.edgeType,
                      label: item.label,
                    });
                    onOpenChange(false);
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-line bg-card p-2 text-center hover:bg-surface-2"
                >
                  <ShapeMiniPreview item={item} />
                  <span className="text-[11px] truncate w-full">{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {sheetTab === 'steps' && (
            <div className="space-y-2">
              {filteredSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      setPlacementItem({
                        kind: 'step',
                        stepId: step.id,
                        label: step.title,
                      });
                      onOpenChange(false);
                    }}
                    className="flex w-full items-start gap-2 rounded-lg border border-line bg-card p-2 text-left hover:bg-surface-2"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/15 text-[10px] font-bold text-accent">
                      {step.stepNumber}
                    </span>
                    <Icon className="size-4 text-accent mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[12px] font-semibold text-text">{step.title}</div>
                      <div className="text-[10.5px] text-text-muted">{step.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function NodePalette() {
  const narrow = useIsNarrow();
  const collapsed = useCanvasStore((s) => s.libraryCollapsed);
  const setCollapsed = useCanvasStore((s) => s.setLibraryCollapsed);
  const addAtCenter = useAddNodeAtCenter();
  const [activeTab, setActiveTab] = useState<LibraryTab>('components');
  const [query, setQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<NodeCategory | null>(
    ALL_CATEGORIES[0].category
  );
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget | null>(null);

  if (narrow) {
    return (
      <LibrarySheet
        open={!collapsed}
        onOpenChange={(open) => setCollapsed(!open)}
        query={query}
        onQueryChange={setQuery}
        onAdd={(type) => {
          addAtCenter(type);
          setCollapsed(true);
        }}
      />
    );
  }

  if (collapsed) {
    return (
      <LibraryRail
        onExpand={() => setCollapsed(false)}
        onOpenCategory={(category) => {
          setActiveTab('components');
          setQuery('');
          setExpandedCategory(category);
          setScrollTarget((prev) => ({ category, nonce: (prev?.nonce ?? 0) + 1 }));
          setCollapsed(false);
        }}
        onOpenTab={(tab) => {
          setActiveTab(tab);
          setQuery('');
          setCollapsed(false);
        }}
      />
    );
  }

  return (
    <LibraryPanel
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        setQuery('');
      }}
      query={query}
      onQueryChange={setQuery}
      expandedCategory={expandedCategory}
      onToggleCategory={(category) =>
        setExpandedCategory((current) => (current === category ? null : category))
      }
      scrollTarget={scrollTarget}
      onAdd={addAtCenter}
      onCollapse={() => setCollapsed(true)}
    />
  );
}
