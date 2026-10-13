'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useReactFlow, ViewportPortal } from '@xyflow/react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { createShapeNode } from '@/lib/node-factory';
import {
  findNodeAt,
  getBestHandles,
  simplifyPoints,
  snapOrthogonalPoints,
  pointsToSvgPath,
  type Point,
} from '@/lib/line-routing';
import type { ShapeType, SystemEdge, SystemNode } from '@/types';

const DRAWING_TOOLS = new Set(['rectangle', 'circle', 'arrow', 'line']);

export function ShapeDrawingOverlay() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const addNode = useCanvasStore((s) => s.addNode);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const setSelectedNodeId = useCanvasStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useCanvasStore((s) => s.setSelectedEdgeId);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const lastDrawingFormatting = useCanvasStore((s) => s.lastDrawingFormatting);
  const isSpacePanning = useCanvasStore((s) => s.isSpacePanning);

  const { screenToFlowPosition } = useReactFlow();

  const [dragState, setDragState] = useState<{
    startFlow: Point;
    currentFlow: Point;
    trail: Point[];
    isShift: boolean;
    sourceNode: SystemNode | null;
    targetNode: SystemNode | null;
  } | null>(null);

  const isDrawingRef = useRef(false);

  // Deactivate drawing state immediately when tool switches away from drawing tools
  const [prevActiveTool, setPrevActiveTool] = useState(activeTool);
  if (prevActiveTool !== activeTool) {
    setPrevActiveTool(activeTool);
    if (!DRAWING_TOOLS.has(activeTool)) {
      setDragState(null);
    }
  }

  useEffect(() => {
    if (!DRAWING_TOOLS.has(activeTool)) {
      isDrawingRef.current = false;
    }
  }, [activeTool]);

  // Cancel on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && DRAWING_TOOLS.has(activeTool)) {
        e.preventDefault();
        isDrawingRef.current = false;
        setDragState(null);
        setActiveTool('select');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTool, setActiveTool]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!DRAWING_TOOLS.has(activeTool)) return;
      if (e.button !== 0 || isSpacePanning) return;

      const target = e.target as HTMLElement;
      // Don't intercept UI controls
      if (target.closest('button, input, [role="dialog"], [role="toolbar"], .nodrag')) return;

      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      // Clicking on Steps cards or Text nodes restores normal select tool
      const hitProtectedNode = nodes.find((n) => {
        if (n.type !== 'step' && n.type !== 'text') return false;
        const domEl = typeof document !== 'undefined'
          ? document.querySelector<HTMLElement>(`.react-flow__node[data-id="${n.id}"]`)
          : null;
        const w = (typeof n.style?.width === 'number' ? n.style.width : n.width) ?? domEl?.offsetWidth ?? 120;
        const h = (typeof n.style?.height === 'number' ? n.style.height : n.height) ?? domEl?.offsetHeight ?? 40;
        return (
          flowPos.x >= n.position.x &&
          flowPos.x <= n.position.x + w &&
          flowPos.y >= n.position.y &&
          flowPos.y <= n.position.y + h
        );
      });

      if (hitProtectedNode) {
        isDrawingRef.current = false;
        setDragState(null);
        setActiveTool('select');
        useCanvasStore.getState().setSelectedNodeId(hitProtectedNode.id);
        return;
      }

      isDrawingRef.current = true;

      const isLineOrArrow = activeTool === 'line' || activeTool === 'arrow';
      const sourceNode = isLineOrArrow ? findNodeAt(flowPos, nodes) : null;

      setDragState({
        startFlow: flowPos,
        currentFlow: flowPos,
        trail: [flowPos],
        isShift: e.shiftKey,
        sourceNode,
        targetNode: null,
      });

      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [activeTool, isSpacePanning, screenToFlowPosition, nodes, setActiveTool]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDrawingRef.current) return;
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      setDragState((prev) => {
        if (!prev) return null;

        const isLineOrArrow = activeTool === 'line' || activeTool === 'arrow';
        let targetNode = prev.targetNode;
        if (isLineOrArrow && prev.sourceNode) {
          const hit = findNodeAt(flowPos, nodes);
          targetNode = hit && hit.id !== prev.sourceNode.id ? hit : null;
        }

        const last = prev.trail[prev.trail.length - 1];
        const dist = Math.hypot(flowPos.x - last.x, flowPos.y - last.y);
        const nextTrail = dist >= 6 ? [...prev.trail, flowPos] : prev.trail;

        return {
          ...prev,
          currentFlow: flowPos,
          trail: nextTrail,
          isShift: e.shiftKey,
          targetNode,
        };
      });
    },
    [screenToFlowPosition, activeTool, nodes]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDrawingRef.current || !dragState) {
        isDrawingRef.current = false;
        setDragState(null);
        return;
      }

      isDrawingRef.current = false;
      const { startFlow, currentFlow, trail, isShift, sourceNode, targetNode } = dragState;
      const isLineOrArrow = activeTool === 'line' || activeTool === 'arrow';

      // ── CASE 1: Connection between two existing architecture components or junctions ──
      if (isLineOrArrow && sourceNode && targetNode && sourceNode.id !== targetNode.id) {
        const handles = getBestHandles(sourceNode, targetNode);
        const newEdge: SystemEdge = {
          id: crypto.randomUUID(),
          source: sourceNode.id,
          target: targetNode.id,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          type: 'system',
          data: {
            edgeType: 'rest',
            color: lastDrawingFormatting.strokeColor === 'transparent' ? undefined : lastDrawingFormatting.strokeColor,
            strokeWidth: lastDrawingFormatting.strokeWidth,
            strokeStyle: lastDrawingFormatting.strokeStyle,
            arrowEnd: activeTool === 'arrow',
            arrowStart: lastDrawingFormatting.arrowStart,
            routeType: 'smoothstep',
          },
        };

        clearSelection();
        setEdges([...edges, newEdge]);
        setSelectedEdgeId(newEdge.id);
        pushHistory();
        setActiveTool('select');
        setDragState(null);

        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        return;
      }

      // ── CASE 2: Freeform multi-segment line or arrow ──
      if (isLineOrArrow) {
        let waypoints: Point[];

        if (isShift || trail.length <= 2) {
          // Single straight segment
          const dx = currentFlow.x - startFlow.x;
          const dy = currentFlow.y - startFlow.y;
          if (Math.hypot(dx, dy) < 8) {
            // Default 140px horizontal line on single click
            waypoints = [startFlow, { x: startFlow.x + 140, y: startFlow.y }];
          } else {
            waypoints = [startFlow, currentFlow];
          }
        } else {
          // Simplify mouse trail to extract corners and bends
          const simplified = simplifyPoints(trail, 14);
          waypoints = snapOrthogonalPoints(simplified);
          if (waypoints.length < 2) {
            waypoints = [startFlow, currentFlow];
          }
        }

        const xs = waypoints.map((p) => p.x);
        const ys = waypoints.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        const width = Math.max(maxX - minX, 30);
        const height = Math.max(maxY - minY, 30);

        // Normalize points relative to node top-left
        const relativePoints = waypoints.map((p) => ({
          x: Math.round(p.x - minX),
          y: Math.round(p.y - minY),
        }));

        const shapeType = activeTool as ShapeType;
        const newNode = createShapeNode(
          shapeType,
          { x: Math.round(minX), y: Math.round(minY) },
          '',
          { width: Math.round(width), height: Math.round(height) },
          {
            points: relativePoints,
            shapeStroke: lastDrawingFormatting.strokeColor,
            strokeWidth: lastDrawingFormatting.strokeWidth,
            strokeStyle: lastDrawingFormatting.strokeStyle,
            arrowStart: lastDrawingFormatting.arrowStart,
            arrowEnd: activeTool === 'arrow' ? true : lastDrawingFormatting.arrowEnd,
          }
        );

        clearSelection();
        addNode(newNode);
        setSelectedNodeId(newNode.id);
        pushHistory();
        setActiveTool('select');
        setDragState(null);

        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        return;
      }

      // ── CASE 3: Standard geometric shape (Rectangle, Circle) ──
      let dx = currentFlow.x - startFlow.x;
      let dy = currentFlow.y - startFlow.y;
      const isTiny = Math.hypot(dx, dy) < 8;

      let x: number;
      let y: number;
      let width: number;
      let height: number;

      if (isTiny) {
        if (activeTool === 'circle') {
          width = 110;
          height = 110;
        } else {
          width = 160;
          height = 100;
        }
        x = startFlow.x - width / 2;
        y = startFlow.y - height / 2;
      } else {
        if (isShift) {
          const maxSide = Math.max(Math.abs(dx), Math.abs(dy));
          dx = dx >= 0 ? maxSide : -maxSide;
          dy = dy >= 0 ? maxSide : -maxSide;
        }
        x = Math.min(startFlow.x, startFlow.x + dx);
        y = Math.min(startFlow.y, startFlow.y + dy);
        width = Math.max(Math.abs(dx), 30);
        height = Math.max(Math.abs(dy), 30);
      }

      const shapeType = activeTool as ShapeType;
      const newNode = createShapeNode(
        shapeType,
        { x: Math.round(x), y: Math.round(y) },
        '',
        { width: Math.round(width), height: Math.round(height) },
        {
          shapeStroke: lastDrawingFormatting.strokeColor,
          shapeFill: lastDrawingFormatting.fillColor,
          strokeWidth: lastDrawingFormatting.strokeWidth,
          strokeStyle: lastDrawingFormatting.strokeStyle,
        }
      );

      clearSelection();
      addNode(newNode);
      setSelectedNodeId(newNode.id);
      pushHistory();
      setActiveTool('select');
      setDragState(null);

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    },
    [
      dragState,
      activeTool,
      edges,
      lastDrawingFormatting,
      clearSelection,
      setEdges,
      setSelectedEdgeId,
      addNode,
      setSelectedNodeId,
      pushHistory,
      setActiveTool,
    ]
  );

  if (!DRAWING_TOOLS.has(activeTool)) return null;

  const stroke =
    lastDrawingFormatting.strokeColor === 'transparent' ? '#3b82f6' : lastDrawingFormatting.strokeColor;
  const fill =
    lastDrawingFormatting.fillColor === 'transparent' ? 'none' : lastDrawingFormatting.fillColor;
  const strokeWidth = lastDrawingFormatting.strokeWidth;
  const strokeDash =
    lastDrawingFormatting.strokeStyle === 'dashed'
      ? '6 4'
      : lastDrawingFormatting.strokeStyle === 'dotted'
      ? '2 3'
      : undefined;

  let livePoints: Point[] = [];
  let isConnecting = false;

  if (dragState) {
    const isLineOrArrow = activeTool === 'line' || activeTool === 'arrow';
    if (isLineOrArrow) {
      if (dragState.sourceNode && dragState.targetNode) {
        isConnecting = true;
        const handles = getBestHandles(dragState.sourceNode, dragState.targetNode);
        const sW = (typeof dragState.sourceNode.style?.width === 'number' ? dragState.sourceNode.style.width : dragState.sourceNode.width) ?? 160;
        const sH = (typeof dragState.sourceNode.style?.height === 'number' ? dragState.sourceNode.style.height : dragState.sourceNode.height) ?? 80;
        const tW = (typeof dragState.targetNode.style?.width === 'number' ? dragState.targetNode.style.width : dragState.targetNode.width) ?? 160;
        const tH = (typeof dragState.targetNode.style?.height === 'number' ? dragState.targetNode.style.height : dragState.targetNode.height) ?? 80;

        const sPos = {
          x: handles.sourceHandle.includes('left') ? dragState.sourceNode.position.x : handles.sourceHandle.includes('right') ? dragState.sourceNode.position.x + sW : dragState.sourceNode.position.x + sW / 2,
          y: handles.sourceHandle.includes('top') ? dragState.sourceNode.position.y : handles.sourceHandle.includes('bottom') ? dragState.sourceNode.position.y + sH : dragState.sourceNode.position.y + sH / 2,
        };
        const tPos = {
          x: handles.targetHandle.includes('left') ? dragState.targetNode.position.x : handles.targetHandle.includes('right') ? dragState.targetNode.position.x + tW : dragState.targetNode.position.x + tW / 2,
          y: handles.targetHandle.includes('top') ? dragState.targetNode.position.y : handles.targetHandle.includes('bottom') ? dragState.targetNode.position.y + tH : dragState.targetNode.position.y + tH / 2,
        };

        // Orthogonal connecting line
        const midX = (sPos.x + tPos.x) / 2;
        livePoints = [sPos, { x: midX, y: sPos.y }, { x: midX, y: tPos.y }, tPos];
      } else if (dragState.isShift || dragState.trail.length <= 2) {
        livePoints = [dragState.startFlow, dragState.currentFlow];
      } else {
        const simplified = simplifyPoints(dragState.trail, 14);
        livePoints = snapOrthogonalPoints(simplified);
      }
    }
  }

  // Preview bounds for rect / circle
  let shapePreview = null;
  if (dragState && (activeTool === 'rectangle' || activeTool === 'circle')) {
    let dx = dragState.currentFlow.x - dragState.startFlow.x;
    let dy = dragState.currentFlow.y - dragState.startFlow.y;
    if (dragState.isShift) {
      const maxSide = Math.max(Math.abs(dx), Math.abs(dy));
      dx = dx >= 0 ? maxSide : -maxSide;
      dy = dy >= 0 ? maxSide : -maxSide;
    }
    const x = Math.min(dragState.startFlow.x, dragState.startFlow.x + dx);
    const y = Math.min(dragState.startFlow.y, dragState.startFlow.y + dy);
    const w = Math.max(Math.abs(dx), 4);
    const h = Math.max(Math.abs(dy), 4);
    shapePreview = { x, y, w, h };
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        isDrawingRef.current = false;
        setDragState(null);
      }}
      className="absolute inset-0 z-30 cursor-crosshair select-none touch-none"
      style={{ pointerEvents: 'all' }}
    >
      <ViewportPortal>
        {dragState && (activeTool === 'line' || activeTool === 'arrow') && livePoints.length >= 2 && (
          <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
            <defs>
              <marker
                id="preview-arrow-end"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={stroke} />
              </marker>
            </defs>

            {/* Target highlight ring if snapping to component */}
            {isConnecting && dragState.targetNode && (
              <rect
                x={dragState.targetNode.position.x - 4}
                y={dragState.targetNode.position.y - 4}
                width={((typeof dragState.targetNode.style?.width === 'number' ? dragState.targetNode.style.width : dragState.targetNode.width) ?? 160) + 8}
                height={((typeof dragState.targetNode.style?.height === 'number' ? dragState.targetNode.style.height : dragState.targetNode.height) ?? 80) + 8}
                rx={12}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray="4 4"
                className="animate-pulse"
              />
            )}

            <path
              d={pointsToSvgPath(livePoints, 8)}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={activeTool === 'arrow' ? 'url(#preview-arrow-end)' : undefined}
            />
          </svg>
        )}

        {shapePreview && (
          <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
            <g transform={`translate(${shapePreview.x}, ${shapePreview.y})`}>
              {activeTool === 'circle' && (
                <ellipse
                  cx={shapePreview.w / 2}
                  cy={shapePreview.h / 2}
                  rx={shapePreview.w / 2}
                  ry={shapePreview.h / 2}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDash}
                />
              )}
              {activeTool === 'rectangle' && (
                <rect
                  x={0}
                  y={0}
                  width={shapePreview.w}
                  height={shapePreview.h}
                  rx={4}
                  ry={4}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDash}
                />
              )}
            </g>
          </svg>
        )}
      </ViewportPortal>
    </div>
  );
}
