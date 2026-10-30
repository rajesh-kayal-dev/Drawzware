import type { SystemNode, SystemEdge } from '@/features/canvas/types/canvas.types';
import {
  createSequenceParticipantNode,
  createSequenceFragmentNode,
  createERTableNode,
} from '@/features/canvas/utils/node-factory';

export function getInitialSequenceDiagram(): { nodes: SystemNode[]; edges: SystemEdge[] } {
  const clientNode = createSequenceParticipantNode('actor', { x: 120, y: 70 }, 'Client', '#a855f7');
  const gatewayNode = createSequenceParticipantNode('service', { x: 380, y: 70 }, 'API Gateway', '#38bdf8');
  const authNode = createSequenceParticipantNode('service', { x: 640, y: 70 }, 'Auth Service', '#10b981');

  const fragmentNode = createSequenceFragmentNode('alt', { x: 70, y: 270 }, 'alt [token valid]', '#8b5cf6');
  fragmentNode.style = { width: 680, height: 260 };

  const edges: SystemEdge[] = [
    {
      id: `edge-seq-1`,
      source: clientNode.id,
      target: gatewayNode.id,
      sourceHandle: 'right-out-0',
      targetHandle: 'left-in-0',
      type: 'system',
      data: {
        edgeType: 'rest',
        messageType: 'sync',
        label: '1. Login Request',
        strokeStyle: 'solid',
        arrowhead: 'filled',
        color: '#3b82f6',
        textSize: '14px',
        arrowEnd: true,
      },
    },
    {
      id: `edge-seq-2`,
      source: gatewayNode.id,
      target: authNode.id,
      sourceHandle: 'right-out-1',
      targetHandle: 'left-in-1',
      type: 'system',
      data: {
        edgeType: 'rest',
        messageType: 'sync',
        label: '2. Validate Token',
        strokeStyle: 'solid',
        arrowhead: 'filled',
        color: '#3b82f6',
        textSize: '14px',
        notes: 'API Gateway validates the JWT token with Auth Service.',
        arrowEnd: true,
      },
    },
    {
      id: `edge-seq-3`,
      source: authNode.id,
      target: gatewayNode.id,
      sourceHandle: 'left-out-2',
      targetHandle: 'right-in-2',
      type: 'system',
      data: {
        edgeType: 'event-stream',
        messageType: 'return',
        label: '3. Token Valid',
        strokeStyle: 'dashed',
        arrowhead: 'open',
        color: '#10b981',
        textSize: '14px',
        arrowEnd: true,
      },
    },
    {
      id: `edge-seq-4`,
      source: gatewayNode.id,
      target: authNode.id,
      sourceHandle: 'right-out-3',
      targetHandle: 'left-in-3',
      type: 'system',
      data: {
        edgeType: 'rest',
        messageType: 'sync',
        label: '4. Get User Data',
        strokeStyle: 'solid',
        arrowhead: 'filled',
        color: '#3b82f6',
        textSize: '14px',
        arrowEnd: true,
      },
    },
    {
      id: `edge-seq-5`,
      source: authNode.id,
      target: gatewayNode.id,
      sourceHandle: 'left-out-4',
      targetHandle: 'right-in-4',
      type: 'system',
      data: {
        edgeType: 'event-stream',
        messageType: 'return',
        label: '5. User Data',
        strokeStyle: 'dashed',
        arrowhead: 'open',
        color: '#38bdf8',
        textSize: '14px',
        arrowEnd: true,
      },
    },
    {
      id: `edge-seq-6`,
      source: gatewayNode.id,
      target: clientNode.id,
      sourceHandle: 'left-out-5',
      targetHandle: 'right-in-5',
      type: 'system',
      data: {
        edgeType: 'event-stream',
        messageType: 'return',
        label: '6. Error Response',
        strokeStyle: 'dashed',
        arrowhead: 'open',
        color: '#ec4899',
        textSize: '14px',
        arrowEnd: true,
      },
    },
  ];

  return {
    nodes: [clientNode, gatewayNode, authNode, fragmentNode],
    edges,
  };
}

export function getInitialERDiagram(): { nodes: SystemNode[]; edges: SystemEdge[] } {
  const usersTable = createERTableNode(
    'table',
    { x: 140, y: 190 },
    'Users',
    [
      { id: 'u1', name: 'id', type: 'UUID', isPk: true, isNullable: false },
      { id: 'u2', name: 'name', type: 'VARCHAR', isNullable: false },
      { id: 'u3', name: 'email', type: 'VARCHAR', isUnique: true, isNullable: false },
      { id: 'u4', name: 'created_at', type: 'TIMESTAMP', isNullable: false },
    ],
    '#38bdf8'
  );
  usersTable.data.description = 'Application users of the system';

  const ordersTable = createERTableNode(
    'table',
    { x: 480, y: 60 },
    'Orders',
    [
      { id: 'o1', name: 'id', type: 'UUID', isPk: true, isNullable: false },
      { id: 'o2', name: 'user_id', type: 'UUID', isFk: true, isNullable: false },
      { id: 'o3', name: 'total', type: 'DECIMAL', isNullable: false },
      { id: 'o4', name: 'status', type: 'VARCHAR', isNullable: false },
      { id: 'o5', name: 'created_at', type: 'TIMESTAMP', isNullable: false },
    ],
    '#10b981'
  );

  const orderItemsTable = createERTableNode(
    'table',
    { x: 480, y: 320 },
    'OrderItems',
    [
      { id: 'oi1', name: 'id', type: 'UUID', isPk: true, isNullable: false },
      { id: 'oi2', name: 'order_id', type: 'UUID', isFk: true, isNullable: false },
      { id: 'oi3', name: 'product_id', type: 'UUID', isFk: true, isNullable: false },
      { id: 'oi4', name: 'quantity', type: 'INT', isNullable: false },
      { id: 'oi5', name: 'price', type: 'DECIMAL', isNullable: false },
    ],
    '#8b5cf6'
  );

  const productsTable = createERTableNode(
    'table',
    { x: 480, y: 580 },
    'Products',
    [
      { id: 'p1', name: 'id', type: 'UUID', isPk: true, isNullable: false },
      { id: 'p2', name: 'name', type: 'VARCHAR', isNullable: false },
      { id: 'p3', name: 'price', type: 'DECIMAL', isNullable: false },
      { id: 'p4', name: 'stock', type: 'INT', isNullable: false },
      { id: 'p5', name: 'created_at', type: 'TIMESTAMP', isNullable: false },
    ],
    '#f59e0b'
  );

  const edges: SystemEdge[] = [
    {
      id: `edge-er-1`,
      source: usersTable.id,
      target: ordersTable.id,
      sourceHandle: 'handle-right-u1',
      targetHandle: 'handle-left-o2',
      type: 'system',
      data: {
        edgeType: 'rest',
        relationshipType: 'one-to-many',
        sourceCardinality: '1',
        targetCardinality: 'N',
        label: '',
        strokeStyle: 'solid',
        color: '#64748b',
        arrowEnd: true,
      },
    },
    {
      id: `edge-er-2`,
      source: ordersTable.id,
      target: orderItemsTable.id,
      sourceHandle: 'bottom-source',
      targetHandle: 'top-target',
      type: 'system',
      data: {
        edgeType: 'rest',
        relationshipType: 'one-to-many',
        sourceCardinality: '1',
        targetCardinality: 'N',
        label: '',
        strokeStyle: 'solid',
        color: '#64748b',
        arrowEnd: true,
      },
    },
    {
      id: `edge-er-3`,
      source: orderItemsTable.id,
      target: productsTable.id,
      sourceHandle: 'bottom-source',
      targetHandle: 'top-target',
      type: 'system',
      data: {
        edgeType: 'rest',
        relationshipType: 'one-to-many',
        sourceCardinality: 'N',
        targetCardinality: '1',
        label: '',
        strokeStyle: 'solid',
        color: '#64748b',
        arrowEnd: true,
      },
    },
  ];

  return {
    nodes: [usersTable, ordersTable, orderItemsTable, productsTable],
    edges,
  };
}
