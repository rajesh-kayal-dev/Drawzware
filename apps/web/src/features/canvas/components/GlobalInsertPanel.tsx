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
  Plus,
} from 'lucide-react';
import { useReactFlow, useStoreApi } from '@xyflow/react';
import { cn } from '@/shared/utils/utils';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
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
import { getLayoutedElements } from '@/features/canvas/utils/auto-layout';
import { saveCurrentCanvasAsDrawz } from '@/features/canvas/utils/save-canvas';
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
  showSearchInput?: boolean;
}

const GROUP_ICONS: Record<GlobalGroup, React.ComponentType<{ className?: string }>> = {
  Components: Boxes,
  'Apps & Services': Sparkles,
  'Technology Stacks': Workflow,
  Diagrams: Network,
  Tools: Wrench,
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
  showSearchInput = true,
}: GlobalInsertPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<GlobalFilterCategory>('All Categories');
  const [clearOpen, setClearOpen] = useState(false);

  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const setLibraryCollapsed = useCanvasStore((s) => s.setLibraryCollapsed);
  const nodes = useCanvasStore((s) => s.nodes);
  const addNode = useCanvasStore((s) => s.addNode);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const setSelectedNodeId = useCanvasStore((s) => s.setSelectedNodeId);
  const projectId = useCanvasStore((s) => s.projectId);

  const { screenToFlowPosition, setCenter, fitView, zoomIn, zoomOut } = useReactFlow();
  const storeApi = useStoreApi();
  const insertStackPreset = useInsertStackPreset();

  const insertCounter = useRef(0);
  const isDraggingRef = useRef(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search results
  const searchResults = useMemo(() => {
    return searchAllItems(query, selectedCategory);
  }, [query, selectedCategory]);

  const visibleResults = useMemo(() => {
    if (query.trim()) return searchResults.slice(0, 50);
    if (selectedCategory !== 'All Categories') return searchResults.slice(0, 30);
    return GROUP_ORDER.flatMap((group) =>
      searchResults.filter((item) => (item.group || getItemGroup(item.category)) === group).slice(0, 4)
    );
  }, [query, searchResults, selectedCategory]);

  const focusResult = (index: number) => {
    const buttons = resultsRef.current?.querySelectorAll<HTMLButtonElement>('[data-search-result]');
    buttons?.[index]?.focus();
  };

  // Keep the full registry searchable while rendering a compact browse view.
  const groupedResults = useMemo(() => {
    const groups: { group: GlobalGroup; items: GlobalSearchItem[] }[] = [];

    for (const groupName of GROUP_ORDER) {
      const items = visibleResults.filter((item) => (item.group || getItemGroup(item.category)) === groupName);
      if (items.length > 0) {
        groups.push({ group: groupName, items });
      }
    }
    return groups;
  }, [visibleResults]);

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
        if (item.action.actionId !== 'clear') setLibraryCollapsed(true);
        switch (item.action.actionId) {
          case 'fitview':
            fitView({ padding: 0.15, duration: 250 });
            return;
          case 'autolayout': {
            const canvas = useCanvasStore.getState();
            if (canvas.nodes.length === 0) return;
            canvas.pushHistory();
            const layouted = getLayoutedElements(canvas.nodes, canvas.edges);
            canvas.setNodes(layouted.nodes);
            canvas.setEdges(layouted.edges);
            requestAnimationFrame(() => fitView({ padding: 0.15, duration: 250 }));
            return;
          }
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
            setClearOpen(true);
            return;
          case 'save-drawz':
            if (projectId) void saveCurrentCanvasAsDrawz(projectId);
            return;
          case 'shortcuts':
            useCanvasStore.getState().setShortcutsOpen(true);
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
        const pos = { x: center.x - 46 + offset, y: center.y - 38 + offset };

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
      projectId,
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
    <>
    <div className="flex flex-col h-full min-h-0">
      {/* ── Search Input ── */}
      {showSearchInput && (
      <div className="px-2.5 pt-2 pb-1.5 shrink-0">
        <div className="relative flex items-center w-full">
          <Search className="absolute left-3 size-4 text-ink-3 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusResult(0);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                resultsRef.current?.querySelector<HTMLButtonElement>('[data-search-result]')?.click();
              } else if (e.key === 'Escape' && query) {
                e.stopPropagation();
                onQueryChange('');
              }
            }}
            aria-label="Search canvas items and actions"
            placeholder="Search components, shapes, commands…"
            className="w-full h-10 pl-9 pr-8 text-[12.5px] rounded-[10px] border border-line bg-paper text-ink placeholder:text-ink-3 focus:outline-hidden focus:border-accent focus:ring-2 focus:ring-accent/15 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="absolute right-2 flex size-6 items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-line-2 transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>
      )}

      {!query && selectedCategory === 'All Categories' && (
        <div className="flex items-center gap-1.5 px-3 pb-1.5 text-[10.5px] text-ink-3">
          <span className="shrink-0">Try</span>
          {['DNS', 'Diamond', 'Save'].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                onQueryChange(suggestion);
                searchInputRef.current?.focus();
              }}
              className="rounded-md border border-line px-1.5 py-0.5 text-ink-2 hover:border-accent/50 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* ── Category Filter Pills ── */}
      <div className="px-2.5 py-1 shrink-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-1 min-w-max pb-0.5" aria-label="Filter search results">
          {GLOBAL_FILTER_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-2.5 py-1 rounded-full border text-[10.5px] font-medium transition-colors select-none cursor-pointer',
                  isSelected
                    ? 'border-accent/40 bg-accent-soft text-accent font-semibold'
                    : 'border-line bg-paper text-ink-2 hover:border-accent/30 hover:text-ink'
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 pt-1 pb-1.5 text-[10px] text-ink-3" role="status" aria-live="polite">
        <span>{query ? `${searchResults.length} ${searchResults.length === 1 ? 'result' : 'results'}` : `Browse ${searchResults.length} items`}</span>
        <span>↑↓ Navigate · Enter use</span>
      </div>

      {/* ── Grouped Content List ── */}
      <div ref={resultsRef} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-3 space-y-3 pt-1">
        {searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <Search className="size-6 text-text-muted/40 mb-2" />
            <p className="text-[12.5px] font-medium text-text">No matching items found</p>
            <p className="text-[11px] text-text-muted mt-0.5 max-w-[200px]">
              Try a component name, shape, command, or a shorter phrase.
            </p>
          </div>
        ) : (
          groupedResults.map((group) => {
            const GroupIcon = GROUP_ICONS[group.group] || Boxes;

            return (
              <section key={group.group} className="space-y-1.5">
                <div className="flex items-center justify-between px-1.5 py-0.5">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink-2">
                    <GroupIcon className="size-3.5 text-accent" />
                    <span>{group.group}</span>
                  </div>
                  <span className="text-[10px] tabular-nums text-ink-3">
                    {searchResults.filter((item) => (item.group || getItemGroup(item.category)) === group.group).length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const isToolActive = item.action.kind === 'tool' && activeTool === item.action.tool;
                    const existingNode = findExistingCanvasNode(item);
                    const isDraggable = item.action.kind === 'placement' || item.action.kind === 'preset';
                    const ItemIcon = item.icon;

                    return (
                      <div
                        key={item.id}
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
                        className={cn(
                          'group flex min-h-12 items-center gap-1 rounded-[9px] border border-line bg-paper pr-1 transition-colors hover:border-accent/35 hover:bg-accent-soft/30 focus-within:border-accent/50 focus-within:bg-accent-soft/30',
                          isDraggable && 'cursor-grab active:cursor-grabbing',
                          isToolActive && 'border-accent/50 bg-accent-soft/50'
                        )}
                      >
                        <button
                          type="button"
                          data-search-result
                          title={item.description}
                          aria-label={`${existingNode ? 'Select existing' : isDraggable ? 'Insert' : 'Use'} ${item.label}`}
                          onClick={() => {
                            if (isDraggingRef.current) return;
                            if (existingNode) focusExistingNode(existingNode);
                            else insertSearchItem(item);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              searchInputRef.current?.focus();
                            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
                              e.preventDefault();
                              const buttons = resultsRef.current?.querySelectorAll<HTMLButtonElement>('[data-search-result]');
                              if (!buttons) return;
                              const index = Array.from(buttons).indexOf(e.currentTarget);
                              if (e.key === 'Home') focusResult(0);
                              else if (e.key === 'End') focusResult(buttons.length - 1);
                              else if (e.key === 'ArrowDown') focusResult(Math.min(index + 1, buttons.length - 1));
                              else if (index === 0) searchInputRef.current?.focus();
                              else focusResult(index - 1);
                            }
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2 p-2 text-left outline-none cursor-pointer"
                        >
                          <span
                            className="flex size-8 shrink-0 items-center justify-center rounded-[7px] border border-line/70 bg-line-2"
                            style={{ color: item.color }}
                          >
                            {item.customIcon ? (
                              <TechIcon name={item.customIcon} className="size-[17px]" color={item.color} />
                            ) : ItemIcon ? (
                              <ItemIcon className="size-[17px] stroke-[1.8]" />
                            ) : (
                              <Sparkles className="size-4" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-semibold leading-4 text-ink">{item.label}</span>
                            <span className="block truncate text-[10.5px] leading-4 text-ink-3">
                              {existingNode ? 'On canvas · select' : item.subcategory || item.category}
                            </span>
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center pr-1">
                          {existingNode ? (
                            <button
                              type="button"
                              onClick={() => insertSearchItem(item)}
                              className="flex size-7 items-center justify-center rounded-md text-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
                              aria-label={`Insert another ${item.label}`}
                              title="Insert another"
                            >
                              <Plus className="size-4" />
                            </button>
                          ) : item.shortcut ? (
                            <kbd className="rounded border border-line bg-line-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-2">{item.shortcut}</kbd>
                          ) : isToolActive ? (
                            <Check className="size-3.5 text-accent" />
                          ) : isDraggable ? (
                            <Plus className="size-3.5 text-ink-3 group-hover:text-accent" />
                          ) : (
                            <ChevronRight className="size-3.5 text-ink-3 group-hover:text-accent" />
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
      {visibleResults.length < searchResults.length && (
        <p className="shrink-0 border-t border-line px-3 py-2 text-[10.5px] text-ink-3">
          Showing {visibleResults.length} of {searchResults.length}. Type to narrow the results.
        </p>
      )}
    </div>
    <Dialog open={clearOpen} onOpenChange={setClearOpen}>
      <DialogContent className="max-w-[360px]">
        <DialogHeader><DialogTitle className="text-[15px]">Clear canvas?</DialogTitle></DialogHeader>
        <DialogBody className="pt-1.5">
          <DialogDescription className="mt-0 text-[13px]">
            Removes every component and connection. You can undo this.
          </DialogDescription>
        </DialogBody>
        <DialogFooter className="justify-end border-t-0 pt-0">
          <Button variant="secondary" onClick={() => setClearOpen(false)}>Cancel</Button>
          <Button variant="danger-solid" onClick={() => {
            useCanvasStore.getState().clearCanvas();
            setClearOpen(false);
            setLibraryCollapsed(true);
          }}>Clear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
