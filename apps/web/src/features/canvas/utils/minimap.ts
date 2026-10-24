import type { SystemNode, SystemEdge, SystemNodeData } from '@/features/canvas/types/canvas.types';

/** Vibrant fills for minimap and thumbnail rects, per node type and service name. */
export const MINIMAP_COLORS: Record<string, string> = {
  service: '#10b981',
  database: '#0891b2',
  cache: '#dc2626',
  queue: '#9333ea',
  'load-balancer': '#2563eb',
  client: '#8b5cf6',
  cdn: '#06b6d4',
  'api-gateway': '#38bdf8',
  group: '#94a3b8',
  note: '#f59e0b',
  dns: '#0284c7',
  waf: '#f97316',
  worker: '#64748b',
  serverless: '#f97316',
  'container-cluster': '#06b6d4',
  'object-storage': '#16a34a',
  'search-index': '#eab308',
  stream: '#ec4899',
  scheduler: '#78716c',
  logging: '#84cc16',
  monitoring: '#d946ef',
};

export function getMinimapColor(node: SystemNode): string {
  if (node.data?.color) return node.data.color;
  if (node.type === 'note') return MINIMAP_COLORS.note;
  if (node.type === 'group') return MINIMAP_COLORS.group;
  if (node.type === 'drawing') return '#64748b';
  if (node.type === 'text') return '#94a3b8';
  if (node.type === 'shape') return '#a1a1aa';
  if (node.type === 'step') return '#8b5cf6';

  const label = (node.data?.label || '').toLowerCase();
  if (label.includes('auth')) return '#10b981';
  if (label.includes('user')) return '#0284c7';
  if (label.includes('order')) return '#f97316';
  if (label.includes('redis')) return '#dc2626';
  if (label.includes('kafka')) return '#9333ea';
  if (label.includes('lambda')) return '#f97316';
  if (label.includes('dynamo')) return '#0284c7';
  if (label.includes('s3')) return '#16a34a';
  if (label.includes('producer')) return '#16a34a';
  if (label.includes('consumer')) return '#2563eb';
  if (label.includes('balancer') || label.includes('lb')) return '#2563eb';
  if (label.includes('gateway')) return '#0284c7';
  if (label.includes('client')) return '#8b5cf6';
  if (label.includes('monolith')) return '#7c3aed';
  if (label.includes('web')) return '#16a34a';
  if (label.includes('db') || label.includes('database')) return '#0891b2';

  const nodeType = (node.data as SystemNodeData | undefined)?.nodeType;
  return (nodeType && MINIMAP_COLORS[nodeType]) || '#64748b';
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Best-known size of a stored node (measured → explicit → style → default). */
export function getNodeRect(node: SystemNode): Rect {
  const styleW = typeof node.style?.width === 'number' ? node.style.width : undefined;
  const styleH = typeof node.style?.height === 'number' ? node.style.height : undefined;
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? node.width ?? styleW ?? 200,
    height: node.measured?.height ?? node.height ?? styleH ?? 72,
  };
}

/** Bounding box of all nodes, padded. Null when there are no nodes. */
export function getBounds(nodes: SystemNode[], pad = 40): Rect | null {
  if (nodes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const r = getNodeRect(node);
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
}

/** Anchor point of an edge end, from the handle id's side ("bottom-source" → bottom center). */
export function getHandlePoint(rect: Rect, handle: string | null | undefined): { x: number; y: number } {
  const side = handle?.split('-')[0];
  switch (side) {
    case 'top':
      return { x: rect.x + rect.width / 2, y: rect.y };
    case 'bottom':
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
    case 'left':
      return { x: rect.x, y: rect.y + rect.height / 2 };
    case 'right':
      return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
    default:
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
}

export type { SystemEdge };
