'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/shared/utils/utils';
import type { SystemNode } from '@/features/canvas/types/canvas.types';

const HIDDEN = '!opacity-0';

function JunctionNodeComponent({ selected }: NodeProps<SystemNode>) {
  return (
    <div
      className={cn(
        'group relative flex items-center justify-center rounded-full transition-all duration-150',
        'bg-ink border-2 border-paper cursor-move shadow-sm',
        selected
          ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg scale-125'
          : 'hover:scale-125 hover:border-accent'
      )}
      style={{
        width: 14,
        height: 14,
      }}
      title="Connection Junction (Multi-service anchor)"
    >
      {/* 4 Connection handles (top, right, bottom, left) allowing multiple in/out branches */}
      <Handle
        type="target"
        id="top-target"
        position={Position.Top}
        className="!size-2.5 !bg-accent -top-1.5 opacity-0 group-hover:opacity-80 hover:!opacity-100 transition-opacity rounded-full border border-paper"
      />
      <Handle
        type="source"
        id="top-source"
        position={Position.Top}
        className={cn(HIDDEN, '-top-1.5')}
      />

      <Handle
        type="target"
        id="right-target"
        position={Position.Right}
        className="!size-2.5 !bg-accent -right-1.5 opacity-0 group-hover:opacity-80 hover:!opacity-100 transition-opacity rounded-full border border-paper"
      />
      <Handle
        type="source"
        id="right-source"
        position={Position.Right}
        className={cn(HIDDEN, '-right-1.5')}
      />

      <Handle
        type="target"
        id="bottom-target"
        position={Position.Bottom}
        className="!size-2.5 !bg-accent -bottom-1.5 opacity-0 group-hover:opacity-80 hover:!opacity-100 transition-opacity rounded-full border border-paper"
      />
      <Handle
        type="source"
        id="bottom-source"
        position={Position.Bottom}
        className={cn(HIDDEN, '-bottom-1.5')}
      />

      <Handle
        type="target"
        id="left-target"
        position={Position.Left}
        className="!size-2.5 !bg-accent -left-1.5 opacity-0 group-hover:opacity-80 hover:!opacity-100 transition-opacity rounded-full border border-paper"
      />
      <Handle
        type="source"
        id="left-source"
        position={Position.Left}
        className={cn(HIDDEN, '-left-1.5')}
      />
    </div>
  );
}

export const JunctionNode = memo(JunctionNodeComponent);
