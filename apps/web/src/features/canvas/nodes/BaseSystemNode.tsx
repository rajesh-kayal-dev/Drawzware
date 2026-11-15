'use client';

import { memo } from 'react';
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import { Lock, TriangleAlert } from 'lucide-react';
import { NODE_REGISTRY } from './node-registry';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { useHasValidationWarning } from '@/features/canvas/utils/validation';
import { cn } from '@/shared/utils/utils';
import { hasTechIcon } from '@/lib/icons/tech-icons';
import { ComponentIdentity } from '@/features/canvas/components/ComponentIdentity';
import type { NodeEnvironment, NodeStatus, SystemNode } from '@/features/canvas/types/canvas.types';

export const NODE_STATUS_META: Record<NodeStatus, { label: string; dot: string }> = {
  operational: { label: 'Operational', dot: 'bg-ok' },
  degraded: { label: 'Degraded', dot: 'bg-warn' },
  down: { label: 'Down', dot: 'bg-danger' },
  maintenance: { label: 'Maintenance', dot: 'bg-accent' },
};

export const NODE_ENV_META: Record<NodeEnvironment, { short: string; label: string }> = {
  production: { short: 'prod', label: 'Prod' },
  staging: { short: 'stg', label: 'Staging' },
  development: { short: 'dev', label: 'Dev' },
};

/** Shared one-to-one canvas component size. */
const NODE_SIZE = 112;
const MIN_NODE_SIZE = 88;
/** Duplicate handles sharing a spot with a visible one: invisible but connectable. */
const HIDDEN = '!opacity-0 pointer-events-none';

function BaseSystemNodeComponent({ id, data, selected, draggable, width, height }: NodeProps<SystemNode>) {
  const config = NODE_REGISTRY[data.nodeType] ?? NODE_REGISTRY.service;
  const customIcon = data.customIcon || data.icon;
  const Icon = config.icon;
  const nodeColor = data.color || config.color;
  const presenting = useCanvasStore((s) => s.presentation.active);
  const setSelectedNodeId = useCanvasStore((s) => s.setSelectedNodeId);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const hasWarning = useHasValidationWarning(id);

  const locked = draggable === false && !presenting;
  const isBrandedComponent = Boolean(customIcon && hasTechIcon(customIcon));
  const compactCard = Math.min(width ?? NODE_SIZE, height ?? NODE_SIZE) < 104;

  return (
    <div
      className={cn(
        'relative rounded-[12px] border bg-paper text-ink transition-[border-color,box-shadow] duration-[120ms] ease-out box-border',
        'flex flex-col items-center justify-center gap-1.5 px-2.5 py-2.5 text-center',
        selected
          ? 'border-accent shadow-[0_0_0_3px_var(--accent-soft),var(--shadow)]'
          : 'border-line shadow-[var(--shadow)] hover:border-ink-3 hover:shadow-[var(--shadow-lg)]',
      )}
      // Fixed compact width until resized; after resizing, fills the React Flow wrapper.
      style={{
        width: width ? '100%' : NODE_SIZE,
        height: height ? '100%' : NODE_SIZE,
        minWidth: MIN_NODE_SIZE,
        minHeight: MIN_NODE_SIZE,
      }}
      onDoubleClick={() => setSelectedNodeId(id)}
    >
      <NodeResizer
        isVisible={!!selected && !presenting}
        minWidth={MIN_NODE_SIZE}
        minHeight={MIN_NODE_SIZE}
        keepAspectRatio={false}
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
          borderWidth: 1.5,
          borderRadius: 2,
        }}
        onResizeEnd={() => pushHistory()}
      />

      <Handle type="target" id="top-target" position={Position.Top} className="pointer-events-auto" />
      <Handle type="source" id="top-source" position={Position.Top} className={HIDDEN} />
      <Handle type="target" id="left-target" position={Position.Left} className="pointer-events-auto" />
      <Handle type="source" id="left-source" position={Position.Left} className={HIDDEN} />

      {hasWarning && !presenting && (
        <span
          role="img"
          aria-label="Has a validation warning"
          className="pointer-events-none absolute -top-1.5 -right-1.5 z-10 inline-flex size-[18px] items-center justify-center rounded-full border-2 border-paper bg-warn"
          style={{ color: 'oklch(0.2 0.02 75)' }}
        >
          <TriangleAlert size={10} strokeWidth={2.5} />
        </span>
      )}

      <span className="relative flex w-full justify-center">
        <ComponentIdentity
          name={data.label || 'Untitled'}
          icon={isBrandedComponent ? customIcon : undefined}
          fallback={<Icon className="size-6" aria-hidden="true" />}
          color={nodeColor}
          iconSize={compactCard ? 'small' : 'large'}
          className="w-full"
          trailing={
            <>
              {locked && <Lock aria-label="Locked" className="size-3 shrink-0 text-ink-3" />}
              {data.environment && (
                <span className="shrink-0 rounded-full bg-line-2 px-1.5 font-mono text-[9px] leading-4 text-ink-2">
                  {NODE_ENV_META[data.environment].short}
                </span>
              )}
            </>
          }
        />
        {data.status && (
          <span
            title={NODE_STATUS_META[data.status].label}
            className={cn(
              'absolute top-0 left-1/2 size-2.5 rounded-full border-2 border-paper',
              compactCard ? 'ml-4' : 'ml-5',
              NODE_STATUS_META[data.status].dot
            )}
          />
        )}
      </span>

      <Handle type="source" id="bottom-source" position={Position.Bottom} className="pointer-events-auto" />
      <Handle type="target" id="bottom-target" position={Position.Bottom} className={HIDDEN} />
      <Handle type="source" id="right-source" position={Position.Right} className="pointer-events-auto" />
      <Handle type="target" id="right-target" position={Position.Right} className={HIDDEN} />
    </div>
  );
}

export const BaseSystemNode = memo(BaseSystemNodeComponent);
