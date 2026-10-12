'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';
import type { SystemNode } from '@/types';

function getFontFamilyClass(family?: string) {
  switch (family) {
    case 'serif':
      return 'font-serif';
    case 'mono':
      return 'font-mono';
    case 'casual':
      return 'font-sans tracking-wide';
    case 'sans':
    default:
      return 'font-sans';
  }
}

function getCaretOffsetFromPoint(e: React.MouseEvent, text: string): number {
  if (typeof document === 'undefined') return text.length;
  try {
    interface CaretPositionDoc {
      caretPositionFromPoint?: (x: number, y: number) => { offset?: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => { startOffset?: number } | null;
    }
    const doc = document as unknown as CaretPositionDoc;
    if (typeof doc.caretPositionFromPoint === 'function') {
      const pos = doc.caretPositionFromPoint(e.clientX, e.clientY);
      if (pos && typeof pos.offset === 'number') {
        return Math.min(pos.offset, text.length);
      }
    }
    if (typeof doc.caretRangeFromPoint === 'function') {
      const range = doc.caretRangeFromPoint(e.clientX, e.clientY);
      if (range && typeof range.startOffset === 'number') {
        return Math.min(range.startOffset, text.length);
      }
    }
  } catch {
    // fallback
  }
  return text.length;
}

function CanvasTextNodeComponent({ id, data, selected }: NodeProps<SystemNode>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const presenting = useCanvasStore((s) => s.presentation.active);

  const [isEditing, setIsEditing] = useState(Boolean(data?.isNew));
  const [draftText, setDraftText] = useState(data?.text ?? data?.label ?? '');
  const [liveFontSize, setLiveFontSize] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialTextRef = useRef(data?.text ?? data?.label ?? '');
  const isNewRef = useRef(Boolean(data?.isNew));
  const nodeRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{
    width: number;
    height: number;
    fontSize: number;
  } | null>(null);
  const liveFontSizeRef = useRef<number | null>(null);

  const contentText = isEditing ? draftText : (data?.text ?? data?.label ?? '');

  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const draftTextRef = useRef(draftText);

  useEffect(() => {
    draftTextRef.current = draftText;
  }, [draftText]);

  const finishEditing = useCallback(() => {
    const current = draftTextRef.current;
    const trimmed = current.trim();
    if (!trimmed) {
      deleteNode(id);
      if (useCanvasStore.getState().activeTool !== 'select') {
        useCanvasStore.getState().setActiveTool('select');
      }
      return;
    }

    setIsEditing(false);
    isNewRef.current = false;

    if (current !== initialTextRef.current) {
      initialTextRef.current = current;
      updateNodeData(id, { text: current, label: current, isNew: false });
      pushHistory();
    } else if (data?.isNew) {
      updateNodeData(id, { isNew: false });
    }

    // When clicking out of text, ensure Select ('v') tool is selected
    if (useCanvasStore.getState().activeTool !== 'select') {
      useCanvasStore.getState().setActiveTool('select');
    }
  }, [id, deleteNode, updateNodeData, pushHistory, data?.isNew]);

  // If in edit mode, immediately and reliably focus textarea ready to type
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);

      const rId = requestAnimationFrame(() => {
        el.focus();
      });
      const t1 = setTimeout(() => {
        el.focus();
      }, 40);
      const t2 = setTimeout(() => {
        el.focus();
      }, 120);

      return () => {
        cancelAnimationFrame(rId);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isEditing]);

  // Click outside listener: finishes editing, removing node immediately if empty
  useEffect(() => {
    if (!isEditing) return;

    const mountTime = Date.now();
    const handlePointerDownOutside = (e: MouseEvent | PointerEvent) => {
      // Ignore click that spawned edit mode within the first 120ms
      if (Date.now() - mountTime < 120) return;

      const target = e.target as HTMLElement | null;
      if (nodeRef.current && nodeRef.current.contains(target)) return;
      if (
        target?.closest('[data-text-toolbar]') ||
        target?.closest('[role="toolbar"]') ||
        target?.closest('[data-radix-popper-content-wrapper]') ||
        target?.closest('[role="menu"]') ||
        target?.closest('[role="dialog"]')
      ) {
        return;
      }
      finishEditing();
    };

    window.addEventListener('pointerdown', handlePointerDownOutside, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside, true);
    };
  }, [isEditing, finishEditing]);

  const onBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.closest('[data-text-toolbar]') ||
          activeEl.closest('[role="toolbar"]') ||
          activeEl.closest('[data-radix-popper-content-wrapper]') ||
          activeEl.closest('[role="menu"]') ||
          activeEl.closest('[role="dialog"]'))
      ) {
        return;
      }
      finishEditing();
    }, 150);
  }, [finishEditing]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  // Double-click on existing text activates inline editing at the clicked position
  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!presenting) {
        const current = data?.text ?? data?.label ?? '';
        setDraftText(current);
        initialTextRef.current = current;
        const offset = getCaretOffsetFromPoint(e, current);
        setIsEditing(true);
        if (useCanvasStore.getState().selectedNodeId !== id) {
          useCanvasStore.getState().setSelectedNodeId(id);
        }
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(offset, offset);
          }
        });
      }
    },
    [presenting, data?.text, data?.label, id, setDraftText]
  );

  const fontSize = data?.fontSize ?? 16;
  const effectiveFontSize = liveFontSize ?? fontSize;
  const fontFamilyClass = getFontFamilyClass(data?.fontFamily);
  const color = data?.color || 'var(--ink)';
  const bold = data?.bold;
  const italic = data?.italic;
  const underline = data?.underline;
  const align = data?.align ?? 'left';
  const widthMode = data?.widthMode ?? 'auto';
  const isFixedWidth = widthMode === 'fixed';

  const textAlignClass =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  return (
    <div
      ref={nodeRef}
      onDoubleClick={onDoubleClick}
      className={cn(
        'group relative inline-block cursor-move select-none px-0.5 py-0 transition-colors w-fit h-auto',
        fontFamilyClass,
        textAlignClass,
        bold && 'font-bold',
        italic && 'italic',
        underline && 'underline',
        selected || isEditing
          ? 'border-[1.5px] border-[#0ea5e9] rounded-[2px]'
          : 'border-[1.5px] border-transparent rounded-[2px]'
      )}
      style={{
        color,
        fontSize: `${effectiveFontSize}px`,
        lineHeight: 1.15,
        backgroundColor: 'transparent',
        width: 'max-content',
        height: 'auto',
        maxWidth: 'max-content',
      }}
    >
      {/* Resizer for scaling dimensions and font size with clear handles in all directions */}
      <NodeResizer
        isVisible={!!selected && !presenting && !isEditing}
        minWidth={16}
        minHeight={16}
        lineStyle={{
          borderColor: '#0ea5e9',
          borderWidth: 1,
        }}
        handleStyle={{
          width: 8,
          height: 8,
          backgroundColor: '#ffffff',
          borderColor: '#0ea5e9',
          borderWidth: 1.5,
          borderRadius: 2,
        }}
        onResizeStart={(_, params) => {
          const currentSize = data?.fontSize ?? 16;
          const initialWidth = nodeRef.current?.offsetWidth || (params.width > 0 ? params.width : 60);
          const initialHeight = nodeRef.current?.offsetHeight || (params.height > 0 ? params.height : 24);
          resizeStartRef.current = {
            width: initialWidth,
            height: initialHeight,
            fontSize: currentSize,
          };
          liveFontSizeRef.current = currentSize;
        }}
        onResize={(_, params) => {
          const start = resizeStartRef.current;
          if (!start || start.width <= 0 || start.height <= 0) return;

          const scaleX = params.width / start.width;
          const scaleY = params.height / start.height;

          let scale = 1;
          const dir = params.direction;
          if (dir && Array.isArray(dir)) {
            const isCorner = dir[0] !== 0 && dir[1] !== 0;
            if (isCorner) {
              scale = (scaleX + scaleY) / 2;
            } else if (dir[0] !== 0) {
              scale = scaleX;
            } else if (dir[1] !== 0) {
              scale = scaleY;
            }
          } else {
            scale = (scaleX + scaleY) / 2;
          }

          const calculatedSize = Math.min(160, Math.max(8, Math.round(start.fontSize * scale)));
          liveFontSizeRef.current = calculatedSize;
          setLiveFontSize(calculatedSize);
        }}
        onResizeEnd={() => {
          pushHistory();
          const finalSize = liveFontSizeRef.current ?? (data?.fontSize ?? 16);
          setLiveFontSize(null);
          resizeStartRef.current = null;
          liveFontSizeRef.current = null;

          // Clear any fixed dimensions React Flow applied during resize so node fits text tightly
          const currentNodes = useCanvasStore.getState().nodes;
          const updatedNodes = currentNodes.map((n) => {
            if (n.id === id) {
              const restStyle = { ...n.style };
              delete restStyle.width;
              delete restStyle.height;
              return {
                ...n,
                width: undefined,
                height: undefined,
                style: Object.keys(restStyle).length > 0 ? restStyle : undefined,
                data: {
                  ...n.data,
                  fontSize: finalSize,
                  widthMode: 'auto' as const,
                },
              } as SystemNode;
            }
            return n;
          });
          useCanvasStore.getState().setNodes(updatedNodes);
          useCanvasStore.getState().setLastTextFormatting({ fontSize: finalSize });
        }}
      />

      {isEditing ? (
        <div
          className={cn(
            'relative inline-grid items-start w-fit',
            textAlignClass
          )}
          style={{
            gridTemplateColumns: 'minmax(0, max-content)',
            gridTemplateRows: 'minmax(0, max-content)',
          }}
        >
          {/* Mirror element: measures exact width & height of typed text */}
          <span
            aria-hidden="true"
            className={cn(
              'invisible select-none pointer-events-none p-0 m-0 border-0 overflow-hidden',
              isFixedWidth ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
            )}
            style={{
              gridArea: '1 / 1',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              fontStyle: 'inherit',
              lineHeight: 'inherit',
              letterSpacing: 'inherit',
              minWidth: 0,
              minHeight: 0,
            }}
          >
            {(draftText || ' ') + (draftText.endsWith('\n') ? ' ' : '')}
          </span>
          <textarea
            ref={textareaRef}
            autoFocus
            rows={1}
            cols={1}
            aria-label="Text editor"
            value={draftText}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
            }}
            onChange={(e) => {
              draftTextRef.current = e.target.value;
              setDraftText(e.target.value);
            }}
            onFocus={() => {
              if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
            }}
            onBlur={onBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                finishEditing();
                return;
              }
              // Stop propagation so typing shortcuts don't trigger canvas actions
              e.stopPropagation();
            }}
            className={cn(
              'nodrag nowheel nopan resize-none border-0 bg-transparent p-0 m-0 outline-none overflow-hidden',
              fontFamilyClass,
              textAlignClass,
              bold && 'font-bold',
              italic && 'italic',
              underline && 'underline',
              isFixedWidth ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
            )}
            style={{
              gridArea: '1 / 1',
              width: '100%',
              height: '100%',
              minWidth: 0,
              minHeight: 0,
              color,
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              fontStyle: 'inherit',
              lineHeight: 'inherit',
              letterSpacing: 'inherit',
              caretColor: color || '#0ea5e9',
            }}
            placeholder=""
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
      ) : (
        <div
          className={cn(
            'p-0 m-0 w-max whitespace-pre cursor-pointer',
            !contentText && 'italic text-ink-3'
          )}
        >
          {contentText || 'Type text…'}
        </div>
      )}
    </div>
  );
}

export const CanvasTextNode = memo(CanvasTextNodeComponent);
