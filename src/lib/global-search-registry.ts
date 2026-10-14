import type { LucideIcon } from 'lucide-react';
import {
  MousePointer2,
  Square,
  Circle,
  ArrowUpRight,
  Minus,
  Pencil,
  Eraser,
  Type,
  Hand,
  CircleDot,
  FileText,
  Workflow,
  LayoutDashboard,
  RotateCcw,
  RotateCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Download,
  Trash2,
} from 'lucide-react';
import type { CanvasTool, PlacementItem, SystemNodeType } from '@/types';
import { NODE_REGISTRY } from '@/components/nodes/node-registry';
import { CLOUD_SERVICES } from '@/lib/cloud-registry';
import { POPULAR_SERVICES } from '@/lib/popular-services-registry';
import { TECHNOLOGY_STACK_PRESETS, type StackPreset } from '@/lib/technology-stacks';
import { SYSTEM_DESIGN_STEPS } from '@/lib/steps-registry';
import { SHAPE_LIBRARY_CATEGORIES } from '@/lib/shapes-registry';
import { DIAGRAM_SEQUENCE_GROUPS, DIAGRAM_ER_GROUPS } from '@/lib/diagram-registry';
import { EXPANDED_COMPONENTS } from '@/lib/expanded-components-registry';

export type GlobalGroup =
  | 'Components'
  | 'Apps & Services'
  | 'Technology Stacks'
  | 'Diagrams'
  | 'Tools';

export type GlobalCategory =
  | 'Tools'
  | 'Diagrams'
  | 'Components'
  | 'Cloud'
  | 'Tech Stacks'
  | 'Technology Stacks'
  | 'Popular Apps'
  | 'Apps & Services'
  | 'Shapes'
  | 'Steps';

export const GLOBAL_FILTER_CATEGORIES = [
  'All Categories',
  'Components',
  'Apps & Services',
  'Technology Stacks',
  'Diagrams',
  'Tools',
] as const;

export type GlobalFilterCategory = (typeof GLOBAL_FILTER_CATEGORIES)[number];

export interface GlobalSearchItem {
  id: string;
  label: string;
  category: GlobalCategory;
  group: GlobalGroup;
  subcategory?: string;
  description: string;
  keywords?: string[];
  aliases?: string[];
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  customIcon?: string;
  color?: string;
  shortcut?: string;
  badge?: string;
  action: {
    kind: 'tool' | 'placement' | 'preset' | 'action';
    tool?: CanvasTool;
    placement?: PlacementItem;
    preset?: StackPreset;
    actionId?: string;
  };
}

export function getItemGroup(category: GlobalCategory): GlobalGroup {
  if (category === 'Tools') return 'Tools';
  if (category === 'Diagrams') return 'Diagrams';
  if (category === 'Tech Stacks' || category === 'Technology Stacks') return 'Technology Stacks';
  if (category === 'Popular Apps' || category === 'Cloud' || category === 'Apps & Services') return 'Apps & Services';
  return 'Components';
}

export const TYPO_MAP: Record<string, string[]> = {
  pencile: ['pencil'],
  erser: ['eraser'],
  eraser: ['eraser'],
  spes: ['shapes', 'shape'],
  shape: ['shapes', 'shape'],
  shapes: ['shapes', 'shape'],
  sequsces: ['sequence'],
  sequence: ['sequence'],
  seq: ['sequence'],
  diahrgarm: ['diagram'],
  diahrgam: ['diagram'],
  diagram: ['diagram'],
  sercla: ['circle'],
  circle: ['circle'],
  arrors: ['arrow'],
  arrow: ['arrow'],
  staks: ['stack', 'stacks'],
  stacks: ['stack', 'stacks'],
  stack: ['stack', 'stacks'],
  componet: ['component', 'components'],
  component: ['component', 'components'],
  components: ['component', 'components'],
  er: ['er', 'entity', 'database'],
  react: ['react', 'react.js', 'reactjs'],
  'react.js': ['react', 'react.js', 'reactjs'],
  reactjs: ['react', 'react.js', 'reactjs'],
  postgres: ['postgres', 'postgresql', 'psql'],
  postgresql: ['postgres', 'postgresql', 'psql'],
  psql: ['postgres', 'postgresql', 'psql'],
  fb: ['facebook'],
  facebook: ['facebook', 'fb'],
  k8s: ['kubernetes'],
  kubernetes: ['kubernetes', 'k8s'],
  kube: ['kubernetes', 'k8s'],
  mongo: ['mongodb', 'mongo'],
  mongodb: ['mongodb', 'mongo'],
  py: ['python'],
  python: ['python', 'py'],
  node: ['node.js', 'nodejs', 'node'],
  'node.js': ['node.js', 'nodejs', 'node'],
  nodejs: ['node.js', 'nodejs', 'node'],
  js: ['javascript', 'js'],
  javascript: ['javascript', 'js'],
  ts: ['typescript', 'ts'],
  typescript: ['typescript', 'ts'],
  es: ['elasticsearch'],
  elasticsearch: ['elasticsearch', 'es'],
  mq: ['message queue', 'queue', 'rabbitmq', 'kafka'],
  kafka: ['kafka', 'streaming', 'mq'],
  rabbit: ['rabbitmq', 'mq'],
  rabbitmq: ['rabbitmq', 'mq'],
  redis: ['redis', 'cache'],
  db: ['database', 'db', 'sql', 'nosql'],
  database: ['database', 'db'],
  lb: ['load balancer', 'loadbalancer', 'lb'],
  'load balancer': ['load balancer', 'loadbalancer', 'lb'],
  loadbalancer: ['load balancer', 'loadbalancer', 'lb'],
  gw: ['gateway', 'api gateway'],
  gateway: ['gateway', 'api gateway'],
  auth: ['auth', 'authentication', 'oauth', 'jwt'],
};

// 1. Core Tools & Quick Canvas Actions
const TOOL_ITEMS: GlobalSearchItem[] = [
  {
    id: 'tool-select',
    label: 'Select Tool',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'Pointer',
    description: 'Select, move, transform and drag elements on canvas',
    keywords: ['cursor', 'pointer', 'move', 'drag', 'pick', 'v'],
    icon: MousePointer2,
    shortcut: 'V',
    action: { kind: 'tool', tool: 'select' },
  },
  {
    id: 'tool-hand',
    label: 'Hand / Pan Tool',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'Navigation',
    description: 'Pan freely across the canvas in any direction',
    keywords: ['hand', 'pan', 'drag', 'canvas', 'navigate', 'h'],
    icon: Hand,
    shortcut: 'H',
    action: { kind: 'tool', tool: 'hand' },
  },
  {
    id: 'tool-rectangle',
    label: 'Rectangle Shape',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'Drawing',
    description: 'Draw box or rectangle container shape',
    keywords: ['box', 'square', 'rect', 'spes', 'r'],
    icon: Square,
    shortcut: 'R',
    action: { kind: 'tool', tool: 'rectangle' },
  },
  {
    id: 'tool-circle',
    label: 'Circle / Round Shape',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'Drawing',
    description: 'Draw circle, round node, or ellipse',
    keywords: ['round', 'ellipse', 'ball', 'sercla', 'spes', 'o'],
    icon: Circle,
    shortcut: 'O',
    action: { kind: 'tool', tool: 'circle' },
  },
  {
    id: 'tool-arrow',
    label: 'Arrow Connector',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'Connector',
    description: 'Draw directional connecting arrow between nodes',
    keywords: ['arrors', 'arrow', 'pointer', 'vector', 'line', 'a'],
    icon: ArrowUpRight,
    shortcut: 'A',
    action: { kind: 'tool', tool: 'arrow' },
  },
  {
    id: 'tool-line',
    label: 'Straight Line',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'Connector',
    description: 'Draw straight connecting line without arrowheads',
    keywords: ['lines', 'line', 'wire', 'divider', 'l'],
    icon: Minus,
    shortcut: 'L',
    action: { kind: 'tool', tool: 'line' },
  },
  {
    id: 'tool-pencil',
    label: 'Pencil Tool',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'Drawing',
    description: 'Freehand sketching, drawing and wireframing pen',
    keywords: ['pencile', 'pencil', 'pen', 'draw', 'sketch', 'brush', 'd'],
    icon: Pencil,
    shortcut: 'D',
    action: { kind: 'tool', tool: 'pencil' },
  },
  {
    id: 'tool-eraser',
    label: 'Eraser Tool',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'Drawing',
    description: 'Erase drawings, strokes, and canvas elements',
    keywords: ['erser', 'eraser', 'delete', 'remove', 'clean', 'e'],
    icon: Eraser,
    shortcut: 'E',
    action: { kind: 'tool', tool: 'eraser' },
  },
  {
    id: 'tool-text',
    label: 'Text Tool',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'Annotation',
    description: 'Add editable rich text label or headline',
    keywords: ['text', 'label', 'font', 'write', 'annotation', 't'],
    icon: Type,
    shortcut: 'T',
    action: { kind: 'tool', tool: 'text' },
  },
  {
    id: 'tool-junction',
    label: 'Connection Junction',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'Connector',
    description: 'Shared anchor dot connecting multiple lines',
    keywords: ['junction', 'anchor', 'hub', 'joint', 'j'],
    icon: CircleDot,
    shortcut: 'J',
    action: {
      kind: 'placement',
      placement: { kind: 'junction', label: 'Junction' },
    },
  },
  {
    id: 'tool-autolayout',
    label: 'Auto Layout',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'Arrangement',
    description: 'Automatically arrange canvas nodes hierarchically',
    keywords: ['auto layout', 'layout', 'arrange', 'organize', 'dagre'],
    icon: LayoutDashboard,
    action: { kind: 'action', actionId: 'autolayout' },
  },
  {
    id: 'tool-fitview',
    label: 'Fit View',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'View',
    description: 'Fit all nodes in view centered on screen',
    keywords: ['fit', 'center', 'zoom to fit', 'f'],
    icon: Maximize2,
    shortcut: 'F',
    action: { kind: 'action', actionId: 'fitview' },
  },
  {
    id: 'tool-zoomin',
    label: 'Zoom In',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'View',
    description: 'Zoom in closer to view fine diagram details',
    keywords: ['zoom in', 'enlarge', 'magnify', '+'],
    icon: ZoomIn,
    shortcut: 'Ctrl++',
    action: { kind: 'action', actionId: 'zoomin' },
  },
  {
    id: 'tool-zoomout',
    label: 'Zoom Out',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'View',
    description: 'Zoom out to view broad system architecture',
    keywords: ['zoom out', 'shrink', '-'],
    icon: ZoomOut,
    shortcut: 'Ctrl+-',
    action: { kind: 'action', actionId: 'zoomout' },
  },
  {
    id: 'tool-undo',
    label: 'Undo Action',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'History',
    description: 'Revert previous canvas modification',
    keywords: ['undo', 'revert', 'back'],
    icon: RotateCcw,
    shortcut: 'Ctrl+Z',
    action: { kind: 'action', actionId: 'undo' },
  },
  {
    id: 'tool-redo',
    label: 'Redo Action',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'History',
    description: 'Re-apply previously undone modification',
    keywords: ['redo', 'forward'],
    icon: RotateCw,
    shortcut: 'Ctrl+Y',
    action: { kind: 'action', actionId: 'redo' },
  },
  {
    id: 'tool-export',
    label: 'Export Canvas',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'File',
    description: 'Export architecture diagram to PNG, SVG, or JSON',
    keywords: ['export', 'save as', 'download', 'image', 'png', 'svg'],
    icon: Download,
    action: { kind: 'action', actionId: 'export' },
  },
  {
    id: 'tool-clear',
    label: 'Clear Canvas',
    category: 'Tools',
    group: 'Tools',
    subcategory: 'File',
    description: 'Remove all components and reset canvas',
    keywords: ['clear', 'clean', 'reset', 'delete all', 'empty'],
    icon: Trash2,
    action: { kind: 'action', actionId: 'clear' },
  },
];

// 2. Diagram Elements (Sequence & ER)
const DIAGRAM_ITEMS: GlobalSearchItem[] = [
  ...DIAGRAM_SEQUENCE_GROUPS.flatMap((g) =>
    g.items.map((item) => ({
      id: `diag-seq-${item.id}`,
      label: item.label,
      category: 'Diagrams' as GlobalCategory,
      group: 'Diagrams' as GlobalGroup,
      subcategory: `Sequence (${g.category})`,
      description: `Sequence diagram element: ${item.label}`,
      keywords: ['sequence', 'sequsces', 'diahrgarm', 'diagram', g.category.toLowerCase()],
      icon: item.icon,
      color: item.color,
      badge: 'Sequence',
      action: {
        kind: 'placement' as const,
        placement: item.placement,
      },
    }))
  ),
  ...DIAGRAM_ER_GROUPS.flatMap((g) =>
    g.items.map((item) => ({
      id: `diag-er-${item.id}`,
      label: item.label,
      category: 'Diagrams' as GlobalCategory,
      group: 'Diagrams' as GlobalGroup,
      subcategory: `ER Diagram (${g.category})`,
      description: `ER diagram entity: ${item.label}`,
      keywords: ['er', 'database', 'schema', 'relational', 'diahrgarm', 'diagram', g.category.toLowerCase()],
      icon: item.icon,
      color: item.color,
      badge: 'ER',
      action: {
        kind: 'placement' as const,
        placement: item.placement,
      },
    }))
  ),
];

// 3. Base Node Registry Components
const COMPONENT_ITEMS: GlobalSearchItem[] = Object.entries(NODE_REGISTRY).map(([type, config]) => ({
  id: `comp-base-${type}`,
  label: config.label,
  category: 'Components',
  group: 'Components',
  subcategory: config.category,
  description: `${config.category} architecture node: ${config.label}`,
  keywords: [
    type,
    config.category.toLowerCase(),
    'component',
    'componet',
    'node',
    config.subcategory ? config.subcategory.toLowerCase() : '',
  ].filter(Boolean),
  icon: config.icon,
  color: config.color,
  badge: config.category,
  action: {
    kind: 'placement',
    placement: {
      kind: 'component',
      type: type as SystemNodeType,
      label: config.label,
    },
  },
}));

// 4. Expanded Components & Tech Stacks (React, Node, PostgreSQL, etc.)
const EXPANDED_ITEMS: GlobalSearchItem[] = EXPANDED_COMPONENTS.map((c) => ({
  id: `comp-exp-${c.id}`,
  label: c.label,
  category: 'Components',
  group: 'Components',
  subcategory: c.category,
  description: c.description,
  keywords: [
    c.label.toLowerCase(),
    c.category.toLowerCase(),
    c.genericType.toLowerCase(),
    ...c.aliases.map((a) => a.toLowerCase()),
    ...c.defaultTechStack.map((t) => t.toLowerCase()),
  ],
  aliases: c.aliases,
  customIcon: c.customIcon,
  color: c.color,
  badge: c.category,
  action: {
    kind: 'placement',
    placement: {
      kind: 'component',
      type: c.genericType,
      label: c.label,
      customIcon: c.customIcon,
      color: c.color,
      defaultTechStack: c.defaultTechStack,
      description: c.description,
    },
  },
}));

// 5. Cloud Services
const CLOUD_ITEMS: GlobalSearchItem[] = CLOUD_SERVICES.map((s) => ({
  id: `cloud-${s.id}`,
  label: s.name,
  category: 'Cloud',
  group: 'Apps & Services',
  subcategory: `${s.provider} · ${s.category}`,
  description: s.description,
  keywords: [
    s.provider.toLowerCase(),
    s.category.toLowerCase(),
    'cloud',
    ...s.defaultTechStack.map((t) => t.toLowerCase()),
  ],
  icon: s.icon,
  color: s.color,
  badge: s.provider,
  action: {
    kind: 'placement',
    placement: {
      kind: 'component',
      type: s.genericType,
      label: s.name,
      color: s.color,
      defaultTechStack: s.defaultTechStack,
      description: s.description,
    },
  },
}));

// 6. Tech Stack Presets
const STACK_ITEMS: GlobalSearchItem[] = TECHNOLOGY_STACK_PRESETS.map((preset) => ({
  id: `preset-${preset.id}`,
  label: preset.name,
  category: 'Tech Stacks',
  group: 'Technology Stacks',
  subcategory: `${preset.nodes.length} nodes preset`,
  description: preset.description,
  keywords: [
    'preset',
    'stack',
    'staks',
    'template',
    'architecture',
    ...preset.nodes.map((n) => n.label.toLowerCase()),
  ],
  icon: Workflow,
  color: '#8b5cf6',
  badge: `${preset.nodes.length} nodes`,
  action: {
    kind: 'preset',
    preset,
  },
}));

// 7. Popular Apps & Services (Facebook, Netflix, Google, Slack, etc.)
const POPULAR_ITEMS: GlobalSearchItem[] = POPULAR_SERVICES.map((app) => ({
  id: `app-${app.id}`,
  label: app.name,
  category: 'Popular Apps',
  group: 'Apps & Services',
  subcategory: app.category,
  description: app.description,
  keywords: [
    'app',
    'service',
    app.name.toLowerCase(),
    app.category.toLowerCase(),
    ...app.aliases.map((a) => a.toLowerCase()),
    ...app.defaultTechStack.map((t) => t.toLowerCase()),
  ],
  aliases: app.aliases,
  customIcon: app.customIcon,
  color: app.color,
  badge: app.category,
  action: {
    kind: 'placement',
    placement: {
      kind: 'component',
      type: app.genericType,
      label: app.name,
      customIcon: app.customIcon,
      color: app.color,
      defaultTechStack: app.defaultTechStack,
      description: app.description,
    },
  },
}));

// 8. Shapes & Symbols
const SHAPE_ITEMS: GlobalSearchItem[] = SHAPE_LIBRARY_CATEGORIES.flatMap((group) =>
  group.items.map((item) => ({
    id: `shape-${item.id}`,
    label: item.label,
    category: 'Shapes' as GlobalCategory,
    group: 'Components' as GlobalGroup,
    subcategory: group.category,
    description: `${group.category} shape: ${item.label}`,
    keywords: ['spes', 'shape', 'symbol', item.shapeType || '', group.category.toLowerCase()].filter(Boolean),
    icon: item.icon,
    color: '#64748b',
    badge: group.category,
    action: {
      kind: 'placement' as const,
      placement: {
        kind: item.kind,
        shapeType: item.shapeType,
        type: item.componentType,
        edgeType: item.edgeType,
        label: item.label,
      },
    },
  }))
);

// 9. Design Steps
const STEP_ITEMS: GlobalSearchItem[] = SYSTEM_DESIGN_STEPS.map((s) => ({
  id: `step-${s.id}`,
  label: s.title,
  category: 'Steps',
  group: 'Components',
  subcategory: `Step ${s.stepNumber}`,
  description: s.subtitle,
  keywords: ['step', 'design step', 'interview', 'framework', s.title.toLowerCase()],
  icon: FileText,
  color: '#3b82f6',
  badge: `Step ${s.stepNumber}`,
  action: {
    kind: 'placement',
    placement: {
      kind: 'step',
      stepId: s.id,
      label: s.title,
    },
  },
}));

/** Master registry of all searchable items */
export const ALL_SEARCHABLE_ITEMS: GlobalSearchItem[] = [
  ...TOOL_ITEMS,
  ...DIAGRAM_ITEMS,
  ...COMPONENT_ITEMS,
  ...EXPANDED_ITEMS,
  ...CLOUD_ITEMS,
  ...STACK_ITEMS,
  ...POPULAR_ITEMS,
  ...SHAPE_ITEMS,
  ...STEP_ITEMS,
];

/** Helper to access all searchable items */
export function getGlobalSearchItems(): GlobalSearchItem[] {
  return ALL_SEARCHABLE_ITEMS;
}

/** Search filter function supporting substring, multi-word, typo normalization, aliases, and category filtering */
export function searchAllItems(
  query: string,
  categoryFilter: GlobalFilterCategory | string = 'All Categories'
): GlobalSearchItem[] {
  let items = ALL_SEARCHABLE_ITEMS;

  const normalizedFilter = categoryFilter.trim().toLowerCase();
  if (normalizedFilter && normalizedFilter !== 'all' && normalizedFilter !== 'all categories') {
    items = items.filter((item) => {
      const itemGroup = (item.group || getItemGroup(item.category)).toLowerCase();
      const itemCat = item.category.toLowerCase();

      if (normalizedFilter === 'components') {
        return itemGroup === 'components' || itemCat === 'components' || itemCat === 'shapes' || itemCat === 'steps';
      }
      if (normalizedFilter === 'apps & services') {
        return itemGroup === 'apps & services' || itemCat === 'popular apps' || itemCat === 'cloud';
      }
      if (normalizedFilter === 'technology stacks' || normalizedFilter === 'tech stacks') {
        return itemGroup === 'technology stacks' || itemCat === 'tech stacks';
      }
      if (normalizedFilter === 'diagrams') {
        return itemGroup === 'diagrams' || itemCat === 'diagrams';
      }
      if (normalizedFilter === 'tools') {
        return itemGroup === 'tools' || itemCat === 'tools';
      }

      // Fallback for granular category filtering (e.g. 'Shapes', 'Steps', 'Cloud', 'Popular Apps')
      return itemCat === normalizedFilter || itemGroup === normalizedFilter;
    });
  }

  const rawQ = query.trim().toLowerCase();
  if (!rawQ) return items;

  // Split query into terms and expand typo/alias maps
  const queryWords = rawQ.split(/\s+/).filter(Boolean);
  const searchWords = Array.from(
    new Set(
      queryWords.flatMap((word) => {
        const expansions = TYPO_MAP[word];
        return expansions ? [word, ...expansions] : [word];
      })
    )
  );

  return items.filter((item) => {
    const labelLower = item.label.toLowerCase();
    const subcategoryLower = (item.subcategory || '').toLowerCase();
    const descLower = item.description.toLowerCase();
    const categoryLower = item.category.toLowerCase();
    const groupLower = (item.group || getItemGroup(item.category)).toLowerCase();
    const keywords = (item.keywords || []).map((k) => k.toLowerCase());
    const aliases = (item.aliases || []).map((a) => a.toLowerCase());

    // Direct match against raw query
    if (labelLower === rawQ || aliases.includes(rawQ) || labelLower.includes(rawQ)) {
      return true;
    }

    // Match across expanded search terms
    return searchWords.some((term) => {
      if (labelLower.includes(term)) return true;
      if (aliases.some((a) => a.includes(term) || term.includes(a))) return true;
      if (subcategoryLower.includes(term)) return true;
      if (descLower.includes(term)) return true;
      if (categoryLower.includes(term)) return true;
      if (groupLower.includes(term)) return true;
      if (keywords.some((k) => k.includes(term))) return true;
      return false;
    });
  });
}

/**
 * Detects whether a global search item already matches an existing node on the canvas.
 * Inspects labels, custom icons, step IDs, and aliases.
 */
export function findMatchingCanvasNode<T extends { data?: Record<string, unknown> }>(
  item: GlobalSearchItem,
  nodes: T[]
): T | undefined {
  const itemLabel = item.label.trim().toLowerCase();
  const customIcon =
    item.action.kind === 'placement' ? item.action.placement?.customIcon : undefined;

  return nodes.find((n) => {
    const nodeLabel = typeof n.data?.label === 'string' ? n.data.label.trim().toLowerCase() : '';
    const nodeCustomIcon = n.data?.customIcon;

    if (nodeLabel && nodeLabel === itemLabel) return true;
    if (customIcon && nodeCustomIcon && nodeCustomIcon === customIcon) return true;
    if (item.action.placement?.stepId && n.data?.stepId === item.action.placement.stepId) return true;
    if (item.aliases && item.aliases.some((a) => a.toLowerCase() === nodeLabel)) return true;
    return false;
  });
}

