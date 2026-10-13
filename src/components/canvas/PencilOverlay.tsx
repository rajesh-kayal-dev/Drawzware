'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ViewportPortal, useReactFlow, useStore } from '@xyflow/react';
import { Eraser } from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { createDrawingNode } from '@/lib/node-factory';
import { pointsToSvgPath } from '@/components/nodes/FreehandDrawingNode';
import { cn } from '@/lib/utils';
import type { SystemNode } from '@/types';

interface Point {
  x: number;
  y: number;
}

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

/**
 * Calculates intersections of line segment A -> B with circle (center C, radius R).
 * Returns values t in [0, 1] where intersection points are A + t * (B - A).
 */
function getSegmentCircleIntersections(
  A: Point,
  B: Point,
  C: Point,
  R: number
): number[] {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const fx = A.x - C.x;
  const fy = A.y - C.y;

  const a = dx * dx + dy * dy;
  if (a < 1e-6) return [];

  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - R * R;

  const discriminant = b * b - 4 * a * c;
  if (discriminant <= 0) return [];

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  const roots: number[] = [];
  if (t1 > 0 && t1 < 1) roots.push(t1);
  if (t2 > 0 && t2 < 1) roots.push(t2);
  return roots.sort((x, y) => x - y);
}

/**
 * Partially erases stroke segments of a drawing node within distance `eraserRadius` from center `E`.
 * Returns:
 * - null: stroke was untouched
 * - []: stroke was completely erased (should be deleted)
 * - SystemNode[]: stroke was partially erased into one or more remaining sub-strokes
 */
function eraseDrawingStroke(
  node: SystemNode,
  E: Point,
  eraserRadius: number
): SystemNode[] | null {
  if (node.type !== 'drawing') return null;
  const rawPoints = node.data?.points as Point[] | undefined;
  if (!rawPoints || rawPoints.length === 0) return [];

  const nodeX = node.position.x;
  const nodeY = node.position.y;
  const strokeWidth = node.data?.strokeWidth ?? 2.5;
  const effectiveRadius = eraserRadius + strokeWidth / 2;

  // Fast O(1) broad-phase check using node bounding box
  const nodeW = (typeof node.style?.width === 'number' ? node.style.width : node.width) ?? 40;
  const nodeH = (typeof node.style?.height === 'number' ? node.style.height : node.height) ?? 40;
  if (
    E.x < nodeX - effectiveRadius ||
    E.x > nodeX + nodeW + effectiveRadius ||
    E.y < nodeY - effectiveRadius ||
    E.y > nodeY + nodeH + effectiveRadius
  ) {
    return null; // Untouched in O(1)
  }

  // Single point case
  if (rawPoints.length === 1) {
    const d = Math.hypot(nodeX + rawPoints[0].x - E.x, nodeY + rawPoints[0].y - E.y);
    return d <= effectiveRadius ? [] : null;
  }

  const isInside = (px: number, py: number) => Math.hypot(px - E.x, py - E.y) <= effectiveRadius;

  const subStrokes: Point[][] = [];
  let currentStroke: Point[] = [];
  let anyPointErased = false;

  for (let i = 0; i < rawPoints.length - 1; i++) {
    const Ax = nodeX + rawPoints[i].x;
    const Ay = nodeY + rawPoints[i].y;
    const Bx = nodeX + rawPoints[i + 1].x;
    const By = nodeY + rawPoints[i + 1].y;
    const A = { x: Ax, y: Ay };
    const B = { x: Bx, y: By };
    const aIn = isInside(Ax, Ay);
    const bIn = isInside(Bx, By);

    if (aIn || bIn) {
      anyPointErased = true;
    }

    if (!aIn) {
      if (currentStroke.length === 0) {
        currentStroke.push(A);
      }
    }

    const intersections = getSegmentCircleIntersections(A, B, E, effectiveRadius);

    if (!aIn && !bIn) {
      if (intersections.length === 2) {
        // Enters and exits circle in this segment
        anyPointErased = true;
        const [t1, t2] = intersections;
        const Penter = { x: Ax + t1 * (Bx - Ax), y: Ay + t1 * (By - Ay) };
        const Pexit = { x: Ax + t2 * (Bx - Ax), y: Ay + t2 * (By - Ay) };

        currentStroke.push(Penter);
        subStrokes.push(currentStroke);
        currentStroke = [Pexit, B];
      } else {
        // Entirely outside
        currentStroke.push(B);
      }
    } else if (!aIn && bIn) {
      // Enters circle: cuts off current stroke at boundary
      const t = intersections.length > 0 ? intersections[0] : 0.5;
      const Penter = { x: Ax + t * (Bx - Ax), y: Ay + t * (By - Ay) };
      currentStroke.push(Penter);
      subStrokes.push(currentStroke);
      currentStroke = [];
    } else if (aIn && !bIn) {
      // Exits circle: starts a new stroke at boundary
      const t = intersections.length > 0 ? intersections[intersections.length - 1] : 0.5;
      const Pexit = { x: Ax + t * (Bx - Ax), y: Ay + t * (By - Ay) };
      currentStroke = [Pexit, B];
    }
  }

  if (currentStroke.length > 0) {
    subStrokes.push(currentStroke);
  }

  if (!anyPointErased) {
    return null;
  }

  // Filter valid sub-strokes with enough length
  const validStrokes = subStrokes.filter((stroke) => {
    if (stroke.length < 2) return false;
    let len = 0;
    for (let k = 0; k < stroke.length - 1; k++) {
      len += Math.hypot(stroke[k + 1].x - stroke[k].x, stroke[k + 1].y - stroke[k].y);
    }
    return len >= 1.5;
  });

  if (validStrokes.length === 0) {
    return []; // Completely erased
  }

  const resultNodes: SystemNode[] = [];
  const color = node.data?.color || 'var(--ink)';

  for (let sIdx = 0; sIdx < validStrokes.length; sIdx++) {
    const stroke = validStrokes[sIdx];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of stroke) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const pad = Math.max(4, strokeWidth);
    const originX = minX - pad;
    const originY = minY - pad;
    const w = Math.max(maxX - minX + pad * 2, 12);
    const h = Math.max(maxY - minY + pad * 2, 12);

    const normalized = stroke.map((p) => ({
      x: p.x - originX,
      y: p.y - originY,
    }));

    if (sIdx === 0) {
      // Reuse node ID for first segment to keep identity
      resultNodes.push({
        ...node,
        position: { x: originX, y: originY },
        style: { ...node.style, width: w, height: h },
        data: {
          ...node.data,
          points: normalized,
        },
      });
    } else {
      // Create new drawing node for split segments
      resultNodes.push(
        createDrawingNode(
          { x: originX, y: originY },
          w,
          h,
          normalized,
          color,
          strokeWidth
        )
      );
    }
  }

  return resultNodes;
}

/** Check hits for non-drawing nodes (lines, shapes, system components) */
function checkPointHitsNonDrawingNode(
  p: Point,
  node: SystemNode,
  eraserRadius: number
): boolean {
  if (node.type === 'drawing') return false;

  // CRITICAL: Steps cards and text nodes must NEVER be deleted by the eraser!
  if (node.type === 'step' || node.type === 'text') return false;

  // Standalone lines and arrows: hit-test along line segments
  if (node.type === 'shape' && (node.data?.shapeType === 'line' || node.data?.shapeType === 'arrow')) {
    const points = node.data?.points as Point[] | undefined;
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

  // All other nodes: shapes, notes, system components
  // Fast memory lookup without layout thrashing
  const w = (typeof node.style?.width === 'number' ? node.style.width : node.width) ?? 120;
  const h = (typeof node.style?.height === 'number' ? node.style.height : node.height) ?? 60;
  const pad = eraserRadius + 4;
  const nodeX = node.position.x;
  const nodeY = node.position.y;

  return p.x >= nodeX - pad && p.x <= nodeX + w + pad && p.y >= nodeY - pad && p.y <= nodeY + h + pad;
}

function checkPointHitsEdge(
  p: Point,
  edgePathEl: SVGPathElement,
  eraserRadius: number
): boolean {
  try {
    const totalLength = edgePathEl.getTotalLength();
    if (!totalLength || totalLength <= 0) return false;

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
  const applyEraseBatch = useCanvasStore((s) => s.applyEraseBatch);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const { screenToFlowPosition } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);

  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isErasingActive, setIsErasingActive] = useState(false);
  const [lastEraseFlowPos, setLastEraseFlowPos] = useState<Point | null>(null);

  const cursorRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);

  const isErasingRef = useRef(false);
  const hasPushedHistoryRef = useRef(false);
  const lastFlowPosRef = useRef<Point | null>(null);

  const eraseBetween = useCallback(
    (from: Point, to: Point) => {
      // Only execute erasing when the Eraser tool is explicitly active
      if (useCanvasStore.getState().activeTool !== 'eraser') return;

      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const stepSize = Math.max(3, eraserRadius / 3);
      const steps = Math.max(1, Math.ceil(dist / stepSize));
      const testPoints: Point[] = [];
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        testPoints.push({
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        });
      }

      let nodes = useCanvasStore.getState().nodes;
      const edges = useCanvasStore.getState().edges;

      const toDeleteNodes = new Set<string>();
      const toDeleteEdges = new Set<string>();
      const updatedDrawingNodesMap = new Map<string, SystemNode>();

      // Pre-query edge paths once before the test-point loop for fast collision checks
      const edgePathEls = edges.length > 0 && typeof document !== 'undefined'
        ? Array.from(document.querySelectorAll<SVGPathElement>('.react-flow__edge-path'))
        : [];

      for (const tp of testPoints) {
        // 1. Partial erasing for Pencil/Freehand drawing strokes
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (n.type !== 'drawing') continue;
          if (toDeleteNodes.has(n.id)) continue;

          const res = eraseDrawingStroke(n, tp, eraserRadius);
          if (res !== null) {
            if (res.length === 0) {
              toDeleteNodes.add(n.id);
              updatedDrawingNodesMap.delete(n.id);
              nodes = nodes.filter((node) => node.id !== n.id);
            } else {
              const first = res[0];
              updatedDrawingNodesMap.set(first.id, first);
              nodes = nodes.map((node) => (node.id === n.id ? first : node));
              for (let k = 1; k < res.length; k++) {
                updatedDrawingNodesMap.set(res[k].id, res[k]);
                nodes.push(res[k]);
              }
            }
          }
        }

        // 2. Whole-element deletion for non-drawing nodes (lines, arrows, shapes)
        for (const n of nodes) {
          if (n.type === 'drawing') continue;
          if (!toDeleteNodes.has(n.id) && checkPointHitsNonDrawingNode(tp, n, eraserRadius)) {
            toDeleteNodes.add(n.id);
          }
        }

        // 3. Whole-element deletion for architecture edges and connectors
        if (edgePathEls.length > 0) {
          for (const pathEl of edgePathEls) {
            const edgeId = pathEl.id || pathEl.closest('.react-flow__edge')?.getAttribute('data-id');
            if (!edgeId || toDeleteEdges.has(edgeId)) continue;
            if (checkPointHitsEdge(tp, pathEl, eraserRadius)) {
              toDeleteEdges.add(edgeId);
            }
          }
        }
      }

      const hasModifications =
        toDeleteNodes.size > 0 ||
        toDeleteEdges.size > 0 ||
        updatedDrawingNodesMap.size > 0;

      if (hasModifications) {
        // Ensure entire erase drag gesture is captured as one undo/redo step
        if (!hasPushedHistoryRef.current) {
          pushHistory();
          hasPushedHistoryRef.current = true;
        }

        applyEraseBatch(
          Array.from(updatedDrawingNodesMap.values()),
          Array.from(toDeleteNodes),
          Array.from(toDeleteEdges)
        );
      }
    },
    [eraserRadius, pushHistory, applyEraseBatch]
  );

  const onContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeTool !== 'eraser') {
        isDrawingRef.current = false;
        isErasingRef.current = false;
        setCurrentStroke([]);
        pointsRef.current = [];
        setLastEraseFlowPos(null);
        useCanvasStore.getState().setActiveTool('select');
      }
    },
    [activeTool]
  );

  // Immediately deactivate drawing/erasing state when tool switches away
  const [prevActiveTool, setPrevActiveTool] = useState(activeTool);
  if (prevActiveTool !== activeTool) {
    setPrevActiveTool(activeTool);
    if (activeTool !== 'pencil' && activeTool !== 'eraser') {
      setCurrentStroke([]);
      setIsErasingActive(false);
      setLastEraseFlowPos(null);
    } else if (activeTool === 'pencil') {
      setIsErasingActive(false);
      setLastEraseFlowPos(null);
    } else if (activeTool === 'eraser') {
      setCurrentStroke([]);
    }
  }

  useEffect(() => {
    if (activeTool !== 'pencil' && activeTool !== 'eraser') {
      isDrawingRef.current = false;
      isErasingRef.current = false;
      pointsRef.current = [];
      if (cursorRef.current) cursorRef.current.style.display = 'none';
    } else if (activeTool === 'pencil') {
      isErasingRef.current = false;
      if (cursorRef.current) cursorRef.current.style.display = 'none';
    } else if (activeTool === 'eraser') {
      isDrawingRef.current = false;
      pointsRef.current = [];
    }
  }, [activeTool]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (activeTool === 'pencil' || activeTool === 'eraser')) {
        isDrawingRef.current = false;
        isErasingRef.current = false;
        setCurrentStroke([]);
        pointsRef.current = [];
        if (cursorRef.current) cursorRef.current.style.display = 'none';
        setIsErasingActive(false);
        setLastEraseFlowPos(null);
        useCanvasStore.getState().setActiveTool('select');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTool]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activeTool !== 'pencil' && activeTool !== 'eraser') return;
      if (isSpacePanning || e.button === 1) return;
      if (activeTool === 'pencil') {
        if (e.button === 2) {
          e.preventDefault();
          e.stopPropagation();
          isDrawingRef.current = false;
          setCurrentStroke([]);
          pointsRef.current = [];
          useCanvasStore.getState().setActiveTool('select');
          return;
        }
        if (e.button !== 0 && e.pointerType === 'mouse') return;
      } else if (activeTool === 'eraser') {
        // Support both left click (0) and right click (2) for erasing with blue effect
        if (e.button !== 0 && e.button !== 2 && e.pointerType === 'mouse') return;
      }

      if (activeTool === 'eraser' && cursorRef.current) {
        cursorRef.current.style.display = 'flex';
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-30%, -70%)`;
      }

      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      // Clicking or interacting with Steps cards, Text nodes, or form inputs must NEVER trigger the eraser or pencil
      const { nodes } = useCanvasStore.getState();
      const hitProtectedNode = nodes.find((n) => {
        if (n.type !== 'step' && n.type !== 'text') return false;
        const domEl = typeof document !== 'undefined'
          ? document.querySelector<HTMLElement>(`.react-flow__node[data-id="${n.id}"]`)
          : null;
        const w = (typeof n.style?.width === 'number' ? n.style.width : n.width) ?? domEl?.offsetWidth ?? 120;
        const h = (typeof n.style?.height === 'number' ? n.style.height : n.height) ?? domEl?.offsetHeight ?? 40;
        return (
          pos.x >= n.position.x &&
          pos.x <= n.position.x + w &&
          pos.y >= n.position.y &&
          pos.y <= n.position.y + h
        );
      });

      if (hitProtectedNode) {
        isDrawingRef.current = false;
        isErasingRef.current = false;
        setIsErasingActive(false);
        if (cursorRef.current) cursorRef.current.style.display = 'none';
        setLastEraseFlowPos(null);
        setCurrentStroke([]);
        pointsRef.current = [];
        // Immediately restore normal selection tool and select the clicked node
        useCanvasStore.getState().setActiveTool('select');
        useCanvasStore.getState().setSelectedNodeId(hitProtectedNode.id);
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}

      if (activeTool === 'pencil') {
        pointsRef.current = [pos];
        setCurrentStroke([pos]);
        isDrawingRef.current = true;
      } else if (activeTool === 'eraser') {
        if (useCanvasStore.getState().activeTool !== 'eraser') return;
        isErasingRef.current = true;
        setIsErasingActive(true);
        hasPushedHistoryRef.current = false;
        lastFlowPosRef.current = pos;
        setLastEraseFlowPos(pos);
        eraseBetween(pos, pos);
      }
    },
    [activeTool, isSpacePanning, screenToFlowPosition, eraseBetween]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Ultra-fast 0ms cursor following via direct DOM transform without triggering React re-renders
      if (activeTool === 'eraser' && cursorRef.current) {
        cursorRef.current.style.display = 'flex';
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-30%, -70%)`;
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
        if (useCanvasStore.getState().activeTool !== 'eraser') {
          isErasingRef.current = false;
          setIsErasingActive(false);
          return;
        }
        e.preventDefault();
        e.stopPropagation();

        // Process coalesced pointer events so fast sweeps follow the cursor naturally without skipped segments
        const native = e.nativeEvent;
        const coalesced =
          typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
        const events = coalesced.length > 0 ? coalesced : [e];

        for (const ev of events) {
          const pos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
          const prev = lastFlowPosRef.current ?? pos;
          eraseBetween(prev, pos);
          lastFlowPosRef.current = pos;
        }

        const lastEv = events[events.length - 1];
        setLastEraseFlowPos(screenToFlowPosition({ x: lastEv.clientX, y: lastEv.clientY }));
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
        setLastEraseFlowPos(null);
      }
    },
    [activeTool, brushColor, strokeWidth, addNode]
  );

  const onPointerLeave = useCallback(() => {
    if (activeTool === 'eraser' && !isErasingRef.current) {
      if (cursorRef.current) cursorRef.current.style.display = 'none';
      setLastEraseFlowPos(null);
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

      {/* Eraser Icon Cursor: Clean white eraser, with subtle highlight effect when mouse button is pressed / right-clicked */}
      {activeTool === 'eraser' && !isSpacePanning && (
        <div
          ref={cursorRef}
          className="pointer-events-none fixed z-50 flex items-center justify-center select-none"
          style={{
            display: 'none',
            left: 0,
            top: 0,
            transform: 'translate(-30%, -70%)',
            willChange: 'transform',
          }}
        >
          {/* Small, muted vertical highlight indicator on cursor when pressed */}
          {isErasingActive && (
            <div className="absolute -left-1 top-2.5 h-3.5 w-1 rounded-full bg-blue-500/40 blur-[0.5px] pointer-events-none" />
          )}

          {/* Normal white eraser icon */}
          <div
            className={cn(
              'relative flex items-center justify-center transition-transform duration-75',
              isErasingActive ? 'scale-110 -rotate-12' : 'scale-100 rotate-0'
            )}
          >
            <Eraser
              className={cn(
                'size-6 stroke-[2.2] pointer-events-none select-none transition-colors duration-75',
                isErasingActive
                  ? 'text-blue-100 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                  : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] drop-shadow-[0_0_1.5px_rgba(0,0,0,0.95)]'
              )}
            />
          </div>
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

        {/* Small, muted vertical highlight in canvas coordinates while mouse button is pressed (prominent circular border removed) */}
        {activeTool === 'eraser' && isErasingActive && lastEraseFlowPos && (
          <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
            <rect
              x={lastEraseFlowPos.x - Math.max(1, 1.5 / (zoom || 1))}
              y={lastEraseFlowPos.y - Math.max(7, 9 / (zoom || 1))}
              width={Math.max(2, 3 / (zoom || 1))}
              height={Math.max(14, 18 / (zoom || 1))}
              rx={Math.max(1, 1.5 / (zoom || 1))}
              fill="rgba(59, 130, 246, 0.4)"
            />
          </svg>
        )}
      </ViewportPortal>
    </>
  );
}
