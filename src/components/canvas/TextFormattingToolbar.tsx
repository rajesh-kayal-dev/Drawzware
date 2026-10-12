'use client';

import { useStore } from '@xyflow/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  BringToFront,
  Check,
  ChevronDown,
  Copy,
  Italic,
  Lock,
  LockOpen,
  Minus,
  MoreHorizontal,
  Plus,
  Trash2,
  Underline,
  WrapText,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getNodeRect } from '@/lib/minimap';
import { getShortcutKeys } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';
import { BRUSH_COLORS } from '@/types';

const PILL_CLEARANCE = 56;

const FONT_FAMILIES = [
  { id: 'sans', label: 'Sans (Inter)', class: 'font-sans' },
  { id: 'serif', label: 'Serif', class: 'font-serif' },
  { id: 'mono', label: 'Mono', class: 'font-mono' },
  { id: 'casual', label: 'Casual', class: 'font-sans tracking-wide' },
] as const;

const FONT_SIZES = [12, 14, 16, 20, 24, 32, 40, 48] as const;

export function TextFormattingToolbar() {
  const nodes = useCanvasStore((s) => s.nodes);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const editingShapeId = useCanvasStore((s) => s.editingShapeId);
  const presenting = useCanvasStore((s) => s.presentation.active);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const duplicateNodes = useCanvasStore((s) => s.duplicateNodes);
  const bringToFront = useCanvasStore((s) => s.bringToFront);
  const toggleLock = useCanvasStore((s) => s.toggleLock);

  const [tx, ty, zoom] = useStore((s) => s.transform);
  const marqueeActive = useStore((s) => s.userSelectionActive);

  const selectedNodes = nodes.filter((n) => n.selected);
  const isTextOrShape = (t: string | undefined) => t === 'text' || t === 'shape';
  const targetNode =
    (editingShapeId ? nodes.find((n) => n.id === editingShapeId && isTextOrShape(n.type)) : null) ||
    (selectedNodes.length === 1 && isTextOrShape(selectedNodes[0].type) ? selectedNodes[0] : null) ||
    (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId && isTextOrShape(n.type)) : null);

  if (
    !targetNode ||
    (selectedNodes.length > 1 && !editingShapeId) ||
    marqueeActive ||
    targetNode.dragging ||
    presenting
  ) {
    return null;
  }

  // Shapes only show text formatting toolbar when currently editing the label inside the shape
  if (targetNode.type === 'shape' && editingShapeId !== targetNode.id) {
    return null;
  }

  const r = getNodeRect(targetNode);
  const left = (r.x + r.width / 2) * zoom + tx;
  const top = r.y * zoom + ty - 10;
  const below = top < PILL_CLEARANCE;

  const data = targetNode.data;
  const currentFont = data?.fontFamily ?? 'sans';
  const currentSize = data?.fontSize ?? (targetNode.type === 'shape' ? 14 : 16);
  const currentColor = data?.color ?? 'var(--ink)';
  const isBold = Boolean(data?.bold);
  const isItalic = Boolean(data?.italic);
  const isUnderline = Boolean(data?.underline);
  const currentAlign = data?.align ?? (targetNode.type === 'shape' ? 'center' : 'left');
  const widthMode = data?.widthMode ?? 'auto';
  const isLocked = targetNode.draggable === false;

  const iconBtn = 'size-7 [&_svg:not([class*=size-])]:size-3.5';

  return (
    <div
      role="toolbar"
      data-text-toolbar="true"
      aria-label="Text formatting"
      className={cn(
        'animate-fade-in absolute z-[11] flex items-center gap-0.5 rounded-full border border-line bg-paper px-1.5 py-1 text-[12.5px] whitespace-nowrap shadow-[var(--shadow-lg)]',
        below ? '-translate-x-1/2' : '-translate-x-1/2 -translate-y-full'
      )}
      style={{ left, top: below ? (r.y + r.height) * zoom + ty + 12 : top }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        // Prevent toolbar clicks from stealing focus / blurring active text editing
        e.preventDefault();
      }}
    >
      {/* Font Family Dropdown */}
      <DropdownMenu>
        <SimpleTooltip label="Font family" side="top">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[12px] font-normal">
              <span className="capitalize">{currentFont}</span>
              <ChevronDown className="size-3 text-ink-3" />
            </Button>
          </DropdownMenuTrigger>
        </SimpleTooltip>
        <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-[140px] p-1">
          {FONT_FAMILIES.map((f) => (
            <DropdownMenuItem
              key={f.id}
              onClick={() => updateNodeData(targetNode.id, { fontFamily: f.id })}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-xs',
                f.class,
                currentFont === f.id && 'bg-line-2 font-medium text-ink'
              )}
            >
              <span>{f.label}</span>
              {currentFont === f.id && <Check className="size-3 text-accent" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font Size Stepper (Decrease, Dropdown, Increase) */}
      <SimpleTooltip label="Decrease font size" keys={['Ctrl', '-']} side="top">
        <Button
          variant="icon"
          size="icon-sm"
          className={iconBtn}
          aria-label="Decrease font size"
          onClick={() => updateNodeData(targetNode.id, { fontSize: Math.max(10, currentSize - 2) })}
        >
          <Minus className="size-3" />
        </Button>
      </SimpleTooltip>

      {/* Font Size Dropdown */}
      <DropdownMenu>
        <SimpleTooltip label="Font size" side="top">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-0.5 px-1 text-[12px] font-normal tabular-nums">
              <span>{currentSize}</span>
              <ChevronDown className="size-3 text-ink-3" />
            </Button>
          </DropdownMenuTrigger>
        </SimpleTooltip>
        <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-[84px] p-1">
          {FONT_SIZES.map((size) => (
            <DropdownMenuItem
              key={size}
              onClick={() => updateNodeData(targetNode.id, { fontSize: size })}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded px-2 py-1 text-xs tabular-nums',
                currentSize === size && 'bg-line-2 font-medium text-ink'
              )}
            >
              <span>{size}px</span>
              {currentSize === size && <Check className="size-3 text-accent" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <SimpleTooltip label="Increase font size" keys={['Ctrl', '+']} side="top">
        <Button
          variant="icon"
          size="icon-sm"
          className={iconBtn}
          aria-label="Increase font size"
          onClick={() => updateNodeData(targetNode.id, { fontSize: Math.min(72, currentSize + 2) })}
        >
          <Plus className="size-3" />
        </Button>
      </SimpleTooltip>

      <div aria-hidden className="mx-1 h-3.5 w-px bg-line" />

      {/* Text Color Dropdown */}
      <DropdownMenu>
        <SimpleTooltip label="Text color" side="top">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className={iconBtn} aria-label="Text color">
              <span
                className="size-3.5 rounded-full border border-black/15 shadow-sm"
                style={{ backgroundColor: currentColor }}
              />
            </Button>
          </DropdownMenuTrigger>
        </SimpleTooltip>
        <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-[180px] p-2">
          <div className="grid grid-cols-5 gap-1.5">
            {BRUSH_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={c.name}
                onClick={() => updateNodeData(targetNode.id, { color: c.value })}
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border border-black/10 transition-transform hover:scale-110',
                  currentColor === c.value && 'ring-2 ring-accent ring-offset-1'
                )}
                style={{ backgroundColor: c.value }}
              >
                {currentColor === c.value && (
                  <Check
                    className={cn(
                      'size-3.5',
                      c.value === '#ffffff' || c.value === '#eab308' ? 'text-black' : 'text-white'
                    )}
                  />
                )}
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <div aria-hidden className="mx-1 h-3.5 w-px bg-line" />

      {/* Bold Toggle */}
      <SimpleTooltip label="Bold" keys={['Ctrl', 'B']} side="top">
        <Button
          variant="icon"
          size="icon-sm"
          className={cn(iconBtn, isBold && 'bg-line-2 text-ink')}
          aria-label="Bold"
          onClick={() => updateNodeData(targetNode.id, { bold: !isBold })}
        >
          <Bold />
        </Button>
      </SimpleTooltip>

      {/* Italic Toggle */}
      <SimpleTooltip label="Italic" keys={['Ctrl', 'I']} side="top">
        <Button
          variant="icon"
          size="icon-sm"
          className={cn(iconBtn, isItalic && 'bg-line-2 text-ink')}
          aria-label="Italic"
          onClick={() => updateNodeData(targetNode.id, { italic: !isItalic })}
        >
          <Italic />
        </Button>
      </SimpleTooltip>

      {/* Underline Toggle */}
      <SimpleTooltip label="Underline" keys={['Ctrl', 'U']} side="top">
        <Button
          variant="icon"
          size="icon-sm"
          className={cn(iconBtn, isUnderline && 'bg-line-2 text-ink')}
          aria-label="Underline"
          onClick={() => updateNodeData(targetNode.id, { underline: !isUnderline })}
        >
          <Underline />
        </Button>
      </SimpleTooltip>

      <div aria-hidden className="mx-1 h-3.5 w-px bg-line" />

      {/* Alignment controls */}
      <SimpleTooltip label="Align left" side="top">
        <Button
          variant="icon"
          size="icon-sm"
          className={cn(iconBtn, currentAlign === 'left' && 'bg-line-2 text-ink')}
          aria-label="Align left"
          onClick={() => updateNodeData(targetNode.id, { align: 'left' })}
        >
          <AlignLeft />
        </Button>
      </SimpleTooltip>

      <SimpleTooltip label="Align center" side="top">
        <Button
          variant="icon"
          size="icon-sm"
          className={cn(iconBtn, currentAlign === 'center' && 'bg-line-2 text-ink')}
          aria-label="Align center"
          onClick={() => updateNodeData(targetNode.id, { align: 'center' })}
        >
          <AlignCenter />
        </Button>
      </SimpleTooltip>

      <SimpleTooltip label="Align right" side="top">
        <Button
          variant="icon"
          size="icon-sm"
          className={cn(iconBtn, currentAlign === 'right' && 'bg-line-2 text-ink')}
          aria-label="Align right"
          onClick={() => updateNodeData(targetNode.id, { align: 'right' })}
        >
          <AlignRight />
        </Button>
      </SimpleTooltip>

      {/* More Menu */}
      <DropdownMenu>
        <SimpleTooltip label="More options" side="top">
          <DropdownMenuTrigger asChild>
            <Button variant="icon" size="icon-sm" className={iconBtn} aria-label="More options">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
        </SimpleTooltip>
        <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-[170px] p-1">
          {targetNode.type === 'text' && (
            <>
              <DropdownMenuItem
                onClick={() => updateNodeData(targetNode.id, { widthMode: widthMode === 'fixed' ? 'auto' : 'fixed' })}
                className="flex cursor-pointer items-center justify-between text-xs"
              >
                <span className="flex items-center gap-2">
                  <WrapText className="size-3.5" />
                  {widthMode === 'fixed' ? 'Wrap text (fixed)' : 'Auto-fit width'}
                </span>
                {widthMode === 'fixed' && <Check className="size-3.5 text-accent" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
            </>
          )}
          <DropdownMenuItem
            onClick={() => duplicateNodes([targetNode.id])}
            className="flex cursor-pointer items-center justify-between text-xs"
          >
            <span className="flex items-center gap-2">
              <Copy className="size-3.5" />
              Duplicate
            </span>
            <DropdownMenuShortcut>{getShortcutKeys('duplicate').join('')}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => bringToFront(targetNode.id)}
            className="flex cursor-pointer items-center gap-2 text-xs"
          >
            <BringToFront className="size-3.5" />
            Bring to front
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => toggleLock([targetNode.id])}
            className="flex cursor-pointer items-center gap-2 text-xs"
          >
            {isLocked ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
            {isLocked ? 'Unlock position' : 'Lock position'}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => deleteNode(targetNode.id)}
            className="flex cursor-pointer items-center justify-between text-xs"
          >
            <span className="flex items-center gap-2">
              <Trash2 className="size-3.5" />
              Delete
            </span>
            <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
