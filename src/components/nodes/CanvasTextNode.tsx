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

function hasHtml(str: string): boolean {
  if (!str) return false;
  return /<(strong|b|em|i|u|span|p|div|br|font)[\s>]/i.test(str);
}

function sanitizeRichText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
}

function CanvasTextNodeComponent({ id, data, selected }: NodeProps<SystemNode>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const presenting = useCanvasStore((s) => s.presentation.active);

  const [isEditing, setIsEditing] = useState(Boolean(data?.isNew));
  const [draftText, setDraftText] = useState(data?.text ?? data?.label ?? '');
  const [liveFontSize, setLiveFontSize] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
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
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    const current = editorRef.current ? editorRef.current.innerHTML : draftTextRef.current;
    const plainText = editorRef.current
      ? (editorRef.current.textContent || '')
      : current.replace(/<[^>]+>/g, '');
    const trimmed = plainText.trim();
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
      updateNodeData(id, { text: current, label: plainText, isNew: false });
      pushHistory();
    } else if (data?.isNew) {
      updateNodeData(id, { isNew: false });
    }

    // When clicking out of text, ensure Select ('v') tool is selected
    if (useCanvasStore.getState().activeTool !== 'select') {
      useCanvasStore.getState().setActiveTool('select');
    }
  }, [id, deleteNode, updateNodeData, pushHistory, data?.isNew]);

  // If in edit mode, immediately and reliably focus contentEditable ready to type
  useEffect(() => {
    if (isEditing && editorRef.current) {
      const el = editorRef.current;
      el.innerHTML = draftTextRef.current;
      el.focus();
      try {
        const sel = window.getSelection();
        if (sel) {
          sel.selectAllChildren(el);
          sel.collapseToEnd();
        }
      } catch {}

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

  const onBlur = useCallback(
    (e: React.FocusEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (
        related &&
        (related.closest('[data-text-toolbar]') ||
          related.closest('[role="toolbar"]') ||
          related.closest('[data-radix-popper-content-wrapper]') ||
          related.closest('[role="menu"]') ||
          related.closest('[role="dialog"]'))
      ) {
        return;
      }

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
      }, 180);
    },
    [finishEditing]
  );

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
        if (useCanvasStore.getState().activeTool !== 'select') {
          useCanvasStore.getState().setActiveTool('select');
        }
        const current = data?.text ?? data?.label ?? '';
        setDraftText(current);
        initialTextRef.current = current;
        setIsEditing(true);
        if (useCanvasStore.getState().selectedNodeId !== id) {
          useCanvasStore.getState().setSelectedNodeId(id);
        }
        requestAnimationFrame(() => {
          if (editorRef.current) {
            editorRef.current.focus();
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
      onPointerDownCapture={() => {
        if (useCanvasStore.getState().activeTool !== 'select') {
          useCanvasStore.getState().setActiveTool('select');
        }
      }}
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
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-text-editor="true"
          data-node-id={id}
          aria-label="Text editor"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onInput={(e) => {
            const html = e.currentTarget.innerHTML;
            draftTextRef.current = html;
            setDraftText(html);
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
            if (e.key === 'Tab') {
              e.preventDefault();
              document.execCommand('insertText', false, '  ');
              return;
            }
            // Stop propagation so typing shortcuts don't trigger canvas actions
            e.stopPropagation();
          }}
          className={cn(
            'nodrag nowheel nopan border-0 bg-transparent p-0 m-0 outline-none select-text',
            fontFamilyClass,
            textAlignClass,
            bold && 'font-bold',
            italic && 'italic',
            underline && 'underline',
            isFixedWidth ? 'whitespace-pre-wrap break-words max-w-[500px]' : 'whitespace-pre w-max'
          )}
          style={{
            minWidth: '24px',
            minHeight: '1.2em',
            color,
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            fontStyle: 'inherit',
            lineHeight: 'inherit',
            letterSpacing: 'inherit',
            caretColor: color || '#0ea5e9',
          }}
          spellCheck={false}
        />
      ) : (
        <div
          className={cn(
            'p-0 m-0 w-max cursor-pointer',
            isFixedWidth ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
            !contentText && 'italic text-ink-3'
          )}
          dangerouslySetInnerHTML={
            hasHtml(contentText)
              ? { __html: sanitizeRichText(contentText) }
              : undefined
          }
        >
          {hasHtml(contentText) ? null : (contentText || 'Type text…')}
        </div>
      )}
    </div>
  );
}

export const CanvasTextNode = memo(CanvasTextNodeComponent);
