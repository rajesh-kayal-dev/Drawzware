'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { User, Box, Database, Server } from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';
import type { SystemNode } from '@/types';

function SequenceParticipantComponent({ id, data, selected }: NodeProps<SystemNode>) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label || 'Participant');
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const inputRef = useRef<HTMLInputElement>(null);

  const [prevLabel, setPrevLabel] = useState(data.label);
  if (prevLabel !== data.label) {
    setPrevLabel(data.label);
    if (!isEditing) {
      setDraftLabel(data.label || 'Participant');
    }
  }

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitLabel = () => {
    setIsEditing(false);
    const trimmed = draftLabel.trim();
    if (trimmed && trimmed !== data.label) {
      updateNodeData(id, { label: trimmed });
    } else {
      setDraftLabel(data.label || 'Participant');
    }
  };

  const participantType = data.participantType || 'service';
  const color = data.color || (participantType === 'actor' ? '#a855f7' : participantType === 'database' ? '#06b6d4' : '#22c55e');

  const Icon =
    participantType === 'actor'
      ? User
      : participantType === 'database'
        ? Database
        : participantType === 'service'
          ? Box
          : Server;

  const lifelineLength = data.lifelineLength || 360;

  // Handle positions along the lifeline (in px from top of lifeline rod)
  const handleOffsets = [60, 110, 160, 210, 260, 310];

  return (
    <div className="relative flex flex-col items-center select-none" style={{ width: 140 }}>
      {/* ── Top Handles for direct connections ── */}
      <Handle type="target" id="top-target" position={Position.Top} className="!top-0" />
      <Handle type="source" id="top-source" position={Position.Top} className="!top-0 !opacity-0" />

      {/* ── Participant Header Box ── */}
      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className={cn(
          'relative z-10 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border px-2.5 py-1.5 shadow-sm transition-all duration-150 backdrop-blur-xs cursor-pointer',
          selected ? 'ring-2 ring-accent ring-offset-1 ring-offset-bg shadow-md' : 'hover:border-line-hover'
        )}
        style={{
          borderColor: selected ? color : `${color}66`,
          backgroundColor: `${color}18`,
          color: '#ffffff',
        }}
      >
        <div
          className="flex size-6 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${color}30`, color }}
        >
          <Icon className="size-3.5 stroke-[2.2]" />
        </div>

        {isEditing ? (
          <input
            ref={inputRef}
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitLabel();
              if (e.key === 'Escape') {
                setDraftLabel(data.label || 'Participant');
                setIsEditing(false);
              }
              e.stopPropagation();
            }}
            className="w-full bg-transparent text-center text-xs font-semibold text-ink outline-none"
          />
        ) : (
          <span className="truncate text-xs font-semibold text-text tracking-tight">
            {data.label || 'Participant'}
          </span>
        )}
      </div>

      {/* ── Lifeline Vertical Dashed Rod ── */}
      <div
        className="relative flex flex-col items-center"
        style={{ height: lifelineLength, width: 2 }}
      >
        {/* Dashed Line */}
        <div
          className="h-full w-[2px] border-l-2 border-dashed"
          style={{ borderColor: `${color}88` }}
        />

        {/* Primary Activation Bar */}
        <div
          className="absolute rounded-sm border shadow-xs"
          style={{
            top: 50,
            height: Math.max(120, lifelineLength - 120),
            width: 12,
            backgroundColor: `${color}33`,
            borderColor: color,
          }}
        />

        {/* Connection Handles along the lifeline */}
        {handleOffsets.map((offset, i) => (
          <div key={offset} style={{ position: 'absolute', top: offset, left: 0 }}>
            {/* Left Handles */}
            <Handle
              type="target"
              id={`left-in-${i}`}
              position={Position.Left}
              style={{ left: -10, width: 8, height: 8, backgroundColor: color }}
            />
            <Handle
              type="source"
              id={`left-out-${i}`}
              position={Position.Left}
              style={{ left: -10, width: 8, height: 8, opacity: 0 }}
            />

            {/* Right Handles */}
            <Handle
              type="source"
              id={`right-out-${i}`}
              position={Position.Right}
              style={{ left: 10, width: 8, height: 8, backgroundColor: color }}
            />
            <Handle
              type="target"
              id={`right-in-${i}`}
              position={Position.Right}
              style={{ left: 10, width: 8, height: 8, opacity: 0 }}
            />
          </div>
        ))}

        {/* Bottom Handle */}
        <Handle
          type="source"
          id="bottom-source"
          position={Position.Bottom}
          style={{ bottom: 0, width: 8, height: 8, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export const SequenceParticipantNode = memo(SequenceParticipantComponent);
