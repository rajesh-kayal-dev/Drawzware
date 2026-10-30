'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Sparkles,
  X,
  Check,
  ChevronRight,
  Workflow,
  Wrench,
  Network,
  Boxes,
  Crosshair,
  Plus,
} from 'lucide-react';
import { useReactFlow, useStoreApi } from '@xyflow/react';
import { cn } from '@/shared/utils/utils';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { TechIcon } from '@/lib/icons/tech-icons';
import {
  GLOBAL_FILTER_CATEGORIES,
  type GlobalFilterCategory,
  type GlobalSearchItem,
  type GlobalGroup,
  searchAllItems,
  getItemGroup,
  findMatchingCanvasNode,
} from '@/features/canvas/registries/global-search-registry';
import { useInsertStackPreset } from '../utils/canvas-helpers';
import {
  createSystemNode,
  createShapeNode,
  createStepNode,
  createJunctionNode,
  createSequenceParticipantNode,
  createSequenceFragmentNode,
  createERTableNode,
} from '@/features/canvas/utils/node-factory';
import type { SystemNode, SystemNodeType, PlacementItem } from '@/features/canvas/types/canvas.types';

interface GlobalInsertPanelProps {
  query: string;
  onQueryChange: (q: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

const GROUP_ICONS: Record<GlobalGroup, React.ComponentType<{ className?: string }>> = {
  Components: Boxes,
  'Apps & Services': Sparkles,
  'Technology Stacks': Workflow,
  Diagrams: Network,
  Tools: Wrench,
};

const GROUP_COLORS: Record<GlobalGroup, string> = {
  Components: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
  'Apps & Services': 'text-pink-500 bg-pink-500/10 border-pink-500/30',
  'Technology Stacks': 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  Diagrams: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  Tools: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
};

const GROUP_ORDER: GlobalGroup[] = [
  'Components',
  'Apps & Services',
  'Technology Stacks',
  'Diagrams',
  'Tools',
];

export function GlobalInsertPanel({
  query,
  onQueryChange,
  searchInputRef,
}: GlobalInsertPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<GlobalFilterCategory>('All Categories');

  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const setLibraryCollapsed = useCanvasStore((s) => s.setLibraryCollapsed);
  const nodes = useCanvasStore((s) => s.nodes);
  const addNode = useCanvasStore((s) => s.addNode);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const setSelectedNodeId = useCanvasStore((s) => s.setSelectedNodeId);

  const { screenToFlowPosition, setCenter, fitView, zoomIn, zoomOut } = useReactFlow();
  const storeApi = useStoreApi();
  const insertStackPreset = useInsertStackPreset();

  const insertCounter = useRef(0);
  const isDraggingRef = useRef(false);

  // Search results
  const searchResults = useMemo(() => {
    return searchAllItems(query, selectedCategory);
  }, [query, selectedCategory]);

  // Grouped results into the 5 specified categories
  const groupedResults = useMemo(() => {
    const groups: { group: GlobalGroup; items: GlobalSearchItem[] }[] = [];

    for (const groupName of GROUP_ORDER) {
      const items = searchResults.filter((item) => (item.group || getItemGroup(item.category)) === groupName);
      if (items.length > 0) {
        groups.push({ group: groupName, items });
      }
    }
    return groups;
  }, [searchResults]);

  // Check if a matching node already exists on canvas
  const findExistingCanvasNode = useCallback(
    (item: GlobalSearchItem): SystemNode | undefined => {
      return findMatchingCanvasNode(item, nodes);
    },
    [nodes]
  );

  // Perform insertion near center of viewport
  const insertSearchItem = useCallback(
    (item: GlobalSearchItem) => {
      // 1. Tool action
      if (item.action.kind === 'tool' && item.action.tool) {
        setActiveTool(item.action.tool);
        setLibraryCollapsed(true);
        return;
      }

      // 2. Canvas quick action (autolayout, fitview, zoom, undo, redo, export, clear)
      if (item.action.kind === 'action' && item.action.actionId) {
        setLibraryCollapsed(true);
        switch (item.action.actionId) {
          case 'fitview':
            fitView({ padding: 0.15, duration: 250 });
            return;
          case 'zoomin':
            zoomIn({ duration: 150 });
            return;
          case 'zoomout':
            zoomOut({ duration: 150 });
            return;
          case 'undo':
            useCanvasStore.getState().undo();
            return;
          case 'redo':
            useCanvasStore.getState().redo();
            return;
          case 'clear':
            useCanvasStore.getState().clearCanvas();
            return;
          case 'export':
            useCanvasStore.getState().setExportOpen(true);
            return;
          default:
            return;
        }
      }

      // 3. Preset action (complete multi-node layout)
      if (item.action.kind === 'preset' && item.action.preset) {
        insertStackPreset(item.action.preset);
        setLibraryCollapsed(true);
        return;
      }

      // 4. Placement item (components, shapes, steps, apps, services)
      if (item.action.kind === 'placement' && item.action.placement) {
        const placement = item.action.placement;
        const { domNode } = storeApi.getState();
        const rect = domNode?.getBoundingClientRect();
        const center = screenToFlowPosition({
          x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
          y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
        });

        const offset = (insertCounter.current++ % 8) * 26;
        const pos = { x: center.x - 100 + offset, y: center.y - 36 + offset };

        let newNode: SystemNode | null = null;

        if (placement.kind === 'component' && placement.type) {
          newNode = createSystemNode(placement.type as SystemNodeType, pos, {
            label: placement.label || item.label,
            customIcon: placement.customIcon,
            color: placement.color,
            techStack: placement.defaultTechStack ? [...placement.defaultTechStack] : undefined,
            description: placement.description,
          });
        } else if (placement.kind === 'shape' && placement.shapeType) {
          newNode = createShapeNode(placement.shapeType, pos, placement.label || item.label);
        } else if (placement.kind === 'step' && placement.stepId) {
          newNode = createStepNode(placement.stepId, pos);
        } else if (placement.kind === 'group') {
          newNode = createSystemNode('group', pos);
          if (placement.label) newNode.data.label = placement.label;
        } else if (placement.kind === 'junction') {
          newNode = createJunctionNode(pos);
        } else if (placement.kind === 'sequence-participant') {
          newNode = createSequenceParticipantNode(
            placement.participantType || 'service',
            pos,
            placement.label || item.label
          );
        } else if (placement.kind === 'sequence-fragment') {
          newNode = createSequenceFragmentNode(
            placement.fragmentType || 'alt',
            pos,
            placement.label || item.label
          );
        } else if (placement.kind === 'er-table') {
          newNode = createERTableNode(
            placement.tableType || 'table',
            pos,
            placement.label || 'table_name',
            placement.columns
          );
        }

        if (newNode) {
          pushHistory();
          addNode(newNode);
          setSelectedNodeId(newNode.id);
          setLibraryCollapsed(true);
        }
      }
    },
    [
      setActiveTool,
      setLibraryCollapsed,
      fitView,
      zoomIn,
      zoomOut,
      insertStackPreset,
      storeApi,
      screenToFlowPosition,
      pushHistory,
      addNode,
      setSelectedNodeId,
    ]
  );

  // Focus existing node on canvas
  const focusExistingNode = useCallback(
    (node: SystemNode) => {
      setSelectedNodeId(node.id);
      const w = typeof node.style?.width === 'number' ? node.style.width : 160;
      const h = typeof node.style?.height === 'number' ? node.style.height : 80;
      setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 1.25, duration: 300 });
      setLibraryCollapsed(true);
    },
    [setSelectedNodeId, setCenter, setLibraryCollapsed]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Search Input ── */}
      <div className="px-2.5 pt-2 pb-1.5 shrink-0">
        <div className="relative flex items-center w-full">
          <Search className="absolute left-2.5 size-3.5 text-text-muted pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search all components, apps, presets, tools..."
            className="w-full h-8 pl-8 pr-7 text-[12px] rounded-[8px] border border-line/70 bg-surface-1 text-text placeholder:text-text-muted/70 focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="absolute right-2 size-4 flex items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Category Filter Pills ── */}
      <div className="px-2.5 py-1 shrink-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-1 min-w-max pb-0.5">
          {GLOBAL_FILTER_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10.5px] font-medium transition-all select-none cursor-pointer',
                  isSelected
                    ? 'bg-accent text-white shadow-2xs font-semibold'
                    : 'bg-surface-2/80 text-text-muted hover:text-text hover:bg-surface-2'
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grouped Content List ── */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-3 space-y-3 pt-1">
        {searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <Search className="size-6 text-text-muted/40 mb-2" />
            <p className="text-[12.5px] font-medium text-text">No matching items found</p>
            <p className="text-[11px] text-text-muted mt-0.5 max-w-[200px]">
              No results for &ldquo;{query}&rdquo;. Try searching for React, Facebook, Postgres, or Tools.
            </p>
          </div>
        ) : (
          groupedResults.map((group) => {
            const GroupIcon = GROUP_ICONS[group.group] || Boxes;
            const badgeClass = GROUP_COLORS[group.group] || 'text-text-muted bg-surface-2';

            return (
              <section key={group.group} className="space-y-1">
                {/* Group Heading */}
                <div className="flex items-center justify-between px-1.5 py-0.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
                    <GroupIcon className="size-3" />
                    <span>{group.group}</span>
                  </div>
                  <span className="text-[9.5px] text-text-muted font-mono rounded bg-surface-2 px-1.5 py-0.2">
                    {group.items.length}
                  </span>
                </div>

                {/* Items in Group */}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isToolActive = item.action.kind === 'tool' && activeTool === item.action.tool;
                    const existingNode = findExistingCanvasNode(item);
                    const isDraggable = item.action.kind === 'placement' || item.action.kind === 'preset';
                    const ItemIcon = item.icon;

                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        draggable={isDraggable}
                        onDragStart={(e) => {
                          isDraggingRef.current = true;
                          if (item.action.kind === 'placement' && item.action.placement) {
                            e.dataTransfer.setData(
                              'application/system-design-item',
                              JSON.stringify(item.action.placement)
                            );
                            if (item.action.placement.kind === 'component' && item.action.placement.type) {
                              e.dataTransfer.setData(
                                'application/reactflow-nodetype',
                                item.action.placement.type
                              );
                            }
                          } else if (item.action.kind === 'preset' && item.action.preset) {
                            const presetPlacement: PlacementItem = {
                              kind: 'preset',
                              presetId: item.action.preset.id,
                              label: item.action.preset.name,
                            };
                            e.dataTransfer.setData(
                              'application/system-design-item',
                              JSON.stringify(presetPlacement)
                            );
                          }
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setTimeout(() => {
                            isDraggingRef.current = false;
                          }, 120);
                        }}
                        onClick={(e) => {
                          if (isDraggingRef.current) return;
                          e.preventDefault();
                          insertSearchItem(item);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            insertSearchItem(item);
                          }
                        }}
                        className={cn(
                          'group flex items-center gap-2.5 p-2 rounded-[8px] border border-line/50 bg-card/60 hover:bg-surface-2/80 hover:border-line-hover transition-all duration-[120ms] select-none',
                          isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                          isToolActive && 'border-accent bg-accent/10 shadow-2xs ring-1 ring-accent/30',
                          existingNode && 'bg-accent/5 border-accent/25'
                        )}
                      >
                        {/* Icon Container */}
                        <div
                          className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-surface-2 border border-line/40 group-hover:scale-105 transition-transform"
                          style={{ color: item.color }}
                        >
                          {item.customIcon ? (
                            <TechIcon name={item.customIcon} className="size-[16px]" color={item.color} />
                          ) : ItemIcon ? (
                            <ItemIcon className="size-4 stroke-[1.8]" />
                          ) : (
                            <Sparkles className="size-4" />
                          )}
                        </div>

                        {/* Title & Description */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11.5px] font-semibold text-text truncate max-w-[130px]">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span
                                className={cn(
                                  'text-[8.5px] font-medium px-1 rounded-sm border shrink-0',
                                  badgeClass
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                            {existingNode && (
                              <span className="text-[8.5px] font-semibold text-accent bg-accent/15 border border-accent/30 px-1 rounded-sm shrink-0">
                                On canvas
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-muted truncate mt-0.2">
                            {item.description}
                          </p>
                        </div>

                        {/* Action buttons (Focus, Duplicate, Insert) */}
                        <div className="shrink-0 flex items-center gap-1">
                          {existingNode ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  focusExistingNode(existingNode);
                                }}
                                className="px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-surface-2 hover:bg-surface-3 text-text border border-line transition-colors cursor-pointer flex items-center gap-0.5"
                                title="Focus existing node on canvas"
                              >
                                <Crosshair className="size-2.5 text-accent" />
                                Select
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  insertSearchItem(item);
                                }}
                                className="px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-accent text-white hover:bg-accent/90 transition-colors cursor-pointer flex items-center gap-0.5 shadow-2xs"
                                title="Insert a duplicate on canvas"
                              >
                                <Plus className="size-2.5" />
                                Duplicate
                              </button>
                            </>
                          ) : item.shortcut ? (
                            <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-line/60 text-[9px] font-mono text-text-muted">
                              {item.shortcut}
                            </kbd>
                          ) : item.action.kind === 'preset' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                insertSearchItem(item);
                              }}
                              className="text-[9.5px] font-medium text-accent bg-accent/15 hover:bg-accent/25 border border-accent/30 px-2 py-0.5 rounded transition-colors cursor-pointer"
                            >
                              Insert Preset
                            </button>
                          ) : item.action.kind === 'placement' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                insertSearchItem(item);
                              }}
                              className="text-[9.5px] font-medium text-text-muted group-hover:text-accent bg-surface-2 group-hover:bg-accent/15 border border-line group-hover:border-accent/30 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                            >
                              Insert
                            </button>
                          ) : isToolActive ? (
                            <Check className="size-3.5 text-accent" />
                          ) : (
                            <ChevronRight className="size-3 text-text-muted/50 group-hover:text-text group-hover:translate-x-0.5 transition-all" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
