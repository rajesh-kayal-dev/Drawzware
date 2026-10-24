'use client';

import { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { cn } from '@/shared/utils/utils';
import type { SystemNode } from '@/features/canvas/types/canvas.types';

function StickyNoteComponent({ id, data, selected, width, height }: NodeProps<SystemNode>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const presenting = useCanvasStore((s) => s.presentation.active);

  return (
    <div
      className={cn(
        'flex size-full flex-col border border-note-line bg-note px-3 py-2 text-ink transition-shadow duration-[120ms] ease-out box-border overflow-hidden',
        selected ? 'shadow-[0_0_0_3px_var(--accent-soft),var(--shadow)]' : 'shadow-[var(--shadow)]'
      )}
      style={{
        borderRadius: '10px 10px 10px 2px',
        width: width ? '100%' : 180,
        height: height ? '100%' : 80,
      }}
    >
      <NodeResizer
        isVisible={!!selected && !presenting}
        minWidth={60}
        minHeight={40}
        lineStyle={{
          borderColor: '#0ea5e9',
          borderWidth: 1.5,
          borderStyle: 'solid',
        }}
        handleStyle={{
          width: 8,
          height: 8,
          backgroundColor: '#ffffff',
          borderColor: '#0ea5e9',
          borderWidth: 1.5,
          borderRadius: 2,
        }}
        onResizeEnd={() => pushHistory()}
      />
      <textarea
        aria-label="Note"
        rows={2}
        readOnly={presenting}
        className="w-full flex-1 resize-none bg-transparent text-[12px] leading-[1.4] text-ink outline-none placeholder:text-ink-3"
        value={data.label ?? ''}
        placeholder="Type a note…"
        onChange={(e) => updateNodeData(id, { label: e.target.value })}
        onKeyDown={(e) => {
          // Let Esc through to the canvas; keep ⌫ etc. from deleting the note.
          if (e.key !== 'Escape') e.stopPropagation();
        }}
      />
    </div>
  );
}

export const StickyNote = memo(StickyNoteComponent);
