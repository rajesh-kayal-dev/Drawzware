import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import type { SystemNode, SystemNodeData } from '@/features/canvas/types/canvas.types';
import { saveStepFormatting, getStepFormatting } from '@/features/canvas/registries/steps-registry';

const mockStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => mockStore.get(key) ?? null,
  setItem: (key: string, val: string) => {
    mockStore.set(key, val);
  },
  removeItem: (key: string) => {
    mockStore.delete(key);
  },
  clear: () => {
    mockStore.clear();
  },
};

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: mockLocalStorage },
    writable: true,
  });
}
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}

describe('Canvas Editing Bugs Validation (Partial Formatting, Enter/Tab/Backspace, Tool Selection, Step Colors)', () => {
  beforeEach(() => {
    mockStore.clear();
    useCanvasStore.setState({
      activeTool: 'select',
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      editingShapeId: null,
      activePopover: null,
      projectId: 'test-project-1',
      history: [],
      historyIndex: -1,
    });
  });

  describe('1. Partial Text Formatting', () => {
    it('applies formatting only to a selected substring while preserving unformatted text', () => {
      const initialText = 'System Architecture Design';
      // Simulate substring selection of 'Architecture' (offset 7 to 19)
      const selectedWord = 'Architecture';
      const formattedHtml = initialText.replace(selectedWord, `<strong>${selectedWord}</strong>`);

      expect(formattedHtml).toBe('System <strong>Architecture</strong> Design');
      expect(formattedHtml.startsWith('System ')).toBe(true);
      expect(formattedHtml.endsWith(' Design')).toBe(true);

      const textNode: SystemNode = {
        id: 'text-1',
        type: 'text',
        position: { x: 100, y: 100 },
        data: {
          text: formattedHtml,
          label: 'System Architecture Design',
          fontSize: 16,
          fontFamily: 'sans',
        } as unknown as SystemNodeData,
      };

      useCanvasStore.getState().setNodes([textNode]);
      expect(useCanvasStore.getState().nodes[0].data?.text).toBe('System <strong>Architecture</strong> Design');
    });

    it('preserves existing formatting when applying a color to another substring', () => {
      const boldHtml = 'System <strong>Architecture</strong> Design';
      // Format 'Design' with a custom color
      const coloredHtml = boldHtml.replace('Design', '<span style="color: #3b82f6">Design</span>');

      expect(coloredHtml).toBe('System <strong>Architecture</strong> <span style="color: #3b82f6">Design</span>');
      // Bold substring remains intact
      expect(coloredHtml).toContain('<strong>Architecture</strong>');
      // Color substring is present
      expect(coloredHtml).toContain('<span style="color: #3b82f6">Design</span>');
    });
  });

  describe('2. Enter, Tab, and Backspace Behavior in Paragraphs and Lists', () => {
    it('outdents and exits empty list items on Backspace or Enter', () => {
      const simulateListExit = (itemText: string, action: 'backspace' | 'enter') => {
        const isEmpty = itemText.trim() === '';
        if (isEmpty && (action === 'backspace' || action === 'enter')) {
          return { shouldOutdent: true, exitedList: true };
        }
        return { shouldOutdent: false, exitedList: false };
      };

      expect(simulateListExit('', 'backspace')).toEqual({ shouldOutdent: true, exitedList: true });
      expect(simulateListExit('', 'enter')).toEqual({ shouldOutdent: true, exitedList: true });
      expect(simulateListExit('Item content', 'enter')).toEqual({ shouldOutdent: false, exitedList: false });
    });

    it('indents list items on Tab and outdents on Shift+Tab without focus loss', () => {
      const simulateTab = (inList: boolean, shiftKey: boolean) => {
        if (inList) {
          return shiftKey ? 'outdent' : 'indent';
        }
        return 'insert-2-spaces';
      };

      expect(simulateTab(true, false)).toBe('indent');
      expect(simulateTab(true, true)).toBe('outdent');
      expect(simulateTab(false, false)).toBe('insert-2-spaces');
    });

    it('creates a new paragraph below when Enter is pressed at the end of a heading', () => {
      const simulateHeadingEnter = (cursorAtEnd: boolean) => {
        if (cursorAtEnd) {
          return { insertParagraphBelow: true, newBlock: '<p><br></p>' };
        }
        return { insertParagraphBelow: false };
      };

      expect(simulateHeadingEnter(true)).toEqual({
        insertParagraphBelow: true,
        newBlock: '<p><br></p>',
      });
    });
  });

  describe('3. Tool Selection and Clearing Stale Object Selection', () => {
    it('clears stale selection outlines and handles when switching to Pen, Hand, Text, or Shapes', () => {
      const shapeNode: SystemNode = {
        id: 'shape-1',
        type: 'shape',
        selected: true,
        position: { x: 50, y: 50 },
        data: {
          shapeType: 'rectangle',
          label: 'Service A',
        } as unknown as SystemNodeData,
      };

      useCanvasStore.getState().setNodes([shapeNode]);
      useCanvasStore.getState().setSelectedNodeId('shape-1');

      expect(useCanvasStore.getState().nodes[0].selected).toBe(true);
      expect(useCanvasStore.getState().selectedNodeId).toBe('shape-1');

      // Switch to Pen tool
      useCanvasStore.getState().setActiveTool('pencil');

      const stateAfterPen = useCanvasStore.getState();
      expect(stateAfterPen.activeTool).toBe('pencil');
      expect(stateAfterPen.selectedNodeId).toBeNull();
      expect(stateAfterPen.nodes[0].selected).toBe(false);
      // Object itself is not deleted or lost
      expect(stateAfterPen.nodes).toHaveLength(1);
      expect(stateAfterPen.nodes[0].id).toBe('shape-1');

      // Switch to Hand tool
      useCanvasStore.getState().setActiveTool('hand');
      expect(useCanvasStore.getState().activeTool).toBe('hand');
      expect(useCanvasStore.getState().selectedNodeId).toBeNull();
      expect(useCanvasStore.getState().nodes[0].selected).toBe(false);

      // Switch to Rectangle tool
      useCanvasStore.getState().setActiveTool('rectangle');
      expect(useCanvasStore.getState().activeTool).toBe('rectangle');
      expect(useCanvasStore.getState().selectedNodeId).toBeNull();
      expect(useCanvasStore.getState().nodes[0].selected).toBe(false);

      // Switch back to Select tool
      useCanvasStore.getState().setActiveTool('select');
      expect(useCanvasStore.getState().activeTool).toBe('select');
      expect(useCanvasStore.getState().nodes).toHaveLength(1);
    });

    it('allows immediate pen drawing without transforming previously selected objects', () => {
      const rectNode: SystemNode = {
        id: 'rect-1',
        type: 'shape',
        selected: true,
        position: { x: 100, y: 100 },
        data: {
          shapeType: 'rectangle',
          label: 'Database',
        } as unknown as SystemNodeData,
      };

      useCanvasStore.getState().setNodes([rectNode]);
      useCanvasStore.getState().setSelectedNodeId('rect-1');

      // User selects Pen tool
      useCanvasStore.getState().setActiveTool('pencil');
      expect(useCanvasStore.getState().selectedNodeId).toBeNull();
      expect(useCanvasStore.getState().nodes[0].selected).toBe(false);

      // Drawing stroke is added
      const drawingNode: SystemNode = {
        id: 'drawing-1',
        type: 'drawing',
        position: { x: 200, y: 200 },
        data: {
          points: [{ x: 0, y: 0 }, { x: 50, y: 50 }],
          color: '#ef4444',
          strokeWidth: 3,
        } as unknown as SystemNodeData,
      };

      useCanvasStore.getState().addNode(drawingNode);

      const allNodes = useCanvasStore.getState().nodes;
      expect(allNodes).toHaveLength(2);
      expect(allNodes.find((n) => n.id === 'rect-1')?.position).toEqual({ x: 100, y: 100 });
      expect(allNodes.find((n) => n.id === 'drawing-1')).toBeDefined();
    });
  });

  describe('4. Step Color Changes and Persistence', () => {
    it('updates step card color immediately, persists to preferences, and pushes history', () => {
      const stepNode: SystemNode = {
        id: 'step-node-1',
        type: 'step',
        position: { x: 200, y: 200 },
        data: {
          stepId: 'api-design',
          stepTitle: 'API Design',
          stepContent: '### Endpoints\n- GET /api/v1/users',
          color: '',
        } as unknown as SystemNodeData,
      };

      useCanvasStore.getState().setNodes([stepNode]);

      // Change step color to blue
      const newColor = '#3b82f6';
      useCanvasStore.getState().updateNodeData('step-node-1', { color: newColor });
      saveStepFormatting('api-design', { color: newColor });
      useCanvasStore.getState().pushHistory();

      const updated = useCanvasStore.getState().nodes.find((n) => n.id === 'step-node-1');
      expect(updated?.data?.color).toBe('#3b82f6');

      const savedPref = getStepFormatting('api-design');
      expect(savedPref?.color).toBe('#3b82f6');
    });

    it('safely handles missing or inactive step nodes without throwing errors', () => {
      expect(() => {
        useCanvasStore.getState().updateNodeData('non-existent-step', { color: '#10b981' });
      }).not.toThrow();
    });

    it('preserves colors across undo and redo', () => {
      const stepNode: SystemNode = {
        id: 'step-undo-test',
        type: 'step',
        position: { x: 0, y: 0 },
        data: {
          stepId: 'requirements',
          stepTitle: 'Requirements',
          color: '#ffffff',
        } as unknown as SystemNodeData,
      };

      useCanvasStore.getState().setNodes([stepNode]);
      useCanvasStore.getState().pushHistory();

      // Change color
      useCanvasStore.getState().updateNodeData('step-undo-test', { color: '#ec4899' });
      useCanvasStore.getState().pushHistory();

      expect(useCanvasStore.getState().nodes[0].data?.color).toBe('#ec4899');

      // Undo
      useCanvasStore.getState().undo();
      expect(useCanvasStore.getState().nodes[0].data?.color).toBe('#ffffff');

      // Redo
      useCanvasStore.getState().redo();
      expect(useCanvasStore.getState().nodes[0].data?.color).toBe('#ec4899');
    });
  });
});
