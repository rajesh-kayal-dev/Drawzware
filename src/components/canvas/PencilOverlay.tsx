'use client';

import { useState, useRef, useCallback } from 'react';
import { ViewportPortal, useReactFlow } from '@xyflow/react';
import { Eraser } from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { createDrawingNode } from '@/lib/node-factory';
import { pointsToSvgPath } from '@/components/nodes/FreehandDrawingNode';
import { cn } from '@/lib/utils';
import type { SystemNode } from '@/types';

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function checkPointHitsDrawingNode(
  p: { x: number; y: number },
  node: SystemNode,
  eraserRadius: number
): boolean {
  if (node.type !== 'drawing') return false;
  const points = node.data?.points;
  if (!points || points.length === 0) return false;

  const nodeX = node.position.x;
  const nodeY = node.position.y;
  const w = (typeof node.style?.width === 'number' ? node.style.width : node.width) ?? 20;
  const h = (typeof node.style?.height === 'number' ? node.style.height : node.height) ?? 20;
  const pad = eraserRadius + 4;

  // Broad phase: Bounding box check
  if (
    p.x < nodeX - pad ||
    p.x > nodeX + w + pad ||
    p.y < nodeY - pad ||
    p.y > nodeY + h + pad
  ) {
    return false;
  }

  const strokeWidth = node.data?.strokeWidth ?? 2.5;
  const hitThreshold = eraserRadius + strokeWidth / 2;

  // Single point hit test
  if (points.length === 1) {
    const ptX = nodeX + points[0].x;
    const ptY = nodeY + points[0].y;
    return Math.hypot(p.x - ptX, p.y - ptY) <= hitThreshold;
  }

  // Segments hit test
  for (let i = 0; i < points.length - 1; i++) {
    const x1 = nodeX + points[i].x;
    const y1 = nodeY + points[i].y;
    const x2 = nodeX + points[i + 1].x;
    const y2 = nodeY + points[i + 1].y;
    if (distanceToSegment(p.x, p.y, x1, y1, x2, y2) <= hitThreshold) {
      return true;
    }
  }

  return false;
}

function checkPointHitsNode(
  p: { x: number; y: number },
  node: SystemNode,
  eraserRadius: number
): boolean {
  if (node.type === 'drawing') {
    return checkPointHitsDrawingNode(p, node, eraserRadius);
  }

  // If it's a line or arrow shape node with points
  if (node.type === 'shape' && (node.data?.shapeType === 'line' || node.data?.shapeType === 'arrow')) {
    const points = node.data?.points as { x: number; y: number }[] | undefined;
    if (points && points.length >= 2) {
      const nodeX = node.position.x;
      const nodeY = node.position.y;
      const hitThreshold = eraserRadius + (node.data?.strokeWidth ?? 2.5) + 4;
      for (let i = 0; i < points.length - 1; i++) {
        const x1 = nodeX + points[i].x;
        const y1 = nodeY + points[i].y;
        const x2 = nodeX + points[i + 1].x;
        const y2 = nodeY + points[i + 1].y;
        if (distanceToSegment(p.x, p.y, x1, y1, x2, y2) <= hitThreshold) {
          return true;
        }
      }
      return false;
    }
  }

  // All other nodes: text, shapes (rectangle, circle, etc.), sticky, step, junction, system components
  const domEl = typeof document !== 'undefined'
    ? document.querySelector<HTMLElement>(`.react-flow__node[data-id="${node.id}"]`)
    : null;
  const w = (typeof node.style?.width === 'number' ? node.style.width : node.width) ?? domEl?.offsetWidth ?? 80;
  const h = (typeof node.style?.height === 'number' ? node.style.height : node.height) ?? domEl?.offsetHeight ?? 32;
  const pad = eraserRadius + 4;
  const nodeX = node.position.x;
  const nodeY = node.position.y;

  return p.x >= nodeX - pad && p.x <= nodeX + w + pad && p.y >= nodeY - pad && p.y <= nodeY + h + pad;
}

function checkPointHitsEdge(
  p: { x: number; y: number },
  edgePathEl: SVGPathElement,
  eraserRadius: number
): boolean {
  try {
    const totalLength = edgePathEl.getTotalLength();
    if (!totalLength || totalLength <= 0) return false;

    // Fast bounding box check in flow coordinates
    const bbox = edgePathEl.getBBox();
    const pad = eraserRadius + 6;
    if (
      p.x < bbox.x - pad ||
      p.x > bbox.x + bbox.width + pad ||
      p.y < bbox.y - pad ||
      p.y > bbox.y + bbox.height + pad
    ) {
      return false;
    }

    // Sample along the bezier curve
    const step = Math.min(8, Math.max(3, totalLength / 40));
    for (let l = 0; l <= totalLength; l += step) {
      const pt = edgePathEl.getPointAtLength(l);
      if (Math.hypot(p.x - pt.x, p.y - pt.y) <= eraserRadius + 4) {
        return true;
      }
    }
    const endPt = edgePathEl.getPointAtLength(totalLength);
    if (Math.hypot(p.x - endPt.x, p.y - endPt.y) <= eraserRadius + 4) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function PencilOverlay() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const brushColor = useCanvasStore((s) => s.brushColor);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);
  const eraserRadius = useCanvasStore((s) => s.eraserRadius);
  const isSpacePanning = useCanvasStore((s) => s.isSpacePanning);
  const addNode = useCanvasStore((s) => s.addNode);
  const eraseElements = useCanvasStore((s) => s.eraseElements);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const { screenToFlowPosition } = useReactFlow();

  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number } | null>(null);
  const [isErasingActive, setIsErasingActive] = useState(false);

  const isDrawingRef = useRef(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  const isErasingRef = useRef(false);
  const hasPushedHistoryRef = useRef(false);
  const lastFlowPosRef = useRef<{ x: number; y: number } | null>(null);

  const eraseBetween = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const steps = Math.max(1, Math.ceil(dist / 8));
      const testPoints: { x: number; y: number }[] = [];
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        testPoints.push({
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        });
      }

      const { nodes, edges } = useCanvasStore.getState();

      const toEraseNodes = new Set<string>();
      const toEraseEdges = new Set<string>();

      // 1. Check all nodes (drawings, shapes, text, sticky, components, etc.)
      for (const tp of testPoints) {
        for (const n of nodes) {
          if (!toEraseNodes.has(n.id) && checkPointHitsNode(tp, n, eraserRadius)) {
            toEraseNodes.add(n.id);
          }
        }
      }

      // 2. Check React Flow edges / connections
      if (edges.length > 0) {
        const edgePathEls = document.querySelectorAll<SVGPathElement>('.react-flow__edge-path');
        for (const pathEl of edgePathEls) {
          const edgeId = pathEl.id || pathEl.closest('.react-flow__edge')?.getAttribute('data-id');
          if (!edgeId || toEraseEdges.has(edgeId)) continue;
          for (const tp of testPoints) {
            if (checkPointHitsEdge(tp, pathEl, eraserRadius)) {
              toEraseEdges.add(edgeId);
              break;
            }
          }
        }
      }

      if (toEraseNodes.size > 0 || toEraseEdges.size > 0) {
        if (!hasPushedHistoryRef.current) {
          pushHistory();
          hasPushedHistoryRef.current = true;
        }
        eraseElements(Array.from(toEraseNodes), Array.from(toEraseEdges));
      }
    },
    [eraserRadius, eraseElements, pushHistory]
  );

  const onContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isDrawingRef.current = false;
    isErasingRef.current = false;
    setCurrentStroke([]);
    pointsRef.current = [];
    useCanvasStore.getState().setActiveTool('select');
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isSpacePanning || e.button === 1) return;
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        isDrawingRef.current = false;
        isErasingRef.current = false;
        setCurrentStroke([]);
        pointsRef.current = [];
        useCanvasStore.getState().setActiveTool('select');
        return;
      }
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      e.stopPropagation();

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}

      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      if (activeTool === 'pencil') {
        pointsRef.current = [pos];
        setCurrentStroke([pos]);
        isDrawingRef.current = true;
      } else if (activeTool === 'eraser') {
        isErasingRef.current = true;
        setIsErasingActive(true);
        hasPushedHistoryRef.current = false;
        lastFlowPosRef.current = pos;
        eraseBetween(pos, pos);
      }
    },
    [activeTool, isSpacePanning, screenToFlowPosition, eraseBetween]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activeTool === 'eraser') {
        setEraserCursor({ x: e.clientX, y: e.clientY });
      }

      if (activeTool === 'pencil' && isDrawingRef.current) {
        e.preventDefault();
        e.stopPropagation();

        const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const pts = pointsRef.current;
        const last = pts[pts.length - 1];
        if (last) {
          const dx = pos.x - last.x;
          const dy = pos.y - last.y;
          if (dx * dx + dy * dy < 4) return;
        }
        pts.push(pos);
        setCurrentStroke([...pts]);
      } else if (activeTool === 'eraser' && isErasingRef.current) {
        e.preventDefault();
        e.stopPropagation();

        const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const prev = lastFlowPosRef.current ?? pos;
        eraseBetween(prev, pos);
        lastFlowPosRef.current = pos;
      }
    },
    [activeTool, screenToFlowPosition, eraseBetween]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}

      if (activeTool === 'pencil' && isDrawingRef.current) {
        isDrawingRef.current = false;
        const pts = pointsRef.current;
        setCurrentStroke([]);
        pointsRef.current = [];

        if (pts.length < 1) return;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const p of pts) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }

        const pad = Math.max(4, strokeWidth);
        const originX = minX - pad;
        const originY = minY - pad;
        const width = Math.max(maxX - minX + pad * 2, 12);
        const height = Math.max(maxY - minY + pad * 2, 12);

        const normalized = pts.map((p) => ({
          x: p.x - originX,
          y: p.y - originY,
        }));

        const node = createDrawingNode(
          { x: originX, y: originY },
          width,
          height,
          normalized,
          brushColor,
          strokeWidth
        );

        addNode(node);
      } else if (activeTool === 'eraser' && isErasingRef.current) {
        isErasingRef.current = false;
        setIsErasingActive(false);
        hasPushedHistoryRef.current = false;
        lastFlowPosRef.current = null;
      }
    },
    [activeTool, brushColor, strokeWidth, addNode]
  );

  const onPointerLeave = useCallback(() => {
    if (activeTool === 'eraser' && !isErasingRef.current) {
      setEraserCursor(null);
    }
  }, [activeTool]);

  if (activeTool !== 'pencil' && activeTool !== 'eraser') return null;

  return (
    <>
      <div
        className={cn(
          activeTool === 'eraser'
            ? 'absolute inset-0 z-20 cursor-none touch-none select-none'
            : 'absolute inset-0 z-20 cursor-crosshair touch-none select-none',
          isSpacePanning && 'pointer-events-none'
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        onContextMenu={onContextMenu}
      />
      {activeTool === 'eraser' && eraserCursor && !isSpacePanning && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-transform duration-75"
          style={{
            left: eraserCursor.x,
            top: eraserCursor.y,
            transform: `translate(-50%, -50%) ${isErasingActive ? 'scale(1.2) rotate(-12deg)' : 'scale(1)'}`,
          }}
        >
          <Eraser
            className="size-6 text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] select-none pointer-events-none"
          />
        </div>
      )}
      <ViewportPortal>
        {activeTool === 'pencil' && currentStroke.length > 0 && (
          <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
            <path
              d={pointsToSvgPath(currentStroke)}
              fill="none"
              stroke={brushColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </ViewportPortal>
    </>
  );
}
