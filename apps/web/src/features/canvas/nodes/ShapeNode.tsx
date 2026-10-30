'use client';

import { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Handle, NodeResizer, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { cn } from '@/shared/utils/utils';
import { pointsToSvgPath, cleanWaypoints, perpendicularDistance, type Point } from '@drawzware/canvas-core';
import type { ShapeType, SystemNode } from '@/features/canvas/types/canvas.types';

const HIDDEN = '!opacity-0 pointer-events-none';

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
  onArrowBodyPointerDown?: (e: React.PointerEvent) => void;
  onArrowBodyPointerMove?: (e: React.PointerEvent) => void;
  onArrowBodyPointerUp?: (e: React.PointerEvent) => void;
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
  onArrowBodyPointerDown,
  onArrowBodyPointerMove,
  onArrowBodyPointerUp,
}: ShapeSvgProps) {
  const commonProps = {
    fill: isTransparent ? 'transparent' : fill,
    stroke,
    strokeWidth,
    strokeDasharray,
    vectorEffect: 'non-scaling-stroke' as const,
    pointerEvents: 'all' as const,
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

    case 'user':
      return (
        <g {...commonProps}>
          {/* Head */}
          <circle cx="50" cy="28" r="18" fill={isTransparent ? 'transparent' : fill} />
          {/* Body */}
          <path
            d="M 16 92 C 16 66, 32 58, 50 58 C 68 58, 84 66, 84 92 Z"
            fill={isTransparent ? 'transparent' : fill}
          />
        </g>
      );

    case 'line': {
      const hasPoints = points && points.length >= 2;
      const pathD = hasPoints ? pointsToSvgPath(points, 0) : 'M 3 50 L 97 50';

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
            pointerEvents="stroke"
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
          {/* Fat transparent stroke for easy hover, selection, and route reshaping */}
          <path
            d={pathD}
            fill="none"
            stroke="transparent"
            strokeWidth={Math.max(strokeWidth + 16, 20)}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="stroke"
            className={cn('cursor-pointer', onArrowBodyPointerDown && 'nodrag nopan')}
            onPointerDown={onArrowBodyPointerDown}
            onPointerMove={onArrowBodyPointerMove}
            onPointerUp={onArrowBodyPointerUp}
          />
          <path
            d={pathD}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerStart={hasStart ? `url(#${markerIdStart})` : undefined}
            markerEnd={hasEnd ? `url(#${markerIdEnd})` : undefined}
            {...commonProps}
            fill="none"
            pointerEvents="stroke"
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

  // Waypoints for line / arrow
  const rawPoints = data?.points as Point[] | undefined;
  const basePoints = useMemo<Point[]>(() => {
    if (shapeType === 'line') {
      if (rawPoints && rawPoints.length >= 2) {
        // A straight line is strictly 2 points: start and end
        return [rawPoints[0], rawPoints[rawPoints.length - 1]];
      }
      return [
        { x: 0, y: Math.round(nodeHeight / 2) },
        { x: Math.round(nodeWidth), y: Math.round(nodeHeight / 2) },
      ];
    }
    if (rawPoints && rawPoints.length >= 2) {
      return cleanWaypoints(rawPoints);
    }
    return [
      { x: 0, y: Math.round(nodeHeight / 2) },
      { x: Math.round(nodeWidth), y: Math.round(nodeHeight / 2) },
    ];
  }, [shapeType, rawPoints, nodeWidth, nodeHeight]);

  const [draggingWaypoint, setDraggingWaypoint] = useState<{
    index: number;
    currentPos: Point;
  } | null>(null);

  const activeWaypointRef = useRef<{
    index: number;
    initialPoints: Point[];
  } | null>(null);

  // Line midpoint translation (moves line preserving straightness and length)
  const [draggingMidpoint, setDraggingMidpoint] = useState<{
    delta: Point;
  } | null>(null);

  const activeMidpointRef = useRef<{
    initialP0: Point;
    initialP1: Point;
    startFlowPos: Point;
  } | null>(null);

  // Arrow body segment dragging (reshapes internal routing without visible handles)
  const [draggingSegment, setDraggingSegment] = useState<{
    segmentIndex: number;
    currentPoints: Point[];
  } | null>(null);

  const activeSegmentRef = useRef<{
    segmentIndex: number;
    initialPoints: Point[];
    startFlowPos: Point;
  } | null>(null);

  const effectivePoints = useMemo(() => {
    if (draggingMidpoint) {
      const { delta } = draggingMidpoint;
      return [
        { x: basePoints[0].x + delta.x, y: basePoints[0].y + delta.y },
        { x: basePoints[1].x + delta.x, y: basePoints[1].y + delta.y },
      ];
    }
    if (draggingSegment) {
      return draggingSegment.currentPoints;
    }
    if (draggingWaypoint) {
      return basePoints.map((pt, i) =>
        i === draggingWaypoint.index ? draggingWaypoint.currentPos : pt
      );
    }
    return basePoints;
  }, [basePoints, draggingMidpoint, draggingSegment, draggingWaypoint]);

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

    if (shapeType === 'line' && e.shiftKey) {
      const otherIdx = idx === 0 ? 1 : 0;
      const otherPt = pts[otherIdx];
      const dx = localX - otherPt.x;
      const dy = localY - otherPt.y;
      const angle = Math.atan2(dy, dx);
      const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      const dist = Math.hypot(dx, dy);
      localX = Math.round(otherPt.x + Math.cos(snapAngle) * dist);
      localY = Math.round(otherPt.y + Math.sin(snapAngle) * dist);
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
    applyNormalizedPoints(shapeType === 'line' ? finalPoints : cleanWaypoints(finalPoints));
  };

  // Line midpoint drag: repositions the entire line preserving angle, length, and straightness
  const onMidpointPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    activeMidpointRef.current = {
      initialP0: { ...basePoints[0] },
      initialP1: { ...basePoints[1] },
      startFlowPos: screenToFlowPosition({ x: e.clientX, y: e.clientY }),
    };
    setDraggingMidpoint({ delta: { x: 0, y: 0 } });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMidpointPointerMove = (e: React.PointerEvent) => {
    if (!activeMidpointRef.current) return;
    e.stopPropagation();
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const dx = Math.round(flowPos.x - activeMidpointRef.current.startFlowPos.x);
    const dy = Math.round(flowPos.y - activeMidpointRef.current.startFlowPos.y);
    setDraggingMidpoint({ delta: { x: dx, y: dy } });
  };

  const onMidpointPointerUp = (e: React.PointerEvent) => {
    if (!activeMidpointRef.current) return;
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const { initialP0, initialP1 } = activeMidpointRef.current;
    const delta = draggingMidpoint?.delta ?? { x: 0, y: 0 };
    activeMidpointRef.current = null;
    setDraggingMidpoint(null);
    const newPoints: Point[] = [
      { x: initialP0.x + delta.x, y: initialP0.y + delta.y },
      { x: initialP1.x + delta.x, y: initialP1.y + delta.y },
    ];
    applyNormalizedPoints(newPoints);
  };

  // Arrow body / segment dragging: reshapes route by shifting the clicked segment
  const onArrowBodyPointerDown = (e: React.PointerEvent) => {
    if (!selected || presenting) return;
    e.stopPropagation();
    e.preventDefault();
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const node = useCanvasStore.getState().nodes.find((n) => n.id === id);
    const nodeX = node ? node.position.x : 0;
    const nodeY = node ? node.position.y : 0;
    const localX = flowPos.x - nodeX;
    const localY = flowPos.y - nodeY;

    let bestSeg = 0;
    let bestDist = Infinity;
    for (let i = 0; i < basePoints.length - 1; i++) {
      const d = perpendicularDistance({ x: localX, y: localY }, basePoints[i], basePoints[i + 1]);
      if (d < bestDist) {
        bestDist = d;
        bestSeg = i;
      }
    }

    activeSegmentRef.current = {
      segmentIndex: bestSeg,
      initialPoints: [...basePoints],
      startFlowPos: flowPos,
    };
    setDraggingSegment({
      segmentIndex: bestSeg,
      currentPoints: [...basePoints],
    });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onArrowBodyPointerMove = (e: React.PointerEvent) => {
    if (!activeSegmentRef.current) return;
    e.stopPropagation();
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const deltaX = Math.round(flowPos.x - activeSegmentRef.current.startFlowPos.x);
    const deltaY = Math.round(flowPos.y - activeSegmentRef.current.startFlowPos.y);

    const pts = activeSegmentRef.current.initialPoints;
    const segIdx = activeSegmentRef.current.segmentIndex;

    // 2-point arrow: dragging perpendicularly creates an orthogonal step
    if (pts.length === 2) {
      const p0 = pts[0];
      const p1 = pts[1];
      const isHoriz = Math.abs(p1.x - p0.x) >= Math.abs(p1.y - p0.y);
      if (isHoriz) {
        if (Math.abs(deltaY) >= 4) {
          const midX = Math.round((p0.x + p1.x) / 2);
          const newPts = [
            { x: p0.x, y: p0.y },
            { x: midX, y: p0.y },
            { x: midX, y: p0.y + deltaY },
            { x: p1.x, y: p0.y + deltaY },
            { x: p1.x, y: p1.y },
          ];
          setDraggingSegment({ segmentIndex: 2, currentPoints: cleanWaypoints(newPts) });
          return;
        }
      } else {
        if (Math.abs(deltaX) >= 4) {
          const midY = Math.round((p0.y + p1.y) / 2);
          const newPts = [
            { x: p0.x, y: p0.y },
            { x: p0.x, y: midY },
            { x: p0.x + deltaX, y: midY },
            { x: p0.x + deltaX, y: p1.y },
            { x: p1.x, y: p1.y },
          ];
          setDraggingSegment({ segmentIndex: 2, currentPoints: cleanWaypoints(newPts) });
          return;
        }
      }
      return;
    }

    // Multi-segment arrow: move the clicked segment perpendicularly
    const newPts = pts.map((p) => ({ ...p }));
    const pA = pts[segIdx];
    const pB = pts[segIdx + 1];
    const isHoriz = Math.abs(pB.x - pA.x) >= Math.abs(pB.y - pA.y);

    if (isHoriz) {
      if (segIdx > 0 && segIdx < pts.length - 2) {
        newPts[segIdx] = { x: pA.x, y: pA.y + deltaY };
        newPts[segIdx + 1] = { x: pB.x, y: pB.y + deltaY };
      } else if (segIdx === 0) {
        newPts[1] = { x: pB.x, y: pB.y + deltaY };
      } else {
        newPts[segIdx] = { x: pA.x, y: pA.y + deltaY };
      }
    } else {
      if (segIdx > 0 && segIdx < pts.length - 2) {
        newPts[segIdx] = { x: pA.x + deltaX, y: pA.y };
        newPts[segIdx + 1] = { x: pB.x + deltaX, y: pB.y };
      } else if (segIdx === 0) {
        newPts[1] = { x: pB.x + deltaX, y: pB.y };
      } else {
        newPts[segIdx] = { x: pA.x + deltaX, y: pA.y };
      }
    }

    setDraggingSegment({ segmentIndex: segIdx, currentPoints: newPts });
  };

  const onArrowBodyPointerUp = (e: React.PointerEvent) => {
    if (!activeSegmentRef.current) return;
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const finalPoints = draggingSegment?.currentPoints ?? activeSegmentRef.current.initialPoints;
    activeSegmentRef.current = null;
    setDraggingSegment(null);
    applyNormalizedPoints(cleanWaypoints(finalPoints));
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

  const lastPointerDownTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isEditing) return;

    const onPointerDown = (e: PointerEvent) => {
      lastPointerDownTargetRef.current = e.target as HTMLElement | null;
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, [isEditing]);

  // Click outside listener: finishes editing cleanly
  useEffect(() => {
    if (!isEditing) return;

    const mountTime = Date.now();
    const handlePointerDownOutside = (e: MouseEvent | PointerEvent) => {
      if (Date.now() - mountTime < 120) return;

      const target = e.target as HTMLElement | null;
      if (inputRef.current && inputRef.current.contains(target)) return;
      if (
        target?.closest('[data-text-toolbar]') ||
        target?.closest('[role="toolbar"]') ||
        target?.closest('[data-radix-popper-content-wrapper]') ||
        target?.closest('[role="menu"]') ||
        target?.closest('[role="dialog"]')
      ) {
        return;
      }
      finishEditing();
    };

    window.addEventListener('pointerdown', handlePointerDownOutside, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside, true);
    };
  }, [isEditing, finishEditing]);

  const onBlur = useCallback(
    (e: React.FocusEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      const lastTarget = lastPointerDownTargetRef.current;

      const isToolbar = (el: HTMLElement | null) =>
        !!(
          el?.closest('[data-text-toolbar]') ||
          el?.closest('[role="toolbar"]') ||
          el?.closest('[data-radix-popper-content-wrapper]') ||
          el?.closest('[role="menu"]') ||
          el?.closest('[role="dialog"]')
        );

      if (isToolbar(related) || isToolbar(lastTarget)) {
        return;
      }

      finishEditing();
    },
    [finishEditing]
  );

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
        isLine
          ? 'pointer-events-none'
          : shapeType === 'rectangle' || shapeType === 'rounded-rectangle'
          ? 'pointer-events-auto'
          : 'pointer-events-none',
        selected && !isLine && !isEditing && 'drop-shadow-[0_0_0_2px_var(--accent-soft)]',
        selected && !isLine && !isEditing && 'ring-2 ring-accent ring-offset-2 ring-offset-bg/50 rounded-[8px]',
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
        keepAspectRatio={shapeType === 'circle' || shapeType === 'star'}
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
          <Handle type="source" id="top-source" position={Position.Top} className={HIDDEN} />
          <Handle type="target" id="left-target" position={Position.Left} className="pointer-events-auto" />
          <Handle type="source" id="left-source" position={Position.Left} className={HIDDEN} />
          <Handle type="source" id="bottom-source" position={Position.Bottom} className="pointer-events-auto" />
          <Handle type="target" id="bottom-target" position={Position.Bottom} className={HIDDEN} />
          <Handle type="source" id="right-source" position={Position.Right} className="pointer-events-auto" />
          <Handle type="target" id="right-target" position={Position.Right} className={HIDDEN} />
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
            onArrowBodyPointerDown={
              shapeType === 'arrow' && selected && !presenting ? onArrowBodyPointerDown : undefined
            }
            onArrowBodyPointerMove={
              shapeType === 'arrow' && selected && !presenting ? onArrowBodyPointerMove : undefined
            }
            onArrowBodyPointerUp={
              shapeType === 'arrow' && selected && !presenting ? onArrowBodyPointerUp : undefined
            }
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible drop-shadow-sm pointer-events-none"
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

      {/* Interactive Handles for Lines & Arrows */}
      {isLine && selected && !presenting && (
        <div className="absolute inset-0 size-full pointer-events-none overflow-visible">
          {shapeType === 'line' && (
            <>
              {/* Start Handle */}
              <div
                key="line-start"
                title="Start point (Drag to reposition)"
                onPointerDown={(e) => onWaypointPointerDown(e, 0)}
                onPointerMove={onWaypointPointerMove}
                onPointerUp={onWaypointPointerUp}
                style={{
                  left: `${effectivePoints[0].x}px`,
                  top: `${effectivePoints[0].y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={cn(
                  'nodrag nopan pointer-events-auto absolute z-30 size-3 rounded-full border-2 border-accent bg-white shadow-md transition-transform hover:scale-125 cursor-move',
                  draggingWaypoint?.index === 0 && 'scale-125 ring-2 ring-accent'
                )}
              />

              {/* Midpoint Handle - Translates line preserving straight geometry */}
              <div
                key="line-mid"
                title="Midpoint (Drag to move line)"
                onPointerDown={onMidpointPointerDown}
                onPointerMove={onMidpointPointerMove}
                onPointerUp={onMidpointPointerUp}
                style={{
                  left: `${(effectivePoints[0].x + effectivePoints[1].x) / 2}px`,
                  top: `${(effectivePoints[0].y + effectivePoints[1].y) / 2}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={cn(
                  'nodrag nopan pointer-events-auto absolute z-30 size-3 rounded-full border-2 border-accent bg-white shadow-md transition-transform hover:scale-125 cursor-move',
                  draggingMidpoint && 'scale-125 ring-2 ring-accent'
                )}
              />

              {/* End Handle */}
              <div
                key="line-end"
                title="End point (Drag to reposition)"
                onPointerDown={(e) => onWaypointPointerDown(e, 1)}
                onPointerMove={onWaypointPointerMove}
                onPointerUp={onWaypointPointerUp}
                style={{
                  left: `${effectivePoints[1].x}px`,
                  top: `${effectivePoints[1].y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={cn(
                  'nodrag nopan pointer-events-auto absolute z-30 size-3 rounded-full border-2 border-accent bg-white shadow-md transition-transform hover:scale-125 cursor-move',
                  draggingWaypoint?.index === 1 && 'scale-125 ring-2 ring-accent'
                )}
              />
            </>
          )}

          {shapeType === 'arrow' && (
            <>
              {/* Start Handle */}
              <div
                key="arrow-start"
                title="Start point (Drag to reposition)"
                onPointerDown={(e) => onWaypointPointerDown(e, 0)}
                onPointerMove={onWaypointPointerMove}
                onPointerUp={onWaypointPointerUp}
                style={{
                  left: `${effectivePoints[0].x}px`,
                  top: `${effectivePoints[0].y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={cn(
                  'nodrag nopan pointer-events-auto absolute z-30 size-3 rounded-full border-2 border-accent bg-white shadow-md transition-transform hover:scale-125 cursor-move',
                  draggingWaypoint?.index === 0 && 'scale-125 ring-2 ring-accent'
                )}
              />

              {/* End Handle (arrow tip) */}
              <div
                key="arrow-end"
                title="End point (Drag to reposition)"
                onPointerDown={(e) => onWaypointPointerDown(e, effectivePoints.length - 1)}
                onPointerMove={onWaypointPointerMove}
                onPointerUp={onWaypointPointerUp}
                style={{
                  left: `${effectivePoints[effectivePoints.length - 1].x}px`,
                  top: `${effectivePoints[effectivePoints.length - 1].y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={cn(
                  'nodrag nopan pointer-events-auto absolute z-30 size-3 rounded-full border-2 border-accent bg-white shadow-md transition-transform hover:scale-125 cursor-move',
                  draggingWaypoint?.index === effectivePoints.length - 1 && 'scale-125 ring-2 ring-accent'
                )}
              />
            </>
          )}
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
