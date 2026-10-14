import { describe, it, expect } from 'vitest';
import { getCanvasCursorClass } from '@/components/canvas/canvas-helpers';
import type { CanvasTool } from '@/types';

describe('Drawzware Active Tool Cursors & Bottom Toolbar Theming', () => {
  describe('Active Tool Mouse Cursor Mapping', () => {
    it('maps Select tool to standard default pointer cursor', () => {
      const cursor = getCanvasCursorClass('select', false, false);
      expect(cursor).toBe('cursor-tool-default');
    });

    it('maps Drawing Shape tools (Rectangle, Circle, Line, Arrow) to crosshair cursor', () => {
      const shapeTools: CanvasTool[] = ['rectangle', 'circle', 'line', 'arrow'];
      for (const tool of shapeTools) {
        const cursor = getCanvasCursorClass(tool, false, false);
        expect(cursor).toBe('cursor-tool-crosshair');
      }
    });

    it('maps Pencil/Pen tool to pencil-style cursor', () => {
      const cursor = getCanvasCursorClass('pencil', false, false);
      expect(cursor).toBe('cursor-tool-pencil');
    });

    it('maps Eraser tool to eraser-style cursor', () => {
      const cursor = getCanvasCursorClass('eraser', false, false);
      expect(cursor).toBe('cursor-tool-eraser');
    });

    it('maps Text tool to text I-beam cursor', () => {
      const cursor = getCanvasCursorClass('text', false, false);
      expect(cursor).toBe('cursor-tool-text');
    });

    it('maps Hand / Pan mode (or Space panning) to grab cursor when idle and grabbing when dragging', () => {
      const handIdleCursor = getCanvasCursorClass('hand', false, false, false);
      expect(handIdleCursor).toBe('cursor-tool-grab');

      const handDraggingCursor = getCanvasCursorClass('hand', false, false, true);
      expect(handDraggingCursor).toBe('cursor-tool-grabbing');

      const spacePanIdle = getCanvasCursorClass('select', true, false, false);
      expect(spacePanIdle).toBe('cursor-tool-grab');

      const spacePanDragging = getCanvasCursorClass('select', true, false, true);
      expect(spacePanDragging).toBe('cursor-tool-grabbing');
    });

    it('prioritizes placement item overlay with crosshair cursor', () => {
      const cursor = getCanvasCursorClass('select', false, true);
      expect(cursor).toBe('cursor-tool-crosshair');
    });
  });
});
