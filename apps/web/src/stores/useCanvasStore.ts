import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Viewport,
} from '@xyflow/react';
import type { SystemNode, SystemEdge, SystemNodeData, SystemEdgeData, CanvasTool, PlacementItem, DrawingFormatting, DiagramType, LibraryTab } from '@/types';
import { getInitialSequenceDiagram, getInitialERDiagram } from '@/lib/diagram-templates';

interface HistoryEntry {
  nodes: SystemNode[];
  edges: SystemEdge[];
}

interface PendingEdge {
  edgeId: string;
  position: { x: number; y: number };
}

export type SaveStatus = 'saved' | 'saving' | 'error';

export interface PresentationState {
  active: boolean;
  /** Index into the BFS node order computed by the presentation overlay. */
  index: number;
}

const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 72;

function nodeSize(node: SystemNode) {
  const styleW = typeof node.style?.width === 'number' ? node.style.width : undefined;
  const styleH = typeof node.style?.height === 'number' ? node.style.height : undefined;
  return {
    width: node.measured?.width ?? node.width ?? styleW ?? DEFAULT_NODE_WIDTH,
    height: node.measured?.height ?? node.height ?? styleH ?? DEFAULT_NODE_HEIGHT,
  };
}

/**
 * Swap a handle id's role when reversing an edge without generating invalid handle IDs:
 * - "right-source" <-> "right-target"
 * - ER Table: "handle-right-${colId}" <-> "handle-right-tgt-${colId}"
 * - Sequence diagram: "left-in-${i}" <-> "left-out-${i}"
 * - Preserves existing custom handle IDs as safe fallbacks rather than breaking endpoints.
 */
function flipHandle(handle: string | null | undefined, targetRole: 'source' | 'target') {
  if (!handle) return handle;

  // 1. Standard cardinal handles: top-source <-> top-target, etc.
  if (handle.endsWith('-source') && targetRole === 'target') {
    return handle.replace(/-source$/, '-target');
  }
  if (handle.endsWith('-target') && targetRole === 'source') {
    return handle.replace(/-target$/, '-source');
  }

  // 2. ER Table column handles: handle-right-${colId} <-> handle-right-tgt-${colId}
  if (handle.includes('-tgt-') && targetRole === 'source') {
    return handle.replace('-tgt-', '-');
  }
  if (handle.startsWith('handle-') && !handle.includes('-tgt-') && targetRole === 'target') {
    return handle.replace(/^handle-([a-z]+)-/, 'handle-$1-tgt-');
  }

  // 3. Sequence diagram handles: left-in-${i} <-> left-out-${i}, right-in-${i} <-> right-out-${i}
  if (handle.includes('-in-') && targetRole === 'source') {
    return handle.replace('-in-', '-out-');
  }
  if (handle.includes('-out-') && targetRole === 'target') {
    return handle.replace('-out-', '-in-');
  }

  // 4. Safe fallback: keep the handle ID intact if no alternate pair exists
  return handle;
}

export interface ActivePopover {
  type: 'edge-protocol';
  id: string;
}

interface CanvasStore {
  // State
  nodes: SystemNode[];
  edges: SystemEdge[];
  viewport: Viewport;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  projectId: string | null;

  // Diagram mode and multi-diagram separation
  diagramType: DiagramType;
  diagramData: Record<DiagramType, { nodes: SystemNode[]; edges: SystemEdge[] }>;
  setDiagramType: (type: DiagramType) => void;

  // Contextual popover state (independent from selection)
  activePopover: ActivePopover | null;
  setActivePopover: (popover: ActivePopover | null) => void;
  closePopover: () => void;

  // Pending edge type selection (right after connecting)
  pendingEdge: PendingEdge | null;
  setPendingEdge: (pending: PendingEdge | null) => void;

  // Undo/redo
  history: HistoryEntry[];
  historyIndex: number;

  // Clipboard
  clipboard: { nodes: SystemNode[]; edges: SystemEdge[] } | null;

  // Chrome
  libraryCollapsed: boolean;
  setLibraryCollapsed: (collapsed: boolean) => void;
  toggleLibrary: () => void;
  libraryActiveTab: LibraryTab;
  setLibraryActiveTab: (tab: LibraryTab) => void;
  openInsertItem: () => void;
  commandMenuOpen: boolean;
  setCommandMenuOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  exportOpen: boolean;
  setExportOpen: (open: boolean) => void;
  shareOpen: boolean;
  setShareOpen: (open: boolean) => void;

  // Presentation mode
  presentation: PresentationState;
  startPresentation: () => void;
  stopPresentation: () => void;
  setPresentationIndex: (index: number) => void;

  // Save status
  saveStatus: SaveStatus;
  setSaveStatus: (status: SaveStatus) => void;

  // Active canvas tool
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
  placementItem: PlacementItem | null;
  setPlacementItem: (item: PlacementItem | null) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  eraserRadius: number;
  setEraserRadius: (radius: number) => void;
  isSpacePanning: boolean;
  setIsSpacePanning: (panning: boolean) => void;
  eraseDrawingNodes: (ids: string[]) => void;
  eraseElements: (nodeIds: string[], edgeIds: string[]) => void;
  applyEraseBatch: (updatedNodes: SystemNode[], deletedNodeIds: string[], deletedEdgeIds: string[]) => void;

  // Text formatting defaults (remembers last used settings)
  lastTextFormatting: {
    fontSize: number;
    fontFamily: string;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    align: 'left' | 'center' | 'right';
  };
  setLastTextFormatting: (formatting: Partial<CanvasStore['lastTextFormatting']>) => void;

  lastDrawingFormatting: DrawingFormatting;
  setLastDrawingFormatting: (formatting: Partial<DrawingFormatting>) => void;

  // Actions
  initCanvas: (
    projectId: string,
    nodes: SystemNode[],
    edges: SystemEdge[],
    viewport: Viewport,
    initialDiagramType?: DiagramType,
    initialDiagramData?: Record<DiagramType, { nodes: SystemNode[]; edges: SystemEdge[] }>
  ) => void;
  onNodesChange: (changes: NodeChange<SystemNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<SystemEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: SystemNode) => void;
  addElements: (nodes: SystemNode[], edges?: SystemEdge[]) => void;
  updateNodeData: (nodeId: string, data: Partial<SystemNodeData>) => void;
  updateEdgeData: (edgeId: string, data: Partial<SystemEdgeData>) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  deleteElements: (nodeIds: string[], edgeIds: string[]) => void;
  clearSelection: () => void;
  reverseEdge: (edgeId: string) => void;
  setViewport: (viewport: Viewport) => void;
  editingShapeId: string | null;
  setEditingShapeId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  copySelection: () => void;
  pasteSelection: () => void;
  deleteSelection: () => void;
  selectAll: () => void;
  /** Duplicate the given nodes (default: current selection) plus edges between them. */
  duplicateNodes: (ids?: string[]) => void;
  /** Wrap the selected nodes in a new group node. */
  groupSelection: () => void;
  /** Line up the selected nodes along their dominant axis. */
  alignSelection: () => void;
  toggleLock: (ids: string[]) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  setNodes: (nodes: SystemNode[]) => void;
  setEdges: (edges: SystemEdge[]) => void;
  pushHistory: () => void;
}

function loadInitialTextFormatting() {
  if (typeof window === 'undefined') {
    return {
      fontSize: 16,
      fontFamily: 'sans',
      color: 'var(--ink)',
      bold: false,
      italic: false,
      underline: false,
      align: 'left' as const,
    };
  }
  try {
    const raw = localStorage.getItem('sysdesign_last_text_formatting');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : 16,
        fontFamily: typeof parsed.fontFamily === 'string' ? parsed.fontFamily : 'sans',
        color: typeof parsed.color === 'string' ? parsed.color : 'var(--ink)',
        bold: Boolean(parsed.bold),
        italic: Boolean(parsed.italic),
        underline: Boolean(parsed.underline),
        align: parsed.align === 'center' || parsed.align === 'right' ? (parsed.align as 'center' | 'right') : ('left' as const),
      };
    }
  } catch {
    // fallback
  }
  return {
    fontSize: 16,
    fontFamily: 'sans',
    color: 'var(--ink)',
    bold: false,
    italic: false,
    underline: false,
    align: 'left' as const,
  };
}

function loadInitialDrawingFormatting(): DrawingFormatting {
  if (typeof window === 'undefined') {
    return {
      strokeColor: '#3b82f6',
      strokeWidth: 2.5,
      strokeStyle: 'solid',
      fillColor: 'transparent',
      arrowStart: false,
      arrowEnd: true,
    };
  }
  try {
    const raw = localStorage.getItem('sysdesign_last_drawing_formatting');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        strokeColor: typeof parsed.strokeColor === 'string' ? parsed.strokeColor : '#3b82f6',
        strokeWidth: typeof parsed.strokeWidth === 'number' ? parsed.strokeWidth : 2.5,
        strokeStyle: parsed.strokeStyle === 'dashed' || parsed.strokeStyle === 'dotted' ? parsed.strokeStyle : 'solid',
        fillColor: typeof parsed.fillColor === 'string' ? parsed.fillColor : 'transparent',
        arrowStart: Boolean(parsed.arrowStart),
        arrowEnd: parsed.arrowEnd !== undefined ? Boolean(parsed.arrowEnd) : true,
      };
    }
  } catch {
    // fallback
  }
  return {
    strokeColor: '#3b82f6',
    strokeWidth: 2.5,
    strokeStyle: 'solid',
    fillColor: 'transparent',
    arrowStart: false,
    arrowEnd: true,
  };
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  lastTextFormatting: loadInitialTextFormatting(),
  setLastTextFormatting: (formatting) => {
    set((state) => {
      const updated = { ...state.lastTextFormatting, ...formatting };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sysdesign_last_text_formatting', JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return { lastTextFormatting: updated };
    });
  },
  lastDrawingFormatting: loadInitialDrawingFormatting(),
  setLastDrawingFormatting: (formatting) => {
    set((state) => {
      const updated = { ...state.lastDrawingFormatting, ...formatting };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sysdesign_last_drawing_formatting', JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return { lastDrawingFormatting: updated };
    });
  },
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeId: null,
  selectedEdgeId: null,
  activePopover: null,
  setActivePopover: (activePopover) => set({ activePopover }),
  closePopover: () => set({ activePopover: null }),
  projectId: null,
  diagramType: 'architecture',
  diagramData: {
    architecture: { nodes: [], edges: [] },
    sequence: { nodes: [], edges: [] },
    er: { nodes: [], edges: [] },
  },
  setDiagramType: (newType: DiagramType) => {
    const current = get().diagramType;
    if (current === newType) return;
    const currentNodes = get().nodes;
    const currentEdges = get().edges;

    const prevDiagrams = {
      ...get().diagramData,
      [current]: { nodes: currentNodes, edges: currentEdges },
    };

    let next = prevDiagrams[newType];
    if (!next || next.nodes.length === 0) {
      if (newType === 'sequence') {
        next = getInitialSequenceDiagram();
      } else if (newType === 'er') {
        next = getInitialERDiagram();
      } else {
        next = next || { nodes: [], edges: [] };
      }
    }

    set({
      diagramType: newType,
      diagramData: {
        ...prevDiagrams,
        [newType]: next,
      },
      nodes: next.nodes,
      edges: next.edges,
      history: [{ nodes: next.nodes, edges: next.edges }],
      historyIndex: 0,
      selectedNodeId: null,
      selectedEdgeId: null,
      activePopover: null,
    });
  },
  history: [],
  historyIndex: -1,
  clipboard: null,
  pendingEdge: null,
  setPendingEdge: (pending) => set({ pendingEdge: pending }),

  libraryCollapsed: true,
  setLibraryCollapsed: (libraryCollapsed) => set({ libraryCollapsed }),
  toggleLibrary: () => set((state) => ({ libraryCollapsed: !state.libraryCollapsed })),
  libraryActiveTab: 'diagrams',
  setLibraryActiveTab: (libraryActiveTab) => set({ libraryActiveTab }),
  openInsertItem: () =>
    set((state) => {
      if (state.libraryActiveTab === 'all' && !state.libraryCollapsed) {
        return { libraryCollapsed: true };
      }
      return { libraryActiveTab: 'all', libraryCollapsed: false };
    }),
  commandMenuOpen: false,
  setCommandMenuOpen: (commandMenuOpen) => set({ commandMenuOpen }),
  shortcutsOpen: false,
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  exportOpen: false,
  setExportOpen: (exportOpen) => set({ exportOpen }),
  shareOpen: false,
  setShareOpen: (shareOpen) => set({ shareOpen }),

  presentation: { active: false, index: 0 },
  startPresentation: () => set({ presentation: { active: true, index: 0 }, pendingEdge: null, activeTool: 'select' }),
  stopPresentation: () => set((state) => ({ presentation: { ...state.presentation, active: false } })),
  setPresentationIndex: (index) => set((state) => ({ presentation: { ...state.presentation, index } })),

  saveStatus: 'saved',
  setSaveStatus: (saveStatus) => set({ saveStatus }),

  activeTool: 'select',
  setActiveTool: (activeTool) => {
    set((state) => {
      const isDrawingOrPanning = activeTool !== 'select';
      return {
        activeTool,
        placementItem: activeTool === 'select' ? null : state.placementItem,
        ...(isDrawingOrPanning
          ? {
              selectedNodeId: null,
              selectedEdgeId: null,
              editingShapeId: null,
              activePopover: null,
              nodes: state.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
              edges: state.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
            }
          : {}),
      };
    });
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.cursor = '';
    }
  },
  placementItem: null,
  setPlacementItem: (placementItem) => set({ placementItem }),
  brushColor: 'var(--ink)',
  setBrushColor: (brushColor) => set({ brushColor }),
  strokeWidth: 2.5,
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  eraserRadius: 14,
  setEraserRadius: (eraserRadius) => set({ eraserRadius }),
  isSpacePanning: false,
  setIsSpacePanning: (isSpacePanning) => set({ isSpacePanning }),
  eraseDrawingNodes: (ids) => {
    get().eraseElements(ids, []);
  },
  eraseElements: (nodeIds, edgeIds) => {
    if (nodeIds.length === 0 && edgeIds.length === 0) return;
    const nodeIdSet = new Set(nodeIds);
    const edgeIdSet = new Set(edgeIds);
    set((state) => ({
      nodes: state.nodes.filter((n) => !nodeIdSet.has(n.id)),
      edges: state.edges.filter((e) => !edgeIdSet.has(e.id) && !nodeIdSet.has(e.source) && !nodeIdSet.has(e.target)),
      selectedNodeId: state.selectedNodeId && nodeIdSet.has(state.selectedNodeId) ? null : state.selectedNodeId,
      selectedEdgeId: state.selectedEdgeId && edgeIdSet.has(state.selectedEdgeId) ? null : state.selectedEdgeId,
    }));
  },
  applyEraseBatch: (updatedNodes, deletedNodeIds, deletedEdgeIds) => {
    const delNodeSet = new Set(deletedNodeIds);
    const delEdgeSet = new Set(deletedEdgeIds);
    const updatedMap = new Map(updatedNodes.map((n) => [n.id, n]));

    set((state) => {
      const nextNodes: SystemNode[] = [];
      const handledUpdated = new Set<string>();

      for (const n of state.nodes) {
        if (delNodeSet.has(n.id)) continue;
        if (updatedMap.has(n.id)) {
          nextNodes.push(updatedMap.get(n.id)!);
          handledUpdated.add(n.id);
        } else {
          nextNodes.push(n);
        }
      }

      for (const un of updatedNodes) {
        if (!handledUpdated.has(un.id) && !delNodeSet.has(un.id)) {
          nextNodes.push(un);
        }
      }

      const nextEdges = state.edges.filter(
        (e) => !delEdgeSet.has(e.id) && !delNodeSet.has(e.source) && !delNodeSet.has(e.target)
      );

      return {
        nodes: nextNodes,
        edges: nextEdges,
        selectedNodeId: state.selectedNodeId && delNodeSet.has(state.selectedNodeId) ? null : state.selectedNodeId,
        selectedEdgeId: state.selectedEdgeId && delEdgeSet.has(state.selectedEdgeId) ? null : state.selectedEdgeId,
      };
    });
  },

  initCanvas: (projectId, nodes, edges, viewport, initialDiagramType = 'architecture', initialDiagramData) => {
    const diagramData = initialDiagramData || {
      architecture: { nodes, edges },
      sequence: { nodes: [], edges: [] },
      er: { nodes: [], edges: [] },
    };
    const activeNodes = diagramData[initialDiagramType]?.nodes || nodes;
    const activeEdges = diagramData[initialDiagramType]?.edges || edges;

    set({
      projectId,
      diagramType: initialDiagramType,
      diagramData,
      nodes: activeNodes,
      edges: activeEdges,
      viewport,
      selectedNodeId: null,
      selectedEdgeId: null,
      activePopover: null,
      history: [{ nodes: activeNodes, edges: activeEdges }],
      historyIndex: 0,
      presentation: { active: false, index: 0 },
      saveStatus: 'saved',
      activeTool: 'select',
      placementItem: null,
      isSpacePanning: false,
      brushColor: 'var(--ink)',
    });
  },

  onNodesChange: (changes) => {
    set((state) => {
      let nodes = applyNodeChanges(changes, state.nodes);
      nodes = nodes.map((node) => {
        if (node.type === 'text') {
          const restStyle = { ...node.style };
          delete restStyle.width;
          delete restStyle.height;
          return {
            ...node,
            width: undefined,
            height: undefined,
            style: Object.keys(restStyle).length > 0 ? restStyle : undefined,
            data: node.data?.widthMode === 'fixed' ? { ...node.data, widthMode: 'auto' as const } : node.data,
          };
        }
        return node;
      });
      const hasSelectionChange = changes.some((c) => c.type === 'select');
      if (!hasSelectionChange) return { nodes };

      const selected = nodes.filter((n) => n.selected);
      let selectedNodeId = state.selectedNodeId;
      if (selectedNodeId && (!selected.some((n) => n.id === selectedNodeId) || selected.length > 1)) {
        selectedNodeId = null;
      }
      if (!selectedNodeId && selected.length === 1) {
        selectedNodeId = selected[0].id;
      }
      let editingShapeId = state.editingShapeId;
      if (editingShapeId && selectedNodeId !== editingShapeId) {
        editingShapeId = null;
      }
      const activePopover = selected.length > 1 ? null : state.activePopover;

      return { nodes, selectedNodeId, editingShapeId, activePopover };
    });
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const edges = applyEdgeChanges(changes, state.edges);
      const hasSelectionChange = changes.some((c) => c.type === 'select');
      if (!hasSelectionChange) return { edges };

      const selected = edges.filter((e) => e.selected);
      let selectedEdgeId = state.selectedEdgeId;
      if (selected.length === 1) {
        selectedEdgeId = selected[0].id;
      } else if (selected.length === 0 || (selectedEdgeId && !selected.some((e) => e.id === selectedEdgeId))) {
        selectedEdgeId = selected.length > 0 ? selected[0].id : null;
      }
      const activePopover =
        selected.length === 1 && state.activePopover?.id === selected[0].id ? state.activePopover : null;

      return { edges, selectedEdgeId, activePopover };
    });
  },

  onConnect: (connection) => {
    if (!connection.source || !connection.target) return;

    // Prevent accidental duplicate edge creation in a single connection gesture
    const existingEdges = get().edges;
    const isDuplicate = existingEdges.some(
      (e) =>
        e.source === connection.source &&
        e.target === connection.target &&
        e.sourceHandle === connection.sourceHandle &&
        e.targetHandle === connection.targetHandle
    );
    if (isDuplicate) return;

    const sourceNode = get().nodes.find((n) => n.id === connection.source);
    const targetNode = get().nodes.find((n) => n.id === connection.target);
    const isSourceArch = sourceNode?.type === 'system' && !sourceNode?.data?.shapeType;
    const isTargetArch = targetNode?.type === 'system' && !targetNode?.data?.shapeType;
    const isShapeConn = !isSourceArch || !isTargetArch;

    // Automatic perimeter handle fallback if handle was omitted (e.g. dropped on node body)
    let sourceHandle = connection.sourceHandle;
    let targetHandle = connection.targetHandle;
    if (sourceNode && targetNode && (!sourceHandle || !targetHandle)) {
      const dx = targetNode.position.x - sourceNode.position.x;
      const dy = targetNode.position.y - sourceNode.position.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        if (!sourceHandle) sourceHandle = dx >= 0 ? 'right-source' : 'left-source';
        if (!targetHandle) targetHandle = dx >= 0 ? 'left-target' : 'right-target';
      } else {
        if (!sourceHandle) sourceHandle = dy >= 0 ? 'bottom-source' : 'top-source';
        if (!targetHandle) targetHandle = dy >= 0 ? 'top-target' : 'bottom-target';
      }
    }

    const id = crypto.randomUUID();
    const newEdge: SystemEdge = {
      id,
      source: connection.source,
      target: connection.target,
      sourceHandle: sourceHandle || connection.sourceHandle,
      targetHandle: targetHandle || connection.targetHandle,
      type: 'system',
      data: {
        edgeType: 'rest',
        label: '',
        isShapeConnection: isShapeConn,
      },
    };
    get().pushHistory();
    set((state) => ({
      edges: [...state.edges, newEdge],
    }));
  },

  addNode: (node) => {
    get().pushHistory();
    set((state) => ({ nodes: [...state.nodes, node] }));
  },

  addElements: (newNodes, newEdges = []) => {
    if (newNodes.length === 0 && newEdges.length === 0) return;
    get().pushHistory();
    set((state) => ({
      nodes: [...state.nodes, ...newNodes],
      edges: [...state.edges, ...newEdges],
    }));
  },

  updateNodeData: (nodeId, data) => {
    get().pushHistory();
    const node = get().nodes.find((n) => n.id === nodeId);
    if (node?.type === 'text') {
      const textFormattingUpdates: Partial<CanvasStore['lastTextFormatting']> = {};
      if (typeof data.fontSize === 'number') textFormattingUpdates.fontSize = data.fontSize;
      if (typeof data.fontFamily === 'string') textFormattingUpdates.fontFamily = data.fontFamily;
      if (typeof data.color === 'string') textFormattingUpdates.color = data.color;
      if (typeof data.bold === 'boolean') textFormattingUpdates.bold = data.bold;
      if (typeof data.italic === 'boolean') textFormattingUpdates.italic = data.italic;
      if (typeof data.underline === 'boolean') textFormattingUpdates.underline = data.underline;
      if (data.align === 'left' || data.align === 'center' || data.align === 'right') {
        textFormattingUpdates.align = data.align;
      }
      if (Object.keys(textFormattingUpdates).length > 0) {
        get().setLastTextFormatting(textFormattingUpdates);
      }
    }
    if (node?.type === 'shape' || node?.type === 'drawing') {
      const drawingFormattingUpdates: Partial<DrawingFormatting> = {};
      if (typeof data.shapeStroke === 'string') drawingFormattingUpdates.strokeColor = data.shapeStroke;
      if (typeof data.strokeWidth === 'number') drawingFormattingUpdates.strokeWidth = data.strokeWidth;
      if (data.strokeStyle) drawingFormattingUpdates.strokeStyle = data.strokeStyle;
      if (typeof data.shapeFill === 'string') drawingFormattingUpdates.fillColor = data.shapeFill;
      if (typeof data.arrowStart === 'boolean') drawingFormattingUpdates.arrowStart = data.arrowStart;
      if (typeof data.arrowEnd === 'boolean') drawingFormattingUpdates.arrowEnd = data.arrowEnd;
      if (Object.keys(drawingFormattingUpdates).length > 0) {
        get().setLastDrawingFormatting(drawingFormattingUpdates);
      }
    }
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }));
  },

  updateEdgeData: (edgeId, data) => {
    get().pushHistory();
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, ...data } as SystemEdgeData } : e
      ),
    }));
  },

  deleteNode: (nodeId) => {
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      activePopover: null,
    }));
  },

  deleteEdge: (edgeId) => {
    get().pushHistory();
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
      activePopover: state.activePopover?.id === edgeId ? null : state.activePopover,
    }));
  },

  reverseEdge: (edgeId) => {
    get().pushHistory();
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId
          ? {
            ...e,
            source: e.target,
            target: e.source,
            sourceHandle: flipHandle(e.targetHandle, 'source'),
            targetHandle: flipHandle(e.sourceHandle, 'target'),
          }
          : e
      ),
    }));
  },

  setViewport: (viewport) => set({ viewport }),

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  editingShapeId: null,
  setEditingShapeId: (editingShapeId) => set({ editingShapeId }),

  setSelectedNodeId: (id) =>
    set((state) => ({
      selectedNodeId: id,
      selectedEdgeId: null,
      editingShapeId: state.editingShapeId === id ? state.editingShapeId : null,
      activePopover: null,
      nodes: id
        ? state.nodes.map((n) => (n.id === id ? { ...n, selected: true } : n.selected ? { ...n, selected: false } : n))
        : state.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
    })),

  setSelectedEdgeId: (id) =>
    set((state) => ({
      selectedEdgeId: id,
      selectedNodeId: null,
      activePopover: state.activePopover?.id === id ? state.activePopover : null,
      edges: id
        ? state.edges.map((e) => (e.id === id ? { ...e, selected: true } : e.selected ? { ...e, selected: false } : e))
        : state.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
    })),

  copySelection: () => {
    const { nodes, edges } = get();
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;
    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    const connectedEdges = edges.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
    );
    set({
      clipboard: {
        nodes: structuredClone(selectedNodes),
        edges: structuredClone(connectedEdges),
      },
    });
  },

  pasteSelection: () => {
    const { clipboard } = get();
    if (!clipboard || clipboard.nodes.length === 0) return;
    const idMap = new Map<string, string>();
    const now = Date.now();
    const newNodes = clipboard.nodes.map((node, i) => {
      const newId = `node-${now}-${i}`;
      idMap.set(node.id, newId);
      return {
        ...structuredClone(node),
        id: newId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        selected: true,
      };
    });
    const newEdges = clipboard.edges.map((edge, i) => ({
      ...structuredClone(edge),
      id: `edge-${now}-${i}`,
      source: idMap.get(edge.source) ?? edge.source,
      target: idMap.get(edge.target) ?? edge.target,
    }));
    get().pushHistory();
    set((state) => ({
      nodes: [
        ...state.nodes.map((n) => ({ ...n, selected: false })),
        ...newNodes,
      ],
      edges: [...state.edges, ...newEdges],
      selectedNodeId: null,
      clipboard: {
        nodes: structuredClone(newNodes),
        edges: structuredClone(newEdges),
      },
    }));
  },

  clearSelection: () => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      edges: state.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
      selectedNodeId: null,
      selectedEdgeId: null,
      editingShapeId: null,
      activePopover: null,
    }));
  },

  deleteElements: (nodeIds, edgeIds) => {
    if (nodeIds.length === 0 && edgeIds.length === 0) return;
    const nodeIdSet = new Set(nodeIds);
    const edgeIdSet = new Set(edgeIds);
    get().pushHistory();
    set((state) => {
      const remainingNodes = state.nodes.filter((n) => !nodeIdSet.has(n.id));
      const remainingEdges = state.edges.filter(
        (e) => !edgeIdSet.has(e.id) && !nodeIdSet.has(e.source) && !nodeIdSet.has(e.target)
      );
      const remainingEdgeIds = new Set(remainingEdges.map((e) => e.id));
      return {
        nodes: remainingNodes,
        edges: remainingEdges,
        selectedNodeId: state.selectedNodeId && nodeIdSet.has(state.selectedNodeId) ? null : state.selectedNodeId,
        selectedEdgeId: state.selectedEdgeId && remainingEdgeIds.has(state.selectedEdgeId) ? state.selectedEdgeId : null,
        activePopover: null,
      };
    });
  },

  deleteSelection: () => {
    const { nodes, edges, selectedNodeId, selectedEdgeId } = get();
    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    if (selectedNodeId) selectedNodeIds.add(selectedNodeId);

    const selectedEdgeIds = new Set(edges.filter((e) => e.selected).map((e) => e.id));
    if (selectedEdgeId) selectedEdgeIds.add(selectedEdgeId);

    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return;

    get().pushHistory();
    set((state) => {
      const remainingNodes = state.nodes.filter((n) => !selectedNodeIds.has(n.id));
      const remainingEdges = state.edges.filter(
        (e) => !selectedEdgeIds.has(e.id) && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)
      );
      const remainingEdgeIds = new Set(remainingEdges.map((e) => e.id));
      return {
        nodes: remainingNodes,
        edges: remainingEdges,
        selectedNodeId: state.selectedNodeId && selectedNodeIds.has(state.selectedNodeId) ? null : state.selectedNodeId,
        selectedEdgeId: state.selectedEdgeId && remainingEdgeIds.has(state.selectedEdgeId) ? state.selectedEdgeId : null,
        activePopover: null,
      };
    });
  },

  selectAll: () => {
    set((state) => ({
      nodes: state.nodes.map((n) => ({ ...n, selected: true })),
      edges: state.edges.map((e) => ({ ...e, selected: true })),
    }));
  },

  duplicateNodes: (ids) => {
    const { nodes, edges } = get();
    const sourceIds = new Set(ids ?? nodes.filter((n) => n.selected).map((n) => n.id));
    if (sourceIds.size === 0) return;
    const now = Date.now();
    const idMap = new Map<string, string>();
    const copies = nodes
      .filter((n) => sourceIds.has(n.id))
      .map((node, i) => {
        const id = `node-${now}-${i}`;
        idMap.set(node.id, id);
        return {
          ...structuredClone(node),
          id,
          position: { x: node.position.x + 30, y: node.position.y + 30 },
          selected: true,
        };
      });
    const edgeCopies = edges
      .filter((e) => sourceIds.has(e.source) && sourceIds.has(e.target))
      .map((edge, i) => ({
        ...structuredClone(edge),
        id: `edge-${now}-${i}`,
        source: idMap.get(edge.source)!,
        target: idMap.get(edge.target)!,
        selected: false,
      }));
    get().pushHistory();
    set((state) => ({
      nodes: [...state.nodes.map((n) => ({ ...n, selected: false })), ...copies],
      edges: [...state.edges, ...edgeCopies],
      selectedNodeId: null,
      selectedEdgeId: null,
    }));
  },

  groupSelection: () => {
    const selected = get().nodes.filter((n) => n.selected && n.type !== 'group');
    if (selected.length === 0) return;
    const pad = 32;
    const labelSpace = 16;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of selected) {
      const { width, height } = nodeSize(node);
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + width);
      maxY = Math.max(maxY, node.position.y + height);
    }
    const group: SystemNode = {
      id: `group-${Date.now()}`,
      type: 'group',
      position: { x: minX - pad, y: minY - pad - labelSpace },
      style: { width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 + labelSpace },
      data: { label: 'Group', nodeType: 'group', description: '', techStack: [] },
    };
    get().pushHistory();
    // Groups go first so they render behind their members.
    set((state) => ({
      nodes: [group, ...state.nodes.map((n) => ({ ...n, selected: false }))],
      selectedNodeId: null,
    }));
  },

  alignSelection: () => {
    const selected = get().nodes.filter((n) => n.selected);
    if (selected.length < 2) return;
    const centers = selected.map((n) => {
      const { width, height } = nodeSize(n);
      return { id: n.id, cx: n.position.x + width / 2, cy: n.position.y + height / 2, width, height };
    });
    const xs = centers.map((c) => c.cx);
    const ys = centers.map((c) => c.cy);
    const spreadX = Math.max(...xs) - Math.min(...xs);
    const spreadY = Math.max(...ys) - Math.min(...ys);
    // Spread out horizontally → put them on one row; otherwise one column.
    const alignRow = spreadX >= spreadY;
    const target = alignRow
      ? ys.reduce((a, b) => a + b, 0) / ys.length
      : xs.reduce((a, b) => a + b, 0) / xs.length;
    const byId = new Map(centers.map((c) => [c.id, c]));
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.map((n) => {
        const c = byId.get(n.id);
        if (!c) return n;
        return {
          ...n,
          position: alignRow
            ? { x: n.position.x, y: target - c.height / 2 }
            : { x: target - c.width / 2, y: n.position.y },
        };
      }),
    }));
  },

  toggleLock: (ids) => {
    const idSet = new Set(ids);
    const targets = get().nodes.filter((n) => idSet.has(n.id));
    if (targets.length === 0) return;
    const lock = targets.some((n) => n.draggable !== false);
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.map((n) =>
        idSet.has(n.id) ? { ...n, draggable: lock ? false : undefined } : n
      ),
    }));
  },

  bringToFront: (id) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;
    get().pushHistory();
    set((state) => ({
      nodes: [...state.nodes.filter((n) => n.id !== id), node],
    }));
  },

  sendToBack: (id) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;
    get().pushHistory();
    set((state) => ({
      nodes: [node, ...state.nodes.filter((n) => n.id !== id)],
    }));
  },

  clearCanvas: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0 && edges.length === 0) return;
    get().pushHistory();
    set({ nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null });
  },

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    // Keep max 50 entries
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      historyIndex: historyIndex - 1,
    });
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({
      nodes: next.nodes,
      edges: next.edges,
      historyIndex: historyIndex + 1,
    });
  },
}));
