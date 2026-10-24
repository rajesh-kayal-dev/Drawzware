'use client';

import { memo } from 'react';
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import { Link2, Lock, TriangleAlert } from 'lucide-react';
import { NODE_REGISTRY } from './node-registry';
import { IconChip } from '@/components/ui/panel';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { useHasValidationWarning } from '@/lib/validation';
import { cn } from '@/lib/utils';
import { TechIcon, hasTechIcon } from '@/lib/icons/tech-icons';
import type { NodeEnvironment, NodeStatus, SystemNode } from '@/types';

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

const NODE_WIDTH = 200;
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

  const techStack = data.techStack ?? [];
  const subtitle = techStack.length > 0 ? techStack.join(' · ') : config.label;
  const linkCount = data.links?.length ?? 0;
  const locked = draggable === false && !presenting;

  const isSmall = height !== undefined && height < 58;
  const isCompact = (width !== undefined && width < 140) || (height !== undefined && height < 44);

  return (
    <div
      className={cn(
        'relative rounded-[12px] border bg-paper text-ink transition-[border-color,box-shadow] duration-[120ms] ease-out box-border overflow-hidden flex flex-col justify-center',
        selected
          ? 'border-accent shadow-[0_0_0_3px_var(--accent-soft),var(--shadow)]'
          : 'border-line shadow-[var(--shadow)] hover:border-ink-3 hover:shadow-[var(--shadow-lg)]',
        isCompact ? 'p-1.5' : isSmall ? 'p-2' : 'p-3'
      )}
      // Fixed 200px until resized; after resizing, fill the React Flow wrapper.
      style={{ width: width ? '100%' : NODE_WIDTH, height: height ? '100%' : undefined }}
      onDoubleClick={() => setSelectedNodeId(id)}
    >
      <NodeResizer
        isVisible={!!selected && !presenting}
        minWidth={80}
        minHeight={36}
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

      <Handle type="target" id="top-target" position={Position.Top} />
      <Handle type="source" id="top-source" position={Position.Top} className={HIDDEN} />
      <Handle type="target" id="left-target" position={Position.Left} />
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

      <div className="flex items-center gap-2">
        <span className="relative shrink-0">
          <IconChip color={nodeColor} size={isCompact ? 24 : 32}>
            {customIcon && hasTechIcon(customIcon) ? (
              <TechIcon name={customIcon} className={isCompact ? 'size-3.5' : 'size-4'} color={nodeColor} />
            ) : (
              <Icon className={isCompact ? 'size-3' : 'size-4'} />
            )}
          </IconChip>
          {data.status && (
            <span
              title={NODE_STATUS_META[data.status].label}
              className={cn(
                'absolute -top-[3px] -right-[3px] size-2.5 rounded-full border-2 border-paper',
                NODE_STATUS_META[data.status].dot
              )}
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className={cn('truncate font-semibold', isCompact ? 'text-[12px] leading-[16px]' : 'text-[13.5px] leading-[18px]')}>
              {data.label || 'Untitled'}
            </span>
            {locked && <Lock aria-label="Locked" className="size-3 shrink-0 text-ink-3" />}
            {data.environment && !isCompact && (
              <span className="ml-auto shrink-0 rounded-full bg-line-2 px-1.5 font-mono text-[10px] leading-4 text-ink-2">
                {NODE_ENV_META[data.environment].short}
              </span>
            )}
          </div>
          {!isSmall && <div className="truncate text-[11.5px] leading-[14px] text-ink-3">{subtitle}</div>}
        </div>
      </div>

      {(!height || height >= 76) && data.description && (
        <p className="mt-2 line-clamp-2 text-[12px] leading-4 text-ink-2">{data.description}</p>
      )}

      {(!height || height >= 64) && (data.owner || linkCount > 0) && (
        <div className="mt-2 flex items-center gap-2 text-[11px] leading-[14px] text-ink-3">
          {data.owner && <span className="min-w-0 truncate">{data.owner}</span>}
          {linkCount > 0 && (
            <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 font-mono">
              <Link2 className="size-3" />
              {linkCount}
            </span>
          )}
        </div>
      )}

      <Handle type="source" id="bottom-source" position={Position.Bottom} />
      <Handle type="target" id="bottom-target" position={Position.Bottom} className={HIDDEN} />
      <Handle type="source" id="right-source" position={Position.Right} />
      <Handle type="target" id="right-target" position={Position.Right} className={HIDDEN} />
    </div>
  );
}

export const BaseSystemNode = memo(BaseSystemNodeComponent);
