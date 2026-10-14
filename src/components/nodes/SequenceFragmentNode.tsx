'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';
import type { SystemNode } from '@/types';

function SequenceFragmentComponent({ id, data, selected }: NodeProps<SystemNode>) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftCondition, setDraftCondition] = useState(data.fragmentCondition || data.label || 'alt [Condition]');
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const inputRef = useRef<HTMLInputElement>(null);

  const [prevCondition, setPrevCondition] = useState(data.fragmentCondition || data.label);
  if (prevCondition !== (data.fragmentCondition || data.label)) {
    setPrevCondition(data.fragmentCondition || data.label);
    if (!isEditing) {
      setDraftCondition(data.fragmentCondition || data.label || 'alt [Condition]');
    }
  }

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commit = () => {
    setIsEditing(false);
    const trimmed = draftCondition.trim();
    if (trimmed && trimmed !== data.label) {
      updateNodeData(id, { label: trimmed, fragmentCondition: trimmed });
    } else {
      setDraftCondition(data.fragmentCondition || data.label || 'alt [Condition]');
    }
  };

  const fragmentType = data.fragmentType || 'alt';
  const color =
    fragmentType === 'alt'
      ? '#f59e0b'
      : fragmentType === 'loop'
        ? '#10b981'
        : fragmentType === 'opt'
          ? '#06b6d4'
          : '#8b5cf6';

  return (
    <div
      className={cn(
        'group relative size-full rounded-[10px] border-2 border-dashed backdrop-blur-2xs transition-colors box-border overflow-hidden',
        selected ? 'ring-2 ring-accent ring-offset-1 ring-offset-bg shadow-md' : 'hover:border-line-hover'
      )}
      style={{
        borderColor: selected ? color : `${color}88`,
        backgroundColor: `${color}0c`,
      }}
    >
      <NodeResizer
        isVisible={!!selected}
        minWidth={80}
        minHeight={40}
        lineClassName="!border-accent"
        handleClassName="!size-2 !bg-accent !border-2 !border-paper"
        onResizeEnd={() => pushHistory()}
      />

      {/* ── Top-Left Operator Pill ── */}
      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className="absolute -top-[1px] -left-[1px] flex items-center gap-1.5 rounded-tl-[8px] rounded-br-[8px] border-b border-r px-2 py-0.5 shadow-2xs select-none cursor-pointer"
        style={{
          borderColor: `${color}88`,
          backgroundColor: `${color}28`,
        }}
      >
        <span
          className="text-[10px] font-extrabold uppercase tracking-wider"
          style={{ color }}
        >
          {fragmentType}
        </span>

        {isEditing ? (
          <input
            ref={inputRef}
            value={draftCondition}
            onChange={(e) => setDraftCondition(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraftCondition(data.fragmentCondition || data.label || 'alt [Condition]');
                setIsEditing(false);
              }
              e.stopPropagation();
            }}
            className="w-36 bg-transparent text-[11px] font-medium text-ink outline-none"
          />
        ) : (
          <span className="text-[11px] font-medium text-ink-2 truncate max-w-[260px]">
            {data.fragmentCondition || data.label || '[Condition]'}
          </span>
        )}
      </div>

      {/* ── For 'alt' fragments: internal dashed divider ── */}
      {fragmentType === 'alt' && (
        <div className="absolute inset-x-0 top-1/2 flex items-center border-t border-dashed border-line/70 px-2 pt-1">
          <span className="text-[10px] font-medium text-text-muted italic select-none">
            [else / invalid]
          </span>
        </div>
      )}

      {/* Handles */}
      <Handle type="target" id="top-target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" id="top-source" position={Position.Top} className="!opacity-0" />
      <Handle type="target" id="left-target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" id="left-source" position={Position.Left} className="!opacity-0" />
      <Handle type="target" id="right-target" position={Position.Right} className="!opacity-0" />
      <Handle type="source" id="right-source" position={Position.Right} className="!opacity-0" />
      <Handle type="target" id="bottom-target" position={Position.Bottom} className="!opacity-0" />
      <Handle type="source" id="bottom-source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

export const SequenceFragmentNode = memo(SequenceFragmentComponent);
