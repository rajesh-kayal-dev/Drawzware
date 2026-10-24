'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  PanOnScrollMode,
  SelectionMode,
  reconnectEdge,
  useReactFlow,
  type OnConnect,
  type OnConnectStart,
  type OnEdgesChange,
  type OnNodesChange,
  type OnReconnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { useProjectStore } from '@/features/projects/stores/useProjectStore';
import { useSettingsStore } from '@/features/settings/stores/useSettingsStore';
import { BaseSystemNode } from '@/features/canvas/nodes/BaseSystemNode';
import { GroupNode } from '@/features/canvas/nodes/GroupNode';
import { StickyNote } from '@/features/canvas/nodes/StickyNote';
import { NodeEditor } from '@/features/canvas/nodes/NodeEditor';
import { NODE_REGISTRY } from '@/features/canvas/nodes/node-registry';
import { SystemEdge } from '@/features/canvas/edges/SystemEdge';
import { EdgeEditor } from '@/features/canvas/edges/EdgeEditor';
import { ConnectionTypePicker } from '@/features/canvas/edges/ConnectionTypePicker';
import { CanvasHeader } from '@/features/canvas/components/CanvasHeader';
import { useAutoSave } from '@/features/projects/hooks/useAutoSave';
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts';
import { useIsNarrow } from '@/shared/hooks/useMediaQuery';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { createSystemNode } from '@/features/canvas/utils/node-factory';
import { TECHNOLOGY_STACK_PRESETS, instantiateStackPreset } from '@/features/canvas/registries/technology-stacks';
import { getMinimapColor } from '@/features/canvas/utils/minimap';
import { computeIssues, ValidationWarningsContext } from '@/features/canvas/utils/validation';
import { cn } from '@/shared/utils/utils';
import type { SystemNode, SystemEdge as SystemEdgeModel, SystemNodeType, PlacementItem, DiagramType } from '@/features/canvas/types/canvas.types';
import { CanvasToolbar } from './CanvasToolbar';
import { NodePalette } from './NodePalette';
import { ValidationPanel } from './ValidationPanel';
import { SelectionActions } from './SelectionActions';
import { EmptyCanvas } from './EmptyCanvas';
import { PresentationOverlay } from './PresentationOverlay';
import { CanvasContextMenu, type ContextMenuState } from './CanvasContextMenu';
import { CommandMenu } from './CommandMenu';
import { ShortcutsDialog } from './ShortcutsDialog';
import { OnboardingOverlay } from './OnboardingOverlay';
import { ShareDialog } from '@/features/sharing/components/ShareDialog';
import { ExportDialog } from '@/features/import-export/components/ExportDialog';
import { FreehandDrawingNode } from '@/features/canvas/nodes/FreehandDrawingNode';
import { CanvasTextNode } from '@/features/canvas/nodes/CanvasTextNode';
import { ShapeNode } from '@/features/canvas/nodes/ShapeNode';
import { StepNode } from '@/features/canvas/nodes/StepNode';
import { JunctionNode } from '@/features/canvas/nodes/JunctionNode';
import { PencilOverlay } from './PencilOverlay';
import { ShapeDrawingOverlay } from './ShapeDrawingOverlay';
import { TextFormattingToolbar } from './TextFormattingToolbar';
import { getCanvasCursorClass } from '../utils/canvas-helpers';
import {
  createCanvasTextNode,
  createShapeNode,
  createStepNode,
  createJunctionNode,
  createSequenceParticipantNode,
  createSequenceFragmentNode,
  createERTableNode,
} from '@/features/canvas/utils/node-factory';
import { SequenceParticipantNode } from '@/features/canvas/nodes/SequenceParticipantNode';
import { SequenceFragmentNode } from '@/features/canvas/nodes/SequenceFragmentNode';
import { ERTableNode } from '@/features/canvas/nodes/ERTableNode';
import { getFitViewOptions, presentationOrder } from '../utils/canvas-helpers';

const nodeTypes = {
  system: BaseSystemNode,
  group: GroupNode,
  note: StickyNote,
  drawing: FreehandDrawingNode,
  text: CanvasTextNode,
  shape: ShapeNode,
  step: StepNode,
  junction: JunctionNode,
  'sequence-participant': SequenceParticipantNode,
  'sequence-fragment': SequenceFragmentNode,
  'er-table': ERTableNode,
};
const edgeTypes = { system: SystemEdge };
const LIBRARY_WIDTH = 288 + 76 + 16;

/** Stable canvas background layer: handles Dots, Grid, or solid backgrounds without subscribing to transform ticks */
function CanvasBackgroundLayer() {
  const canvasBackground = useSettingsStore((s) => s.canvasBackground);

  if (canvasBackground === 'dots') {
    return (
      <Background
        id="canvas-bg-dots"
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1.5}
        color="var(--dots)"
      />
    );
  }

  if (canvasBackground === 'grid') {
    return (
      <Background
        id="canvas-bg-grid"
        variant={BackgroundVariant.Lines}
        gap={20}
        size={1}
        color="var(--line)"
      />
    );
  }

  return null;
}

function CanvasInner({ projectId }: { projectId: string }) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const viewport = useCanvasStore((s) => s.viewport);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange) as OnNodesChange<SystemNode>;
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange) as OnEdgesChange<SystemEdgeModel>;
  const onConnect = useCanvasStore((s) => s.onConnect) as OnConnect;
  const setViewport = useCanvasStore((s) => s.setViewport);
  const setSelectedNodeId = useCanvasStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useCanvasStore((s) => s.setSelectedEdgeId);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);
  const addNode = useCanvasStore((s) => s.addNode);
  const addElements = useCanvasStore((s) => s.addElements);
  const deleteElements = useCanvasStore((s) => s.deleteElements);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const setPendingEdge = useCanvasStore((s) => s.setPendingEdge);
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const presentation = useCanvasStore((s) => s.presentation);
  const setPresentationIndex = useCanvasStore((s) => s.setPresentationIndex);
  const libraryCollapsed = useCanvasStore((s) => s.libraryCollapsed);
  const setLibraryCollapsed = useCanvasStore((s) => s.setLibraryCollapsed);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const placementItem = useCanvasStore((s) => s.placementItem);
  const setPlacementItem = useCanvasStore((s) => s.setPlacementItem);
  const isSpacePanning = useCanvasStore((s) => s.isSpacePanning);

  const snap = useSettingsStore((s) => s.snap);
  const showMinimapSetting = useSettingsStore((s) => s.minimap);
  const validationEnabled = useSettingsStore((s) => s.validation);
  const animatedEdges = useSettingsStore((s) => s.animatedEdges);
  const canvasBackground = useSettingsStore((s) => s.canvasBackground);

  const canvasBgStyle = useMemo<React.CSSProperties>(() => {
    switch (canvasBackground) {
      case 'white':
        return { backgroundColor: '#ffffff' };
      case 'dark':
        return { backgroundColor: '#121212' };
      case 'neutral':
        return { backgroundColor: 'var(--canvas-neutral)' };
      case 'grid':
      case 'dots':
      default:
        return { backgroundColor: 'var(--bg)' };
    }
  }, [canvasBackground]);

  const narrow = useIsNarrow();
  const presenting = presentation.active;

  const connectEndPos = useRef<{ x: number; y: number } | null>(null);
  const connectStartRef = useRef<{ nodeId: string | null; handleId: string | null } | null>(null);
  const edgeReconnectSuccessful = useRef(true);

  const { screenToFlowPosition, fitView } = useReactFlow();
  useAutoSave();
  useKeyboardShortcuts();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const projects = useProjectStore((s) => s.projects);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const loaded = useProjectStore((s) => s.loaded);
  const currentProject = projects.find((p) => p.id === projectId);

  useDocumentTitle(currentProject ? (currentProject.name || 'Untitled Design') : undefined);

  useEffect(() => {
    requestAnimationFrame(() => {
      fitView(getFitViewOptions(200));
    });
  }, [fitView]);

  useEffect(() => {
    if (!loaded) loadProjects();
  }, [loaded, loadProjects]);

  // Library starts closed by default when opening any canvas/project.
  useEffect(() => {
    setLibraryCollapsed(true);
  }, [setLibraryCollapsed]);

  // ── Derived chrome state ───────────────────────────────
  const selectedCount = useMemo(() => nodes.reduce((n, node) => n + (node.selected ? 1 : 0), 0), [nodes]);
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : undefined;
  const nodeEditorOpen =
    !!selectedNode &&
    (selectedNode.type === 'system' ||
      selectedNode.type === 'sequence-participant' ||
      selectedNode.type === 'sequence-fragment' ||
      selectedNode.type === 'er-table') &&
    selectedCount < 2;
  const edgeEditorOpen = !!selectedEdgeId && edges.some((e) => e.id === selectedEdgeId);
  const editorOpen = !presenting && (nodeEditorOpen || edgeEditorOpen);

  const issues = useMemo(() => computeIssues(nodes, edges), [nodes, edges]);
  const validationActive = validationEnabled && !presenting;
  // Stable identity while the set of warned nodes is unchanged, so nodes don't re-render on every drag frame.
  const warningKey = validationActive
    ? issues
      .filter((i) => i.severity === 'warning')
      .map((i) => i.nodeId)
      .join('|')
    : '';
  const warningNodeIds = useMemo<ReadonlySet<string>>(
    () => new Set(warningKey ? warningKey.split('|') : []),
    [warningKey]
  );

  // ── Presentation ───────────────────────────────────────
  const presentationStartId = selectedNodeId ?? nodes.find((n) => n.selected)?.id;
  const order = useMemo(
    () => (presenting ? presentationOrder(nodes, edges, presentationStartId) : []),
    [presenting, nodes, edges, presentationStartId]
  );
  const currentId = order.length > 0 ? order[Math.min(presentation.index, order.length - 1)].id : undefined;

  const flowNodes = useMemo(() => {
    if (!presenting) return nodes;
    const neighbors = new Set<string>();
    for (const e of edges) {
      if (e.source === currentId) neighbors.add(e.target);
      if (e.target === currentId) neighbors.add(e.source);
    }
    return nodes.map((n) => {
      const opacity = n.id === currentId ? 1 : neighbors.has(n.id) ? 0.7 : 0.25;
      return { ...n, selected: n.id === currentId, style: { ...n.style, opacity } };
    });
  }, [presenting, nodes, edges, currentId]);

  const flowEdges = useMemo(() => {
    if (!presenting) return edges;
    return edges.map((e) => {
      const opacity = e.source === currentId || e.target === currentId ? 1 : 0.2;
      return { ...e, selected: false, style: { ...e.style, opacity } };
    });
  }, [presenting, edges, currentId]);

  // ── Handlers ───────────────────────────────────────────
  const onNodeClick = useCallback(
    (e: ReactMouseEvent, node: SystemNode) => {
      if (useCanvasStore.getState().presentation.active) {
        const i = order.findIndex((n) => n.id === node.id);
        if (i >= 0) setPresentationIndex(i);
        return;
      }
      if (e.ctrlKey || e.metaKey) return;
      if (useCanvasStore.getState().activeTool !== 'select' && useCanvasStore.getState().activeTool !== 'hand') {
        setActiveTool('select');
      }
      // Single-click selects/drags the component on canvas without opening the right bar
    },
    [order, setPresentationIndex, setActiveTool]
  );

  const onNodeDoubleClick = useCallback(
    (e: ReactMouseEvent, node: SystemNode) => {
      if (useCanvasStore.getState().presentation.active) return;
      if (e.ctrlKey || e.metaKey) return;
      if (node.type === 'system') {
        setSelectedNodeId(node.id);
      }
    },
    [setSelectedNodeId]
  );

  const onEdgeClick = useCallback(
    (e: ReactMouseEvent, edge: SystemEdgeModel) => {
      if (useCanvasStore.getState().presentation.active) return;
      if (e.ctrlKey || e.metaKey) return;
      setSelectedEdgeId(edge.id);
    },
    [setSelectedEdgeId]
  );

  const onPaneClick = useCallback(
    (e: ReactMouseEvent) => {
      if (placementItem) {
        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        let newNode: SystemNode | null = null;
        if (placementItem.kind === 'shape' && placementItem.shapeType) {
          newNode = createShapeNode(placementItem.shapeType, flowPos, placementItem.label);
        } else if (placementItem.kind === 'step' && placementItem.stepId) {
          newNode = createStepNode(placementItem.stepId, flowPos);
        } else if (placementItem.kind === 'component' && placementItem.type) {
          newNode = createSystemNode(placementItem.type as SystemNodeType, flowPos, {
            ...(placementItem.label ? { label: placementItem.label } : {}),
            ...(placementItem.customIcon ? { customIcon: placementItem.customIcon } : {}),
            ...(placementItem.color ? { color: placementItem.color } : {}),
            ...(placementItem.defaultTechStack ? { techStack: [...placementItem.defaultTechStack] } : {}),
            ...(placementItem.description ? { description: placementItem.description } : {}),
          });
        } else if (placementItem.kind === 'preset' && placementItem.presetId) {
          const preset = TECHNOLOGY_STACK_PRESETS.find((pr) => pr.id === placementItem.presetId);
          if (preset) {
            const { nodes: newNodes, edges: newEdges } = instantiateStackPreset(preset, flowPos);
            addElements(newNodes, newEdges);
            setPlacementItem(null);
            return;
          }
        } else if (placementItem.kind === 'group') {
          newNode = createSystemNode('group', flowPos);
          if (placementItem.label) newNode.data.label = placementItem.label;
        } else if (placementItem.kind === 'junction') {
          newNode = createJunctionNode(flowPos);
        } else if (placementItem.kind === 'sequence-participant') {
          newNode = createSequenceParticipantNode(placementItem.participantType || 'service', flowPos, placementItem.label);
        } else if (placementItem.kind === 'sequence-fragment') {
          newNode = createSequenceFragmentNode(placementItem.fragmentType || 'alt', flowPos, placementItem.label);
        } else if (placementItem.kind === 'er-table') {
          newNode = createERTableNode(placementItem.tableType || 'table', flowPos, placementItem.label || 'table_name', placementItem.columns);
        } else if (placementItem.kind === 'connection' && placementItem.edgeType) {
          if (placementItem.messageType) {
            const participants = nodes.filter((n) => n.type === 'sequence-participant');
            if (participants.length >= 2) {
              const sorted = [...participants].sort(
                (a, b) => Math.abs(a.position.x - flowPos.x) - Math.abs(b.position.x - flowPos.x)
              );
              const [pA, pB] = [sorted[0], sorted[1]].sort((a, b) => a.position.x - b.position.x);
              const newEdge: SystemEdgeModel = {
                id: crypto.randomUUID(),
                source: pA.id,
                target: pB.id,
                sourceHandle: 'right-out-0',
                targetHandle: 'left-in-0',
                type: 'system',
                data: {
                  edgeType: 'rest',
                  messageType: placementItem.messageType,
                  strokeStyle: placementItem.strokeStyle || (placementItem.messageType === 'sync' ? 'solid' : 'dashed'),
                  arrowhead: placementItem.messageType === 'async' ? 'open' : 'filled',
                  color: '#3b82f6',
                  label: placementItem.label || 'Message',
                  arrowEnd: true,
                },
              };
              pushHistory();
              setEdges([...edges, newEdge]);
              setPlacementItem(null);
              return;
            } else {
              const nodeA = createSequenceParticipantNode('service', { x: flowPos.x - 140, y: flowPos.y - 40 }, 'Participant A');
              const nodeB = createSequenceParticipantNode('service', { x: flowPos.x + 140, y: flowPos.y - 40 }, 'Participant B');
              const newEdge: SystemEdgeModel = {
                id: crypto.randomUUID(),
                source: nodeA.id,
                target: nodeB.id,
                sourceHandle: 'right-out-0',
                targetHandle: 'left-in-0',
                type: 'system',
                data: {
                  edgeType: 'rest',
                  messageType: placementItem.messageType,
                  strokeStyle: placementItem.strokeStyle || (placementItem.messageType === 'sync' ? 'solid' : 'dashed'),
                  arrowhead: placementItem.messageType === 'async' ? 'open' : 'filled',
                  color: '#3b82f6',
                  label: placementItem.label || 'Message',
                  arrowEnd: true,
                },
              };
              pushHistory();
              setNodes([...nodes, nodeA, nodeB]);
              setEdges([...edges, newEdge]);
              setPlacementItem(null);
              return;
            }
          }

          if (placementItem.relationshipType) {
            const tables = nodes.filter((n) => n.type === 'er-table');
            if (tables.length >= 2) {
              const sorted = [...tables].sort(
                (a, b) => Math.abs(a.position.x - flowPos.x) - Math.abs(b.position.x - flowPos.x)
              );
              const [tA, tB] = [sorted[0], sorted[1]].sort((a, b) => a.position.x - b.position.x);
              const newEdge: SystemEdgeModel = {
                id: crypto.randomUUID(),
                source: tA.id,
                target: tB.id,
                type: 'system',
                data: {
                  edgeType: 'rest',
                  relationshipType: placementItem.relationshipType,
                  sourceCardinality: placementItem.sourceCardinality || '1',
                  targetCardinality: placementItem.targetCardinality || 'N',
                  label: '',
                  strokeStyle: 'solid',
                  color: '#64748b',
                  arrowEnd: true,
                },
              };
              pushHistory();
              setEdges([...edges, newEdge]);
              setPlacementItem(null);
              return;
            } else {
              const nodeA = createERTableNode('table', { x: flowPos.x - 160, y: flowPos.y - 60 }, 'Table A');
              const nodeB = createERTableNode('table', { x: flowPos.x + 160, y: flowPos.y - 60 }, 'Table B');
              const newEdge: SystemEdgeModel = {
                id: crypto.randomUUID(),
                source: nodeA.id,
                target: nodeB.id,
                type: 'system',
                data: {
                  edgeType: 'rest',
                  relationshipType: placementItem.relationshipType,
                  sourceCardinality: placementItem.sourceCardinality || '1',
                  targetCardinality: placementItem.targetCardinality || 'N',
                  label: '',
                  strokeStyle: 'solid',
                  color: '#64748b',
                  arrowEnd: true,
                },
              };
              pushHistory();
              setNodes([...nodes, nodeA, nodeB]);
              setEdges([...edges, newEdge]);
              setPlacementItem(null);
              return;
            }
          }

          const nodeA = createShapeNode('rounded-rectangle', { x: flowPos.x - 120, y: flowPos.y }, 'Source');
          const nodeB = createShapeNode('rounded-rectangle', { x: flowPos.x + 120, y: flowPos.y }, 'Target');
          const newEdge: SystemEdgeModel = {
            id: crypto.randomUUID(),
            source: nodeA.id,
            target: nodeB.id,
            sourceHandle: 'right-source',
            targetHandle: 'left-target',
            type: 'system',
            data: { edgeType: placementItem.edgeType, label: '' },
          };
          pushHistory();
          setNodes([...nodes, nodeA, nodeB]);
          setEdges([...edges, newEdge]);
          setPlacementItem(null);
          return;
        }

        if (newNode) {
          pushHistory();
          addNode(newNode);
          setPlacementItem(null);
          return;
        }
      }

      if (activeTool === 'text') {
        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const { lastTextFormatting } = useCanvasStore.getState();
        const newTextNode: SystemNode = {
          ...createCanvasTextNode(flowPos, '', {
            ...lastTextFormatting,
            isNew: true,
          }),
          selected: true,
        };
        pushHistory();
        addNode(newTextNode);
        setSelectedNodeId(newTextNode.id);
        setActiveTool('select');
        return;
      }
      clearSelection();
      setContextMenu(null);
    },
    [
      placementItem,
      nodes,
      edges,
      activeTool,
      screenToFlowPosition,
      pushHistory,
      addNode,
      addElements,
      setNodes,
      setEdges,
      setSelectedNodeId,
      setPlacementItem,
      setActiveTool,
      clearSelection,
    ]
  );

  const onPaneDoubleClick = useCallback(
    (e: ReactMouseEvent) => {
      e.stopPropagation();
      if (useCanvasStore.getState().presentation.active) return;
      if (
        e.target instanceof Element &&
        e.target.closest(
          '.react-flow__node, .react-flow__edge, .react-flow__controls, .react-flow__minimap, [role="toolbar"], [role="dialog"], [role="menu"]'
        )
      ) {
        return;
      }
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const { lastTextFormatting } = useCanvasStore.getState();
      const newTextNode: SystemNode = {
        ...createCanvasTextNode(flowPos, '', {
          ...lastTextFormatting,
          isNew: true,
        }),
        selected: true,
      };
      pushHistory();
      addNode(newTextNode);
      setSelectedNodeId(newTextNode.id);
      setActiveTool('select');
    },
    [screenToFlowPosition, pushHistory, addNode, setSelectedNodeId, setActiveTool]
  );

  const onNodesDelete = useCallback(
    (deleted: SystemNode[]) => {
      const nodeIds = deleted.map((n) => n.id);
      deleteElements(nodeIds, []);
    },
    [deleteElements]
  );

  const onEdgesDelete = useCallback(
    (deleted: SystemEdgeModel[]) => {
      const edgeIds = deleted.map((e) => e.id);
      deleteElements([], edgeIds);
    },
    [deleteElements]
  );

  const [isPanning, setIsPanning] = useState(false);
  const onMoveStart = useCallback(() => {
    setIsPanning(true);
  }, []);

  const onMoveEnd = useCallback(
    (_: unknown, vp: { x: number; y: number; zoom: number }) => {
      setIsPanning(false);
      setViewport(vp);
    },
    [setViewport]
  );

  const onNodeDragStop = useCallback(() => pushHistory(), [pushHistory]);

  const onConnectStart: OnConnectStart = useCallback((_, params) => {
    connectStartRef.current = {
      nodeId: params.nodeId,
      handleId: params.handleId,
    };
  }, []);

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      let finalConnection = connection;
      // If user started dragging from a node that React Flow canonicalized as target,
      // restore the original source and target so the arrow points in the user's drag direction.
      if (
        connectStartRef.current?.nodeId &&
        connectStartRef.current.nodeId === connection.target &&
        connection.source !== connection.target
      ) {
        finalConnection = {
          ...connection,
          source: connection.target,
          target: connection.source,
          sourceHandle: connection.targetHandle,
          targetHandle: connection.sourceHandle,
        };
      }
      onConnect(finalConnection);
      if (!connectEndPos.current) return;
      const latest = useCanvasStore.getState().edges;
      const newEdge = latest[latest.length - 1];
      if (newEdge) setPendingEdge({ edgeId: newEdge.id, position: connectEndPos.current });
    },
    [onConnect, setPendingEdge]
  );

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    connectEndPos.current =
      'changedTouches' in event
        ? { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
        : { x: event.clientX, y: event.clientY };
  }, []);

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect: OnReconnect<SystemEdgeModel> = useCallback(
    (oldEdge, newConnection) => {
      edgeReconnectSuccessful.current = true;
      pushHistory();
      setEdges(reconnectEdge(oldEdge, newConnection, useCanvasStore.getState().edges) as SystemEdgeModel[]);
    },
    [pushHistory, setEdges]
  );

  const onReconnectEnd = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const customItemJson = event.dataTransfer.getData('application/system-design-item');
      if (customItemJson) {
        try {
          const item = JSON.parse(customItemJson) as PlacementItem;
          const p = screenToFlowPosition({ x: event.clientX, y: event.clientY });
          let newNode: SystemNode | null = null;
          if (item.kind === 'shape' && item.shapeType) {
            newNode = createShapeNode(item.shapeType, { x: p.x - 70, y: p.y - 45 }, item.label);
          } else if (item.kind === 'step' && item.stepId) {
            newNode = createStepNode(item.stepId, { x: p.x - 170, y: p.y - 100 });
          } else if (item.kind === 'component' && item.type) {
            newNode = createSystemNode(item.type as SystemNodeType, { x: p.x - 100, y: p.y - 36 }, {
              ...(item.label ? { label: item.label } : {}),
              ...(item.customIcon ? { customIcon: item.customIcon } : {}),
              ...(item.color ? { color: item.color } : {}),
              ...(item.defaultTechStack ? { techStack: [...item.defaultTechStack] } : {}),
              ...(item.description ? { description: item.description } : {}),
            });
          } else if (item.kind === 'preset' && item.presetId) {
            const preset = TECHNOLOGY_STACK_PRESETS.find((pr) => pr.id === item.presetId);
            if (preset) {
              const { nodes: newNodes, edges: newEdges } = instantiateStackPreset(preset, { x: p.x - 200, y: p.y - 80 });
              addElements(newNodes, newEdges);
              return;
            }
          } else if (item.kind === 'group') {
            newNode = createSystemNode('group', { x: p.x - 160, y: p.y - 100 });
            if (item.label) newNode.data.label = item.label;
          } else if (item.kind === 'junction') {
            newNode = createJunctionNode({ x: p.x - 12, y: p.y - 12 });
          } else if (item.kind === 'sequence-participant') {
            newNode = createSequenceParticipantNode(item.participantType || 'service', { x: p.x - 70, y: p.y - 25 }, item.label);
          } else if (item.kind === 'sequence-fragment') {
            newNode = createSequenceFragmentNode(item.fragmentType || 'alt', { x: p.x - 130, y: p.y - 80 }, item.label);
          } else if (item.kind === 'er-table') {
            newNode = createERTableNode(item.tableType || 'table', { x: p.x - 120, y: p.y - 80 }, item.label || 'table_name', item.columns);
          } else if (item.kind === 'connection' && item.edgeType) {
            if (item.messageType) {
              const participants = nodes.filter((n) => n.type === 'sequence-participant');
              if (participants.length >= 2) {
                const sorted = [...participants].sort(
                  (a, b) => Math.abs(a.position.x - p.x) - Math.abs(b.position.x - p.x)
                );
                const [pA, pB] = [sorted[0], sorted[1]].sort((a, b) => a.position.x - b.position.x);
                const newEdge: SystemEdgeModel = {
                  id: crypto.randomUUID(),
                  source: pA.id,
                  target: pB.id,
                  sourceHandle: 'right-out-0',
                  targetHandle: 'left-in-0',
                  type: 'system',
                  data: {
                    edgeType: 'rest',
                    messageType: item.messageType,
                    strokeStyle: item.strokeStyle || (item.messageType === 'sync' ? 'solid' : 'dashed'),
                    arrowhead: item.messageType === 'async' ? 'open' : 'filled',
                    color: '#3b82f6',
                    label: item.label || 'Message',
                    arrowEnd: true,
                  },
                };
                pushHistory();
                setEdges([...edges, newEdge]);
                return;
              } else {
                const nodeA = createSequenceParticipantNode('service', { x: p.x - 140, y: p.y - 40 }, 'Participant A');
                const nodeB = createSequenceParticipantNode('service', { x: p.x + 140, y: p.y - 40 }, 'Participant B');
                const newEdge: SystemEdgeModel = {
                  id: crypto.randomUUID(),
                  source: nodeA.id,
                  target: nodeB.id,
                  sourceHandle: 'right-out-0',
                  targetHandle: 'left-in-0',
                  type: 'system',
                  data: {
                    edgeType: 'rest',
                    messageType: item.messageType,
                    strokeStyle: item.strokeStyle || (item.messageType === 'sync' ? 'solid' : 'dashed'),
                    arrowhead: item.messageType === 'async' ? 'open' : 'filled',
                    color: '#3b82f6',
                    label: item.label || 'Message',
                    arrowEnd: true,
                  },
                };
                pushHistory();
                setNodes([...nodes, nodeA, nodeB]);
                setEdges([...edges, newEdge]);
                return;
              }
            }

            if (item.relationshipType) {
              const tables = nodes.filter((n) => n.type === 'er-table');
              if (tables.length >= 2) {
                const sorted = [...tables].sort(
                  (a, b) => Math.abs(a.position.x - p.x) - Math.abs(b.position.x - p.x)
                );
                const [tA, tB] = [sorted[0], sorted[1]].sort((a, b) => a.position.x - b.position.x);
                const newEdge: SystemEdgeModel = {
                  id: crypto.randomUUID(),
                  source: tA.id,
                  target: tB.id,
                  type: 'system',
                  data: {
                    edgeType: 'rest',
                    relationshipType: item.relationshipType,
                    sourceCardinality: item.sourceCardinality || '1',
                    targetCardinality: item.targetCardinality || 'N',
                    label: '',
                    strokeStyle: 'solid',
                    color: '#64748b',
                    arrowEnd: true,
                  },
                };
                pushHistory();
                setEdges([...edges, newEdge]);
                return;
              } else {
                const nodeA = createERTableNode('table', { x: p.x - 160, y: p.y - 60 }, 'Table A');
                const nodeB = createERTableNode('table', { x: p.x + 160, y: p.y - 60 }, 'Table B');
                const newEdge: SystemEdgeModel = {
                  id: crypto.randomUUID(),
                  source: nodeA.id,
                  target: nodeB.id,
                  type: 'system',
                  data: {
                    edgeType: 'rest',
                    relationshipType: item.relationshipType,
                    sourceCardinality: item.sourceCardinality || '1',
                    targetCardinality: item.targetCardinality || 'N',
                    label: '',
                    strokeStyle: 'solid',
                    color: '#64748b',
                    arrowEnd: true,
                  },
                };
                pushHistory();
                setNodes([...nodes, nodeA, nodeB]);
                setEdges([...edges, newEdge]);
                return;
              }
            }

            const nodeA = createShapeNode('rounded-rectangle', { x: p.x - 120, y: p.y }, 'Source');
            const nodeB = createShapeNode('rounded-rectangle', { x: p.x + 120, y: p.y }, 'Target');
            const newEdge: SystemEdgeModel = {
              id: crypto.randomUUID(),
              source: nodeA.id,
              target: nodeB.id,
              sourceHandle: 'right-source',
              targetHandle: 'left-target',
              type: 'system',
              data: { edgeType: item.edgeType, label: item.label || '' },
            };
            pushHistory();
            setNodes([...nodes, nodeA, nodeB]);
            setEdges([...edges, newEdge]);
            return;
          }
          if (newNode) {
            pushHistory();
            addNode(newNode);
            return;
          }
        } catch {
          // fallthrough
        }
      }
      const nodeType = event.dataTransfer.getData('application/reactflow-nodetype') as SystemNodeType;
      if (!nodeType || !(nodeType in NODE_REGISTRY)) return;
      const p = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const isGroup = nodeType === 'group';
      const node = createSystemNode(nodeType, { x: p.x - (isGroup ? 160 : 100), y: p.y - (isGroup ? 100 : 36) });
      pushHistory();
      addNode(node);
    },
    [screenToFlowPosition, addNode, addElements, pushHistory, nodes, edges, setNodes, setEdges]
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | ReactMouseEvent) => {
      event.preventDefault();
      if (useCanvasStore.getState().presentation.active) return;
      setContextMenu(null);
      if (useCanvasStore.getState().placementItem) {
        setPlacementItem(null);
      }
    },
    [setPlacementItem]
  );

  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: SystemNode) => {
      event.preventDefault();
      if (useCanvasStore.getState().presentation.active) return;
      setContextMenu(null);
      if (useCanvasStore.getState().placementItem) {
        setPlacementItem(null);
      }
      const currentNodes = useCanvasStore.getState().nodes;
      const isAlreadySelected = currentNodes.find((n) => n.id === node.id)?.selected;
      if (!isAlreadySelected) {
        setNodes(
          currentNodes.map((n) =>
            n.id === node.id ? { ...n, selected: true } : { ...n, selected: false }
          )
        );
      }
    },
    [setPlacementItem, setNodes]
  );

  const onEdgeContextMenu = useCallback(
    (event: ReactMouseEvent, edge: SystemEdgeModel) => {
      event.preventDefault();
      if (useCanvasStore.getState().presentation.active) return;
      setContextMenu(null);
      if (useCanvasStore.getState().placementItem) {
        setPlacementItem(null);
      }
      setSelectedEdgeId(edge.id);
    },
    [setPlacementItem, setSelectedEdgeId]
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const showMinimap = showMinimapSetting && !narrow && !presenting && !editorOpen;
  const showValidation = validationActive && !(narrow && editorOpen);
  const libraryOffset = !narrow && !libraryCollapsed ? LIBRARY_WIDTH : 0;

  const toolCursorClass = getCanvasCursorClass(activeTool, isSpacePanning, Boolean(placementItem), isPanning);

  return (
    <div className="flex h-dvh w-screen flex-col bg-bg">
      {!presenting && <CanvasHeader projectId={projectId} projectName={currentProject?.name} />}
      <div
        data-canvas-background={canvasBackground}
        className={cn(
          'relative flex-1 overflow-hidden transition-colors duration-150',
          !animatedEdges && 'edges-static',
          toolCursorClass
        )}
        style={canvasBgStyle}
        onContextMenu={(e) => {
          e.preventDefault();
          if (useCanvasStore.getState().placementItem) {
            setPlacementItem(null);
          }
        }}
      >
        <ValidationWarningsContext.Provider value={warningNodeIds}>
          <ReactFlow<SystemNode, SystemEdgeModel>
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnectStart={onConnectStart}
            onConnect={handleConnect}
            onConnectEnd={onConnectEnd}
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onDoubleClick={onPaneDoubleClick}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onMoveStart={onMoveStart}
            onMoveEnd={onMoveEnd}
            onNodeDragStop={onNodeDragStop}
            onSelectionDragStop={onNodeDragStop}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onPaneContextMenu={onPaneContextMenu}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultViewport={viewport}
            defaultEdgeOptions={{ type: 'system' }}
            fitView
            fitViewOptions={getFitViewOptions()}
            connectionMode={ConnectionMode.Loose}
            selectionMode={SelectionMode.Partial}
            minZoom={0.1}
            maxZoom={4}
            zoomOnScroll={false}
            zoomOnPinch={true}
            panOnScroll={true}
            panOnScrollMode={PanOnScrollMode.Free}
            preventScrolling={true}
            zoomActivationKeyCode={['Control', 'Meta']}
            zoomOnDoubleClick={false}
            selectionKeyCode={null}
            selectionOnDrag={!presenting && activeTool === 'select' && !isSpacePanning}
            multiSelectionKeyCode={['Control', 'Meta', 'Shift']}
            snapToGrid={snap}
            snapGrid={[20, 20]}
            nodesDraggable={!presenting && activeTool === 'select' && !isSpacePanning}
            nodesConnectable={!presenting && activeTool === 'select' && !isSpacePanning}
            elementsSelectable={!presenting && activeTool === 'select' && !isSpacePanning}
            edgesReconnectable={!presenting && activeTool === 'select' && !isSpacePanning}
            panOnDrag={activeTool === 'hand' || isSpacePanning ? [0, 1] : [1]}
            deleteKeyCode={null}
            style={canvasBgStyle}
            className="transition-colors duration-150"
          >
            <CanvasBackgroundLayer />
            <PencilOverlay />
            <ShapeDrawingOverlay />
            {showMinimap && (
              <MiniMap<SystemNode>
                position="bottom-right"
                pannable
                zoomable
                nodeColor={getMinimapColor}
                nodeBorderRadius={14}
                maskColor="color-mix(in oklch, var(--bg) 55%, transparent)"
                maskStrokeColor="var(--accent)"
                maskStrokeWidth={1}
                bgColor="transparent"
                style={{ width: 176, height: 112 }}
                className="!m-4 overflow-hidden rounded-[12px] border border-line shadow-[var(--shadow-lg)]"
              />
            )}
          </ReactFlow>
        </ValidationWarningsContext.Provider>

        {!presenting && (
          <>
            <NodePalette />
            <CanvasToolbar />
            <SelectionActions />
            <TextFormattingToolbar />
            {showValidation && <ValidationPanel issues={issues} editorOpen={editorOpen} />}
            {nodes.length === 0 && <EmptyCanvas offsetLeft={libraryOffset} />}
            {placementItem && (
              <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-line bg-card/95 px-4 py-1.5 text-xs font-medium text-text shadow-[var(--shadow-lg)] backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span>
                  Click canvas to place <strong className="font-semibold text-accent">{placementItem.label}</strong>
                </span>
                <span className="text-text-muted">· Esc to cancel</span>
              </div>
            )}
          </>
        )}

        <NodeEditor />
        <EdgeEditor />
        <ConnectionTypePicker />

        {presenting && <PresentationOverlay order={order} projectName={currentProject?.name} />}
        {contextMenu && !presenting && (
          <CanvasContextMenu key={`${contextMenu.x}-${contextMenu.y}`} menu={contextMenu} onClose={closeContextMenu} />
        )}

        <CommandMenu />
        <ShortcutsDialog />
        <OnboardingOverlay />
        <ShareDialog />
        <ExportDialog />
      </div>
    </div>
  );
}

export function Canvas({ projectId }: { projectId: string }) {
  const [hydrationStatus, setHydrationStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset hydration status when projectId changes
    setHydrationStatus('loading');
    setLoadError(null);

    const hydrate = async () => {
      try {
        const store = useProjectStore.getState();
        let project = store.projects.find((p) => p.id === projectId);
        if (!project) {
          project = (await store.getOrLoadProject(projectId)) ?? undefined;
        }

        if (cancelled) return;

        if (!project) {
          setHydrationStatus('not-found');
          return;
        }

        // Initialize canvas store state with the loaded project document BEFORE mounting ReactFlow
        useCanvasStore.getState().initCanvas(
          projectId,
          project.nodes as SystemNode[],
          project.edges as SystemEdgeModel[],
          project.viewport,
          project.diagramType || 'architecture',
          project.diagramData as Record<DiagramType, { nodes: SystemNode[]; edges: SystemEdgeModel[] }> | undefined
        );

        setHydrationStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load project from storage.';
        setLoadError(msg);
        setHydrationStatus('error');
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [projectId, retryKey]);

  if (hydrationStatus === 'loading') {
    return (
      <div className="dot-grid flex h-screen w-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-[13px] text-ink-3">Loading design…</span>
        </div>
      </div>
    );
  }

  if (hydrationStatus === 'not-found') {
    return (
      <div className="dot-grid flex min-h-screen items-center justify-center p-6 bg-bg">
        <div className="grid max-w-[340px] justify-items-center gap-2 text-center">
          <div className="text-[15px] font-semibold text-ink">Project not found</div>
          <p className="text-[12.5px] text-ink-2">The requested project could not be found in storage.</p>
          <Button variant="secondary" asChild className="mt-2">
            <Link href="/app">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (hydrationStatus === 'error') {
    return (
      <div className="dot-grid flex min-h-screen items-center justify-center p-6 bg-bg">
        <div className="grid max-w-[340px] justify-items-center gap-3 text-center">
          <div className="text-[15px] font-semibold text-danger">Failed to load project</div>
          <p className="text-[12.5px] text-ink-2">{loadError}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setRetryKey((k) => k + 1)}>
              Retry
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/app">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <CanvasInner projectId={projectId} />
    </ReactFlowProvider>
  );
}
