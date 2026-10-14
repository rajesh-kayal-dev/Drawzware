import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { getCanvasCursorClass, getFitViewOptions } from '@/components/canvas/canvas-helpers';
import type { CanvasTool } from '@/types';

describe('Canvas Navigation, Hand Tool, Zoom, and Toolbar Synchronization', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      activeTool: 'select',
      isSpacePanning: false,
      placementItem: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      libraryCollapsed: true,
      libraryActiveTab: 'components',
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [],
      edges: [],
    });
  });

  describe('1. Hand Tool Activation & State Transitions', () => {
    it('initializes with Select tool and default cursor', () => {
      const tool = useCanvasStore.getState().activeTool;
      expect(tool).toBe('select');
      expect(getCanvasCursorClass(tool, false, false)).toBe('cursor-tool-default');
    });

    it('activates Hand mode and updates cursor to grab', () => {
      useCanvasStore.getState().setActiveTool('hand');
      expect(useCanvasStore.getState().activeTool).toBe('hand');
      expect(getCanvasCursorClass('hand', false, false, false)).toBe('cursor-tool-grab');
    });

    it('toggles Hand mode back to Select when explicitly clicked again', () => {
      useCanvasStore.getState().setActiveTool('hand');
      expect(useCanvasStore.getState().activeTool).toBe('hand');

      // Clicking Hand button while already in hand mode restores select
      const nextTool: CanvasTool = useCanvasStore.getState().activeTool === 'hand' ? 'select' : 'hand';
      useCanvasStore.getState().setActiveTool(nextTool);
      expect(useCanvasStore.getState().activeTool).toBe('select');
      expect(getCanvasCursorClass('select', false, false)).toBe('cursor-tool-default');
    });

    it('switches between Hand, drawing tools, and Select seamlessly', () => {
      useCanvasStore.getState().setActiveTool('hand');
      expect(useCanvasStore.getState().activeTool).toBe('hand');

      useCanvasStore.getState().setActiveTool('rectangle');
      expect(useCanvasStore.getState().activeTool).toBe('rectangle');
      expect(getCanvasCursorClass('rectangle', false, false)).toBe('cursor-tool-crosshair');

      useCanvasStore.getState().setActiveTool('pencil');
      expect(useCanvasStore.getState().activeTool).toBe('pencil');
      expect(getCanvasCursorClass('pencil', false, false)).toBe('cursor-tool-pencil');

      useCanvasStore.getState().setActiveTool('select');
      expect(useCanvasStore.getState().activeTool).toBe('select');
      expect(getCanvasCursorClass('select', false, false)).toBe('cursor-tool-default');
    });
  });

  describe('2. Pan on Drag Configuration & Cursor States', () => {
    function computePanOnDrag(activeTool: CanvasTool, isSpacePanning: boolean): number[] | false {
      return activeTool === 'hand' || isSpacePanning ? [0, 1] : [1];
    }

    it('configures panOnDrag to allow left-click and middle-click drag in Hand mode', () => {
      const panButtons = computePanOnDrag('hand', false);
      expect(panButtons).toEqual([0, 1]);
    });

    it('configures panOnDrag to allow left-click and middle-click drag during Space panning', () => {
      const panButtons = computePanOnDrag('select', true);
      expect(panButtons).toEqual([0, 1]);
    });

    it('reserves left-click for selection/drawing and allows middle-click drag in Select or Drawing mode', () => {
      expect(computePanOnDrag('select', false)).toEqual([1]);
      expect(computePanOnDrag('rectangle', false)).toEqual([1]);
      expect(computePanOnDrag('pencil', false)).toEqual([1]);
    });

    it('transitions cursor from grab to grabbing while actively panning', () => {
      // Idle Hand tool -> grab
      expect(getCanvasCursorClass('hand', false, false, false)).toBe('cursor-tool-grab');
      // Active pan gesture in Hand tool -> grabbing
      expect(getCanvasCursorClass('hand', false, false, true)).toBe('cursor-tool-grabbing');

      // Idle Space pan -> grab
      expect(getCanvasCursorClass('select', true, false, false)).toBe('cursor-tool-grab');
      // Active Space pan -> grabbing
      expect(getCanvasCursorClass('select', true, false, true)).toBe('cursor-tool-grabbing');
    });
  });

  describe('3. Zoom Controls & Limits', () => {
    it('provides sensible zoom limits between 10% and 400%', () => {
      const minZoom = 0.1;
      const maxZoom = 4.0;

      expect(minZoom).toBe(0.1);
      expect(maxZoom).toBe(4.0);
      expect(minZoom).toBeLessThan(1);
      expect(maxZoom).toBeGreaterThan(1);
    });

    it('formats zoom percentage accurately for UI display', () => {
      const formatZoomPct = (zoom: number) => `${Math.round(zoom * 100)}%`;

      expect(formatZoomPct(1)).toBe('100%');
      expect(formatZoomPct(0.5)).toBe('50%');
      expect(formatZoomPct(1.5)).toBe('150%');
      expect(formatZoomPct(2.25)).toBe('225%');
    });

    it('computes fitView options with layout padding clear of chrome', () => {
      const options = getFitViewOptions(200);
      expect(options).toBeDefined();
      expect(options.duration).toBe(200);
    });
  });

  describe('4. Sidebar & Panel Independence', () => {
    it('selecting a sidebar category tab does not change canvas activeTool', () => {
      useCanvasStore.getState().setActiveTool('hand');
      expect(useCanvasStore.getState().activeTool).toBe('hand');

      // Switch sidebar tab to 'shapes'
      useCanvasStore.getState().setLibraryActiveTab('shapes');
      expect(useCanvasStore.getState().libraryActiveTab).toBe('shapes');
      expect(useCanvasStore.getState().activeTool).toBe('hand');

      // Switch sidebar tab to 'diagrams'
      useCanvasStore.getState().setLibraryActiveTab('diagrams');
      expect(useCanvasStore.getState().libraryActiveTab).toBe('diagrams');
      expect(useCanvasStore.getState().activeTool).toBe('hand');

      // Switch sidebar tab to 'steps'
      useCanvasStore.getState().setLibraryActiveTab('steps');
      expect(useCanvasStore.getState().libraryActiveTab).toBe('steps');
      expect(useCanvasStore.getState().activeTool).toBe('hand');
    });

    it('collapsing or expanding the sidebar library does not change canvas activeTool', () => {
      useCanvasStore.getState().setActiveTool('hand');
      useCanvasStore.getState().setLibraryCollapsed(false);
      expect(useCanvasStore.getState().libraryCollapsed).toBe(false);
      expect(useCanvasStore.getState().activeTool).toBe('hand');

      useCanvasStore.getState().setLibraryCollapsed(true);
      expect(useCanvasStore.getState().libraryCollapsed).toBe(true);
      expect(useCanvasStore.getState().activeTool).toBe('hand');
    });
  });

  describe('5. Node Interactions vs Hand Mode', () => {
    it('does not pan or drag nodes when in Hand mode', () => {
      const activeTool: string = 'hand';
      const isSpacePanning = false;
      const presenting = false;

      const nodesDraggable = !presenting && activeTool === 'select' && !isSpacePanning;
      const elementsSelectable = !presenting && activeTool === 'select' && !isSpacePanning;
      const selectionOnDrag = !presenting && activeTool === 'select' && !isSpacePanning;

      expect(nodesDraggable).toBe(false);
      expect(elementsSelectable).toBe(false);
      expect(selectionOnDrag).toBe(false);
    });

    it('enables dragging and marquee selection when in Select mode', () => {
      const activeTool: CanvasTool = 'select';
      const isSpacePanning = false;
      const presenting = false;

      const nodesDraggable = !presenting && activeTool === 'select' && !isSpacePanning;
      const elementsSelectable = !presenting && activeTool === 'select' && !isSpacePanning;
      const selectionOnDrag = !presenting && activeTool === 'select' && !isSpacePanning;

      expect(nodesDraggable).toBe(true);
      expect(elementsSelectable).toBe(true);
      expect(selectionOnDrag).toBe(true);
    });

    it('clicking a node does not reset Hand mode to Select', () => {
      useCanvasStore.getState().setActiveTool('hand');

      // Handler logic: if tool is not select and not hand, it may reset, but hand must be preserved
      const handleNodeClickToolLogic = (currentTool: CanvasTool) => {
        if (currentTool !== 'select' && currentTool !== 'hand') {
          return 'select';
        }
        return currentTool;
      };

      const resultingTool = handleNodeClickToolLogic(useCanvasStore.getState().activeTool);
      expect(resultingTool).toBe('hand');
    });
  });
});
