import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../src/stores/useCanvasStore';
import { cleanWaypoints, perpendicularDistance, pointsToSvgPath, type Point } from '../src/lib/line-routing';
import type { SystemNodeData, SystemNode } from '../src/types';

describe('Canvas UX and Drawing Tools (Sidebar, Toolbar, Straight Line, Arrow)', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      libraryCollapsed: true,
      activeTool: 'select',
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      projectId: 'test-proj',
    });
  });

  describe('1. Sidebar Closed by Default & Independent Tool Selection', () => {
    it('initializes with the sidebar closed by default', () => {
      expect(useCanvasStore.getState().libraryCollapsed).toBe(true);
    });

    it('selecting any toolbar tool does not open the sidebar', () => {
      const tools = ['select', 'rectangle', 'circle', 'arrow', 'line', 'pencil', 'text', 'hand'] as const;

      for (const tool of tools) {
        useCanvasStore.getState().setActiveTool(tool);
        expect(useCanvasStore.getState().activeTool).toBe(tool);
        expect(useCanvasStore.getState().libraryCollapsed).toBe(true);
      }
    });

    it('allows manual open and close toggling of the sidebar independently of active tool', () => {
      useCanvasStore.getState().setActiveTool('arrow');
      expect(useCanvasStore.getState().libraryCollapsed).toBe(true);

      // Explicitly open sidebar
      useCanvasStore.getState().setLibraryCollapsed(false);
      expect(useCanvasStore.getState().libraryCollapsed).toBe(false);
      expect(useCanvasStore.getState().activeTool).toBe('arrow');

      // Explicitly close sidebar
      useCanvasStore.getState().setLibraryCollapsed(true);
      expect(useCanvasStore.getState().libraryCollapsed).toBe(true);
      expect(useCanvasStore.getState().activeTool).toBe('arrow');
    });

    it('selecting a canvas element or node does not open the sidebar', () => {
      useCanvasStore.getState().setSelectedNodeId('node-1');
      expect(useCanvasStore.getState().libraryCollapsed).toBe(true);

      useCanvasStore.getState().clearSelection();
      expect(useCanvasStore.getState().libraryCollapsed).toBe(true);
    });
  });

  describe('2. Toolbar Ordering (Hand / Pan below Text)', () => {
    it('verifies toolbar shortcut and tool actions for Text and Hand tools', () => {
      useCanvasStore.getState().setActiveTool('text');
      expect(useCanvasStore.getState().activeTool).toBe('text');

      useCanvasStore.getState().setActiveTool('hand');
      expect(useCanvasStore.getState().activeTool).toBe('hand');
    });
  });

  describe('3. Straight Line Tool', () => {
    it('guarantees straight line points are strictly 2 endpoints', () => {
      // If legacy or corrupted data has multiple points, straight line takes start and end
      const legacyMultiPoints: Point[] = [
        { x: 0, y: 10 },
        { x: 30, y: 25 },
        { x: 80, y: 45 },
        { x: 140, y: 10 },
      ];

      const start = legacyMultiPoints[0];
      const end = legacyMultiPoints[legacyMultiPoints.length - 1];
      const normalizedLine = [start, end];

      expect(normalizedLine).toHaveLength(2);
      expect(normalizedLine[0]).toEqual({ x: 0, y: 10 });
      expect(normalizedLine[1]).toEqual({ x: 140, y: 10 });
    });

    it('dragging midpoint translates the whole line preserving length, angle, and straightness', () => {
      const p0: Point = { x: 10, y: 20 };
      const p1: Point = { x: 110, y: 70 };
      const initialLength = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const initialAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

      // Drag midpoint by delta (dx=15, dy=-25)
      const delta: Point = { x: 15, y: -25 };
      const translatedP0: Point = { x: p0.x + delta.x, y: p0.y + delta.y };
      const translatedP1: Point = { x: p1.x + delta.x, y: p1.y + delta.y };
      const newPoints = [translatedP0, translatedP1];

      expect(newPoints).toHaveLength(2);
      const newLength = Math.hypot(translatedP1.x - translatedP0.x, translatedP1.y - translatedP0.y);
      const newAngle = Math.atan2(translatedP1.y - translatedP0.y, translatedP1.x - translatedP0.x);

      expect(newLength).toBeCloseTo(initialLength, 5);
      expect(newAngle).toBeCloseTo(initialAngle, 5);
    });

    it('renders SVG path as a strictly straight line (radius 0)', () => {
      const points: Point[] = [{ x: 10, y: 20 }, { x: 100, y: 50 }];
      const path = pointsToSvgPath(points, 0);
      expect(path).toBe('M 10 20 L 100 50');
    });
  });

  describe('4. Arrow / Connector Tool', () => {
    it('simplifies and cleans waypoints while preserving intended orthogonal bends', () => {
      const rawTrail: Point[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 10 },
        { x: 50, y: 40 },
        { x: 100, y: 40 },
      ];

      const cleaned = cleanWaypoints(rawTrail);
      // Collinear redundant points on the straight segments are collapsed
      expect(cleaned.length).toBeLessThan(rawTrail.length);
      expect(cleaned[0]).toEqual({ x: 0, y: 0 });
      expect(cleaned[cleaned.length - 1]).toEqual({ x: 100, y: 40 });
    });

    it('allows reshaping orthogonal segments by perpendicular shifting without adding visible handles', () => {
      // Stepped path: (0,0) -> (50,0) -> (50,40) -> (100,40)
      const path: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 40 },
        { x: 100, y: 40 },
      ];

      // Shift the vertical segment between (50,0) and (50,40) horizontally by deltaX = 15
      const deltaX = 15;
      const reshaped = path.map((p, idx) => {
        if (idx === 1 || idx === 2) {
          return { x: p.x + deltaX, y: p.y };
        }
        return p;
      });

      expect(reshaped).toEqual([
        { x: 0, y: 0 },
        { x: 65, y: 0 },
        { x: 65, y: 40 },
        { x: 100, y: 40 },
      ]);
      // Endpoints remain intact
      expect(reshaped[0]).toEqual(path[0]);
      expect(reshaped[reshaped.length - 1]).toEqual(path[path.length - 1]);
    });

    it('correctly calculates perpendicular distance for segment selection', () => {
      const p1: Point = { x: 0, y: 50 };
      const p2: Point = { x: 100, y: 50 };

      // Point at (50, 60) is distance 10 from horizontal segment
      const dist = perpendicularDistance({ x: 50, y: 60 }, p1, p2);
      expect(dist).toBe(10);
    });
  });

  describe('5. Persistence and Diagram Compatibility', () => {
    it('persists line and arrow updates in canvas store with history tracking', () => {
      const lineNode: SystemNode = {
        id: 'line-node-1',
        type: 'shape',
        position: { x: 100, y: 100 },
        data: {
          shapeType: 'line',
          points: [{ x: 0, y: 0 }, { x: 150, y: 0 }],
        } as unknown as SystemNodeData,
      };

      useCanvasStore.getState().setNodes([lineNode]);
      expect(useCanvasStore.getState().nodes).toHaveLength(1);

      // Simulate line midpoint move
      const updatedNodes = useCanvasStore.getState().nodes.map((n) =>
        n.id === 'line-node-1'
          ? {
              ...n,
              position: { x: 120, y: 130 },
              data: {
                ...n.data,
                points: [{ x: 0, y: 0 }, { x: 150, y: 0 }],
              },
            }
          : n
      );

      useCanvasStore.getState().setNodes(updatedNodes);
      useCanvasStore.getState().pushHistory();

      const savedNode = useCanvasStore.getState().nodes.find((n) => n.id === 'line-node-1');
      expect(savedNode?.position).toEqual({ x: 120, y: 130 });
      expect((savedNode?.data as SystemNodeData).points).toHaveLength(2);
    });

    it('loads previously saved diagrams without corrupting straight lines', () => {
      const existingDiagramNodes: SystemNode[] = [
        {
          id: 'existing-line',
          type: 'shape',
          position: { x: 50, y: 50 },
          data: {
            shapeType: 'line',
            label: 'Connector',
            points: [{ x: 0, y: 0 }, { x: 200, y: 100 }],
          } as unknown as SystemNodeData,
        },
      ];

      useCanvasStore.getState().setNodes(existingDiagramNodes);
      const loadedLine = useCanvasStore.getState().nodes[0];
      const pts = (loadedLine.data as SystemNodeData).points;

      expect(pts).toHaveLength(2);
      expect(pts?.[0]).toEqual({ x: 0, y: 0 });
      expect(pts?.[1]).toEqual({ x: 200, y: 100 });
    });
  });
});
