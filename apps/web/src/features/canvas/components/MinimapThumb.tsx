'use client';

import { memo, useMemo } from 'react';
import type { SystemNode, SystemEdge } from '@/features/canvas/types/canvas.types';
import { getBounds, getHandlePoint, getMinimapColor, getNodeRect } from '@/features/canvas/utils/minimap';
import { cn } from '@/shared/utils/utils';

interface MinimapThumbProps {
  nodes: SystemNode[];
  edges: SystemEdge[];
  className?: string;
  /** Fill opacity of node rects. */
  opacity?: number;
  /** Rendered when there are no nodes. */
  empty?: React.ReactNode;
}

/** Static SVG minimap of a design: colored rects with labels + connector lines with arrows. */
function MinimapThumbComponent({ nodes, edges, className, opacity = 0.9, empty = null }: MinimapThumbProps) {
  const content = useMemo(() => {
    const bounds = getBounds(nodes, 28);
    if (!bounds) return null;
    const rects = new Map(nodes.map((n) => [n.id, getNodeRect(n)]));
    // Groups first so members draw on top.
    const ordered = [...nodes].sort((a, b) => Number(b.type === 'group') - Number(a.type === 'group'));
    return { bounds, rects, ordered };
  }, [nodes]);

  if (!content) return <>{empty}</>;
  const { bounds, rects, ordered } = content;

  return (
    <svg
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn('block h-full w-full select-none', className)}
      aria-hidden
    >
      <defs>
        <marker
          id="minimap-arrow"
          viewBox="0 0 8 8"
          refX="6"
          refY="4"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M 0 1 L 7 4 L 0 7 z" fill="#71717a" />
        </marker>
      </defs>

      {/* Connection lines */}
      {edges.map((edge) => {
        const s = rects.get(edge.source);
        const t = rects.get(edge.target);
        if (!s || !t) return null;
        const a = getHandlePoint(s, edge.sourceHandle);
        const b = getHandlePoint(t, edge.targetHandle);
        return (
          <line
            key={edge.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#71717a"
            strokeWidth={2.5}
            strokeDasharray={edge.data?.strokeStyle === 'dashed' ? '5 3' : undefined}
            opacity={0.7}
            markerEnd="url(#minimap-arrow)"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}

      {/* Nodes */}
      {ordered.map((node) => {
        const r = rects.get(node.id)!;
        const isGroup = node.type === 'group';
        const rawLabel = node.data?.label || node.data?.stepTitle || '';
        const label = rawLabel.length > 15 ? rawLabel.slice(0, 13) + '…' : rawLabel;
        const fillColor = node.data?.color || getMinimapColor(node);
        const fontSize = Math.max(11, Math.min(r.height * 0.32, 16));

        return (
          <g key={node.id}>
            <rect
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              rx={isGroup ? 12 : 8}
              fill={isGroup ? 'rgba(255, 255, 255, 0.03)' : fillColor}
              stroke={isGroup ? '#71717a' : 'rgba(255, 255, 255, 0.22)'}
              strokeWidth={isGroup ? 1.5 : 1}
              strokeDasharray={isGroup ? '6 6' : undefined}
              opacity={isGroup ? 0.6 : opacity}
            />
            {!isGroup && label && (
              <text
                x={r.x + r.width / 2}
                y={r.y + r.height / 2 + fontSize * 0.35}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={fontSize}
                fontWeight="600"
                fontFamily="system-ui, -apple-system, sans-serif"
                style={{ pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export const MinimapThumb = memo(MinimapThumbComponent);
