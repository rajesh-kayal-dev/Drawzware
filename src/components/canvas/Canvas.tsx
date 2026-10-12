'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  SelectionMode,
  reconnectEdge,
  useReactFlow,
  useStore,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type OnReconnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '@/stores/useCanvasStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { BaseSystemNode } from '@/components/nodes/BaseSystemNode';
import { GroupNode } from '@/components/nodes/GroupNode';
import { StickyNote } from '@/components/nodes/StickyNote';
import { NodeEditor } from '@/components/nodes/NodeEditor';
import { NODE_REGISTRY } from '@/components/nodes/node-registry';
import { SystemEdge } from '@/components/edges/SystemEdge';
import { EdgeEditor } from '@/components/edges/EdgeEditor';
import { ConnectionTypePicker } from '@/components/edges/ConnectionTypePicker';
import { CanvasHeader } from '@/components/layout/CanvasHeader';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIsNarrow } from '@/hooks/useMediaQuery';
import { createSystemNode } from '@/lib/node-factory';
import { getMinimapColor } from '@/lib/minimap';
import { computeIssues, ValidationWarningsContext } from '@/lib/validation';
import { cn } from '@/lib/utils';
import type { SystemNode, SystemEdge as SystemEdgeModel, SystemNodeType, PlacementItem } from '@/types';
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
import { ShareDialog } from './ShareDialog';
import { ExportDialog } from './ExportDialog';
import { FreehandDrawingNode } from '@/components/nodes/FreehandDrawingNode';
import { CanvasTextNode } from '@/components/nodes/CanvasTextNode';
import { ShapeNode } from '@/components/nodes/ShapeNode';
import { StepNode } from '@/components/nodes/StepNode';
import { JunctionNode } from '@/components/nodes/JunctionNode';
import { PencilOverlay } from './PencilOverlay';
import { ShapeDrawingOverlay } from './ShapeDrawingOverlay';
import { TextFormattingToolbar } from './TextFormattingToolbar';
import { createCanvasTextNode, createShapeNode, createStepNode, createJunctionNode } from '@/lib/node-factory';
import { getFitViewOptions, presentationOrder } from './canvas-helpers';

const nodeTypes = {
  system: BaseSystemNode,
  group: GroupNode,
  note: StickyNote,
  drawing: FreehandDrawingNode,
  text: CanvasTextNode,
  shape: ShapeNode,
  step: StepNode,
  junction: JunctionNode,
};
const edgeTypes = { system: SystemEdge };
const LIBRARY_WIDTH = 260 + 16;

/** Dot grid: gap scales with zoom, dots stay ~1px like the Studio canvas ground. */
function DotGrid() {
  const zoom = useStore((s) => s.transform[2]);
  return <Background variant={BackgroundVariant.Dots} gap={20} size={2 / zoom} color="var(--dots)" />;
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
  const initCanvas = useCanvasStore((s) => s.initCanvas);
  const addNode = useCanvasStore((s) => s.addNode);
  const deleteEdge = useCanvasStore((s) => s.deleteEdge);
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

  const narrow = useIsNarrow();
  const presenting = presentation.active;

  const connectEndPos = useRef<{ x: number; y: number } | null>(null);
  const edgeReconnectSuccessful = useRef(true);

  const { screenToFlowPosition, fitView, getViewport, setViewport: setFlowViewport } = useReactFlow();
  useAutoSave();
  useKeyboardShortcuts();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const projects = useProjectStore((s) => s.projects);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const loaded = useProjectStore((s) => s.loaded);
  const currentProject = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (!loaded) loadProjects();
  }, [loaded, loadProjects]);

  useEffect(() => {
    if (!loaded) return;
    const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
    if (!project) return;
    initCanvas(projectId, project.nodes as SystemNode[], project.edges as SystemEdgeModel[], project.viewport);
    requestAnimationFrame(() => {
      fitView(getFitViewOptions(200));
    });
  }, [projectId, loaded, initCanvas, fitView]);

  // Library starts collapsed (i.e. the bottom sheet closed) on narrow screens.
  useEffect(() => {
    if (narrow) setLibraryCollapsed(true);
  }, [narrow, setLibraryCollapsed]);

  // ── Derived chrome state ───────────────────────────────
  const selectedCount = useMemo(() => nodes.reduce((n, node) => n + (node.selected ? 1 : 0), 0), [nodes]);
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : undefined;
  const nodeEditorOpen = selectedNode?.type === 'system' && selectedCount < 2;
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
      if (useCanvasStore.getState().activeTool !== 'select') {
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
          newNode = createSystemNode(placementItem.type as SystemNodeType, flowPos);
          if (placementItem.label) newNode.data.label = placementItem.label;
        } else if (placementItem.kind === 'group') {
          newNode = createSystemNode('group', flowPos);
          if (placementItem.label) newNode.data.label = placementItem.label;
        } else if (placementItem.kind === 'junction') {
          newNode = createJunctionNode(flowPos);
        } else if (placementItem.kind === 'connection' && placementItem.edgeType) {
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
      if (useCanvasStore.getState().activeTool !== 'select') {
        setActiveTool('select');
      }
    },
    [
      placementItem,
      nodes,
      edges,
      activeTool,
      screenToFlowPosition,
      pushHistory,
      addNode,
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

  const onMoveEnd = useCallback(
    (_: unknown, vp: { x: number; y: number; zoom: number }) => setViewport(vp),
    [setViewport]
  );

  const onNodeDragStop = useCallback(() => pushHistory(), [pushHistory]);

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      onConnect(connection);
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

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: SystemEdgeModel) => {
      if (!edgeReconnectSuccessful.current) deleteEdge(edge.id);
    },
    [deleteEdge]
  );

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
            newNode = createSystemNode(item.type as SystemNodeType, { x: p.x - 100, y: p.y - 36 });
            if (item.label) newNode.data.label = item.label;
          } else if (item.kind === 'group') {
            newNode = createSystemNode('group', { x: p.x - 160, y: p.y - 100 });
            if (item.label) newNode.data.label = item.label;
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
    [screenToFlowPosition, addNode, pushHistory]
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | ReactMouseEvent) => {
      event.preventDefault();
      if (useCanvasStore.getState().presentation.active) return;
      setContextMenu(null);
      if (useCanvasStore.getState().activeTool !== 'select') {
        setActiveTool('select');
      }
      if (useCanvasStore.getState().placementItem) {
        setPlacementItem(null);
      }
    },
    [setActiveTool, setPlacementItem]
  );

  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: SystemNode) => {
      event.preventDefault();
      if (useCanvasStore.getState().presentation.active) return;
      setContextMenu(null);
      if (useCanvasStore.getState().activeTool !== 'select') {
        setActiveTool('select');
      }
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
    [setActiveTool, setPlacementItem, setNodes]
  );

  const onEdgeContextMenu = useCallback(
    (event: ReactMouseEvent, edge: SystemEdgeModel) => {
      event.preventDefault();
      if (useCanvasStore.getState().presentation.active) return;
      setContextMenu(null);
      if (useCanvasStore.getState().activeTool !== 'select') {
        setActiveTool('select');
      }
      if (useCanvasStore.getState().placementItem) {
        setPlacementItem(null);
      }
      setSelectedEdgeId(edge.id);
    },
    [setActiveTool, setPlacementItem, setSelectedEdgeId]
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const panStartRef = useRef<{ x: number; y: number; vpX: number; vpY: number; zoom: number } | null>(null);

  const onPointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 2) {
        if (useCanvasStore.getState().activeTool !== 'select') {
          setActiveTool('select');
        }
        if (useCanvasStore.getState().placementItem) {
          setPlacementItem(null);
        }
      }

      const isMiddle = e.button === 1;
      const isSpaceDrag = e.button === 0 && isSpacePanning;
      const isHandDrag = e.button === 0 && activeTool === 'hand';

      if (isMiddle || isSpaceDrag || isHandDrag) {
        e.preventDefault();
        e.stopPropagation();
        const currentVp = getViewport();
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          vpX: currentVp.x,
          vpY: currentVp.y,
          zoom: currentVp.zoom,
        };

        const prevCursor = document.body.style.cursor;
        document.body.style.cursor = 'grabbing';

        const onPointerMove = (ev: PointerEvent) => {
          if (!panStartRef.current) return;
          const dx = ev.clientX - panStartRef.current.x;
          const dy = ev.clientY - panStartRef.current.y;
          setFlowViewport({
            x: panStartRef.current.vpX + dx,
            y: panStartRef.current.vpY + dy,
            zoom: panStartRef.current.zoom,
          });
        };

        const onPointerUp = () => {
          panStartRef.current = null;
          document.body.style.cursor = prevCursor;
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          window.removeEventListener('pointercancel', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
      }
    },
    [isSpacePanning, activeTool, getViewport, setFlowViewport, setActiveTool, setPlacementItem]
  );

  const showMinimap = showMinimapSetting && !narrow && !presenting && !editorOpen;
  const showValidation = validationActive && !(narrow && editorOpen);
  const libraryOffset = !narrow && !libraryCollapsed ? LIBRARY_WIDTH : 0;

  return (
    <div className="flex h-dvh w-screen flex-col bg-bg">
      {!presenting && <CanvasHeader projectId={projectId} projectName={currentProject?.name} />}
      <div
        className={cn(
          'relative flex-1 overflow-hidden',
          !animatedEdges && 'edges-static',
          activeTool === 'text' && 'cursor-text',
          placementItem && 'cursor-crosshair',
          (activeTool === 'hand' || isSpacePanning) &&
          'cursor-grab active:cursor-grabbing [&_.react-flow__node]:pointer-events-none [&_.react-flow__edge]:pointer-events-none'
        )}
        onPointerDownCapture={onPointerDownCapture}
        onContextMenu={(e) => {
          e.preventDefault();
          if (useCanvasStore.getState().activeTool !== 'select') {
            setActiveTool('select');
          }
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
            panOnDrag={activeTool === 'hand' || isSpacePanning ? [0] : false}
            deleteKeyCode={null}
            className="bg-bg"
          >
            <DotGrid />
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
  return (
    <ReactFlowProvider>
      <CanvasInner projectId={projectId} />
    </ReactFlowProvider>
  );
}
