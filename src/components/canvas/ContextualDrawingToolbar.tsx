'use client';

import { useState, useRef } from 'react';
import {
  ChevronDown,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Copy,
  Layers,
  Ban,
  CornerDownRight,
  Spline,
  Minus,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';
import type { DrawingFormatting, SystemNodeData, SystemEdgeData } from '@/types';

export const PRESET_COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Black', value: '#18181b' },
];

const STROKE_WIDTH_PRESETS: { label: 'S' | 'M' | 'L' | 'XL'; value: number }[] = [
  { label: 'S', value: 1.5 },
  { label: 'M', value: 3 },
  { label: 'L', value: 5 },
  { label: 'XL', value: 8 },
];

export function ContextualDrawingToolbar() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const updateEdgeData = useCanvasStore((s) => s.updateEdgeData);
  const deleteSelection = useCanvasStore((s) => s.deleteSelection);
  const duplicateNodes = useCanvasStore((s) => s.duplicateNodes);
  const sendToBack = useCanvasStore((s) => s.sendToBack);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const lastDrawingFormatting = useCanvasStore((s) => s.lastDrawingFormatting);
  const setLastDrawingFormatting = useCanvasStore((s) => s.setLastDrawingFormatting);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : null;

  const nodeData = selectedNode?.data as (SystemNodeData & { points?: unknown }) | undefined;
  const edgeData = selectedEdge?.data as SystemEdgeData | undefined;

  // Determine current effective formatting
  const effectiveStrokeColor =
    nodeData?.shapeStroke ||
    (selectedNode?.type === 'drawing' ? nodeData?.color : null) ||
    edgeData?.color ||
    lastDrawingFormatting.strokeColor;

  const effectiveFillColor =
    nodeData?.shapeFill || lastDrawingFormatting.fillColor;

  const effectiveStrokeWidth =
    nodeData?.strokeWidth ||
    (selectedNode?.type === 'drawing' ? nodeData?.strokeWidth : null) ||
    edgeData?.strokeWidth ||
    lastDrawingFormatting.strokeWidth;

  const effectiveStrokeStyle =
    nodeData?.strokeStyle ||
    edgeData?.strokeStyle ||
    lastDrawingFormatting.strokeStyle;

  const effectiveArrowStart = Boolean(
    nodeData?.arrowStart ?? edgeData?.arrowStart ?? lastDrawingFormatting.arrowStart
  );
  const effectiveArrowEnd =
    nodeData?.arrowEnd !== undefined
      ? nodeData.arrowEnd
      : edgeData?.arrowEnd !== undefined
      ? edgeData.arrowEnd
      : lastDrawingFormatting.arrowEnd !== false;

  const effectiveRouteType =
    edgeData?.routeType ||
    nodeData?.routeType ||
    lastDrawingFormatting.routeType ||
    'smoothstep';

  const [hoverColorName, setHoverColorName] = useState<string | null>(null);
  const [hoverFillName, setHoverFillName] = useState<string | null>(null);
  const customColorInputRef = useRef<HTMLInputElement>(null);
  const customFillInputRef = useRef<HTMLInputElement>(null);

  const applyFormatting = (updates: Partial<DrawingFormatting>) => {
    setLastDrawingFormatting(updates);

    if (selectedNode) {
      const nodeUpdates: Partial<SystemNodeData> = {};
      if (updates.strokeColor !== undefined) {
        nodeUpdates.shapeStroke = updates.strokeColor;
        if (selectedNode.type === 'drawing') nodeUpdates.color = updates.strokeColor;
      }
      if (updates.fillColor !== undefined) {
        nodeUpdates.shapeFill = updates.fillColor;
      }
      if (updates.strokeWidth !== undefined) {
        nodeUpdates.strokeWidth = updates.strokeWidth;
      }
      if (updates.strokeStyle !== undefined) {
        nodeUpdates.strokeStyle = updates.strokeStyle;
      }
      if (updates.arrowStart !== undefined) {
        nodeUpdates.arrowStart = updates.arrowStart;
      }
      if (updates.arrowEnd !== undefined) {
        nodeUpdates.arrowEnd = updates.arrowEnd;
      }
      if (updates.routeType !== undefined) {
        nodeUpdates.routeType = updates.routeType;
        if (
          updates.routeType === 'straight' &&
          selectedNode.data?.points &&
          Array.isArray(selectedNode.data.points)
        ) {
          const pts = selectedNode.data.points;
          if (pts.length > 2) {
            nodeUpdates.points = [pts[0], pts[pts.length - 1]];
          }
        }
      }
      updateNodeData(selectedNode.id, nodeUpdates);
      pushHistory();
    } else if (selectedEdge) {
      const edgeUpdates: Partial<SystemEdgeData> = {};
      if (updates.strokeColor !== undefined) edgeUpdates.color = updates.strokeColor;
      if (updates.strokeWidth !== undefined) edgeUpdates.strokeWidth = updates.strokeWidth;
      if (updates.strokeStyle !== undefined) edgeUpdates.strokeStyle = updates.strokeStyle;
      if (updates.arrowStart !== undefined) edgeUpdates.arrowStart = updates.arrowStart;
      if (updates.arrowEnd !== undefined) edgeUpdates.arrowEnd = updates.arrowEnd;
      if (updates.routeType !== undefined) edgeUpdates.routeType = updates.routeType;
      updateEdgeData(selectedEdge.id, edgeUpdates);
      pushHistory();
    }
  };


  const showFillControl =
    activeTool === 'rectangle' ||
    activeTool === 'circle' ||
    (selectedNode?.type === 'shape' &&
      selectedNode.data?.shapeType !== 'line' &&
      selectedNode.data?.shapeType !== 'arrow' &&
      selectedNode.data?.shapeType !== 'divider');

  const showArrowControls =
    activeTool === 'arrow' ||
    activeTool === 'line' ||
    selectedEdge !== null ||
    (selectedNode?.type === 'shape' &&
      (selectedNode.data?.shapeType === 'arrow' || selectedNode.data?.shapeType === 'line'));

  const editingShapeId = useCanvasStore((s) => s.editingShapeId);
  if (editingShapeId) return null;

  return (
    <div
      role="toolbar"
      aria-label="Contextual drawing formatting toolbar"
      className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border border-white/10 bg-[#18181b]/95 p-1.5 text-white shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-md whitespace-nowrap"
    >
      {/* 1. FILL COLOR (if shape supports fill) */}
      {showFillControl && (
        <Popover>
          <SimpleTooltip label="Fill Color" side="top">
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Fill Color"
                className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                {effectiveFillColor === 'transparent' || effectiveFillColor === 'none' ? (
                  <span className="flex size-4 items-center justify-center rounded-full border border-white/30 text-neutral-400">
                    <Ban className="size-3" />
                  </span>
                ) : (
                  <span
                    className="size-4 rounded-full border border-white/30 shadow-sm"
                    style={{ backgroundColor: effectiveFillColor }}
                  />
                )}
                <ChevronDown className="size-3 text-neutral-400" />
              </button>
            </PopoverTrigger>
          </SimpleTooltip>
          <PopoverContent
            side="top"
            sideOffset={8}
            className="w-[200px] rounded-xl border border-white/10 bg-[#1e1e22] p-2 text-white shadow-xl"
          >
            <div className="mb-1.5 px-1 text-center text-[11px] font-medium text-neutral-400">
              {hoverFillName ?? (effectiveFillColor === 'transparent' ? 'Transparent' : 'Fill Color')}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {/* Transparent button */}
              <button
                type="button"
                onClick={() => applyFormatting({ fillColor: 'transparent' })}
                onMouseEnter={() => setHoverFillName('Transparent')}
                onMouseLeave={() => setHoverFillName(null)}
                aria-label="Transparent"
                className={cn(
                  'flex size-7 items-center justify-center rounded-lg border border-white/20 text-neutral-400 transition hover:bg-white/10',
                  effectiveFillColor === 'transparent' && 'ring-2 ring-accent'
                )}
              >
                <Ban className="size-3.5" />
              </button>

              {PRESET_COLORS.slice(0, 4).map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => applyFormatting({ fillColor: c.value })}
                  onMouseEnter={() => setHoverFillName(c.name)}
                  onMouseLeave={() => setHoverFillName(null)}
                  aria-label={c.name}
                  className={cn(
                    'size-7 rounded-lg border border-white/20 transition hover:scale-105',
                    effectiveFillColor === c.value && 'ring-2 ring-accent'
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}

              {PRESET_COLORS.slice(4).map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => applyFormatting({ fillColor: c.value })}
                  onMouseEnter={() => setHoverFillName(c.name)}
                  onMouseLeave={() => setHoverFillName(null)}
                  aria-label={c.name}
                  className={cn(
                    'size-7 rounded-lg border border-white/20 transition hover:scale-105',
                    effectiveFillColor === c.value && 'ring-2 ring-accent'
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}

              {/* Custom rainbow color */}
              <button
                type="button"
                onClick={() => customFillInputRef.current?.click()}
                onMouseEnter={() => setHoverFillName('Custom Color')}
                onMouseLeave={() => setHoverFillName(null)}
                aria-label="Custom color"
                className="relative size-7 rounded-lg border border-white/20 overflow-hidden hover:scale-105 transition"
                style={{
                  background:
                    'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #FFFF00 60deg, #00FF00 120deg, #00FFFF 180deg, #0000FF 240deg, #FF00FF 300deg, #FF0000 360deg)',
                }}
              >
                <input
                  ref={customFillInputRef}
                  type="color"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => applyFormatting({ fillColor: e.target.value })}
                />
              </button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* 2. STROKE COLOR */}
      <Popover>
        <SimpleTooltip label="Stroke Color" side="top">
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Stroke Color"
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <span
                className="size-4 rounded-full border border-white/30 shadow-sm"
                style={{
                  backgroundColor:
                    effectiveStrokeColor === 'var(--ink)'
                      ? '#ffffff'
                      : effectiveStrokeColor === 'transparent'
                      ? 'transparent'
                      : effectiveStrokeColor,
                }}
              />
              <ChevronDown className="size-3 text-neutral-400" />
            </button>
          </PopoverTrigger>
        </SimpleTooltip>
        <PopoverContent
          side="top"
          sideOffset={8}
          className="w-[200px] rounded-xl border border-white/10 bg-[#1e1e22] p-2 text-white shadow-xl"
        >
          <div className="mb-1.5 px-1 text-center text-[11px] font-medium text-neutral-400">
            {hoverColorName ?? 'Stroke Color'}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {/* Transparent stroke option */}
            <button
              type="button"
              onClick={() => applyFormatting({ strokeColor: 'transparent' })}
              onMouseEnter={() => setHoverColorName('No Border')}
              onMouseLeave={() => setHoverColorName(null)}
              aria-label="No border"
              className={cn(
                'flex size-7 items-center justify-center rounded-lg border border-white/20 text-neutral-400 transition hover:bg-white/10',
                effectiveStrokeColor === 'transparent' && 'ring-2 ring-accent'
              )}
            >
              <Ban className="size-3.5" />
            </button>

            {PRESET_COLORS.slice(0, 4).map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => applyFormatting({ strokeColor: c.value })}
                onMouseEnter={() => setHoverColorName(c.name)}
                onMouseLeave={() => setHoverColorName(null)}
                aria-label={c.name}
                className={cn(
                  'size-7 rounded-lg border border-white/20 transition hover:scale-105',
                  effectiveStrokeColor === c.value && 'ring-2 ring-accent'
                )}
                style={{ backgroundColor: c.value }}
              />
            ))}

            {PRESET_COLORS.slice(4).map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => applyFormatting({ strokeColor: c.value })}
                onMouseEnter={() => setHoverColorName(c.name)}
                onMouseLeave={() => setHoverColorName(null)}
                aria-label={c.name}
                className={cn(
                  'size-7 rounded-lg border border-white/20 transition hover:scale-105',
                  effectiveStrokeColor === c.value && 'ring-2 ring-accent'
                )}
                style={{ backgroundColor: c.value }}
              />
            ))}

            {/* Rainbow color input */}
            <button
              type="button"
              onClick={() => customColorInputRef.current?.click()}
              onMouseEnter={() => setHoverColorName('Custom Color')}
              onMouseLeave={() => setHoverColorName(null)}
              aria-label="Custom stroke color"
              className="relative size-7 rounded-lg border border-white/20 overflow-hidden hover:scale-105 transition"
              style={{
                background:
                  'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #FFFF00 60deg, #00FF00 120deg, #00FFFF 180deg, #0000FF 240deg, #FF00FF 300deg, #FF0000 360deg)',
              }}
            >
              <input
                ref={customColorInputRef}
                type="color"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => applyFormatting({ strokeColor: e.target.value })}
              />
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* 3. STROKE WIDTH & STYLE */}
      <Popover>
        <SimpleTooltip label="Stroke Width & Style" side="top">
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Stroke Width & Style"
              className="flex h-8 items-center gap-1 rounded-lg px-2 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <span className="flex flex-col gap-0.5 items-center justify-center">
                <span className="h-0.5 w-3.5 bg-current rounded-full" />
                <span className="h-0.5 w-3.5 bg-current rounded-full" />
                <span className="h-0.5 w-3.5 bg-current rounded-full" />
              </span>
              <ChevronDown className="size-3 text-neutral-400" />
            </button>
          </PopoverTrigger>
        </SimpleTooltip>
        <PopoverContent
          side="top"
          sideOffset={8}
          className="w-[160px] rounded-xl border border-white/10 bg-[#1e1e22] p-2 text-white shadow-xl"
        >
          {/* Top Style Selector: Solid, Dashed, Dotted */}
          <div className="flex items-center justify-between gap-1 pb-2 border-b border-white/10">
            <button
              type="button"
              onClick={() => applyFormatting({ strokeStyle: 'solid' })}
              aria-label="Solid line"
              className={cn(
                'flex-1 flex items-center justify-center h-6 rounded px-1 hover:bg-white/10 transition',
                effectiveStrokeStyle === 'solid' && 'bg-accent/20 text-accent font-semibold ring-1 ring-accent'
              )}
            >
              <span className="h-[2px] w-5 bg-current" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting({ strokeStyle: 'dashed' })}
              aria-label="Dashed line"
              className={cn(
                'flex-1 flex items-center justify-center h-6 rounded px-1 hover:bg-white/10 transition',
                effectiveStrokeStyle === 'dashed' && 'bg-accent/20 text-accent font-semibold ring-1 ring-accent'
              )}
            >
              <span className="text-[11px] tracking-widest font-mono">---</span>
            </button>
            <button
              type="button"
              onClick={() => applyFormatting({ strokeStyle: 'dotted' })}
              aria-label="Dotted line"
              className={cn(
                'flex-1 flex items-center justify-center h-6 rounded px-1 hover:bg-white/10 transition',
                effectiveStrokeStyle === 'dotted' && 'bg-accent/20 text-accent font-semibold ring-1 ring-accent'
              )}
            >
              <span className="text-[11px] tracking-widest font-mono">···</span>
            </button>
          </div>

          {/* Width options: S, M, L, XL */}
          <div className="flex flex-col gap-1 pt-2">
            {STROKE_WIDTH_PRESETS.map((p) => {
              const isSelected =
                Math.abs(effectiveStrokeWidth - p.value) < 0.8 ||
                (p.label === 'M' && effectiveStrokeWidth === 3);

              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyFormatting({ strokeWidth: p.value })}
                  className={cn(
                    'flex h-7 w-full items-center justify-between rounded-lg px-2.5 text-[12px] font-medium transition cursor-pointer hover:bg-white/10',
                    isSelected ? 'bg-accent text-white shadow-xs' : 'text-neutral-300'
                  )}
                >
                  <span className="w-4 text-left">{p.label}</span>
                  <span
                    className="flex-1 ml-3 rounded-full bg-current"
                    style={{ height: Math.min(p.value, 6) }}
                  />
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* 4. ARROWHEAD TOGGLES (When line or arrow) */}
      {showArrowControls && (
        <>
          <div className="mx-0.5 h-4 w-px bg-white/15" />
          <SimpleTooltip label="Toggle Start Arrowhead" side="top">
            <button
              type="button"
              onClick={() => applyFormatting({ arrowStart: !effectiveArrowStart })}
              aria-label="Toggle Start Arrowhead"
              className={cn(
                'flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer',
                effectiveArrowStart
                  ? 'bg-[#2a2a2a] text-white shadow-sm ring-1 ring-white/15'
                  : 'text-neutral-400 hover:bg-white/10 hover:text-white'
              )}
            >
              <ArrowLeft className="size-3.5" />
            </button>
          </SimpleTooltip>

          <SimpleTooltip label="Toggle End Arrowhead" side="top">
            <button
              type="button"
              onClick={() => applyFormatting({ arrowEnd: !effectiveArrowEnd })}
              aria-label="Toggle End Arrowhead"
              className={cn(
                'flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer',
                effectiveArrowEnd
                  ? 'bg-[#2a2a2a] text-white shadow-sm ring-1 ring-white/15'
                  : 'text-neutral-400 hover:bg-white/10 hover:text-white'
              )}
            >
              <ArrowRight className="size-3.5" />
            </button>
          </SimpleTooltip>

          {/* Route Style Popover */}
          <Popover>
            <SimpleTooltip label="Connection Routing Style" side="top">
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Connection Routing Style"
                  className="flex h-8 items-center gap-1 rounded-lg px-2 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  {effectiveRouteType === 'straight' ? (
                    <Minus className="size-3.5" />
                  ) : effectiveRouteType === 'bezier' ? (
                    <Spline className="size-3.5" />
                  ) : (
                    <CornerDownRight className="size-3.5" />
                  )}
                  <ChevronDown className="size-3 text-neutral-400" />
                </button>
              </PopoverTrigger>
            </SimpleTooltip>
            <PopoverContent
              side="top"
              sideOffset={8}
              className="w-[170px] rounded-xl border border-white/10 bg-[#1e1e22] p-1.5 text-white shadow-xl text-[12px]"
            >
              <button
                type="button"
                onClick={() => applyFormatting({ routeType: 'smoothstep' })}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition text-left cursor-pointer',
                  effectiveRouteType === 'smoothstep'
                    ? 'bg-accent/20 text-accent font-medium ring-1 ring-accent'
                    : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                )}
              >
                <CornerDownRight className="size-3.5" />
                <span>Orthogonal (Step)</span>
              </button>
              <button
                type="button"
                onClick={() => applyFormatting({ routeType: 'bezier' })}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition text-left cursor-pointer mt-1',
                  effectiveRouteType === 'bezier'
                    ? 'bg-accent/20 text-accent font-medium ring-1 ring-accent'
                    : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                )}
              >
                <Spline className="size-3.5" />
                <span>Curved (Bezier)</span>
              </button>
              <button
                type="button"
                onClick={() => applyFormatting({ routeType: 'straight' })}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition text-left cursor-pointer mt-1',
                  effectiveRouteType === 'straight'
                    ? 'bg-accent/20 text-accent font-medium ring-1 ring-accent'
                    : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                )}
              >
                <Minus className="size-3.5" />
                <span>Straight Segment</span>
              </button>
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* 5. MORE OPTIONS (Delete, duplicate, send to back) */}
      {(selectedNodeId || selectedEdgeId) && (
        <>
          <div className="mx-0.5 h-4 w-px bg-white/15" />
          <Popover>
            <SimpleTooltip label="More Actions" side="top">
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="More actions"
                  className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </PopoverTrigger>
            </SimpleTooltip>
            <PopoverContent
              side="top"
              sideOffset={8}
              className="w-[160px] rounded-xl border border-white/10 bg-[#1e1e22] p-1.5 text-white shadow-xl text-[12.5px]"
            >
              <button
                type="button"
                onClick={() => duplicateNodes(selectedNodeId ? [selectedNodeId] : undefined)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-neutral-300 hover:bg-white/10 hover:text-white transition"
              >
                <Copy className="size-3.5" />
                <span>Duplicate</span>
              </button>
              {selectedNodeId && (
                <button
                  type="button"
                  onClick={() => sendToBack(selectedNodeId)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-neutral-300 hover:bg-white/10 hover:text-white transition"
                >
                  <Layers className="size-3.5" />
                  <span>Send to Back</span>
                </button>
              )}
              <div className="my-1 h-px bg-white/10" />
              <button
                type="button"
                onClick={() => deleteSelection()}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition"
              >
                <Trash2 className="size-3.5" />
                <span>Delete</span>
              </button>
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
