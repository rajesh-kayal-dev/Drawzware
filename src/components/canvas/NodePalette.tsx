'use client';

import { useEffect, useMemo, useRef, useState, Fragment, type DragEvent } from 'react';
import {
  LayoutGrid,
  Layers,
  FileText,
  Check,
  ChevronDown,
  Eraser,
  Hand,
  MousePointer2,
  PanelLeft,
  Pencil,
  Type,
  Search,
  Square,
  Circle,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  Key,
  Cloud,
  Monitor,
  Network,
  Cpu,
  Workflow,
  Database,
  Smartphone,
  Globe,
  Globe2,
  Scale,
  Shield,
  Server,
  Boxes,
  Zap,
  MessageSquare,
  HardDrive,
  User,
  Box,
  Split,
  RefreshCw,
  CheckSquare,
  StickyNote,
  SquareDashed,
  Table,
  Binary,
  GitFork,
  Layout,
  type LucideIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getNodesByCategory,
  type NodeCategory,
  type NodeTypeConfig,
} from '@/components/nodes/node-registry';
import {
  CLOUD_SERVICES,
  CLOUD_PROVIDERS,
  CLOUD_CATEGORIES,
  type CloudServiceItem,
} from '@/lib/cloud-registry';
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

export type LibraryTab = 'diagrams' | 'components' | 'shapes' | 'steps';
export type DiagramType = 'architecture' | 'sequence' | 'er';

export interface DiagramItem {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  placement: PlacementItem;
}

export interface DiagramCategoryGroup {
  category: string;
  items: DiagramItem[];
}

export const DIAGRAM_ARCHITECTURE_GROUPS: DiagramCategoryGroup[] = [
  {
    category: 'Clients & Interfaces',
    items: [
      { id: 'arch-client', label: 'Client', icon: Monitor, color: '#a855f7', placement: { kind: 'component', type: 'client', label: 'Client' } },
      { id: 'arch-mobile', label: 'Mobile App', icon: Smartphone, color: '#06b6d4', placement: { kind: 'component', type: 'client', label: 'Mobile App' } },
      { id: 'arch-web', label: 'Web App', icon: Globe, color: '#3b82f6', placement: { kind: 'component', type: 'client', label: 'Web App' } },
    ],
  },
  {
    category: 'Load & Network',
    items: [
      { id: 'arch-lb', label: 'Load Balancer', icon: Scale, color: '#ef4444', placement: { kind: 'component', type: 'load-balancer', label: 'Load Balancer' } },
      { id: 'arch-gw', label: 'API Gateway', icon: Shield, color: '#ec4899', placement: { kind: 'component', type: 'api-gateway', label: 'API Gateway' } },
      { id: 'arch-cdn', label: 'CDN', icon: Globe2, color: '#06b6d4', placement: { kind: 'component', type: 'cdn', label: 'CDN' } },
    ],
  },
  {
    category: 'Compute',
    items: [
      { id: 'arch-server', label: 'Server', icon: Server, color: '#3b82f6', placement: { kind: 'component', type: 'server', label: 'Server' } },
      { id: 'arch-container', label: 'Container', icon: Boxes, color: '#10b981', placement: { kind: 'component', type: 'container-cluster', label: 'Container' } },
      { id: 'arch-fn', label: 'Function', icon: Zap, color: '#06b6d4', placement: { kind: 'component', type: 'serverless', label: 'Function' } },
    ],
  },
  {
    category: 'Data & Storage',
    items: [
      { id: 'arch-db', label: 'Database', icon: Database, color: '#3b82f6', placement: { kind: 'component', type: 'database', label: 'Database' } },
      { id: 'arch-cache', label: 'Cache', icon: Zap, color: '#10b981', placement: { kind: 'component', type: 'cache', label: 'Cache' } },
      { id: 'arch-queue', label: 'Queue', icon: MessageSquare, color: '#a855f7', placement: { kind: 'component', type: 'queue', label: 'Queue' } },
      { id: 'arch-obj', label: 'Object Storage', icon: HardDrive, color: '#10b981', placement: { kind: 'component', type: 'object-storage', label: 'Object Storage' } },
    ],
  },
];

export const DIAGRAM_SEQUENCE_GROUPS: DiagramCategoryGroup[] = [
  {
    category: 'Participants',
    items: [
      { id: 'seq-actor', label: 'Actor', icon: User, color: '#a855f7', placement: { kind: 'sequence-participant', participantType: 'actor', label: 'Actor', color: '#a855f7' } },
      { id: 'seq-service', label: 'Service', icon: Box, color: '#38bdf8', placement: { kind: 'sequence-participant', participantType: 'service', label: 'Service', color: '#38bdf8' } },
      { id: 'seq-db', label: 'Database', icon: Database, color: '#06b6d4', placement: { kind: 'sequence-participant', participantType: 'database', label: 'Database', color: '#06b6d4' } },
    ],
  },
  {
    category: 'Messages',
    items: [
      { id: 'seq-sync', label: 'Sync Message', icon: ArrowRight, color: '#38bdf8', placement: { kind: 'connection', edgeType: 'rest', messageType: 'sync', strokeStyle: 'solid', arrowEnd: true, label: 'Sync Message' } },
      { id: 'seq-async', label: 'Async Message', icon: ArrowRight, color: '#06b6d4', placement: { kind: 'connection', edgeType: 'event-stream', messageType: 'async', strokeStyle: 'dashed', arrowEnd: true, label: 'Async Message' } },
      { id: 'seq-return', label: 'Return Message', icon: ArrowLeft, color: '#94a3b8', placement: { kind: 'connection', edgeType: 'event-stream', messageType: 'return', strokeStyle: 'dashed', arrowEnd: true, label: 'Return Message' } },
    ],
  },
  {
    category: 'Fragments',
    items: [
      { id: 'seq-alt', label: 'Alt', icon: Split, color: '#8b5cf6', placement: { kind: 'sequence-fragment', fragmentType: 'alt', label: 'alt [token valid]' } },
      { id: 'seq-opt', label: 'Opt', icon: CheckSquare, color: '#10b981', placement: { kind: 'sequence-fragment', fragmentType: 'opt', label: 'opt [condition]' } },
      { id: 'seq-loop', label: 'Loop', icon: RefreshCw, color: '#3b82f6', placement: { kind: 'sequence-fragment', fragmentType: 'loop', label: 'loop [condition]' } },
    ],
  },
  {
    category: 'Others',
    items: [
      { id: 'seq-note', label: 'Note', icon: StickyNote, color: '#f59e0b', placement: { kind: 'shape', shapeType: 'document', label: 'Note' } },
    ],
  },
];

export const DIAGRAM_ER_GROUPS: DiagramCategoryGroup[] = [
  {
    category: 'Entities',
    items: [
      {
        id: 'er-table',
        label: 'Table',
        icon: Table,
        color: '#38bdf8',
        placement: {
          kind: 'er-table',
          tableType: 'table',
          label: 'Users',
          color: '#38bdf8',
          columns: [
            { id: 'c1', name: 'id', type: 'UUID', isPk: true, isNullable: false },
            { id: 'c2', name: 'name', type: 'VARCHAR', isNullable: false },
            { id: 'c3', name: 'email', type: 'VARCHAR', isUnique: true, isNullable: false },
            { id: 'c4', name: 'created_at', type: 'TIMESTAMP', isNullable: false },
          ],
        },
      },
      {
        id: 'er-view',
        label: 'View',
        icon: Layout,
        color: '#8b5cf6',
        placement: {
          kind: 'er-table',
          tableType: 'view',
          label: 'UserOrdersView',
          color: '#8b5cf6',
          columns: [
            { id: 'c1', name: 'user_id', type: 'UUID', isFk: true, isNullable: false },
            { id: 'c2', name: 'order_count', type: 'INT', isNullable: false },
            { id: 'c3', name: 'total_amount', type: 'DECIMAL', isNullable: false },
          ],
        },
      },
      {
        id: 'er-enum',
        label: 'Enum',
        icon: Binary,
        color: '#10b981',
        placement: {
          kind: 'er-table',
          tableType: 'enum',
          label: 'OrderStatus',
          color: '#10b981',
          columns: [
            { id: 'c1', name: 'PENDING', type: 'ENUM', isNullable: false },
            { id: 'c2', name: 'PROCESSING', type: 'ENUM', isNullable: false },
            { id: 'c3', name: 'COMPLETED', type: 'ENUM', isNullable: false },
          ],
        },
      },
    ],
  },
  {
    category: 'Column Types',
    items: [
      {
        id: 'er-col-pk',
        label: 'Primary Key',
        icon: Key,
        color: '#a855f7',
        placement: {
          kind: 'er-table',
          tableType: 'table',
          label: 'Entity',
          color: '#a855f7',
          columns: [
            { id: 'pk-1', name: 'id', type: 'UUID', isPk: true, isNullable: false },
          ],
        },
      },
    ],
  },
  {
    category: 'Relationships',
    items: [
      { id: 'er-1-1', label: 'One to One', icon: ArrowLeftRight, color: '#3b82f6', placement: { kind: 'connection', edgeType: 'rest', relationshipType: 'one-to-one', sourceCardinality: '1', targetCardinality: '1', label: '1 : 1' } },
      { id: 'er-1-n', label: 'One to Many', icon: GitFork, color: '#10b981', placement: { kind: 'connection', edgeType: 'rest', relationshipType: 'one-to-many', sourceCardinality: '1', targetCardinality: 'N', label: '1 : N' } },
      { id: 'er-n-m', label: 'Many to Many', icon: Workflow, color: '#a855f7', placement: { kind: 'connection', edgeType: 'rest', relationshipType: 'many-to-many', sourceCardinality: 'N', targetCardinality: 'N', label: 'M : N' } },
    ],
  },
  {
    category: 'Others',
    items: [
      { id: 'er-note', label: 'Note', icon: StickyNote, color: '#f59e0b', placement: { kind: 'shape', shapeType: 'document', label: 'Note' } },
      { id: 'er-group', label: 'Group', icon: SquareDashed, color: '#94a3b8', placement: { kind: 'group', label: 'Group' } },
    ],
  },
];

export interface UtilityItem {
  id: string;
  label: string;
  description: string;
  icon: typeof Square;
  color: string;
  kind: 'group' | 'junction' | 'shape';
  shapeType?: 'callout';
  type?: SystemNodeType;
}

export const OTHERS_UTILITIES: UtilityItem[] = [
  {
    id: 'util-group',
    label: 'Group / Boundary',
    description: 'Bounding box for grouping related services',
    icon: Square,
    color: '#64748b',
    kind: 'group',
    type: 'group',
  },
  {
    id: 'util-junction',
    label: 'Junction',
    description: 'Shared connection anchor connecting multiple services',
    icon: Circle,
    color: '#3b82f6',
    kind: 'junction',
  },
  {
    id: 'util-annotation',
    label: 'Annotation',
    description: 'Contextual note or callout speech bubble',
    icon: ArrowUpRight,
    color: '#eab308',
    kind: 'shape',
    shapeType: 'callout',
  },
];

export const OTHERS_SUBCATEGORY_ORDER = [
  'Networking',
  'Kubernetes',
  'Data & Recovery',
  'Reliability',
  'Configuration',
  'DevOps',
  'Utilities',
] as const;

type CategoryGroup = ReturnType<typeof getNodesByCategory>[number];
const ALL_CATEGORIES = getNodesByCategory();

function matchesComponent(config: NodeTypeConfig, q: string) {
  return (
    config.label.toLowerCase().includes(q) ||
    (config.subcategory && config.subcategory.toLowerCase().includes(q)) ||
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

export type CategoryKey = NodeCategory | 'Cloud Providers';

interface ScrollTarget {
  category: CategoryKey;
  nonce: number;
}

function ShapeMiniPreview({ item }: { item: ShapeLibraryItem }) {
  const Icon = item.icon;
  const stroke = 'currentColor';

  switch (item.shapeType) {
    case 'rectangle':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <rect x="2" y="4" width="16" height="12" rx="1.5" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'rounded-rectangle':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <rect x="2" y="4" width="16" height="12" rx="4" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'circle':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <circle cx="10" cy="10" r="7" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'ellipse':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <ellipse cx="10" cy="10" rx="8" ry="5.5" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'diamond':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <polygon points="10,2 18,10 10,18 2,10" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <polygon points="10,3 18,17 2,17" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case 'hexagon':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <polygon points="5.5,3 14.5,3 19,10 14.5,17 5.5,17 1,10" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case 'pill':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <rect x="2" y="5" width="16" height="10" rx="5" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'parallelogram':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <polygon points="5,4 18,4 15,16 2,16" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'document':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <path d="M3 4 h14 v9 c-3.5 0 -5.5 2 -7 2 s-3.5 -2 -7 -2 Z" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'callout':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <path d="M3 4 h14 v9 h-6 l-3 3 v-3 h-5 Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case 'divider':
    case 'line':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <line x1="2" y1="10" x2="18" y2="10" stroke={stroke} strokeWidth="1.8" />
        </svg>
      );
    case 'arrow':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <line x1="3" y1="10" x2="17" y2="10" stroke={stroke} strokeWidth="1.5" />
          <polyline points="12,5 17,10 12,15" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <polygon points="10,1 12.5,7 19,7 13.8,11.2 16,17.5 10,13.5 4,17.5 6.2,11.2 1,7 7.5,7" stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      );
    case 'user':
      return (
        <svg viewBox="0 0 20 20" className="size-[19px] shrink-0 text-ink-2" fill="none">
          <circle cx="10" cy="6" r="3.5" stroke={stroke} strokeWidth="1.5" />
          <path d="M3.5 17.5 c0 -4 3 -5.5 6.5 -5.5 s6.5 1.5 6.5 5.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return <Icon className="size-[19px] shrink-0 text-ink-2" />;
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
  diagramType,
  onDiagramTypeChange,
  query,
  onQueryChange,
  expandedCategory,
  onToggleCategory,
  scrollTarget,
  onAdd,
  onCollapse,
}: {
  activeTab: LibraryTab;
  diagramType: DiagramType;
  onDiagramTypeChange: (dt: DiagramType) => void;
  query: string;
  onQueryChange: (q: string) => void;
  expandedCategory: CategoryKey | null;
  onToggleCategory: (c: CategoryKey) => void;
  scrollTarget: ScrollTarget | null;
  onAdd: (type: SystemNodeType) => void;
  onCollapse: () => void;
}) {
  const sections = useRef(new Map<CategoryKey, HTMLElement>());
  const placementItem = useCanvasStore((s) => s.placementItem);
  const setPlacementItem = useCanvasStore((s) => s.setPlacementItem);

  const handleDiagramItemClick = (item: DiagramItem) => {
    const isCurrentlyActive =
      placementItem?.kind === item.placement.kind &&
      placementItem?.label === item.placement.label;

    if (isCurrentlyActive) {
      setPlacementItem(null);
    } else {
      setPlacementItem(item.placement);
    }
  };

  const renderDiagramGroup = (group: DiagramCategoryGroup) => {
    const q = query.trim().toLowerCase();
    const filtered = group.items.filter(
      (item) => !q || item.label.toLowerCase().includes(q)
    );
    if (filtered.length === 0) return null;

    return (
      <div key={group.category} className="pb-2.5">
        <div className="flex h-6 items-center px-1 text-[11px] font-semibold text-text-muted">
          {group.category}
        </div>
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {filtered.map((item) => {
            const Icon = item.icon;
            const isPlaced =
              placementItem?.kind === item.placement.kind &&
              placementItem?.label === item.placement.label;

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e) => onDragStartPlacementItem(e, item.placement)}
                onClick={() => handleDiagramItemClick(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDiagramItemClick(item);
                  }
                }}
                aria-label={`Place ${item.label}`}
                className={cn(
                  'focus-ring group relative flex flex-col items-center justify-center gap-1 rounded-[8px] border border-line/60 bg-card/80 p-1.5 py-2 text-center transition-all duration-[120ms] select-none hover:border-line-hover hover:bg-surface-2 cursor-grab active:cursor-grabbing min-h-[58px]',
                  isPlaced && 'border-accent bg-accent/10 shadow-xs ring-1 ring-accent/30'
                )}
              >
                <div
                  className="flex size-6 items-center justify-center rounded-md transition-transform group-hover:scale-105"
                  style={{ color: item.color }}
                >
                  <Icon className="size-[18px] stroke-[1.8]" />
                </div>
                <span className="truncate w-full text-[10px] font-medium text-text text-center leading-tight px-0.5">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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

  const [expandedOthersSubcategories, setExpandedOthersSubcategories] = useState<Record<string, boolean>>({
    Networking: true,
    Kubernetes: true,
    'Data & Recovery': true,
    Reliability: true,
    Configuration: true,
    DevOps: true,
    Utilities: true,
  });

  const [expandedCloudProviders, setExpandedCloudProviders] = useState<Record<string, boolean>>({
    AWS: true,
    'Google Cloud': false,
    Azure: false,
  });
  const [expandedCloudCategories, setExpandedCloudCategories] = useState<Record<string, boolean>>({
    'Compute & Containers': true,
    Storage: true,
    Databases: true,
    Networking: true,
    'Messaging & Integration': true,
    Security: true,
    Observability: true,
    'AI & Analytics': true,
  });

  const toggleCloudProvider = (provider: string) => {
    setExpandedCloudProviders((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const toggleCloudCategory = (key: string) => {
    setExpandedCloudCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleShapeGroup = (cat: string) => {
    setExpandedShapeGroups((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleOthersSubcategory = (sub: string) => {
    setExpandedOthersSubcategories((prev) => ({ ...prev, [sub]: !prev[sub] }));
  };

  const searching = query.trim().length > 0;

  useEffect(() => {
    if (!scrollTarget) return;
    sections.current.get(scrollTarget.category)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [scrollTarget]);

  const handleCloudServiceClick = (item: CloudServiceItem) => {
    const isCurrentlyActive =
      placementItem?.kind === 'component' &&
      placementItem?.type === item.genericType &&
      placementItem?.label === item.name;

    if (isCurrentlyActive) {
      setPlacementItem(null);
    } else {
      setPlacementItem({
        kind: 'component',
        type: item.genericType,
        label: item.name,
      });
    }
  };

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

  const handleUtilityItemClick = (item: UtilityItem) => {
    const isCurrentlyActive =
      placementItem?.kind === item.kind &&
      (item.kind === 'shape' ? placementItem?.shapeType === item.shapeType : true) &&
      (item.kind === 'group' ? placementItem?.type === item.type : true);

    if (isCurrentlyActive) {
      setPlacementItem(null);
    } else {
      setPlacementItem({
        kind: item.kind,
        shapeType: item.shapeType,
        type: item.type,
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

  const renderCloudProviders = () => {
    const q = query.trim().toLowerCase();
    const filteredCloud = q
      ? CLOUD_SERVICES.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.provider.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.defaultTechStack.some((t) => t.toLowerCase().includes(q))
        )
      : CLOUD_SERVICES;

    if (q && filteredCloud.length === 0 && filteredComponents.length === 0) {
      return null;
    }

    const isCloudOpen = searching || expandedCategory === 'Cloud Providers';

    return (
      <section
        key="Cloud Providers"
        ref={(el) => {
          if (el) sections.current.set('Cloud Providers', el);
          else sections.current.delete('Cloud Providers');
        }}
        className="scroll-mt-1 pb-1"
      >
        <button
          type="button"
          onClick={() => onToggleCategory('Cloud Providers')}
          aria-expanded={isCloudOpen}
          className="focus-ring flex h-7 w-full items-center gap-1.5 rounded-[7px] px-2 text-left text-[11.5px] font-semibold text-text transition-colors duration-[120ms] hover:text-text cursor-pointer"
        >
          <Cloud className="size-3.5 text-accent" />
          <span>Cloud Providers</span>
          <span className="rounded-full bg-accent/15 px-1.5 py-0.2 text-[9.5px] font-medium text-accent">
            AWS · GCP · Azure
          </span>
          <ChevronDown
            className={cn(
              'ml-auto size-3.5 transition-transform duration-[120ms]',
              !isCloudOpen && '-rotate-90'
            )}
          />
        </button>

        {isCloudOpen && (
          <div className="space-y-2 pt-1 pb-2">
            {CLOUD_PROVIDERS.map((provider) => {
              const providerServices = filteredCloud.filter((s) => s.provider === provider);
              if (providerServices.length === 0) return null;

              const isProviderOpen = searching || !!expandedCloudProviders[provider];

              return (
                <div
                  key={provider}
                  className="rounded-[8px] border border-line bg-card/70 p-1.5 shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleCloudProvider(provider)}
                    aria-expanded={isProviderOpen}
                    className="focus-ring flex h-6 w-full items-center gap-1.5 rounded-md px-1.5 text-left text-[11.5px] font-medium text-text transition-colors hover:bg-surface-2 cursor-pointer"
                  >
                    <span className="font-semibold">{provider}</span>
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.2 text-[9.5px] text-text-muted">
                      {providerServices.length}
                    </span>
                    <ChevronDown
                      className={cn(
                        'ml-auto size-3 transition-transform duration-[120ms]',
                        !isProviderOpen && '-rotate-90'
                      )}
                    />
                  </button>

                  {isProviderOpen && (
                    <div className="space-y-1.5 pt-1.5">
                      {CLOUD_CATEGORIES.map((cat) => {
                        const catServices = providerServices.filter((s) => s.category === cat);
                        if (catServices.length === 0) return null;

                        const catKey = `${provider}-${cat}`;
                        const isCatOpen = searching || !!expandedCloudCategories[cat];

                        return (
                          <div key={catKey} className="rounded-md border border-line/50 bg-surface-1/40 p-1">
                            <button
                              type="button"
                              onClick={() => toggleCloudCategory(cat)}
                              aria-expanded={isCatOpen}
                              className="focus-ring flex h-5 w-full items-center gap-1 rounded px-1 text-left text-[10.5px] font-medium text-text-muted hover:text-text cursor-pointer"
                            >
                              <span>{cat}</span>
                              <ChevronDown
                                className={cn(
                                  'ml-auto size-2.5 transition-transform duration-[120ms]',
                                  !isCatOpen && '-rotate-90'
                                )}
                              />
                            </button>

                            {isCatOpen && (
                              <div className="grid grid-cols-2 gap-1.5 pt-0.5 pb-1">
                                {catServices.map((service) => {
                                  const Icon = service.icon;
                                  const isPlaced =
                                    placementItem?.kind === 'component' &&
                                    placementItem.type === service.genericType &&
                                    placementItem.label === service.name;

                                  const placementData: PlacementItem = {
                                    kind: 'component',
                                    type: service.genericType,
                                    label: service.name,
                                  };

                                  return (
                                    <SimpleTooltip
                                      key={service.id}
                                      label={`${service.name} (${service.provider}): ${service.description}`}
                                      side="right"
                                    >
                                      <div
                                        role="button"
                                        tabIndex={0}
                                        draggable
                                        onDragStart={(e) =>
                                          onDragStartPlacementItem(e, placementData)
                                        }
                                        onClick={() => handleCloudServiceClick(service)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleCloudServiceClick(service);
                                          }
                                        }}
                                        aria-label={`Place ${service.name}`}
                                        className={cn(
                                          'focus-ring group relative flex flex-col items-center justify-center gap-0.5 rounded-[8px] border border-line/60 bg-card/80 p-1.5 py-1.5 text-center transition-all duration-[120ms] select-none hover:border-line-hover hover:bg-surface-2 cursor-grab active:cursor-grabbing min-h-[58px]',
                                          isPlaced &&
                                            'border-accent bg-accent/10 shadow-xs ring-1 ring-accent/30'
                                        )}
                                      >
                                        <div
                                          className="flex size-6 items-center justify-center rounded-md transition-transform group-hover:scale-105"
                                          style={{ color: service.color }}
                                        >
                                          <Icon className="size-[20px] stroke-[1.8]" />
                                        </div>
                                        <span className="truncate w-full text-[10.5px] font-medium text-text text-center leading-tight px-0.5">
                                          {service.name}
                                        </span>
                                        <span className="text-[8.5px] font-mono text-text-muted/70 text-center leading-none">
                                          {service.provider}
                                        </span>
                                      </div>
                                    </SimpleTooltip>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderArchitectureComponents = () => (
    <div>
      {!filteredComponents.some((g) => g.category === 'Compute') && renderCloudProviders()}

      {filteredComponents.length === 0 &&
        CLOUD_SERVICES.filter((s) => {
          const q = query.trim().toLowerCase();
          return (
            !q ||
            s.name.toLowerCase().includes(q) ||
            s.provider.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q)
          );
        }).length === 0 && <EmptySearch query={query} type="components" />}

      {filteredComponents.map(({ category, types }) => {
        const open = searching || expandedCategory === category;
        return (
          <Fragment key={category}>
            <section
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
                className="focus-ring flex h-7 w-full items-center gap-1 rounded-[7px] px-2 text-left text-[11.5px] font-medium text-text-muted transition-colors duration-[120ms] hover:text-text cursor-pointer"
              >
                {category}
                <ChevronDown
                  className={cn('ml-auto size-3.5 transition-transform duration-[120ms]', !open && '-rotate-90')}
                />
              </button>
              {open && (
                <>
                  {category === 'Others' ? (
                    <div className="space-y-1.5 pt-0.5 pb-2">
                      {OTHERS_SUBCATEGORY_ORDER.map((subcategory) => {
                        const isUtilities = subcategory === 'Utilities';
                        const subTypes = types.filter((t) => t.config.subcategory === subcategory);
                        const q = query.trim().toLowerCase();
                        const subUtilities = isUtilities
                          ? OTHERS_UTILITIES.filter(
                              (u) =>
                                !q ||
                                u.label.toLowerCase().includes(q) ||
                                u.description.toLowerCase().includes(q)
                            )
                          : [];

                        if (!isUtilities && subTypes.length === 0) return null;

                        const subOpen = searching || !!expandedOthersSubcategories[subcategory];

                        return (
                          <div
                            key={subcategory}
                            className="rounded-[8px] border border-line/60 bg-surface-1/40 p-1"
                          >
                            <button
                              type="button"
                              onClick={() => toggleOthersSubcategory(subcategory)}
                              aria-expanded={subOpen}
                              className="focus-ring flex h-5 w-full items-center gap-1 rounded px-1 text-left text-[10.5px] font-medium text-text-muted hover:text-text cursor-pointer"
                            >
                              <span>{subcategory}</span>
                              <span className="rounded-full bg-surface-2 px-1 py-0.2 text-[9px] text-text-muted">
                                {isUtilities ? subUtilities.length : subTypes.length}
                              </span>
                              <ChevronDown
                                className={cn(
                                  'ml-auto size-2.5 transition-transform duration-[120ms]',
                                  !subOpen && '-rotate-90'
                                )}
                              />
                            </button>

                            {subOpen && (
                              <div className="grid grid-cols-2 gap-1.5 pt-1 pb-0.5">
                                {!isUtilities &&
                                  subTypes.map(({ type, config }) => {
                                    const Icon = config.icon;
                                    const isPlaced =
                                      placementItem?.kind === 'component' && placementItem.type === type;
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
                                          'focus-ring group relative flex flex-col items-center justify-center gap-1 rounded-[8px] border border-line/60 bg-card/70 p-1.5 py-2 text-center transition-all duration-[120ms] select-none hover:border-line-hover hover:bg-surface-2 cursor-grab active:cursor-grabbing min-h-[62px]',
                                          isPlaced && 'border-accent bg-accent/10 shadow-xs ring-1 ring-accent/30'
                                        )}
                                      >
                                        <div
                                          className="flex size-7 items-center justify-center rounded-md transition-transform group-hover:scale-105"
                                          style={{ color: config.color }}
                                        >
                                          <Icon className="size-[24px] stroke-[1.8]" />
                                        </div>
                                        <span className="truncate w-full text-[10.5px] font-medium text-text text-center leading-tight px-1">
                                          {config.label}
                                        </span>
                                      </div>
                                    );
                                  })}

                                {isUtilities &&
                                  subUtilities.map((util) => {
                                    const Icon = util.icon;
                                    const isPlaced =
                                      placementItem?.kind === util.kind &&
                                      (util.kind === 'shape' ? placementItem?.shapeType === util.shapeType : true) &&
                                      (util.kind === 'group' ? placementItem?.type === util.type : true);

                                    const placementData: PlacementItem = {
                                      kind: util.kind,
                                      shapeType: util.shapeType,
                                      type: util.type,
                                      label: util.label,
                                    };

                                    return (
                                      <div
                                        key={util.id}
                                        role="button"
                                        tabIndex={0}
                                        draggable
                                        onDragStart={(e) => onDragStartPlacementItem(e, placementData)}
                                        onClick={() => handleUtilityItemClick(util)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleUtilityItemClick(util);
                                          }
                                        }}
                                        aria-label={`Place ${util.label}`}
                                        className={cn(
                                          'focus-ring group relative flex flex-col items-center justify-center gap-1 rounded-[8px] border border-line/60 bg-card/70 p-1.5 py-2 text-center transition-all duration-[120ms] select-none hover:border-line-hover hover:bg-surface-2 cursor-grab active:cursor-grabbing min-h-[62px]',
                                          isPlaced && 'border-accent bg-accent/10 shadow-xs ring-1 ring-accent/30'
                                        )}
                                      >
                                        <div
                                          className="flex size-7 items-center justify-center rounded-md transition-transform group-hover:scale-105"
                                          style={{ color: util.color }}
                                        >
                                          <Icon className="size-[24px] stroke-[1.8]" />
                                        </div>
                                        <span className="truncate w-full text-[10.5px] font-medium text-text text-center leading-tight px-1">
                                          {util.label}
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={cn(category === 'Client & Edge' ? 'grid grid-cols-3 gap-1.5 pt-0.5 pb-1.5' : 'grid grid-cols-2 gap-1.5 pt-0.5 pb-1.5')}>
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
                              'focus-ring group relative flex flex-col items-center justify-center gap-1 rounded-[8px] border border-line/60 bg-card/70 p-1.5 py-2 text-center transition-all duration-[120ms] select-none hover:border-line-hover hover:bg-surface-2 cursor-grab active:cursor-grabbing min-h-[62px]',
                              isPlaced && 'border-accent bg-accent/10 shadow-xs ring-1 ring-accent/30'
                            )}
                          >
                            <div
                              className="flex size-7 items-center justify-center rounded-md transition-transform group-hover:scale-105"
                              style={{ color: config.color }}
                            >
                              <Icon className="size-[24px] stroke-[1.8]" />
                            </div>
                            <span className="truncate w-full text-[10.5px] font-medium text-text text-center leading-tight px-1">
                              {config.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </section>
            {category === 'Compute' && renderCloudProviders()}
          </Fragment>
        );
      })}
    </div>
  );

  return (
    <Panel className="animate-panel-in absolute top-4 bottom-4 left-[76px] z-10 flex w-[288px] flex-col overflow-hidden shadow-[var(--shadow-xl)] border border-line bg-card">
      {/* Header matching reference image: Title on left with icon, collapse button on right */}
      <div className="flex items-center justify-between pt-2.5 pr-2.5 pb-2 pl-3.5 border-b border-line/60 h-[42px] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {activeTab === 'diagrams' || activeTab === 'components' ? (
            <>
              <Network className="size-4 text-accent shrink-0" />
              <h2 className="text-[13.5px] font-semibold text-text tracking-tight truncate">Diagrams</h2>
            </>
          ) : activeTab === 'shapes' ? (
            <>
              <Layers className="size-4 text-accent shrink-0" />
              <h2 className="text-[13.5px] font-semibold text-text tracking-tight truncate">Shapes &amp; Symbols</h2>
            </>
          ) : (
            <>
              <FileText className="size-4 text-accent shrink-0" />
              <h2 className="text-[13.5px] font-semibold text-text tracking-tight truncate">Design Steps</h2>
            </>
          )}
        </div>
        <SimpleTooltip label="Collapse" keys={getShortcutKeys('toggle-library')} side="right">
          <Button variant="icon" size="icon-sm" aria-label="Collapse library" onClick={onCollapse}>
            <PanelLeft className="size-[15px]" />
          </Button>
        </SimpleTooltip>
      </div>

      {/* Three Selectors at top: Architecture, Sequence, ER Diagram (All 3 visible at all times) */}
      {(activeTab === 'diagrams' || activeTab === 'components') && (
        <div className="px-2.5 pt-2.5 pb-1 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-[10px] bg-line/25 border border-line/50">
            {/* 1. Architecture */}
            <button
              type="button"
              onClick={() => onDiagramTypeChange('architecture')}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-[7px] text-center transition-all cursor-pointer select-none',
                diagramType === 'architecture'
                  ? 'border border-[#8b5cf6]/80 bg-[#8b5cf6]/20 text-[#a78bfa] font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text hover:bg-surface-2 border border-transparent'
              )}
            >
              <Cpu className="size-3.5 shrink-0" />
              <span className="text-[10px] leading-tight truncate w-full">Architecture</span>
            </button>

            {/* 2. Sequence */}
            <button
              type="button"
              onClick={() => onDiagramTypeChange('sequence')}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-[7px] text-center transition-all cursor-pointer select-none',
                diagramType === 'sequence'
                  ? 'border border-[#3b82f6]/80 bg-[#3b82f6]/20 text-[#60a5fa] font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text hover:bg-surface-2 border border-transparent'
              )}
            >
              <Workflow className="size-3.5 shrink-0" />
              <span className="text-[10px] leading-tight truncate w-full">Sequence</span>
            </button>

            {/* 3. ER Diagram */}
            <button
              type="button"
              onClick={() => onDiagramTypeChange('er')}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-[7px] text-center transition-all cursor-pointer select-none',
                diagramType === 'er'
                  ? 'border border-[#10b981]/80 bg-[#10b981]/20 text-[#34d399] font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text hover:bg-surface-2 border border-transparent'
              )}
            >
              <Database className="size-3.5 shrink-0" />
              <span className="text-[10px] leading-tight truncate w-full">ER Diagram</span>
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="px-2.5 pt-2 pb-1.5 shrink-0">
        <SearchInput
          variant="inset"
          placeholder={
            activeTab === 'diagrams' || activeTab === 'components'
              ? 'Search components...'
              : activeTab === 'shapes'
                ? 'Search shapes & symbols...'
                : 'Search design steps...'
          }
          aria-label="Search library"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      {/* Content Area - switches content of this same panel */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-3">
        {/* ── TAB 0 & 1: DIAGRAMS & COMPONENTS (MATCHING REFERENCE IMAGE) ──────────── */}
        {(activeTab === 'diagrams' || activeTab === 'components') && (
          <div className="pt-1">
            {diagramType === 'architecture' && renderArchitectureComponents()}
            {diagramType === 'sequence' && (
              <div>
                {DIAGRAM_SEQUENCE_GROUPS.map(renderDiagramGroup)}
              </div>
            )}
            {diagramType === 'er' && (
              <div>
                {DIAGRAM_ER_GROUPS.map(renderDiagramGroup)}
              </div>
            )}
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
                    className="focus-ring flex h-7 w-full items-center gap-1.5 rounded-[7px] px-2 text-left text-[11.5px] font-medium text-text-muted transition-colors duration-[120ms] hover:text-text cursor-pointer"
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
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5 px-0.5 pb-1.5">
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
                                'focus-ring group relative flex flex-col items-center justify-center gap-1 rounded-[8px] border border-line/60 bg-card/70 p-1.5 py-2 text-center transition-all duration-[120ms] select-none hover:border-line-hover hover:bg-surface-2 cursor-grab active:cursor-grabbing min-h-[56px]',
                                isPlaced && 'border-accent bg-accent/10 shadow-xs ring-1 ring-accent/30'
                              )}
                            >
                              <div className="flex size-7 items-center justify-center transition-transform group-hover:scale-105">
                                <ShapeMiniPreview item={item} />
                              </div>
                              <span className="truncate w-full text-[10.5px] font-medium text-text text-center leading-tight px-1">
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

        {/* ── TAB 3: DESIGN STEPS ──────────────────────────────────── */}
        {activeTab === 'steps' && (
          <div>
            {filteredSteps.length === 0 && <EmptySearch query={query} type="steps" />}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5 pb-1.5">
              {filteredSteps.map((step) => {
                const Icon = step.icon;
                const isPlaced = placementItem?.kind === 'step' && placementItem?.stepId === step.id;
                return (
                  <SimpleTooltip key={step.id} label={`${step.title}: ${step.subtitle}`} side="right">
                    <div
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(e) =>
                        onDragStartPlacementItem(e, {
                          kind: 'step',
                          stepId: step.id,
                          label: step.title,
                        })
                      }
                      onClick={() => handleStepClick(step)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleStepClick(step);
                        }
                      }}
                      aria-label={`Place ${step.title}`}
                      className={cn(
                        'focus-ring group relative flex flex-col items-center justify-center gap-1 rounded-[8px] border border-line/60 bg-card/70 p-1.5 py-2 text-center transition-all duration-[120ms] select-none hover:border-line-hover hover:bg-surface-2 cursor-grab active:cursor-grabbing min-h-[62px]',
                        isPlaced && 'border-accent bg-accent/10 shadow-xs ring-1 ring-accent/30'
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <span className="flex size-4 items-center justify-center rounded bg-accent/15 text-[9px] font-bold text-accent">
                          {step.stepNumber}
                        </span>
                        <Icon className="size-[19px] text-accent stroke-[1.8]" />
                      </div>
                      <span className="truncate w-full text-[10.5px] font-semibold text-text text-center leading-tight px-1">
                        {step.title}
                      </span>
                    </div>
                  </SimpleTooltip>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function LibraryRail({
  activeTab,
  collapsed,
  onSelectTab,
}: {
  activeTab: LibraryTab;
  collapsed: boolean;
  onSelectTab: (tab: LibraryTab) => void;
}) {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);

  return (
    <Panel className="animate-panel-in absolute top-4 left-4 z-10 flex w-[58px] flex-col items-center gap-1 p-1.5 shadow-[var(--shadow-xl)] border border-line bg-card max-h-[calc(100vh-2rem)] overflow-x-hidden overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
          onClick={() => setActiveTool('rectangle')}
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
          onClick={() => setActiveTool('circle')}
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
          onClick={() => setActiveTool('arrow')}
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
          onClick={() => setActiveTool('line')}
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

      <div aria-hidden className="mx-1 my-1 h-px w-full bg-line" />

      {/* ── BOTTOM NAVIGATION: DIAGRAMS, COMPONENTS, SHAPES, STEPS ── */}
      {/* 0. Diagrams */}
      <button
        type="button"
        aria-label="Diagrams"
        onClick={() => onSelectTab('diagrams')}
        className={cn(
          'focus-ring flex flex-col items-center justify-center gap-1 w-full py-2 px-0.5 rounded-[8px] transition-colors cursor-pointer overflow-hidden',
          activeTab === 'diagrams' && !collapsed
            ? 'bg-accent/15 text-accent shadow-2xs font-semibold'
            : 'text-text-muted hover:text-text hover:bg-surface-2'
        )}
      >
        <Network className="size-[18px] shrink-0" />
        <span className="text-[9px] leading-none tracking-tight truncate max-w-full">Diagrams</span>
      </button>

      {/* 1. Components */}
      <button
        type="button"
        aria-label="Components"
        onClick={() => onSelectTab('components')}
        className={cn(
          'focus-ring flex flex-col items-center justify-center gap-1 w-full py-2 px-0.5 rounded-[8px] transition-colors cursor-pointer overflow-hidden',
          activeTab === 'components' && !collapsed
            ? 'bg-accent/15 text-accent shadow-2xs font-semibold'
            : 'text-text-muted hover:text-text hover:bg-surface-2'
        )}
      >
        <LayoutGrid className="size-[18px] shrink-0" />
        <span className="text-[9px] leading-none tracking-tight truncate max-w-full">Components</span>
      </button>

      {/* 2. Shapes */}
      <button
        type="button"
        aria-label="Shapes"
        onClick={() => onSelectTab('shapes')}
        className={cn(
          'focus-ring flex flex-col items-center justify-center gap-1 w-full py-2 px-0.5 rounded-[8px] transition-colors cursor-pointer overflow-hidden',
          activeTab === 'shapes' && !collapsed
            ? 'bg-accent/15 text-accent shadow-2xs font-semibold'
            : 'text-text-muted hover:text-text hover:bg-surface-2'
        )}
      >
        <Layers className="size-[18px] shrink-0" />
        <span className="text-[9px] leading-none tracking-tight truncate max-w-full">Shapes</span>
      </button>

      {/* 3. Steps */}
      <button
        type="button"
        aria-label="Steps"
        onClick={() => onSelectTab('steps')}
        className={cn(
          'focus-ring flex flex-col items-center justify-center gap-1 w-full py-2 px-0.5 rounded-[8px] transition-colors cursor-pointer overflow-hidden',
          activeTab === 'steps' && !collapsed
            ? 'bg-accent/15 text-accent shadow-2xs font-semibold'
            : 'text-text-muted hover:text-text hover:bg-surface-2'
        )}
      >
        <FileText className="size-[18px] shrink-0" />
        <span className="text-[9px] leading-none tracking-tight truncate max-w-full">Steps</span>
      </button>
    </Panel>
  );
}

function LibrarySheet({
  open,
  onOpenChange,
  query,
  onQueryChange,
  onAdd,
  diagramType = 'architecture',
  onDiagramTypeChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onAdd: (type: SystemNodeType) => void;
  diagramType?: DiagramType;
  onDiagramTypeChange?: (dt: DiagramType) => void;
}) {
  const [sheetTab, setSheetTab] = useState<LibraryTab>('diagrams');
  const [localDiagramType, setLocalDiagramType] = useState<DiagramType>(diagramType);
  const currentDiagramType = onDiagramTypeChange ? diagramType : localDiagramType;
  const setDiagType = onDiagramTypeChange ?? setLocalDiagramType;
  const setPlacementItem = useCanvasStore((s) => s.setPlacementItem);

  const filteredComponents = useMemo(() => filterCategories(query), [query]);
  const filteredShapes = useMemo(() => filterShapeGroups(query), [query]);
  const filteredSteps = useMemo(() => filterSteps(query), [query]);

  const currentDiagramGroups = useMemo(() => {
    if (currentDiagramType === 'sequence') return DIAGRAM_SEQUENCE_GROUPS;
    if (currentDiagramType === 'er') return DIAGRAM_ER_GROUPS;
    return DIAGRAM_ARCHITECTURE_GROUPS;
  }, [currentDiagramType]);

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
        <div className="flex shrink-0 gap-2 px-3.5 py-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSheetTab('diagrams')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0',
              sheetTab === 'diagrams' ? 'bg-ink text-paper' : 'bg-surface-2 text-text-muted hover:text-text'
            )}
          >
            Diagrams
          </button>
          <button
            type="button"
            onClick={() => setSheetTab('components')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0',
              sheetTab === 'components' ? 'bg-ink text-paper' : 'bg-surface-2 text-text-muted hover:text-text'
            )}
          >
            Components
          </button>
          <button
            type="button"
            onClick={() => setSheetTab('shapes')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0',
              sheetTab === 'shapes' ? 'bg-ink text-paper' : 'bg-surface-2 text-text-muted hover:text-text'
            )}
          >
            Shapes
          </button>
          <button
            type="button"
            onClick={() => setSheetTab('steps')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0',
              sheetTab === 'steps' ? 'bg-ink text-paper' : 'bg-surface-2 text-text-muted hover:text-text'
            )}
          >
            Design Steps
          </button>
        </div>

        {/* Diagrams Sub-Selectors if in diagrams tab */}
        {sheetTab === 'diagrams' && (
          <div className="flex items-center gap-1.5 px-3.5 pb-2">
            <button
              type="button"
              onClick={() => setDiagType('architecture')}
              className={cn(
                'flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all text-center',
                currentDiagramType === 'architecture'
                  ? 'border-[#8b5cf6]/80 bg-[#8b5cf6]/20 text-[#a78bfa]'
                  : 'border-line/60 bg-surface-1/40 text-text-muted'
              )}
            >
              Architecture
            </button>
            <button
              type="button"
              onClick={() => setDiagType('sequence')}
              className={cn(
                'flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all text-center',
                currentDiagramType === 'sequence'
                  ? 'border-[#3b82f6]/80 bg-[#3b82f6]/20 text-[#60a5fa]'
                  : 'border-line/60 bg-surface-1/40 text-text-muted'
              )}
            >
              Sequence
            </button>
            <button
              type="button"
              onClick={() => setDiagType('er')}
              className={cn(
                'flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all text-center',
                currentDiagramType === 'er'
                  ? 'border-[#10b981]/80 bg-[#10b981]/20 text-[#34d399]'
                  : 'border-line/60 bg-surface-1/40 text-text-muted'
              )}
            >
              ER Diagram
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-3.5">
          {sheetTab === 'diagrams' && (
            <div className="space-y-3">
              {currentDiagramGroups.map((group) => {
                const q = query.trim().toLowerCase();
                const filtered = group.items.filter((item) => !q || item.label.toLowerCase().includes(q));
                if (filtered.length === 0) return null;

                return (
                  <div key={group.category} className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-text-muted">{group.category}</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {filtered.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setPlacementItem(item.placement);
                              onOpenChange(false);
                            }}
                            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-line bg-card p-2 text-center hover:bg-surface-2"
                          >
                            <div className="flex size-7 items-center justify-center" style={{ color: item.color }}>
                              <Icon className="size-[20px]" />
                            </div>
                            <span className="text-[10px] font-medium truncate w-full">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
  const [activeTab, setActiveTab] = useState<LibraryTab>('diagrams');
  const diagramType = useCanvasStore((s) => s.diagramType);
  const setDiagramType = useCanvasStore((s) => s.setDiagramType);
  const [query, setQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(
    ALL_CATEGORIES[0].category
  );
  const [scrollTarget] = useState<ScrollTarget | null>(null);

  if (narrow) {
    return (
      <LibrarySheet
        open={!collapsed}
        onOpenChange={(open) => setCollapsed(!open)}
        query={query}
        onQueryChange={setQuery}
        diagramType={diagramType}
        onDiagramTypeChange={setDiagramType}
        onAdd={(type) => {
          addAtCenter(type);
          setCollapsed(true);
        }}
      />
    );
  }

  return (
    <>
      <LibraryRail
        activeTab={activeTab}
        collapsed={collapsed}
        onSelectTab={(tab) => {
          if (collapsed) {
            setActiveTab(tab);
            setCollapsed(false);
          } else if (activeTab === tab) {
            setCollapsed(true);
          } else {
            setActiveTab(tab);
          }
          setQuery('');
        }}
      />

      {!collapsed && (
        <LibraryPanel
          activeTab={activeTab}
          diagramType={diagramType}
          onDiagramTypeChange={setDiagramType}
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
      )}
    </>
  );
}
