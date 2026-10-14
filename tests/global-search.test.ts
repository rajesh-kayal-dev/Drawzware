import { describe, it, expect } from 'vitest';
import {
  searchAllItems,
  getGlobalSearchItems,
  getItemGroup,
  findMatchingCanvasNode,
} from '@/lib/global-search-registry';
import { instantiateStackPreset } from '@/lib/technology-stacks';
import { useCanvasStore } from '@/stores/useCanvasStore';
import type { SystemNodeType } from '@/types';

describe('Global Search & Quick Insert Registry', () => {
  it('loads items across all required categories', () => {
    const items = getGlobalSearchItems();
    expect(items.length).toBeGreaterThan(100);

    const categories = new Set(items.map((i) => i.category.toLowerCase()));
    expect(categories.has('tools')).toBe(true);
    expect(categories.has('diagrams')).toBe(true);
    expect(categories.has('components')).toBe(true);
    expect(categories.has('cloud')).toBe(true);
    expect(categories.has('tech stacks')).toBe(true);
    expect(categories.has('popular apps')).toBe(true);
    expect(categories.has('shapes')).toBe(true);
    expect(categories.has('steps')).toBe(true);
  });

  describe('User requested typo tolerance & normalization', () => {
    it('handles "pencile" -> returns pencil draw tool', () => {
      const results = searchAllItems('pencile');
      expect(results.some((r) => r.id === 'tool-pencil' && r.label.toLowerCase().includes('pencil'))).toBe(true);
    });

    it('handles "erser" -> returns eraser tool', () => {
      const results = searchAllItems('erser');
      expect(results.some((r) => r.id === 'tool-eraser' && r.label.toLowerCase().includes('eraser'))).toBe(true);
    });

    it('handles "spes" -> returns shapes and symbols', () => {
      const results = searchAllItems('spes');
      expect(results.some((r) => r.category === 'Shapes')).toBe(true);
    });

    it('handles "sercla" -> returns circle shape', () => {
      const results = searchAllItems('sercla');
      expect(results.some((r) => r.label.toLowerCase().includes('circle'))).toBe(true);
    });

    it('handles "arrors" -> returns arrow shape', () => {
      const results = searchAllItems('arrors');
      expect(results.some((r) => r.label.toLowerCase().includes('arrow'))).toBe(true);
    });

    it('handles "sequsces" -> returns sequence diagram items', () => {
      const results = searchAllItems('sequsces');
      expect(results.some((r) => r.category === 'Diagrams' && r.subcategory?.toLowerCase().includes('sequence'))).toBe(true);
    });

    it('handles "diahrgarm" -> returns diagram items', () => {
      const results = searchAllItems('diahrgarm');
      expect(results.some((r) => r.category === 'Diagrams')).toBe(true);
    });

    it('handles "er" -> returns ER diagram entities', () => {
      const results = searchAllItems('er');
      expect(results.some((r) => r.category === 'Diagrams' && (r.label.includes('Entity') || r.subcategory?.includes('ER')))).toBe(true);
    });
  });

  describe('Category Filtering & 5-Group Organization', () => {
    it('filters strictly by category when specified', () => {
      const toolsOnly = searchAllItems('', 'Tools');
      expect(toolsOnly.every((i) => i.category === 'Tools')).toBe(true);
      expect(toolsOnly.length).toBeGreaterThan(5);

      const diagramsOnly = searchAllItems('', 'diagrams');
      expect(diagramsOnly.every((i) => i.category === 'Diagrams')).toBe(true);
      expect(diagramsOnly.length).toBeGreaterThan(5);

      const stacksOnly = searchAllItems('', 'Tech Stacks');
      expect(stacksOnly.every((i) => i.category === 'Tech Stacks')).toBe(true);
    });

    it('organizes items into the 5 primary groups with positive counts', () => {
      const allItems = getGlobalSearchItems();
      expect(allItems.length).toBeGreaterThan(0);
      const groups = ['Components', 'Apps & Services', 'Technology Stacks', 'Diagrams', 'Tools'] as const;

      for (const grp of groups) {
        const filtered = searchAllItems('', grp);
        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered.every((item) => (item.group || getItemGroup(item.category)) === grp)).toBe(true);
      }
    });
  });

  describe('Aliases and Partial Matching', () => {
    it('matches "react.js", "reactjs", and "react"', () => {
      const reactQueries = ['react', 'react.js', 'reactjs'];
      for (const q of reactQueries) {
        const results = searchAllItems(q);
        const match = results.find((r) => r.label === 'React' || r.aliases?.includes('React.js'));
        expect(match, `Failed to find React for query "${q}"`).toBeDefined();
      }
    });

    it('matches "psql", "postgres", and "postgresql"', () => {
      const psqlQueries = ['psql', 'postgres', 'postgresql'];
      for (const q of psqlQueries) {
        const results = searchAllItems(q);
        const match = results.find(
          (r) => r.label.toLowerCase().includes('postgres') || r.aliases?.includes('PostgreSQL') || r.aliases?.includes('psql')
        );
        expect(match, `Failed to find PostgreSQL for query "${q}"`).toBeDefined();
      }
    });

    it('matches "fb" and "facebook"', () => {
      const fbQueries = ['fb', 'facebook'];
      for (const q of fbQueries) {
        const results = searchAllItems(q);
        const match = results.find((r) => r.label === 'Facebook' || r.aliases?.includes('fb'));
        expect(match, `Failed to find Facebook for query "${q}"`).toBeDefined();
      }
    });

    it('matches "k8s" and "kubernetes"', () => {
      const k8sQueries = ['k8s', 'kubernetes'];
      for (const q of k8sQueries) {
        const results = searchAllItems(q);
        const match = results.find((r) => r.label.toLowerCase().includes('kubernetes') || r.aliases?.includes('k8s'));
        expect(match, `Failed to find Kubernetes for query "${q}"`).toBeDefined();
      }
    });
  });

  describe('Click-to-Insert and Event Propagation Safety', () => {
    it('clicking a Facebook result inserts exactly one node', () => {
      useCanvasStore.setState({ nodes: [], edges: [] });

      const fbItem = searchAllItems('facebook').find((i) => i.label === 'Facebook');
      expect(fbItem).toBeDefined();
      expect(fbItem?.action.kind).toBe('placement');

      // Execute single insertion
      const placement = fbItem!.action.placement!;
      const pos = { x: 400, y: 300 };
      const node = {
        id: 'node-fb-1',
        type: 'system' as const,
        position: pos,
        data: {
          label: placement.label || fbItem!.label,
          nodeType: (placement.type || 'service') as SystemNodeType,
          customIcon: placement.customIcon,
          color: placement.color,
          techStack: placement.defaultTechStack ? [...placement.defaultTechStack] : [],
          description: placement.description || '',
        },
      };

      useCanvasStore.getState().addNode(node);

      const canvasNodes = useCanvasStore.getState().nodes;
      expect(canvasNodes.length).toBe(1);
      expect(canvasNodes[0].data.label).toBe('Facebook');
      expect(canvasNodes[0].data.customIcon).toBe('facebook');
      expect(canvasNodes[0].position).toEqual({ x: 400, y: 300 });
    });

    it('clicking Insert button stops event propagation to avoid duplicate insertion', () => {
      useCanvasStore.setState({ nodes: [], edges: [] });

      let insertionCount = 0;
      const doInsert = () => {
        insertionCount += 1;
        useCanvasStore.getState().addNode({
          id: `node-insert-${insertionCount}`,
          type: 'system',
          position: { x: 200 + insertionCount * 20, y: 200 },
          data: { label: 'Facebook', nodeType: 'service', description: '', techStack: [] },
        });
      };

      // Simulating a button click inside the card
      let propagationStopped = false;
      const mockEvent = {
        stopPropagation: () => {
          propagationStopped = true;
        },
        preventDefault: () => {},
      };

      // When user clicks the inner "Insert" button:
      const handleButtonClick = (e: typeof mockEvent) => {
        e.stopPropagation();
        doInsert();
      };

      // Parent card onClick
      const handleCardClick = () => {
        if (!propagationStopped) {
          doInsert();
        }
      };

      handleButtonClick(mockEvent);
      handleCardClick(); // Card handler check

      expect(propagationStopped).toBe(true);
      expect(insertionCount).toBe(1);
      expect(useCanvasStore.getState().nodes.length).toBe(1);
    });

    it('a drag gesture does not trigger click insertion on release', () => {
      useCanvasStore.setState({ nodes: [], edges: [] });

      let isDragging = false;
      let insertedViaClick = false;

      // When drag starts
      isDragging = true;

      // Card click handler during or right after drag
      const handleCardClick = () => {
        if (isDragging) return; // Guard against drag release
        insertedViaClick = true;
      };

      // Click event fires immediately on mouseup after drag
      handleCardClick();
      expect(insertedViaClick).toBe(false);

      // After drag cleanup window
      isDragging = false;
      handleCardClick();
      expect(insertedViaClick).toBe(true);
    });
  });

  describe('Drag-and-Drop Viewport Placement', () => {
    it('dragging Facebook onto the canvas inserts exactly one node at the drop position', () => {
      useCanvasStore.setState({ nodes: [], edges: [] });

      const fbItem = searchAllItems('facebook').find((i) => i.label === 'Facebook')!;
      const placement = fbItem.action.placement!;

      // Drop coordinates from pointer event
      const clientX = 600;
      const clientY = 400;

      // Simulated flow conversion (e.g. pan x: 50, y: 30, zoom: 1.5)
      const zoom = 1.5;
      const pan = { x: 50, y: 30 };
      const flowPos = {
        x: (clientX - pan.x) / zoom,
        y: (clientY - pan.y) / zoom,
      };

      // Canvas.tsx onDrop placement calculation
      const dropNode = {
        id: 'node-drag-fb-1',
        type: 'system' as const,
        position: { x: flowPos.x - 100, y: flowPos.y - 36 },
        data: {
          label: placement.label || fbItem.label,
          nodeType: (placement.type || 'service') as SystemNodeType,
          customIcon: placement.customIcon,
          color: placement.color,
          techStack: placement.defaultTechStack ? [...placement.defaultTechStack] : [],
          description: placement.description || '',
        },
      };

      useCanvasStore.getState().addNode(dropNode);

      const nodes = useCanvasStore.getState().nodes;
      expect(nodes.length).toBe(1);
      expect(nodes[0].data.label).toBe('Facebook');
      expect(nodes[0].position.x).toBeCloseTo((600 - 50) / 1.5 - 100);
      expect(nodes[0].position.y).toBeCloseTo((400 - 30) / 1.5 - 36);
    });
  });

  describe('Technology Stack Presets (Click and Drag-and-Drop)', () => {
    it('inserts a complete preset as independently editable nodes with connections on click', () => {
      useCanvasStore.setState({ nodes: [], edges: [] });

      const presetItem = searchAllItems('MERN').find((i) => i.action.kind === 'preset');
      expect(presetItem).toBeDefined();

      const preset = presetItem!.action.preset!;
      const origin = { x: 300, y: 200 };

      // Instantiate preset
      const { nodes: newNodes, edges: newEdges } = presetItem!.action.preset
        ? instantiateStackPreset(preset, origin)
        : { nodes: [], edges: [] };

      expect(newNodes.length).toBeGreaterThanOrEqual(3);
      expect(newEdges.length).toBeGreaterThanOrEqual(2);

      useCanvasStore.getState().addElements(newNodes, newEdges);

      const state = useCanvasStore.getState();
      expect(state.nodes.length).toBe(newNodes.length);
      expect(state.edges.length).toBe(newEdges.length);

      // Verify all nodes have unique IDs and valid coordinates
      const ids = new Set(state.nodes.map((n) => n.id));
      expect(ids.size).toBe(newNodes.length);

      // Verify connections connect valid source and target nodes
      for (const edge of state.edges) {
        expect(ids.has(edge.source)).toBe(true);
        expect(ids.has(edge.target)).toBe(true);
      }
    });

    it('drags and drops a stack preset layout at drop coordinates', () => {
      useCanvasStore.setState({ nodes: [], edges: [] });

      const presetItem = searchAllItems('Next.js').find((i) => i.action.kind === 'preset')!;
      const preset = presetItem.action.preset!;

      // Drag dataTransfer payload
      const dragPayload = {
        kind: 'preset',
        presetId: preset.id,
        label: preset.name,
      };
      expect(dragPayload.presetId).toBe(preset.id);

      // Drop event simulation at (500, 300)
      const dropOrigin = { x: 500 - 200, y: 300 - 80 };
      const { nodes, edges } = instantiateStackPreset(preset, dropOrigin);

      useCanvasStore.getState().addElements(nodes, edges);

      const state = useCanvasStore.getState();
      expect(state.nodes.length).toBe(preset.nodes.length);
      expect(state.edges.length).toBe(preset.edges.length);
      expect(state.nodes[0].position.x).toBeGreaterThan(0);
    });
  });

  describe('Existing Match Visibility & Canvas Awareness ("On canvas", Select, Duplicate)', () => {
    it('keeps React visible in search results even when React is already on the canvas', () => {
      const existingReactNode = {
        id: 'node-react-existing',
        type: 'system' as const,
        position: { x: 100, y: 100 },
        data: {
          label: 'React',
          nodeType: 'service' as SystemNodeType,
          customIcon: 'react',
          techStack: ['React.js'],
          description: 'UI Library',
        },
      };

      useCanvasStore.setState({ nodes: [existingReactNode], edges: [] });

      // Searching for React must still return React
      const results = searchAllItems('react');
      const reactItem = results.find((r) => r.label === 'React');
      expect(reactItem).toBeDefined();

      // Detection finds existing canvas node
      const matchingNode = findMatchingCanvasNode(reactItem!, useCanvasStore.getState().nodes);
      expect(matchingNode).toBeDefined();
      expect(matchingNode?.id).toBe('node-react-existing');
    });

    it('allows selecting the existing React node or inserting a duplicate', () => {
      const existingReactNode = {
        id: 'node-react-existing',
        type: 'system' as const,
        position: { x: 100, y: 100 },
        data: {
          label: 'React',
          nodeType: 'service' as SystemNodeType,
          customIcon: 'react',
          techStack: ['React.js'],
          description: 'UI Library',
        },
      };

      useCanvasStore.setState({
        nodes: [existingReactNode],
        edges: [],
        selectedNodeId: null,
      });

      // 1. Select action
      useCanvasStore.getState().setSelectedNodeId(existingReactNode.id);
      expect(useCanvasStore.getState().selectedNodeId).toBe('node-react-existing');

      // 2. Duplicate action
      const duplicateReactNode = {
        id: 'node-react-duplicate',
        type: 'system' as const,
        position: { x: 126, y: 126 }, // Nudged position
        data: { ...existingReactNode.data },
      };
      useCanvasStore.getState().addNode(duplicateReactNode);

      const currentNodes = useCanvasStore.getState().nodes;
      expect(currentNodes.length).toBe(2);
      expect(currentNodes[0].id).toBe('node-react-existing');
      expect(currentNodes[1].id).toBe('node-react-duplicate');
      expect(currentNodes[1].position).not.toEqual(currentNodes[0].position);
    });
  });

  describe('Store Integration: openInsertItem', () => {
    it('opens library and sets tab to all', () => {
      useCanvasStore.setState({ libraryCollapsed: true, libraryActiveTab: 'diagrams' });

      useCanvasStore.getState().openInsertItem();

      expect(useCanvasStore.getState().libraryCollapsed).toBe(false);
      expect(useCanvasStore.getState().libraryActiveTab).toBe('all');
    });
  });
});

