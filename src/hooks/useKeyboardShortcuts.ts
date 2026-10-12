'use client';

import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/stores/useCanvasStore';

import { getFitViewOptions } from '@/components/canvas/canvas-helpers';
function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
}

/** A Radix dialog/sheet or menu is open — it owns the keyboard. */
function isOverlayOpen() {
  return !!document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]'
  );
}

/**
 * Global canvas shortcuts. Keep in sync with SHORTCUT_GROUPS in `src/lib/shortcuts.ts`.
 * Delete/Backspace is handled by React Flow's deleteKeyCode; Space-drag pan by React Flow.
 * Presentation arrows live in PresentationOverlay.
 */
export function useKeyboardShortcuts() {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = useCanvasStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // ⌘K works everywhere, including inside inputs and the command menu itself.
      if (mod && !e.shiftKey && !e.altKey && key === 'k') {
        e.preventDefault();
        s.setCommandMenuOpen(!s.commandMenuOpen);
        return;
      }

      if (isOverlayOpen()) return;

      if (e.key === 'Escape') {
        if (s.presentation.active) {
          e.preventDefault();
          s.stopPresentation();
          return;
        }
        if (s.placementItem) {
          e.preventDefault();
          s.setPlacementItem(null);
          return;
        }
        if (isTyping(e.target)) {
          (e.target as HTMLElement).blur();
          return;
        }
        if (s.pendingEdge) {
          s.setPendingEdge(null);
          return;
        }
        if (s.activePopover) {
          e.preventDefault();
          s.closePopover();
          return;
        }
        if (s.activeTool !== 'select') {
          s.setActiveTool('select');
          return;
        }
        s.clearSelection();
        return;
      }

      if (isTyping(e.target)) return;
      if (s.presentation.active) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        s.deleteSelection();
        return;
      }

      if (mod && !e.altKey) {
        switch (key) {
          case 'a':
            e.preventDefault();
            s.selectAll();
            return;
          case 'c':
            if (window.getSelection()?.toString()) return;
            e.preventDefault();
            s.copySelection();
            return;
          case 'v':
            e.preventDefault();
            s.pasteSelection();
            return;
          case 'd': {
            e.preventDefault();
            const selected = s.nodes.filter((n) => n.selected).map((n) => n.id);
            if (selected.length > 0) s.duplicateNodes(selected);
            else if (s.selectedNodeId) s.duplicateNodes([s.selectedNodeId]);
            return;
          }
          case 'z':
            e.preventDefault();
            if (e.shiftKey) s.redo();
            else s.undo();
            return;
          case 'y':
            e.preventDefault();
            s.redo();
            return;
        }
        return;
      }

      if (e.altKey) return;

      if (e.key === '?') {
        e.preventDefault();
        s.setShortcutsOpen(true);
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        s.toggleLibrary();
        return;
      }
      if (e.shiftKey && key === 'r') {
        if (s.selectedEdgeId) {
          e.preventDefault();
          s.reverseEdge(s.selectedEdgeId);
        }
        return;
      }
      if (e.shiftKey) return;
      if (key === 'f') {
        e.preventDefault();
        fitView(getFitViewOptions(200));
        return;
      }
      if (e.code === 'Space') {
        if (!e.repeat && !isTyping(e.target) && !isOverlayOpen()) {
          e.preventDefault();
          s.setIsSpacePanning(true);
        }
        return;
      }

      if (e.key === 'Tab') {
        if (s.activeTool === 'pencil' || s.activeTool === 'eraser') {
          e.preventDefault();
          s.setActiveTool(s.activeTool === 'pencil' ? 'eraser' : 'pencil');
          return;
        }
      }

      // If a text node is selected, don't trigger tool shortcuts that could break text editing
      if (s.nodes.some((n) => n.selected && n.type === 'text')) {
        return;
      }

      if (key === 'h') {
        e.preventDefault();
        s.setActiveTool(s.activeTool === 'hand' ? 'select' : 'hand');
        return;
      }
      if (key === 'v') {
        e.preventDefault();
        s.setActiveTool('select');
        return;
      }
      if (key === 'r') {
        e.preventDefault();
        s.setActiveTool(s.activeTool === 'rectangle' ? 'select' : 'rectangle');
        return;
      }
      if (key === 'o') {
        e.preventDefault();
        s.setActiveTool(s.activeTool === 'circle' ? 'select' : 'circle');
        return;
      }
      if (key === 'a') {
        e.preventDefault();
        s.setActiveTool(s.activeTool === 'arrow' ? 'select' : 'arrow');
        return;
      }
      if (key === 'l') {
        e.preventDefault();
        s.setActiveTool(s.activeTool === 'line' ? 'select' : 'line');
        return;
      }
      if (key === 'j') {
        e.preventDefault();
        s.setPlacementItem(
          s.placementItem?.kind === 'junction' ? null : { kind: 'junction', label: 'Junction' }
        );
        return;
      }
      if (key === 't') {
        e.preventDefault();
        s.setActiveTool(s.activeTool === 'text' ? 'select' : 'text');
        return;
      }
      if (key === 'd') {
        e.preventDefault();
        s.setActiveTool(s.activeTool === 'pencil' ? 'select' : 'pencil');
        return;
      }
      if (key === 'e') {
        e.preventDefault();
        s.setActiveTool(s.activeTool === 'eraser' ? 'select' : 'eraser');
        return;
      }
      if (key === 'p') {
        if (s.nodes.some((n) => n.type === 'system')) {
          e.preventDefault();
          s.startPresentation();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        useCanvasStore.getState().setIsSpacePanning(false);
      }
    };

    const handleBlur = () => {
      useCanvasStore.getState().setIsSpacePanning(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [fitView]);
}
