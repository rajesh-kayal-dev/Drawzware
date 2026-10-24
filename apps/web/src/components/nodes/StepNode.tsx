'use client';

import { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  List,
  ListOrdered,
  Minus,
  Palette,
  Plus,
  Underline,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';
import { BRUSH_COLORS } from '@/types';
import { saveStepFormatting, type StepFormattingPreferences } from '@/lib/steps-registry';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SimpleTooltip } from '@/components/ui/tooltip';
import type { SystemNode } from '@/types';

const HIDDEN = '!opacity-0 pointer-events-none';

/** Clean any unwanted raw markdown symbols (like stray ****, ###, etc.) */
function cleanRawMarkdownSymbols(text: string): string {
  return text.replace(/\*{3,}/g, '**').replace(/_{3,}/g, '__');
}

/** Converts stored markdown string to clean HTML for contentEditable WYSIWYG editor */
function markdownToHtml(md: string): string {
  if (!md || !md.trim()) return '<p><br></p>';

  if (/<(p|h[1-6]|ul|ol|li|div)[\s>]/i.test(md)) {
    return md;
  }

  const lines = md.split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      html += '</ul>';
      inUl = false;
    }
    if (inOl) {
      html += '</ol>';
      inOl = false;
    }
  };

  const parseInline = (str: string): string => {
    return str
      .replace(/\*{3,}/g, '**')
      .replace(/_{3,}/g, '__')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
      .replace(/_([^_]+?)_/g, '<em>$1</em>')
      .replace(/`([^`]+?)`/g, '<code>$1</code>');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Bullet list: -, *, +, •
    const bulletMatch = line.match(/^(\s*)[-*+•]\s+(.*)$/);
    if (bulletMatch) {
      if (inOl) {
        html += '</ol>';
        inOl = false;
      }
      if (!inUl) {
        html += '<ul>';
        inUl = true;
      }
      html += `<li>${parseInline(bulletMatch[2])}</li>`;
      continue;
    }

    // Numbered list: 1., 2.
    const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (inUl) {
        html += '</ul>';
        inUl = false;
      }
      if (!inOl) {
        html += '<ol>';
        inOl = true;
      }
      html += `<li>${parseInline(numMatch[3])}</li>`;
      continue;
    }

    closeLists();

    if (!trimmed) {
      html += '<p><br></p>';
      continue;
    }

    // Heading: supports ###, ##, # as well as wrapped ****### Title****
    const headingMatch = trimmed.match(/^[*_]*\s*(#{1,6})\s+(.*?)\s*[*_]*$/);
    if (headingMatch) {
      const level = Math.min(Math.max(headingMatch[1].length, 1), 3);
      const headingText = headingMatch[2].replace(/^[*_]+|[*_]+$/g, '').trim();
      html += `<h${level}>${parseInline(headingText)}</h${level}>`;
      continue;
    }

    // Bold title line
    const boldLineMatch = trimmed.match(/^[*_]{2,}\s*([^]+?)\s*[*_]{2,}$/);
    if (boldLineMatch && !boldLineMatch[1].includes('\n')) {
      html += `<h3>${parseInline(boldLineMatch[1])}</h3>`;
      continue;
    }

    html += `<p>${parseInline(trimmed)}</p>`;
  }

  closeLists();
  return html;
}

/** Converts edited HTML from contentEditable back to clean Markdown */
function domToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  let inner = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    inner += domToMarkdown(el.childNodes[i]);
  }

  switch (tag) {
    case 'h1':
      return `\n# ${inner.trim()}\n`;
    case 'h2':
      return `\n## ${inner.trim()}\n`;
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return `\n### ${inner.trim()}\n`;
    case 'strong':
    case 'b':
      return inner.trim() ? `**${inner.trim()}**` : '';
    case 'em':
    case 'i':
      return inner.trim() ? `*${inner.trim()}*` : '';
    case 'u':
      return inner.trim() ? `<u>${inner.trim()}</u>` : '';
    case 'span':
    case 'font': {
      const styleColor = el.style?.color || (el as HTMLFontElement).color;
      if (styleColor) {
        return `<span style="color: ${styleColor}">${inner}</span>`;
      }
      return inner;
    }
    case 'code':
      return inner.trim() ? `\`${inner.trim()}\`` : '';
    case 'li':
      return `- ${inner.trim()}\n`;
    case 'ul':
    case 'ol':
      return `\n${inner.trim()}\n`;
    case 'p':
    case 'div':
      return inner.trim() ? `\n${inner.trim()}\n` : '\n';
    case 'br':
      return '\n';
    default:
      return inner;
  }
}

function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';
  if (typeof window === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const raw = domToMarkdown(doc.body.firstChild || doc.body);
  return raw
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Parse and render inline Markdown tokens: span color, u, bold, italic, code */
function renderInlineMarkdown(rawText: string): React.ReactNode {
  const text = cleanRawMarkdownSymbols(rawText);
  const parts: React.ReactNode[] = [];
  const regex = /(<span\s+style="color:\s*([^"]+)">([\s\S]*?)<\/span>|<u>([\s\S]*?)<\/u>|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.toLowerCase().startsWith('<span')) {
      const color = match[2];
      const inner = match[3];
      parts.push(
        <span key={match.index} style={{ color }}>
          {renderInlineMarkdown(inner)}
        </span>
      );
    } else if (token.toLowerCase().startsWith('<u>')) {
      const inner = match[4];
      parts.push(
        <u key={match.index} className="underline">
          {renderInlineMarkdown(inner)}
        </u>
      );
    } else if (token.startsWith('**') || token.startsWith('__')) {
      const inner = token.slice(2, -2).trim();
      parts.push(
        <strong key={match.index} className="font-semibold">
          {inner}
        </strong>
      );
    } else if (token.startsWith('`')) {
      const inner = token.slice(1, -1);
      parts.push(
        <code
          key={match.index}
          className="rounded bg-line/40 px-1 py-0.5 font-mono text-[0.88em] text-accent font-medium"
        >
          {inner}
        </code>
      );
    } else if (token.startsWith('*') || token.startsWith('_')) {
      const inner = token.slice(1, -1).trim();
      parts.push(
        <em key={match.index} className="italic">
          {inner}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    // Strip any dangling single or double markdown markers from the trailing text
    const remaining = text.slice(lastIndex).replace(/^[*_]+|[*_]+$/g, '');
    parts.push(remaining);
  }

  return parts.length > 0 ? parts : text.replace(/^[*_]+|[*_]+$/g, '');
}

/** Render full Markdown content block with proportional typography matching screenshot */
function renderMarkdown(
  rawText: string,
  fontSize: number,
  scale: number,
  color?: string,
  align?: 'left' | 'center' | 'right',
  bold?: boolean,
  italic?: boolean
): React.ReactNode {
  if (!rawText || !rawText.trim()) {
    return (
      <div
        className="italic text-ink-3/70 select-none py-2"
        style={{ fontSize: `${fontSize}px`, textAlign: align }}
      >
        Double-click to add documentation & notes…
      </div>
    );
  }

  const lines = rawText.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: { text: string; ordered: boolean; num?: string }[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    const isOrdered = listItems[0].ordered;
    const currentItems = [...listItems];
    listItems = [];

    elements.push(
      isOrdered ? (
        <ol
          key={`ol-${listKey++}`}
          className="my-2 space-y-1.5 pl-0 list-none"
          style={{ fontSize: `${fontSize}px`, textAlign: align }}
        >
          {currentItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 leading-relaxed">
              <span className="shrink-0 font-mono text-[0.88em] font-semibold text-accent mt-0.5 select-none">
                {item.num ?? `${idx + 1}.`}
              </span>
              <span className="flex-1 min-w-0">{renderInlineMarkdown(item.text)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul
          key={`ul-${listKey++}`}
          className="my-2 space-y-1.5 pl-0 list-none"
          style={{ fontSize: `${fontSize}px`, textAlign: align }}
        >
          {currentItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
              <span
                className="shrink-0 rounded-full bg-accent mt-2 select-none"
                style={{
                  width: `${Math.max(4.5, 5.5 * scale)}px`,
                  height: `${Math.max(4.5, 5.5 * scale)}px`,
                }}
              />
              <span className="flex-1 min-w-0">{renderInlineMarkdown(item.text)}</span>
            </li>
          ))}
        </ul>
      )
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for unordered bullet list: -, *, +, •
    const unorderedMatch = line.match(/^(\s*)[-*+•]\s+(.*)$/);
    if (unorderedMatch) {
      if (listItems.length > 0 && listItems[0].ordered) flushList();
      listItems.push({ text: unorderedMatch[2], ordered: false });
      continue;
    }

    // Check for ordered list: 1., 2.
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (listItems.length > 0 && !listItems[0].ordered) flushList();
      listItems.push({ text: orderedMatch[3], ordered: true, num: `${orderedMatch[2]}.` });
      continue;
    }

    // Flush any pending list before block items
    flushList();

    // Blank line
    if (!trimmed) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Check for Headings: supports ###, ##, # as well as wrapped ****### Title**** or ### **Title**
    const headingMatch = trimmed.match(/^[*_]*\s*(#{1,6})\s+(.*?)\s*[*_]*$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingContent = headingMatch[2].replace(/^[*_]+|[*_]+$/g, '').trim();

      if (level === 1) {
        elements.push(
          <h1
            key={`h1-${i}`}
            className="font-extrabold tracking-tight mt-4 mb-2 first:mt-0"
            style={{
              fontSize: `${Math.round(fontSize * 1.45)}px`,
              color: color || undefined,
              textAlign: align,
            }}
          >
            {renderInlineMarkdown(headingContent)}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2
            key={`h2-${i}`}
            className="font-bold tracking-tight mt-3.5 mb-1.5 first:mt-0"
            style={{
              fontSize: `${Math.round(fontSize * 1.25)}px`,
              color: color || undefined,
              textAlign: align,
            }}
          >
            {renderInlineMarkdown(headingContent)}
          </h2>
        );
      } else {
        // level >= 3 (H3 / H4 / etc.)
        elements.push(
          <h3
            key={`h3-${i}`}
            className="font-bold tracking-tight mt-3.5 mb-1.5 first:mt-0"
            style={{
              fontSize: `${Math.round(fontSize * 1.15)}px`,
              color: color || undefined,
              textAlign: align,
            }}
          >
            {renderInlineMarkdown(headingContent)}
          </h3>
        );
      }
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="border-l-2 border-accent pl-2.5 my-2 italic text-ink-2"
          style={{ fontSize: `${Math.round(fontSize * 0.95)}px`, textAlign: align }}
        >
          {renderInlineMarkdown(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(<hr key={`hr-${i}`} className="my-2.5 border-line/60" />);
      continue;
    }

    // Standalone bold line acting as a section heading (e.g. "**Traffic Estimates**" or "****Traffic Estimates****")
    const boldLineMatch = trimmed.match(/^[*_]{2,}\s*([^]+?)\s*[*_]{2,}$/);
    if (boldLineMatch && !boldLineMatch[1].includes('\n')) {
      elements.push(
        <h3
          key={`bold-h-${i}`}
          className="font-bold tracking-tight mt-3.5 mb-1.5 first:mt-0"
          style={{
            fontSize: `${Math.round(fontSize * 1.15)}px`,
            color: color || undefined,
            textAlign: align,
          }}
        >
          {renderInlineMarkdown(boldLineMatch[1])}
        </h3>
      );
      continue;
    }

    // Regular Paragraph
    elements.push(
      <p
        key={`p-${i}`}
        className="my-1 leading-relaxed"
        style={{
          fontSize: `${fontSize}px`,
          color: color || undefined,
          textAlign: align,
          fontWeight: bold ? 600 : undefined,
          fontStyle: italic ? 'italic' : undefined,
        }}
      >
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  }

  flushList();
  return elements;
}

function StepNodeComponent({ id, data, selected, width, height }: NodeProps<SystemNode>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const presenting = useCanvasStore((s) => s.presentation.active);
  const pushHistory = useCanvasStore((s) => s.pushHistory);

  const title = data?.stepTitle ?? data?.label ?? 'System Design Step';
  const subtitle = data?.stepDescription ?? data?.description ?? '';
  const initialContent = data?.stepContent ?? '';

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const initialContentRef = useRef(initialContent);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Proportional Scaling Logic based on card dimensions
  const baseWidth = 340;
  const baseHeight = 280;
  const cardWidth = width ?? baseWidth;
  const cardHeight = height ?? baseHeight;

  // Proportional scale factor with sensible limits [0.75x, 2.2x]
  const scale = useMemo(() => {
    const raw = Math.sqrt((cardWidth / baseWidth) * (cardHeight / baseHeight));
    return Math.min(Math.max(raw, 0.75), 2.2);
  }, [cardWidth, cardHeight]);

  const baseFontSize = data?.fontSize ?? 12;
  const scaledFontSize = Math.min(Math.max(Math.round(baseFontSize * scale * 10) / 10, 10), 28);

  // Proportional toolbar sizing when card is resized
  const toolBtnSize = Math.max(20, Math.round(22 * scale));
  const toolIconSize = Math.max(12, Math.round(13 * scale));
  const toolFontSize = Math.max(10, Math.round(11 * scale));
  const toolDividerHeight = Math.max(12, Math.round(14 * scale));

  const currentColor = data?.color ?? '';
  const currentAlign = data?.align ?? 'left';
  const isBold = Boolean(data?.bold);
  const isItalic = Boolean(data?.italic);
  const isUnderline = Boolean(data?.underline);

  // Save text selection whenever user selects text inside editor
  useEffect(() => {
    if (!isEditing) return;
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current) {
        const anchor = sel.anchorNode;
        if (anchor && editorRef.current.contains(anchor)) {
          savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
        }
      }
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [isEditing]);

  useEffect(() => {
    if (isEditing && editorRef.current) {
      const el = editorRef.current;
      el.innerHTML = markdownToHtml(content);
      el.focus();
      try {
        const sel = window.getSelection();
        if (sel) {
          sel.selectAllChildren(el);
          sel.collapseToEnd();
        }
      } catch {
        // ignore selection error
      }
    }
  }, [isEditing, content]);

  // Keep local content in sync if data changes externally
  const [prevExternalContent, setPrevExternalContent] = useState(data?.stepContent);
  if (prevExternalContent !== data?.stepContent) {
    setPrevExternalContent(data?.stepContent);
    if (!isEditing && data?.stepContent !== undefined) {
      setContent(data.stepContent);
    }
  }

  useEffect(() => {
    if (data?.stepContent !== undefined) {
      initialContentRef.current = data.stepContent;
    }
  }, [data?.stepContent]);

  const finishEditing = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (editorRef.current) {
      const updatedMd = htmlToMarkdown(editorRef.current.innerHTML);
      if (updatedMd !== initialContentRef.current) {
        initialContentRef.current = updatedMd;
        setContent(updatedMd);
        updateNodeData(id, { stepContent: updatedMd });
        pushHistory();
      }
    }
    setIsEditing(false);
  }, [id, pushHistory, updateNodeData]);

  const handleEditorBlur = useCallback(
    (e: React.FocusEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (
        related &&
        (related.closest('[data-step-toolbar]') ||
          related.closest('[data-radix-popper-content-wrapper]') ||
          related.closest('[role="dialog"]') ||
          related.closest('[role="menu"]'))
      ) {
        return;
      }
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = setTimeout(() => {
        const activeEl = document.activeElement;
        if (
          activeEl &&
          (activeEl.closest('[data-step-toolbar]') ||
            activeEl.closest('[data-radix-popper-content-wrapper]') ||
            activeEl.closest('[role="dialog"]') ||
            activeEl.closest('[role="menu"]'))
        ) {
          return;
        }
        finishEditing();
      }, 180);
    },
    [finishEditing]
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!presenting) {
        if (useCanvasStore.getState().activeTool !== 'select') {
          useCanvasStore.getState().setActiveTool('select');
        }
        setContent(data?.stepContent ?? '');
        initialContentRef.current = data?.stepContent ?? '';
        setIsEditing(true);
      }
    },
    [presenting, data?.stepContent]
  );

  // Update formatting and persist preferences per stepId
  const applyFormatting = useCallback(
    (patch: Partial<StepFormattingPreferences>) => {
      const updated: StepFormattingPreferences = {
        fontSize: patch.fontSize ?? data?.fontSize ?? 12,
        color: patch.color !== undefined ? patch.color : data?.color,
        align: patch.align ?? data?.align ?? 'left',
        bold: patch.bold !== undefined ? patch.bold : Boolean(data?.bold),
        italic: patch.italic !== undefined ? patch.italic : Boolean(data?.italic),
      };
      updateNodeData(id, updated);
      if (data?.stepId) {
        saveStepFormatting(data.stepId, updated);
      }
    },
    [data, id, updateNodeData]
  );

  const restoreSelection = useCallback(() => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (sel && savedSelectionRef.current && editorRef.current) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      } catch {}
    }
  }, []);

  const triggerContentSave = useCallback(() => {
    if (editorRef.current) {
      const updatedMd = htmlToMarkdown(editorRef.current.innerHTML);
      initialContentRef.current = updatedMd;
      setContent(updatedMd);
      updateNodeData(id, { stepContent: updatedMd });
      pushHistory();
    }
  }, [id, pushHistory, updateNodeData]);

  // Direct WYSIWYG rich-text commands
  const toggleBold = useCallback(() => {
    if (typeof document !== 'undefined') {
      restoreSelection();
      document.execCommand('bold', false);
      triggerContentSave();
    }
  }, [restoreSelection, triggerContentSave]);

  const toggleItalic = useCallback(() => {
    if (typeof document !== 'undefined') {
      restoreSelection();
      document.execCommand('italic', false);
      triggerContentSave();
    }
  }, [restoreSelection, triggerContentSave]);

  const toggleUnderline = useCallback(() => {
    if (typeof document !== 'undefined') {
      restoreSelection();
      document.execCommand('underline', false);
      triggerContentSave();
    }
  }, [restoreSelection, triggerContentSave]);

  const onSelectColor = useCallback(
    (color: string) => {
      const sel = typeof window !== 'undefined' ? window.getSelection() : null;
      let range = savedSelectionRef.current;
      if (
        sel &&
        sel.rangeCount > 0 &&
        !sel.isCollapsed &&
        editorRef.current?.contains(sel.anchorNode)
      ) {
        range = sel.getRangeAt(0);
      }

      if (
        range &&
        !range.collapsed &&
        editorRef.current?.contains(range.commonAncestorContainer)
      ) {
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        if (color) {
          document.execCommand('foreColor', false, color);
        } else {
          document.execCommand('removeFormat', false);
        }
        if (sel && sel.rangeCount > 0) {
          savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
        }
        triggerContentSave();
      } else {
        applyFormatting({ color });
        pushHistory();
      }
    },
    [applyFormatting, pushHistory, triggerContentSave]
  );

  const toggleHeading = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    restoreSelection();
    const sel = window.getSelection();
    let isH3 = false;
    if (sel && sel.anchorNode) {
      let node: Node | null = sel.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'H3') {
          isH3 = true;
          break;
        }
        node = node.parentNode;
      }
    }
    if (isH3) {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, '<h3>');
    }
    triggerContentSave();
  }, [restoreSelection, triggerContentSave]);

  const toggleBulletList = useCallback(() => {
    if (typeof document !== 'undefined') {
      restoreSelection();
      document.execCommand('insertUnorderedList', false);
      triggerContentSave();
    }
  }, [restoreSelection, triggerContentSave]);

  const toggleOrderedList = useCallback(() => {
    if (typeof document !== 'undefined') {
      restoreSelection();
      document.execCommand('insertOrderedList', false);
      triggerContentSave();
    }
  }, [restoreSelection, triggerContentSave]);

  // Professional document editor keyboard handling for Enter, Tab, and Backspace
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finishEditing();
        return;
      }

      // Stop propagation so typing does not trigger canvas keyboard shortcuts
      e.stopPropagation();

      // Tab key: indent list item or insert spaces
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          document.execCommand('outdent', false);
        } else {
          const sel = window.getSelection();
          let inList = false;
          if (sel && sel.anchorNode) {
            let curr: Node | null = sel.anchorNode;
            while (curr && curr !== editorRef.current) {
              if (curr.nodeName === 'LI' || curr.nodeName === 'UL' || curr.nodeName === 'OL') {
                inList = true;
                break;
              }
              curr = curr.parentNode;
            }
          }
          if (inList) {
            document.execCommand('indent', false);
          } else {
            document.execCommand('insertText', false, '  ');
          }
        }
        return;
      }

      // Backspace on empty list item: outdents to exit list
      if (e.key === 'Backspace' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const sel = window.getSelection();
        if (sel && sel.isCollapsed && sel.anchorNode) {
          let curr: Node | null = sel.anchorNode;
          let li: HTMLElement | null = null;
          while (curr && curr !== editorRef.current) {
            if (curr.nodeName === 'LI') {
              li = curr as HTMLElement;
              break;
            }
            curr = curr.parentNode;
          }
          if (li && (!li.textContent || li.textContent.trim() === '')) {
            e.preventDefault();
            document.execCommand('outdent', false);
            return;
          }
        }
      }

      // Enter key: natural list item continuation or exiting empty list / heading
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          e.preventDefault();
          document.execCommand('insertLineBreak', false);
          return;
        }

        const sel = window.getSelection();
        if (sel && sel.isCollapsed && sel.anchorNode) {
          // If in an empty list item, Enter outdents / exits the list
          let curr: Node | null = sel.anchorNode;
          let li: HTMLElement | null = null;
          let heading: HTMLElement | null = null;
          while (curr && curr !== editorRef.current) {
            if (curr.nodeName === 'LI') li = curr as HTMLElement;
            if (/^H[1-6]$/.test(curr.nodeName)) heading = curr as HTMLElement;
            curr = curr.parentNode;
          }

          if (li && (!li.textContent || li.textContent.trim() === '')) {
            e.preventDefault();
            document.execCommand('outdent', false);
            return;
          }

          // If at the end of a heading, Enter creates a normal paragraph below it
          if (heading && !li) {
            const range = sel.getRangeAt(0);
            const headingRange = document.createRange();
            headingRange.selectNodeContents(heading);
            headingRange.setStart(range.endContainer, range.endOffset);
            if (headingRange.toString().length === 0) {
              e.preventDefault();
              const p = document.createElement('p');
              p.innerHTML = '<br>';
              if (heading.nextSibling) {
                heading.parentNode?.insertBefore(p, heading.nextSibling);
              } else {
                heading.parentNode?.appendChild(p);
              }
              const newRange = document.createRange();
              newRange.setStart(p, 0);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
              return;
            }
          }
        }
      }
    },
    [finishEditing]
  );

  return (
    <div
      onDoubleClick={onDoubleClick}
      onPointerDownCapture={() => {
        if (useCanvasStore.getState().activeTool !== 'select') {
          useCanvasStore.getState().setActiveTool('select');
        }
      }}
      className={cn(
        'group relative flex flex-col rounded-[14px] border bg-paper text-ink transition-[border-color,box-shadow] duration-[120ms] ease-out select-none',
        selected
          ? 'border-accent shadow-[0_0_0_3px_var(--accent-soft),var(--shadow-lg)]'
          : 'border-line shadow-[var(--shadow)] hover:border-ink-3 hover:shadow-[var(--shadow-lg)]'
      )}
      style={{
        width: cardWidth,
        height: cardHeight,
      }}
    >
      <NodeResizer
        isVisible={!!selected && !presenting && !isEditing}
        minWidth={240}
        minHeight={170}
        maxWidth={900}
        maxHeight={800}
        onResizeEnd={() => pushHistory()}
      />

      {/* 4 Handles for connecting flows or steps */}
      <Handle type="target" id="top-target" position={Position.Top} />
      <Handle type="source" id="top-source" position={Position.Top} className={HIDDEN} />
      <Handle type="target" id="left-target" position={Position.Left} />
      <Handle type="source" id="left-source" position={Position.Left} className={HIDDEN} />
      <Handle type="source" id="bottom-source" position={Position.Bottom} />
      <Handle type="target" id="bottom-target" position={Position.Bottom} className={HIDDEN} />
      <Handle type="source" id="right-source" position={Position.Right} />
      <Handle type="target" id="right-target" position={Position.Right} className={HIDDEN} />

      {/* Header Bar */}
      <div
        className="flex items-center justify-between border-b border-line px-3.5 bg-line/20 rounded-t-[13px] shrink-0"
        style={{ padding: `${Math.round(8 * scale)}px ${Math.round(14 * scale)}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="font-semibold text-ink truncate"
            style={{ fontSize: `${Math.round(12.5 * scale)}px` }}
          >
            {title}
          </span>
        </div>
        {isEditing && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={finishEditing}
            aria-label="Save step"
            className="flex items-center justify-center rounded-[6px] text-ink-3 hover:text-ink hover:bg-line-2 transition-colors cursor-pointer shrink-0"
            style={{
              width: `${Math.round(24 * scale)}px`,
              height: `${Math.round(24 * scale)}px`,
            }}
          >
            <Check
              className="text-accent stroke-[2.5]"
              style={{
                width: `${Math.round(14 * scale)}px`,
                height: `${Math.round(14 * scale)}px`,
              }}
            />
          </button>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          className="px-3.5 pt-1.5 text-ink-3 line-clamp-1 italic shrink-0"
          style={{
            fontSize: `${Math.round(11 * scale)}px`,
            paddingLeft: `${Math.round(14 * scale)}px`,
            paddingRight: `${Math.round(14 * scale)}px`,
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Compact Text Toolbar (Active during editing, scaled proportionally) */}
      {isEditing && (
        <div
          data-step-toolbar="true"
          className="nodrag nopan nowheel flex items-center border-b border-line/80 bg-paper/95 text-ink shrink-0 shadow-2xs backdrop-blur-xs select-none overflow-x-auto [scrollbar-width:none]"
          style={{
            padding: `${Math.max(4, Math.round(5 * scale))}px ${Math.max(8, Math.round(14 * scale))}px`,
            gap: `${Math.max(6, Math.round(8 * scale))}px`,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Left: Font Size Controls */}
          <div className="flex items-center" style={{ gap: `${Math.max(2, Math.round(3 * scale))}px` }}>
            <SimpleTooltip label="Decrease font size" side="top">
              <button
                type="button"
                onClick={() => applyFormatting({ fontSize: Math.max(10, (data?.fontSize ?? 12) - 1) })}
                className="flex items-center justify-center rounded hover:bg-line text-ink-2 hover:text-ink cursor-pointer"
                style={{ width: `${toolBtnSize}px`, height: `${toolBtnSize}px` }}
              >
                <Minus style={{ width: `${toolIconSize}px`, height: `${toolIconSize}px` }} />
              </button>
            </SimpleTooltip>
            <span
              className="font-mono px-1 text-ink-2 select-none"
              style={{ fontSize: `${toolFontSize}px` }}
            >
              {data?.fontSize ?? 12}px
            </span>
            <SimpleTooltip label="Increase font size" side="top">
              <button
                type="button"
                onClick={() => applyFormatting({ fontSize: Math.min(24, (data?.fontSize ?? 12) + 1) })}
                className="flex items-center justify-center rounded hover:bg-line text-ink-2 hover:text-ink cursor-pointer"
                style={{ width: `${toolBtnSize}px`, height: `${toolBtnSize}px` }}
              >
                <Plus style={{ width: `${toolIconSize}px`, height: `${toolIconSize}px` }} />
              </button>
            </SimpleTooltip>
          </div>

          <div className="w-px bg-line/60 shrink-0" style={{ height: `${toolDividerHeight}px` }} />

          {/* Color Picker */}
          <Popover>
            <SimpleTooltip label="Text Color" side="top">
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center rounded hover:bg-line text-ink-2 hover:text-ink cursor-pointer"
                  style={{ width: `${toolBtnSize}px`, height: `${toolBtnSize}px` }}
                >
                  <Palette
                    style={{
                      width: `${toolIconSize}px`,
                      height: `${toolIconSize}px`,
                      color: currentColor || undefined,
                    }}
                  />
                </button>
              </PopoverTrigger>
            </SimpleTooltip>
            <PopoverContent
              side="top"
              align="center"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              className="w-[150px] p-1.5 grid grid-cols-5 gap-1 z-50 bg-paper border border-line shadow-lg"
            >
              <button
                type="button"
                title="Default"
                onClick={() => onSelectColor('')}
                className="size-5 rounded border border-line bg-paper text-ink flex items-center justify-center text-[9px] font-bold cursor-pointer"
              >
                Def
              </button>
              {BRUSH_COLORS.slice(0, 9).map((c) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => onSelectColor(c.value)}
                  className="size-5 rounded border border-line/40 transition-transform hover:scale-110 cursor-pointer"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </PopoverContent>
          </Popover>

          <div className="w-px bg-line/60 shrink-0" style={{ height: `${toolDividerHeight}px` }} />

          {/* Formatting: Bold, Italic, Underline */}
          <div className="flex items-center" style={{ gap: `${Math.max(2, Math.round(3 * scale))}px` }}>
            <SimpleTooltip label="Bold" side="top">
              <button
                type="button"
                onClick={toggleBold}
                className={cn(
                  'flex items-center justify-center rounded hover:bg-line text-ink-2 hover:text-ink cursor-pointer',
                  isBold && 'bg-accent/15 text-accent'
                )}
                style={{ width: `${toolBtnSize}px`, height: `${toolBtnSize}px` }}
              >
                <span
                  className="font-bold leading-none select-none"
                  style={{ fontSize: `${toolFontSize}px` }}
                >
                  B
                </span>
              </button>
            </SimpleTooltip>
            <SimpleTooltip label="Italic" side="top">
              <button
                type="button"
                onClick={toggleItalic}
                className={cn(
                  'flex items-center justify-center rounded hover:bg-line text-ink-2 hover:text-ink cursor-pointer',
                  isItalic && 'bg-accent/15 text-accent'
                )}
                style={{ width: `${toolBtnSize}px`, height: `${toolBtnSize}px` }}
              >
                <span
                  className="font-serif italic font-bold leading-none select-none"
                  style={{ fontSize: `${Math.round(toolFontSize * 1.1)}px` }}
                >
                  I
                </span>
              </button>
            </SimpleTooltip>
            <SimpleTooltip label="Underline" side="top">
              <button
                type="button"
                onClick={toggleUnderline}
                className={cn(
                  'flex items-center justify-center rounded hover:bg-line text-ink-2 hover:text-ink cursor-pointer',
                  isUnderline && 'bg-accent/15 text-accent'
                )}
                style={{ width: `${toolBtnSize}px`, height: `${toolBtnSize}px` }}
              >
                <Underline style={{ width: `${toolIconSize}px`, height: `${toolIconSize}px` }} />
              </button>
            </SimpleTooltip>
          </div>

          <div className="w-px bg-line/60 shrink-0" style={{ height: `${toolDividerHeight}px` }} />

          {/* Alignment */}
          <div className="flex items-center" style={{ gap: `${Math.max(2, Math.round(3 * scale))}px` }}>
            <SimpleTooltip label="Align Left" side="top">
              <button
                type="button"
                onClick={() => applyFormatting({ align: 'left' })}
                className={cn(
                  'flex items-center justify-center rounded hover:bg-line text-ink-2 hover:text-ink cursor-pointer transition-colors',
                  currentAlign === 'left' && 'bg-line-2 text-ink shadow-2xs font-semibold'
                )}
                style={{ width: `${toolBtnSize}px`, height: `${toolBtnSize}px` }}
              >
                <AlignLeft style={{ width: `${toolIconSize}px`, height: `${toolIconSize}px` }} />
              </button>
            </SimpleTooltip>
            <SimpleTooltip label="Align Center" side="top">
              <button
                type="button"
                onClick={() => applyFormatting({ align: 'center' })}
                className={cn(
                  'flex items-center justify-center rounded hover:bg-line text-ink-2 hover:text-ink cursor-pointer transition-colors',
                  currentAlign === 'center' && 'bg-line-2 text-ink shadow-2xs font-semibold'
                )}
                style={{ width: `${toolBtnSize}px`, height: `${toolBtnSize}px` }}
              >
                <AlignCenter style={{ width: `${toolIconSize}px`, height: `${toolIconSize}px` }} />
              </button>
            </SimpleTooltip>
            <SimpleTooltip label="Align Right" side="top">
              <button
                type="button"
                onClick={() => applyFormatting({ align: 'right' })}
                className={cn(
                  'flex items-center justify-center rounded hover:bg-line text-ink-2 hover:text-ink cursor-pointer transition-colors',
                  currentAlign === 'right' && 'bg-line-2 text-ink shadow-2xs font-semibold'
                )}
                style={{ width: `${toolBtnSize}px`, height: `${toolBtnSize}px` }}
              >
                <AlignRight style={{ width: `${toolIconSize}px`, height: `${toolIconSize}px` }} />
              </button>
            </SimpleTooltip>
          </div>

          <div className="w-px bg-line/60 shrink-0" style={{ height: `${toolDividerHeight}px` }} />

          {/* Elements: Heading & Lists */}
          <div className="flex items-center" style={{ gap: `${Math.max(2, Math.round(3 * scale))}px` }}>
            <SimpleTooltip label="Heading (H3)" side="top">
              <button
                type="button"
                onClick={toggleHeading}
                className="flex items-center justify-center rounded hover:bg-line text-ink-2 hover:text-ink cursor-pointer"
                style={{ width: `${toolBtnSize}px`, height: `${toolBtnSize}px` }}
              >
                <span
                  className="font-bold leading-none select-none"
                  style={{ fontSize: `${toolFontSize}px` }}
                >
                  H3
                </span>
              </button>
            </SimpleTooltip>
            <SimpleTooltip label="Bullet List" side="top">
              <button
                type="button"
                onClick={toggleBulletList}
                className="flex items-center justify-center rounded hover:bg-line text-ink-2 hover:text-ink cursor-pointer"
                style={{ width: `${toolBtnSize}px`, height: `${toolBtnSize}px` }}
              >
                <List style={{ width: `${toolIconSize}px`, height: `${toolIconSize}px` }} />
              </button>
            </SimpleTooltip>
            <SimpleTooltip label="Numbered List" side="top">
              <button
                type="button"
                onClick={toggleOrderedList}
                className="flex items-center justify-center rounded hover:bg-line text-ink-2 hover:text-ink cursor-pointer"
                style={{ width: `${toolBtnSize}px`, height: `${toolBtnSize}px` }}
              >
                <ListOrdered style={{ width: `${toolIconSize}px`, height: `${toolIconSize}px` }} />
              </button>
            </SimpleTooltip>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]"
        style={{
          padding: `${Math.round(12 * scale)}px`,
        }}
      >
        {isEditing ? (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-text-editor="true"
            data-node-id={id}
            aria-label="Step notes and documentation"
            onBlur={handleEditorBlur}
            onKeyDown={handleKeyDown}
            className={cn(
              'nodrag nowheel nopan size-full outline-none select-text overflow-y-auto leading-relaxed',
              '[&_h1]:text-[1.35em] [&_h1]:font-extrabold [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1:first-child]:mt-0',
              '[&_h2]:text-[1.2em] [&_h2]:font-bold [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h2:first-child]:mt-0',
              '[&_h3]:text-[1.12em] [&_h3]:font-bold [&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3:first-child]:mt-0',
              '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ul]:space-y-1',
              '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_ol]:space-y-1',
              '[&_li::marker]:text-accent',
              '[&_strong]:font-semibold',
              '[&_b]:font-semibold',
              '[&_p]:my-1 [&_p]:leading-relaxed'
            )}
            style={{
              fontSize: `${scaledFontSize}px`,
              color: currentColor || undefined,
              textAlign: currentAlign,
            }}
          />
        ) : (
          <div
            className="size-full select-text transition-colors"
            style={{
              fontSize: `${scaledFontSize}px`,
              color: currentColor || undefined,
              textAlign: currentAlign,
            }}
          >
            {renderMarkdown(
              content,
              scaledFontSize,
              scale,
              currentColor,
              currentAlign,
              isBold,
              isItalic
            )}
          </div>
        )}
      </div>

      {/* Clean Footer (No icon inside text box) */}
      <div
        className="flex items-center justify-between border-t border-line/60 bg-line/10 rounded-b-[13px] text-ink-3 select-none shrink-0"
        style={{
          padding: `${Math.round(6 * scale)}px ${Math.round(14 * scale)}px`,
          fontSize: `${Math.round(10 * scale)}px`,
        }}
      >
        <span className="font-medium text-ink-3/80">Architecture Step</span>
        <span>{isEditing ? 'Press Esc to finish' : 'Double-click to edit'}</span>
      </div>
    </div>
  );
}

export const StepNode = memo(StepNodeComponent);
