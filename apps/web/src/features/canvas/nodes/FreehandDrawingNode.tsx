'use client';

import { memo, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { cn } from '@/shared/utils/utils';
import type { SystemNode } from '@/features/canvas/types/canvas.types';

/** Convert point array to smooth SVG path with quadratic midpoint curve. */
export function pointsToSvgPath(points: { x: number; y: number }[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.5} ${points[0].y + 0.5}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
  }
  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  d += ` Q ${secondLast.x} ${secondLast.y}, ${last.x} ${last.y}`;
  return d;
}

function FreehandDrawingNodeComponent({ data, selected }: NodeProps<SystemNode>) {
  const points = data?.points;
  const color = data?.color || 'var(--ink)';
  const strokeWidth = data?.strokeWidth ?? 2.5;

  const path = useMemo(() => pointsToSvgPath(points ?? []), [points]);

  return (
    <div
      className={cn(
        'group relative size-full cursor-move select-none transition-shadow duration-[120ms]',
        selected && 'rounded-[6px] ring-2 ring-dashed ring-accent shadow-[0_0_0_2px_var(--accent-soft)]'
      )}
    >
      <svg className="size-full overflow-visible">
        {/* Invisible wider hit target for effortless grabbing/selection */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(strokeWidth + 12, 16)}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="cursor-move"
        />
        {/* Visible stroke */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none"
        />
      </svg>
    </div>
  );
}

export const FreehandDrawingNode = memo(FreehandDrawingNodeComponent);
