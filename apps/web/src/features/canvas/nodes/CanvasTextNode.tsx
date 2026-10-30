'use client';

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { cn } from '@/shared/utils/utils';
import type { SystemNode } from '@/features/canvas/types/canvas.types';

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

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'P', 'DIV', 'BR', 'FONT']);
const DANGEROUS_TAGS = new Set([
  'SCRIPT',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'MATH',
  'IMG',
  'AUDIO',
  'VIDEO',
  'INPUT',
  'BUTTON',
  'FORM',
  'LINK',
  'STYLE',
  'META',
  'BASE',
  'FRAME',
  'FRAMESET',
]);

function isSafeColor(color: string): boolean {
  const trimmed = color.trim().toLowerCase();
  if (/^#([0-9a-f]{3,8})$/.test(trimmed)) return true;
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/.test(trimmed)) return true;
  if (/^hsla?\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(?:,\s*[\d.]+\s*)?\)$/.test(trimmed)) return true;
  if (/^[a-z]{3,20}$/.test(trimmed) && !['javascript', 'expression', 'url'].includes(trimmed)) return true;
  return false;
}

function extractSafeColor(styleStr: string | null): string | undefined {
  if (!styleStr) return undefined;
  const match = styleStr.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  if (match) {
    const val = match[1].trim();
    if (isSafeColor(val)) return val;
  }
  return undefined;
}

function domNodeToReact(node: Node, key: number | string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();

  if (DANGEROUS_TAGS.has(tag)) {
    return null;
  }

  const childNodes = Array.from(el.childNodes);
  const children = childNodes
    .map((child, idx) => domNodeToReact(child, `${key}-${idx}`))
    .filter((child) => child !== null && child !== '');

  switch (tag) {
    case 'BR':
      return <br key={key} />;
    case 'B':
    case 'STRONG':
      return (
        <strong key={key} className="font-semibold">
          {children}
        </strong>
      );
    case 'I':
    case 'EM':
      return (
        <em key={key} className="italic">
          {children}
        </em>
      );
    case 'U':
      return (
        <u key={key} className="underline">
          {children}
        </u>
      );
    case 'P':
      return (
        <p key={key} className="my-0">
          {children}
        </p>
      );
    case 'DIV':
      return <div key={key}>{children}</div>;
    case 'FONT': {
      const colorAttr = el.getAttribute('color');
      const safeColor = colorAttr && isSafeColor(colorAttr) ? colorAttr : undefined;
      return <span key={key} style={safeColor ? { color: safeColor } : undefined}>{children}</span>;
    }
    case 'SPAN': {
      const safeColor = extractSafeColor(el.getAttribute('style'));
      return <span key={key} style={safeColor ? { color: safeColor } : undefined}>{children}</span>;
    }
    default:
      return children.length > 0 ? <React.Fragment key={key}>{children}</React.Fragment> : null;
  }
}

function hasHtml(str: string): boolean {
  if (!str) return false;
  return /<(strong|b|em|i|u|span|p|div|br|font)[\s>]/i.test(str);
}

export function sanitizeRichText(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<[^>]+>/g, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstElementChild || doc.body;

    const dangerousElements = container.querySelectorAll(
      'script, iframe, object, embed, svg, math, img, audio, video, input, button, form, link, style, meta, base'
    );
    dangerousElements.forEach((el) => el.remove());

    const allElements = container.querySelectorAll('*');
    allElements.forEach((el) => {
      const tag = el.tagName.toUpperCase();
      if (!ALLOWED_TAGS.has(tag)) {
        const parent = el.parentNode;
        while (el.firstChild) {
          parent?.insertBefore(el.firstChild, el);
        }
        parent?.removeChild(el);
        return;
      }

      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        if (tag === 'SPAN' && attr.name.toLowerCase() === 'style') {
          const safeColor = extractSafeColor(attr.value);
          if (safeColor) {
            el.setAttribute('style', `color: ${safeColor}`);
          } else {
            el.removeAttribute(attr.name);
          }
        } else if (tag === 'FONT' && attr.name.toLowerCase() === 'color') {
          if (!isSafeColor(attr.value)) {
            el.removeAttribute(attr.name);
          }
        } else {
          el.removeAttribute(attr.name);
        }
      }
    });

    return container.innerHTML;
  } catch {
    return '';
  }
}

function renderSafeRichText(html: string): React.ReactNode {
  if (!html) return null;
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]+>/g, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstElementChild || doc.body;
    return Array.from(container.childNodes).map((child, idx) => domNodeToReact(child, idx));
  } catch {
    return html.replace(/<[^>]+>/g, '');
  }
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
      el.innerHTML = sanitizeRichText(draftTextRef.current);
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

  const lastPointerDownTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isEditing) return;

    const onPointerDown = (e: PointerEvent) => {
      lastPointerDownTargetRef.current = e.target as HTMLElement | null;
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
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
      const lastTarget = lastPointerDownTargetRef.current;

      const isToolbar = (el: HTMLElement | null) =>
        !!(
          el?.closest('[data-text-toolbar]') ||
          el?.closest('[role="toolbar"]') ||
          el?.closest('[data-radix-popper-content-wrapper]') ||
          el?.closest('[role="menu"]') ||
          el?.closest('[role="dialog"]')
        );

      if (isToolbar(related) || isToolbar(lastTarget)) {
        return;
      }

      finishEditing();
    },
    [finishEditing]
  );

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
        selected && !isEditing
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
        minWidth={20}
        minHeight={20}
        lineStyle={{
          borderColor: '#0ea5e9',
          borderWidth: 1,
        }}
        handleStyle={{
          width: 9,
          height: 9,
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
        >
          {hasHtml(contentText) ? renderSafeRichText(contentText) : (contentText || 'Type text…')}
        </div>
      )}
    </div>
  );
}

export const CanvasTextNode = memo(CanvasTextNodeComponent);
