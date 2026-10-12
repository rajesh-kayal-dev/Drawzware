'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import { BookOpen, CheckSquare, Pencil } from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';
import type { SystemNode } from '@/types';

const HIDDEN = '!opacity-0';

function StepNodeComponent({ id, data, selected, width, height }: NodeProps<SystemNode>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const presenting = useCanvasStore((s) => s.presentation.active);
  const pushHistory = useCanvasStore((s) => s.pushHistory);

  const stepNumber = data?.stepNumber ?? 1;
  const title = data?.stepTitle ?? data?.label ?? 'System Design Step';
  const subtitle = data?.stepDescription ?? data?.description ?? '';
  const initialContent = data?.stepContent ?? '';

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const initialContentRef = useRef(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const finishEditing = useCallback(() => {
    setIsEditing(false);
    if (content !== initialContentRef.current) {
      initialContentRef.current = content;
      updateNodeData(id, { stepContent: content });
    }
  }, [content, id, updateNodeData]);

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!presenting) {
      setContent(data?.stepContent ?? '');
      initialContentRef.current = data?.stepContent ?? '';
      setIsEditing(true);
    }
  }, [presenting, data?.stepContent]);

  return (
    <div
      onDoubleClick={onDoubleClick}
      className={cn(
        'group relative flex flex-col rounded-[14px] border bg-paper text-ink transition-[border-color,box-shadow] duration-[120ms] ease-out',
        selected
          ? 'border-accent shadow-[0_0_0_3px_var(--accent-soft),var(--shadow-lg)]'
          : 'border-line shadow-[var(--shadow)] hover:border-ink-3 hover:shadow-[var(--shadow-lg)]'
      )}
      style={{
        width: width ?? 340,
        height: height ?? 280,
      }}
    >
      <NodeResizer
        isVisible={!!selected && !presenting && !isEditing}
        minWidth={260}
        minHeight={180}
        onResizeEnd={() => pushHistory()}
      />

      {/* 4 Handles for connecting flows or steps */}
      <Handle type="target" id="top-target" position={Position.Top} />
      <Handle type="source" id="top-source" position={Position.Top} className={HIDDEN} />
      <Handle type="target" id="left-target" position={Position.Left} />
      <Handle type="source" id="left-source" position={Position.Left} className={HIDDEN} />
      <Handle type="target" id="bottom-target" position={Position.Bottom} />
      <Handle type="source" id="bottom-source" position={Position.Bottom} className={HIDDEN} />
      <Handle type="target" id="right-target" position={Position.Right} />
      <Handle type="source" id="right-source" position={Position.Right} className={HIDDEN} />

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5 bg-line/20 rounded-t-[13px]">
        <div className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[10.5px] font-bold text-accent-ink">
            {stepNumber}
          </span>
          <span className="text-[12.5px] font-semibold text-ink truncate max-w-[200px]">
            {title}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          aria-label={isEditing ? 'Save step' : 'Edit step'}
          className="size-6 flex items-center justify-center rounded-[6px] text-ink-3 hover:text-ink hover:bg-line-2 transition-colors"
        >
          {isEditing ? <CheckSquare className="size-3.5 text-accent" /> : <Pencil className="size-3.5" />}
        </button>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="px-3.5 pt-2 text-[11px] text-ink-3 line-clamp-1 italic">
          {subtitle}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 min-h-0 p-3 overflow-y-auto">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            aria-label="Step notes and prompts"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={finishEditing}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                finishEditing();
                return;
              }
              // Stop propagation so typing doesn't trigger canvas shortcuts
              e.stopPropagation();
            }}
            className="nodrag nowheel nopan size-full resize-none border-none bg-transparent font-mono text-[11.5px] leading-relaxed text-ink outline-none"
            placeholder="Document requirements, estimations, trade-offs, or decisions…"
          />
        ) : (
          <div
            className={cn(
              'size-full whitespace-pre-wrap text-[11.5px] leading-relaxed select-text',
              content ? 'text-ink' : 'text-ink-3 italic'
            )}
          >
            {content || 'Double-click to add documentation & notes…'}
          </div>
        )}
      </div>

      {/* Footer Pill */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-line/60 bg-line/10 rounded-b-[13px] text-[10px] text-ink-3">
        <span className="flex items-center gap-1">
          <BookOpen className="size-3" />
          Architecture Step
        </span>
        <span>{isEditing ? 'Press Esc to finish' : 'Double-click to edit'}</span>
      </div>
    </div>
  );
}

export const StepNode = memo(StepNodeComponent);
