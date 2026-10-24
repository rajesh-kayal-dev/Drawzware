'use client';

import { memo, useEffect, useRef, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useStore,
  type EdgeProps,
} from '@xyflow/react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { EDGE_REGISTRY, edgeAnimationClass } from './edge-registry';
import { ProtocolMenu, ProtocolMenuItem, ProtocolMenuSeparator } from './ProtocolPicker';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { useIsNarrow } from '@/hooks/useMediaQuery';
import { cn, edgeStroke } from '@/lib/utils';
import type { SystemEdge as SystemEdgeModel, SystemEdgeType } from '@/types';

/** Half the label pill's height: 14px line + 2px padding ×2 + 1px border ×2. */
const PILL_HALF = 10;
/** Meta line under the pill: 14px line + 2px gap. */
const META_HEIGHT = 16;

function SystemEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
  markerStart,
  markerEnd,
  interactionWidth,
}: EdgeProps<SystemEdgeModel>) {
  const edgeType = data?.edgeType ?? 'rest';
  const config = EDGE_REGISTRY[edgeType] ?? EDGE_REGISTRY.rest;
  const isStoreSelected = useCanvasStore((s) => s.selectedEdgeId === id);
  const presenting = useCanvasStore((s) => s.presentation.active);
  const updateEdgeData = useCanvasStore((s) => s.updateEdgeData);
  const setSelectedEdgeId = useCanvasStore((s) => s.setSelectedEdgeId);

  const isShapeEndpoint = useCanvasStore((s) => {
    if (typeof data?.isShapeConnection === 'boolean') {
      return data.isShapeConnection;
    }
    const sourceNode = s.nodes.find((n) => n.id === source);
    const targetNode = s.nodes.find((n) => n.id === target);
    if (!sourceNode && !targetNode) return false;
    const isSourceArch = sourceNode?.type === 'system' && !sourceNode?.data?.shapeType;
    const isTargetArch = targetNode?.type === 'system' && !targetNode?.data?.shapeType;
    return !isSourceArch || !isTargetArch;
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  // Set once an edit is committed or cancelled, so a trailing blur doesn't commit again.
  const editDone = useRef(true);

  const routeType = data?.routeType ?? 'smoothstep';

  const [edgePath, labelX, labelY] =
    routeType === 'straight'
      ? getStraightPath({
          sourceX,
          sourceY,
          targetX,
          targetY,
        })
      : routeType === 'bezier'
      ? getBezierPath({
          sourceX,
          sourceY,
          targetX,
          targetY,
          sourcePosition,
          targetPosition,
        })
      : getSmoothStepPath({
          sourceX,
          sourceY,
          targetX,
          targetY,
          sourcePosition,
          targetPosition,
          borderRadius: 8,
        });

  const isSelected = !!selected || isStoreSelected;
  const isSingleEdgeSelected = useCanvasStore((s) => {
    const selectedEdges = s.edges.filter((e) => e.selected || e.id === s.selectedEdgeId);
    const selectedNodes = s.nodes.filter((n) => n.selected);
    return selectedNodes.length === 0 && selectedEdges.length === 1 && selectedEdges[0].id === id;
  });

  const isPopoverOpen = useCanvasStore(
    (s) => s.activePopover?.type === 'edge-protocol' && s.activePopover?.id === id
  );
  const setActivePopover = useCanvasStore((s) => s.setActivePopover);
  const closePopover = useCanvasStore((s) => s.closePopover);

  const label = data?.label ?? '';
  const meta = [data?.latency, data?.dataFormat, data?.throughput].filter(Boolean).join(' · ');
  const hasCustomLabel = Boolean(label.trim().length > 0);
  const showBadge = hasCustomLabel || editing || isPopoverOpen || Boolean(meta);

  const startEditing = () => {
    if (presenting) return;
    closePopover();
    editDone.current = false;
    setDraft(data?.label ?? '');
    setEditing(true);
  };

  const finishEditing = (commit: boolean) => {
    if (editDone.current) return;
    editDone.current = true;
    setEditing(false);
    const next = draft.trim();
    if (commit && next !== (data?.label ?? '')) updateEdgeData(id, { label: next });
  };

  const strokeColor = isSelected ? 'var(--accent)' : (data?.color || edgeStroke(config.color));
  const markerIdFilled = `marker-filled-${id}`;
  const markerIdOpen = `marker-open-${id}`;

  const isSequence = Boolean(data?.messageType) || Boolean(data?.arrowhead);
  const showEndArrow = data?.arrowEnd ?? (isSequence ? data?.arrowhead !== 'none' : true);
  const isOpenArrow = data?.arrowhead === 'open' || data?.messageType === 'async';
  const resolvedMarkerEnd = markerEnd || (showEndArrow ? (isOpenArrow ? `url(#${markerIdOpen})` : `url(#${markerIdFilled})`) : undefined);

  const sourceCard = data?.sourceCardinality;
  const targetCard = data?.targetCardinality;

  const scOffset = 26;
  let scX = sourceX;
  let scY = sourceY;
  if (sourcePosition === 'right') { scX += scOffset; scY -= 14; }
  else if (sourcePosition === 'left') { scX -= scOffset; scY -= 14; }
  else if (sourcePosition === 'bottom') { scY += scOffset; scX -= 14; }
  else if (sourcePosition === 'top') { scY -= scOffset; scX -= 14; }
  else { scX += 16; scY -= 14; }

  const tcOffset = 26;
  let tcX = targetX;
  let tcY = targetY;
  if (targetPosition === 'right') { tcX += tcOffset; tcY -= 14; }
  else if (targetPosition === 'left') { tcX -= tcOffset; tcY -= 14; }
  else if (targetPosition === 'bottom') { tcY += tcOffset; tcX -= 14; }
  else if (targetPosition === 'top') { tcY -= tcOffset; tcX -= 14; }
  else { tcX -= 16; tcY -= 14; }

  return (
    <>
      <defs>
        <marker
          id={markerIdFilled}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={strokeColor} />
        </marker>
        <marker
          id={markerIdOpen}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path
            d="M 1 1.5 L 8 5 L 1 8.5"
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={resolvedMarkerEnd}
        interactionWidth={interactionWidth}
        className={edgeAnimationClass(config)}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: isSelected ? (data?.strokeWidth ? data.strokeWidth + 1 : 2.5) : (data?.strokeWidth ?? 1.75),
          strokeLinecap: 'round',
          strokeDasharray:
            data?.messageType === 'async' || data?.messageType === 'return'
              ? '6 4'
              : data?.strokeStyle === 'dashed'
              ? '6 4'
              : data?.strokeStyle === 'dotted'
              ? '2 3'
              : data?.strokeStyle === 'solid'
              ? undefined
              : config.strokeDasharray,
        }}
      />
      {/* Invisible interaction path to capture click & double-click along edge line */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(interactionWidth ?? 20, 24)}
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedEdgeId(id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setSelectedEdgeId(id);
          startEditing();
        }}
      />
      {showBadge && (
        <EdgeLabelRenderer>
          <div
            className="absolute top-0 left-0 transition-opacity duration-200 motion-reduce:transition-none"
            style={{
              transform: `translate(${labelX}px, ${labelY}px)`,
              pointerEvents: presenting ? 'none' : 'all',
              opacity: style?.opacity,
              zIndex: isSelected ? 1100 : 100,
            }}
          >
            <div
              className={cn(
                'nodrag nopan absolute top-0 left-0 cursor-pointer rounded-full border px-[9px] py-0.5 text-[10.5px] leading-[14px] font-medium whitespace-nowrap shadow-[var(--shadow)] transition-colors duration-[120ms] inline-flex items-center gap-1 select-none',
                isSelected ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-paper text-ink-2'
              )}
              style={{
                transform: 'translate(-50%, -50%)',
                fontSize: data?.textSize || undefined,
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEdgeId(id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                closePopover();
                startEditing();
              }}
            >
              {editing ? (
                <input
                  autoFocus
                  aria-label="Connection label"
                  value={draft}
                  placeholder="Add label..."
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => finishEditing(true)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') finishEditing(true);
                    else if (e.key === 'Escape') finishEditing(false);
                  }}
                  className="block bg-transparent p-0 text-[10.5px] leading-[14px] font-medium text-inherit outline-none placeholder:text-[color-mix(in_oklch,var(--accent-ink)_60%,transparent)] caret-current min-w-[3ch]"
                  style={{ width: `${Math.max(draft.length, 'Add label'.length, 4) + 1}ch` }}
                />
              ) : (
                <>
                  <span>{label}</span>
                  {isSingleEdgeSelected && !isShapeEndpoint && !isSequence && !sourceCard && !targetCard && (
                    <button
                      type="button"
                      aria-label="Change protocol"
                      className="inline-flex items-center justify-center rounded p-0.5 hover:opacity-80 transition-opacity"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPopoverOpen) {
                          closePopover();
                        } else {
                          setActivePopover({ type: 'edge-protocol', id });
                        }
                      }}
                    >
                      <ChevronDown className={cn('size-3 transition-transform duration-150', isPopoverOpen && 'rotate-180')} />
                    </button>
                  )}
                </>
              )}
            </div>
            {meta && (
              <div
                className="pointer-events-none absolute left-0 rounded-[4px] bg-[color-mix(in_oklch,var(--bg)_85%,transparent)] px-1 font-mono text-[10px] leading-[14px] whitespace-nowrap text-ink-3"
                style={{ top: PILL_HALF + 2, transform: 'translateX(-50%)' }}
              >
                {meta}
              </div>
            )}
            {isPopoverOpen && isSingleEdgeSelected && !presenting && !editing && !isShapeEndpoint && (
              <EdgeProtocolMenu
                edgeId={id}
                edgeType={edgeType}
                top={PILL_HALF + (meta ? META_HEIGHT : 0)}
                onEditLabel={startEditing}
              />
            )}
          </div>
        </EdgeLabelRenderer>
      )}
      {(sourceCard || targetCard) && (
        <EdgeLabelRenderer>
          {sourceCard && (
            <div
              style={{
                position: 'absolute',
                transform: `translate(${scX}px, ${scY}px)`,
                pointerEvents: 'none',
                zIndex: isSelected ? 1101 : 10,
              }}
              className="nodrag nopan -translate-x-1/2 -translate-y-1/2 rounded bg-paper/95 px-1 py-0.2 font-mono text-[11px] font-bold text-ink shadow-xs border border-line"
            >
              {sourceCard}
            </div>
          )}
          {targetCard && (
            <div
              style={{
                position: 'absolute',
                transform: `translate(${tcX}px, ${tcY}px)`,
                pointerEvents: 'none',
                zIndex: isSelected ? 1101 : 10,
              }}
              className="nodrag nopan -translate-x-1/2 -translate-y-1/2 rounded bg-paper/95 px-1 py-0.2 font-mono text-[11px] font-bold text-ink shadow-xs border border-line"
            >
              {targetCard}
            </div>
          )}
        </EdgeLabelRenderer>
      )}
    </>
  );
}

/** Inline protocol picker under the selected edge's label, kept at screen size. */
function EdgeProtocolMenu({
  edgeId,
  edgeType,
  top,
  onEditLabel,
}: {
  edgeId: string;
  edgeType: SystemEdgeType;
  top: number;
  onEditLabel: () => void;
}) {
  const zoom = useStore((s) => s.transform[2]);
  const isNarrow = useIsNarrow();
  const updateEdgeData = useCanvasStore((s) => s.updateEdgeData);
  const deleteEdge = useCanvasStore((s) => s.deleteEdge);
  const closePopover = useCanvasStore((s) => s.closePopover);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closePopover();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closePopover();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [closePopover]);

  // On narrow screens the edge editor drawer covers this; it has the same controls.
  if (isNarrow) return null;

  return (
    <div
      ref={menuRef}
      className="nodrag nopan nowheel animate-fade-in absolute left-0 pt-3 z-50"
      style={{ top, transform: `scale(${1 / zoom}) translateX(-50%)`, transformOrigin: '0 0' }}
    >
      <ProtocolMenu
        value={edgeType}
        onSelect={(type) => {
          if (type !== edgeType) updateEdgeData(edgeId, { edgeType: type });
          closePopover();
        }}
      >
        <ProtocolMenuSeparator />
        <ProtocolMenuItem
          icon={<Pencil />}
          onClick={() => {
            closePopover();
            onEditLabel();
          }}
        >
          Edit label
        </ProtocolMenuItem>
        <ProtocolMenuItem
          icon={<Trash2 />}
          danger
          onClick={() => {
            closePopover();
            deleteEdge(edgeId);
          }}
        >
          Remove
        </ProtocolMenuItem>
      </ProtocolMenu>
    </div>
  );
}

export const SystemEdge = memo(SystemEdgeComponent);
