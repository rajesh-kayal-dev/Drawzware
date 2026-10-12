'use client';

import { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Handle, NodeResizer, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';
import { pointsToSvgPath, type Point } from '@/lib/line-routing';
import type { ShapeType, SystemNode } from '@/types';

const HIDDEN = '!opacity-0';

function getStrokeDasharray(style?: 'solid' | 'dashed' | 'dotted') {
  if (style === 'dashed') return '6 4';
  if (style === 'dotted') return '2 3';
  return undefined;
}

function getCaretOffsetFromPoint(e: React.MouseEvent, text: string): number {
  if (typeof document === 'undefined' || !text) return text.length;
  try {
    interface CaretPositionDoc {
      caretPositionFromPoint?: (x: number, y: number) => { offset?: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => { startOffset?: number } | null;
    }
    const doc = document as unknown as CaretPositionDoc;
    if (typeof doc.caretPositionFromPoint === 'function') {
      const pos = doc.caretPositionFromPoint(e.clientX, e.clientY);
      if (pos && typeof pos.offset === 'number') {
        return Math.min(pos.offset, text.length);
      }
    }
    if (typeof doc.caretRangeFromPoint === 'function') {
      const range = doc.caretRangeFromPoint(e.clientX, e.clientY);
      if (range && typeof range.startOffset === 'number') {
        return Math.min(range.startOffset, text.length);
      }
    }
  } catch {
    // fallback
  }
  return text.length;
}

interface ShapeSvgProps {
  id: string;
  shapeType: ShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  isTransparent: boolean;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  points?: Point[];
}

function ShapeSvg({
  id,
  shapeType,
  fill,
  stroke,
  strokeWidth,
  strokeDasharray,
  isTransparent,
  arrowStart,
  arrowEnd,
  points,
}: ShapeSvgProps) {
  const commonProps = {
    fill: isTransparent ? 'none' : fill,
    stroke,
    strokeWidth,
    strokeDasharray,
    vectorEffect: 'non-scaling-stroke' as const,
    pointerEvents: isTransparent ? ('stroke' as const) : ('all' as const),
    className: 'transition-colors',
  };

  switch (shapeType) {
    case 'circle':
    case 'ellipse':
      return (
        <ellipse
          cx="50%"
          cy="50%"
          rx="47%"
          ry="47%"
          {...commonProps}
        />
      );

    case 'star':
      return (
        <polygon
          points="50,3 62,35 97,35 69,56 80,92 50,70 20,92 31,56 3,35 38,35"
          {...commonProps}
        />
      );

    case 'line': {
      const hasPoints = points && points.length >= 2;
      const pathD = hasPoints ? pointsToSvgPath(points, 8) : 'M 3 50 L 97 50';

      return (
        <>
          {/* Fat transparent stroke for easy hover & selection */}
          <path
            d={pathD}
            fill="none"
            stroke="transparent"
            strokeWidth={Math.max(strokeWidth + 14, 16)}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="stroke"
            className="cursor-pointer"
          />
          <path
            d={pathD}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...commonProps}
            fill="none"
          />
        </>
      );
    }

    case 'arrow': {
      const markerIdStart = `arrow-start-${id}`;
      const markerIdEnd = `arrow-end-${id}`;
      const hasEnd = arrowEnd !== false;
      const hasStart = Boolean(arrowStart);
      const hasPoints = points && points.length >= 2;
      const pathD = hasPoints ? pointsToSvgPath(points, 8) : 'M 10 50 L 90 50';

      return (
        <>
          <defs>
            {hasEnd && (
              <marker
                id={markerIdEnd}
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={stroke} />
              </marker>
            )}
            {hasStart && (
              <marker
                id={markerIdStart}
                viewBox="0 0 10 10"
                refX="3"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 8 1.5 L 0 5 L 8 8.5 z" fill={stroke} />
              </marker>
            )}
          </defs>
          {/* Fat transparent stroke for easy hover & selection */}
          <path
            d={pathD}
            fill="none"
            stroke="transparent"
            strokeWidth={Math.max(strokeWidth + 14, 16)}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="stroke"
            className="cursor-pointer"
          />
          <path
            d={pathD}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerStart={hasStart ? `url(#${markerIdStart})` : undefined}
            markerEnd={hasEnd ? `url(#${markerIdEnd})` : undefined}
            {...commonProps}
            fill="none"
          />
        </>
      );
    }

    case 'diamond':
      return (
        <polygon
          points="50,2 98,50 50,98 2,50"
          {...commonProps}
        />
      );

    case 'triangle':
      return (
        <polygon
          points="50,4 98,96 2,96"
          {...commonProps}
        />
      );

    case 'hexagon':
      return (
        <polygon
          points="25,2 75,2 98,50 75,98 25,98 2,50"
          {...commonProps}
        />
      );

    case 'pill':
      return (
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="48"
          ry="48"
          {...commonProps}
        />
      );

    case 'parallelogram':
      return (
        <polygon
          points="18,2 98,2 82,98 2,98"
          {...commonProps}
        />
      );

    case 'document':
      return (
        <path
          d="M 2 2 L 98 2 L 98 84 Q 74 98 50 84 Q 26 70 2 84 Z"
          {...commonProps}
        />
      );

    case 'callout':
      return (
        <path
          d="M 4 4 L 96 4 Q 98 4 98 6 L 98 76 Q 98 78 96 78 L 40 78 L 24 96 L 28 78 L 4 78 Q 2 78 2 76 L 2 6 Q 2 4 4 4 Z"
          {...commonProps}
        />
      );

    case 'divider':
      return (
        <line
          x1="2"
          y1="50"
          x2="98"
          y2="50"
          {...commonProps}
          strokeDasharray="4 4"
        />
      );

    case 'rounded-rectangle':
      return (
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="12"
          ry="12"
          {...commonProps}
        />
      );

    case 'rectangle':
    default:
      return (
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="4"
          ry="4"
          {...commonProps}
        />
      );
  }
}

function ShapeNodeComponent({ id, data, selected, width, height }: NodeProps<SystemNode>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const presenting = useCanvasStore((s) => s.presentation.active);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const { screenToFlowPosition } = useReactFlow();

  const shapeType: ShapeType = data?.shapeType ?? 'rectangle';
  const isLine = shapeType === 'line' || shapeType === 'arrow';

  // Styling properties
  const shapeFill = data?.shapeFill ?? 'transparent';
  const shapeStroke = data?.shapeStroke ?? 'var(--line-2)';
  const strokeWidth = data?.strokeWidth ?? (isLine ? 2 : 1.5);
  const strokeStyle = data?.strokeStyle ?? 'solid';
  const strokeDasharray = getStrokeDasharray(strokeStyle);
  const isTransparent = shapeFill === 'transparent' || shapeFill === 'none';

  // Node dimensions
  const nodeWidth = typeof width === 'number' ? width : 140;
  const nodeHeight = typeof height === 'number' ? height : 60;

  // Waypoints for multi-segment line / arrow
  const rawPoints = data?.points as Point[] | undefined;
  const basePoints = useMemo<Point[]>(() => {
    if (rawPoints && rawPoints.length >= 2) return rawPoints;
    return [
      { x: 0, y: Math.round(nodeHeight / 2) },
      { x: Math.round(nodeWidth), y: Math.round(nodeHeight / 2) },
    ];
  }, [rawPoints, nodeWidth, nodeHeight]);

  const [draggingWaypoint, setDraggingWaypoint] = useState<{
    index: number;
    currentPos: Point;
  } | null>(null);

  const activeWaypointRef = useRef<{
    index: number;
    initialPoints: Point[];
  } | null>(null);

  const effectivePoints = useMemo(() => {
    if (!draggingWaypoint) return basePoints;
    return basePoints.map((pt, i) =>
      i === draggingWaypoint.index ? draggingWaypoint.currentPos : pt
    );
  }, [basePoints, draggingWaypoint]);

  // Normalize waypoints & update node position and bounds
  const applyNormalizedPoints = useCallback(
    (pts: Point[]) => {
      if (pts.length < 2) return;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      const normalized = pts.map((p) => ({
        x: Math.round(p.x - minX),
        y: Math.round(p.y - minY),
      }));

      const newW = Math.max(maxX - minX, 20);
      const newH = Math.max(maxY - minY, 20);

      const node = useCanvasStore.getState().nodes.find((n) => n.id === id);
      if (node) {
        const newPosX = Math.round(node.position.x + minX);
        const newPosY = Math.round(node.position.y + minY);

        const updated = useCanvasStore.getState().nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                position: { x: newPosX, y: newPosY },
                style: { ...n.style, width: newW, height: newH },
                data: { ...n.data, points: normalized },
              }
            : n
        );
        useCanvasStore.getState().setNodes(updated);
        useCanvasStore.getState().pushHistory();
      }
    },
    [id]
  );

  const onWaypointPointerDown = (e: React.PointerEvent, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    activeWaypointRef.current = {
      index,
      initialPoints: [...basePoints],
    };
    setDraggingWaypoint({ index, currentPos: basePoints[index] });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onWaypointPointerMove = (e: React.PointerEvent) => {
    if (!activeWaypointRef.current) return;
    e.stopPropagation();
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const node = useCanvasStore.getState().nodes.find((n) => n.id === id);
    const nodeX = node ? node.position.x : 0;
    const nodeY = node ? node.position.y : 0;
    let localX = Math.round(flowPos.x - nodeX);
    let localY = Math.round(flowPos.y - nodeY);

    const idx = activeWaypointRef.current.index;
    const pts = activeWaypointRef.current.initialPoints;
    // Snap with neighbor points if close
    if (pts[idx - 1]) {
      if (Math.abs(localX - pts[idx - 1].x) < 8) localX = pts[idx - 1].x;
      if (Math.abs(localY - pts[idx - 1].y) < 8) localY = pts[idx - 1].y;
    }
    if (pts[idx + 1]) {
      if (Math.abs(localX - pts[idx + 1].x) < 8) localX = pts[idx + 1].x;
      if (Math.abs(localY - pts[idx + 1].y) < 8) localY = pts[idx + 1].y;
    }

    setDraggingWaypoint({ index: idx, currentPos: { x: localX, y: localY } });
  };

  const onWaypointPointerUp = (e: React.PointerEvent) => {
    if (!activeWaypointRef.current) return;
    e.stopPropagation();
    const idx = activeWaypointRef.current.index;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const finalPos = draggingWaypoint?.currentPos ?? basePoints[idx];
    const finalPoints = basePoints.map((pt, i) => (i === idx ? finalPos : pt));

    activeWaypointRef.current = null;
    setDraggingWaypoint(null);
    applyNormalizedPoints(finalPoints);
  };

  const onDeleteWaypoint = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (basePoints.length <= 2) return;
    if (index <= 0 || index >= basePoints.length - 1) return;
    const remaining = basePoints.filter((_, i) => i !== index);
    applyNormalizedPoints(remaining);
  };

  const onAddMidpoint = (e: React.PointerEvent, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    const p1 = basePoints[index];
    const p2 = basePoints[index + 1];
    const midPt = {
      x: Math.round((p1.x + p2.x) / 2),
      y: Math.round((p1.y + p2.y) / 2),
    };
    const newPoints = [
      ...basePoints.slice(0, index + 1),
      midPt,
      ...basePoints.slice(index + 1),
    ];

    updateNodeData(id, { points: newPoints });
    activeWaypointRef.current = {
      index: index + 1,
      initialPoints: newPoints,
    };
    setDraggingWaypoint({ index: index + 1, currentPos: midPt });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data?.label ?? '');
  const initialLabelRef = useRef(data?.label ?? '');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentLabel = isEditing ? draftLabel : (data?.label ?? '');

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const finishEditing = useCallback(() => {
    setIsEditing(false);
    useCanvasStore.getState().setEditingShapeId(null);
    if (draftLabel !== initialLabelRef.current) {
      initialLabelRef.current = draftLabel;
      updateNodeData(id, { label: draftLabel });
      pushHistory();
    }
  }, [draftLabel, id, updateNodeData, pushHistory]);

  const onBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.closest('[data-text-toolbar]') ||
          activeEl.closest('[role="toolbar"]') ||
          activeEl.closest('[data-radix-popper-content-wrapper]') ||
          activeEl.closest('[role="menu"]') ||
          activeEl.closest('[role="dialog"]'))
      ) {
        return;
      }
      finishEditing();
    }, 150);
  }, [finishEditing]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!presenting && !isLine) {
        const current = data?.label ?? '';
        setDraftLabel(current);
        initialLabelRef.current = current;
        const offset = getCaretOffsetFromPoint(e, current);
        setIsEditing(true);
        useCanvasStore.getState().setSelectedNodeId(id);
        useCanvasStore.getState().setEditingShapeId(id);
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(offset, offset);
          }
        });
      }
    },
    [presenting, isLine, data?.label, id, setDraftLabel]
  );

  const fontSize = data?.fontSize ?? 14;
  const fontFamily = data?.fontFamily ?? 'sans';
  const isBold = Boolean(data?.bold);
  const isItalic = Boolean(data?.italic);
  const isUnderline = Boolean(data?.underline);
  const color = data?.color ?? 'var(--ink)';
  const align = data?.align ?? 'center';

  const textStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    color: color,
    fontWeight: isBold ? 700 : 500,
    fontStyle: isItalic ? 'italic' : 'normal',
    textDecoration: isUnderline ? 'underline' : 'none',
    textAlign: align,
  };

  const fontClass =
    fontFamily === 'serif'
      ? 'font-serif'
      : fontFamily === 'mono'
      ? 'font-mono'
      : fontFamily === 'casual'
      ? 'font-sans tracking-wide'
      : 'font-sans';

  return (
    <div
      onDoubleClick={onDoubleClick}
      className={cn(
        'group relative flex size-full items-center justify-center select-none transition-[filter,box-shadow] duration-[120ms]',
        isLine ? 'pointer-events-none' : (isTransparent && !selected && !isEditing && !currentLabel) ? 'pointer-events-none' : 'pointer-events-auto',
        selected && !isLine && !isEditing && 'drop-shadow-[0_0_0_2px_var(--accent-soft)]',
        selected && !isLine && 'ring-2 ring-accent ring-offset-2 ring-offset-bg/50 rounded-[8px]',
        selected && isLine && 'drop-shadow-[0_0_3px_var(--accent)]'
      )}
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
      }}
    >
      {/* NodeResizer for standard 2D shapes with smooth, high-precision handles in all directions */}
      <NodeResizer
        isVisible={!!selected && !presenting && !isEditing && !isLine}
        minWidth={30}
        minHeight={30}
        lineStyle={{
          borderColor: '#0ea5e9',
          borderWidth: 1.5,
          borderStyle: 'solid',
        }}
        handleStyle={{
          width: 9,
          height: 9,
          backgroundColor: '#ffffff',
          borderColor: '#0ea5e9',
          borderWidth: 2,
          borderRadius: 2,
        }}
        onResizeEnd={() => pushHistory()}
      />

      {/* Handles for standard shapes */}
      {!isLine && (
        <>
          <Handle type="target" id="top-target" position={Position.Top} className="pointer-events-auto" />
          <Handle type="source" id="top-source" position={Position.Top} className={cn(HIDDEN, 'pointer-events-auto')} />
          <Handle type="target" id="left-target" position={Position.Left} className="pointer-events-auto" />
          <Handle type="source" id="left-source" position={Position.Left} className={cn(HIDDEN, 'pointer-events-auto')} />
          <Handle type="target" id="bottom-target" position={Position.Bottom} className="pointer-events-auto" />
          <Handle type="source" id="bottom-source" position={Position.Bottom} className={cn(HIDDEN, 'pointer-events-auto')} />
          <Handle type="target" id="right-target" position={Position.Right} className="pointer-events-auto" />
          <Handle type="source" id="right-source" position={Position.Right} className={cn(HIDDEN, 'pointer-events-auto')} />
        </>
      )}

      {/* SVG Shape / Path */}
      {isLine ? (
        <svg
          className={cn(
            'absolute inset-0 size-full overflow-visible drop-shadow-sm pointer-events-stroke'
          )}
        >
          <ShapeSvg
            id={id}
            shapeType={shapeType}
            fill={shapeFill}
            stroke={shapeStroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            isTransparent={isTransparent}
            arrowStart={data?.arrowStart}
            arrowEnd={data?.arrowEnd}
            points={effectivePoints}
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className={cn(
            'absolute inset-0 size-full overflow-visible drop-shadow-sm',
            isTransparent ? 'pointer-events-stroke' : 'pointer-events-auto'
          )}
        >
          <ShapeSvg
            id={id}
            shapeType={shapeType}
            fill={shapeFill}
            stroke={shapeStroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            isTransparent={isTransparent}
            arrowStart={data?.arrowStart}
            arrowEnd={data?.arrowEnd}
          />
        </svg>
      )}

      {/* Interactive Waypoints and Midpoints for Lines & Arrows */}
      {isLine && selected && !presenting && (
        <div className="absolute inset-0 size-full pointer-events-none overflow-visible">
          {/* Midpoint '+' buttons to split and add new bends */}
          {effectivePoints.slice(0, -1).map((pt, i) => {
            const next = effectivePoints[i + 1];
            if (!next) return null;
            const midX = (pt.x + next.x) / 2;
            const midY = (pt.y + next.y) / 2;
            return (
              <button
                key={`mid-${i}`}
                type="button"
                title="Click or drag to add a bend corner"
                onPointerDown={(e) => onAddMidpoint(e, i)}
                onPointerMove={onWaypointPointerMove}
                onPointerUp={onWaypointPointerUp}
                style={{
                  left: `${midX}px`,
                  top: `${midY}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="nodrag nopan pointer-events-auto absolute z-20 flex size-3.5 items-center justify-center rounded-full border border-blue-400 bg-white/95 text-blue-600 shadow-sm transition hover:scale-125 hover:bg-blue-600 hover:text-white cursor-pointer"
              >
                <span className="text-[10px] font-bold leading-none select-none">+</span>
              </button>
            );
          })}

          {/* Waypoint handle dots for endpoints & bends */}
          {effectivePoints.map((pt, i) => {
            const isEnd = i === 0 || i === effectivePoints.length - 1;
            return (
              <div
                key={`waypoint-${i}`}
                title={
                  isEnd
                    ? 'Endpoint (Drag to reposition)'
                    : 'Bend point (Drag to move, double-click to remove)'
                }
                onPointerDown={(e) => onWaypointPointerDown(e, i)}
                onPointerMove={onWaypointPointerMove}
                onPointerUp={onWaypointPointerUp}
                onDoubleClick={(e) => onDeleteWaypoint(e, i)}
                style={{
                  left: `${pt.x}px`,
                  top: `${pt.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={cn(
                  'nodrag nopan pointer-events-auto absolute z-30 size-3 rounded-full border-2 border-accent bg-white shadow-md transition-transform hover:scale-125 cursor-move',
                  draggingWaypoint?.index === i && 'scale-125 ring-2 ring-accent'
                )}
              />
            );
          })}
        </div>
      )}

      {/* Center Label or Inline Editor (Standard Shapes) */}
      {!isLine && (
        <div
          className={cn(
            'relative z-[1] flex size-full items-center justify-center p-3 text-center pointer-events-auto'
          )}
        >
          {isEditing ? (
            <textarea
              ref={inputRef}
              aria-label="Shape label"
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
              }}
              onFocus={() => {
                if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
              }}
              onBlur={onBlur}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  finishEditing();
                  return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  finishEditing();
                  return;
                }
                e.stopPropagation();
              }}
              rows={2}
              style={textStyle}
              className={cn(
                'nodrag nowheel nopan w-full resize-none border-none bg-transparent leading-snug outline-none pointer-events-auto',
                fontClass
              )}
            />
          ) : (
            currentLabel ? (
              <span
                style={textStyle}
                className={cn(
                  'line-clamp-4 leading-snug break-words w-full pointer-events-auto cursor-pointer',
                  fontClass
                )}
              >
                {currentLabel}
              </span>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

export const ShapeNode = memo(ShapeNodeComponent);
