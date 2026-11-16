import { beforeEach, describe, expect, it } from 'vitest';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { createSystemNode } from '@/features/canvas/utils/node-factory';
import { normalizeConnectionHandles } from '@/features/canvas/utils/connection-handles';

describe('Canvas system node connections', () => {
  beforeEach(() => {
    const source = createSystemNode('api-gateway', { x: 0, y: 0 });
    const target = createSystemNode('service', { x: 240, y: 0 });
    useCanvasStore.getState().initCanvas('connections-test', [source, target], [], { x: 0, y: 0, zoom: 1 });
  });

  it('stores an edge between system node handles', () => {
    const [source, target] = useCanvasStore.getState().nodes;

    useCanvasStore.getState().onConnect({
      source: source.id,
      sourceHandle: 'right-source',
      target: target.id,
      targetHandle: 'left-target',
    });

    expect(useCanvasStore.getState().edges).toHaveLength(1);
    expect(useCanvasStore.getState().edges[0]).toMatchObject({
      source: source.id,
      sourceHandle: 'right-source',
      target: target.id,
      targetHandle: 'left-target',
    });
  });

  it('keeps the new wire selected when confirming its default REST type', () => {
    const [source, target] = useCanvasStore.getState().nodes;
    useCanvasStore.getState().onConnect({
      source: source.id,
      sourceHandle: 'right-source',
      target: target.id,
      targetHandle: 'left-target',
    });

    const edge = useCanvasStore.getState().edges[0];
    useCanvasStore.getState().setPendingEdge({ edgeId: edge.id, position: { x: 120, y: 40 } });
    useCanvasStore.getState().setSelectedEdgeId(edge.id);
    useCanvasStore.getState().setPendingEdge(null);

    expect(useCanvasStore.getState().edges).toHaveLength(1);
    expect(useCanvasStore.getState().edges[0]).toMatchObject({ id: edge.id, selected: true });
    expect(useCanvasStore.getState().selectedEdgeId).toBe(edge.id);
  });

  it('uses source and target handle roles after a reverse drag', () => {
    expect(normalizeConnectionHandles({ sourceHandle: 'right-target', targetHandle: 'left-source' })).toEqual({
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
    });
  });
});
