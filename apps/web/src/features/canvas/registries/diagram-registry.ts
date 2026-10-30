import type { LucideIcon } from 'lucide-react';
import {
  Monitor,
  Smartphone,
  Globe,
  Scale,
  Shield,
  Globe2,
  Server,
  Boxes,
  Zap,
  Database,
  MessageSquare,
  HardDrive,
  User,
  Box,
  ArrowRight,
  ArrowLeft,
  Split,
  CheckSquare,
  RefreshCw,
  StickyNote,
  Table,
  Layout,
  Binary,
  Key,
  ArrowLeftRight,
  GitFork,
  Workflow,
  SquareDashed,
} from 'lucide-react';
import type { PlacementItem } from '@/features/canvas/types/canvas.types';

export interface DiagramItem {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  placement: PlacementItem;
}

export interface DiagramCategoryGroup {
  category: string;
  items: DiagramItem[];
}

export const DIAGRAM_ARCHITECTURE_GROUPS: DiagramCategoryGroup[] = [
  {
    category: 'Clients & Interfaces',
    items: [
      { id: 'arch-client', label: 'Client', icon: Monitor, color: '#a855f7', placement: { kind: 'component', type: 'client', label: 'Client' } },
      { id: 'arch-mobile', label: 'Mobile App', icon: Smartphone, color: '#06b6d4', placement: { kind: 'component', type: 'client', label: 'Mobile App' } },
      { id: 'arch-web', label: 'Web App', icon: Globe, color: '#3b82f6', placement: { kind: 'component', type: 'client', label: 'Web App' } },
    ],
  },
  {
    category: 'Load & Network',
    items: [
      { id: 'arch-lb', label: 'Load Balancer', icon: Scale, color: '#ef4444', placement: { kind: 'component', type: 'load-balancer', label: 'Load Balancer' } },
      { id: 'arch-gw', label: 'API Gateway', icon: Shield, color: '#ec4899', placement: { kind: 'component', type: 'api-gateway', label: 'API Gateway' } },
      { id: 'arch-cdn', label: 'CDN', icon: Globe2, color: '#06b6d4', placement: { kind: 'component', type: 'cdn', label: 'CDN' } },
    ],
  },
  {
    category: 'Compute',
    items: [
      { id: 'arch-server', label: 'Server', icon: Server, color: '#3b82f6', placement: { kind: 'component', type: 'server', label: 'Server' } },
      { id: 'arch-container', label: 'Container', icon: Boxes, color: '#10b981', placement: { kind: 'component', type: 'container-cluster', label: 'Container' } },
      { id: 'arch-fn', label: 'Function', icon: Zap, color: '#06b6d4', placement: { kind: 'component', type: 'serverless', label: 'Function' } },
    ],
  },
  {
    category: 'Data & Storage',
    items: [
      { id: 'arch-db', label: 'Database', icon: Database, color: '#3b82f6', placement: { kind: 'component', type: 'database', label: 'Database' } },
      { id: 'arch-cache', label: 'Cache', icon: Zap, color: '#10b981', placement: { kind: 'component', type: 'cache', label: 'Cache' } },
      { id: 'arch-queue', label: 'Queue', icon: MessageSquare, color: '#a855f7', placement: { kind: 'component', type: 'queue', label: 'Queue' } },
      { id: 'arch-obj', label: 'Object Storage', icon: HardDrive, color: '#10b981', placement: { kind: 'component', type: 'object-storage', label: 'Object Storage' } },
    ],
  },
];

export const DIAGRAM_SEQUENCE_GROUPS: DiagramCategoryGroup[] = [
  {
    category: 'Participants',
    items: [
      { id: 'seq-actor', label: 'Actor', icon: User, color: '#a855f7', placement: { kind: 'sequence-participant', participantType: 'actor', label: 'Actor', color: '#a855f7' } },
      { id: 'seq-service', label: 'Service', icon: Box, color: '#38bdf8', placement: { kind: 'sequence-participant', participantType: 'service', label: 'Service', color: '#38bdf8' } },
      { id: 'seq-db', label: 'Database', icon: Database, color: '#06b6d4', placement: { kind: 'sequence-participant', participantType: 'database', label: 'Database', color: '#06b6d4' } },
    ],
  },
  {
    category: 'Messages',
    items: [
      { id: 'seq-sync', label: 'Sync Message', icon: ArrowRight, color: '#38bdf8', placement: { kind: 'connection', edgeType: 'rest', messageType: 'sync', strokeStyle: 'solid', arrowEnd: true, label: 'Sync Message' } },
      { id: 'seq-async', label: 'Async Message', icon: ArrowRight, color: '#06b6d4', placement: { kind: 'connection', edgeType: 'event-stream', messageType: 'async', strokeStyle: 'dashed', arrowEnd: true, label: 'Async Message' } },
      { id: 'seq-return', label: 'Return Message', icon: ArrowLeft, color: '#94a3b8', placement: { kind: 'connection', edgeType: 'event-stream', messageType: 'return', strokeStyle: 'dashed', arrowEnd: true, label: 'Return Message' } },
    ],
  },
  {
    category: 'Fragments',
    items: [
      { id: 'seq-alt', label: 'Alt', icon: Split, color: '#8b5cf6', placement: { kind: 'sequence-fragment', fragmentType: 'alt', label: 'alt [token valid]' } },
      { id: 'seq-opt', label: 'Opt', icon: CheckSquare, color: '#10b981', placement: { kind: 'sequence-fragment', fragmentType: 'opt', label: 'opt [condition]' } },
      { id: 'seq-loop', label: 'Loop', icon: RefreshCw, color: '#3b82f6', placement: { kind: 'sequence-fragment', fragmentType: 'loop', label: 'loop [condition]' } },
    ],
  },
  {
    category: 'Others',
    items: [
      { id: 'seq-note', label: 'Note', icon: StickyNote, color: '#f59e0b', placement: { kind: 'shape', shapeType: 'document', label: 'Note' } },
    ],
  },
];

export const DIAGRAM_ER_GROUPS: DiagramCategoryGroup[] = [
  {
    category: 'Entities',
    items: [
      {
        id: 'er-table',
        label: 'Table',
        icon: Table,
        color: '#38bdf8',
        placement: {
          kind: 'er-table',
          tableType: 'table',
          label: 'Users',
          color: '#38bdf8',
          columns: [
            { id: 'c1', name: 'id', type: 'UUID', isPk: true, isNullable: false },
            { id: 'c2', name: 'name', type: 'VARCHAR', isNullable: false },
            { id: 'c3', name: 'email', type: 'VARCHAR', isUnique: true, isNullable: false },
            { id: 'c4', name: 'created_at', type: 'TIMESTAMP', isNullable: false },
          ],
        },
      },
      {
        id: 'er-view',
        label: 'View',
        icon: Layout,
        color: '#8b5cf6',
        placement: {
          kind: 'er-table',
          tableType: 'view',
          label: 'UserOrdersView',
          color: '#8b5cf6',
          columns: [
            { id: 'c1', name: 'user_id', type: 'UUID', isFk: true, isNullable: false },
            { id: 'c2', name: 'order_count', type: 'INT', isNullable: false },
            { id: 'c3', name: 'total_amount', type: 'DECIMAL', isNullable: false },
          ],
        },
      },
      {
        id: 'er-enum',
        label: 'Enum',
        icon: Binary,
        color: '#10b981',
        placement: {
          kind: 'er-table',
          tableType: 'enum',
          label: 'OrderStatus',
          color: '#10b981',
          columns: [
            { id: 'c1', name: 'PENDING', type: 'ENUM', isNullable: false },
            { id: 'c2', name: 'PROCESSING', type: 'ENUM', isNullable: false },
            { id: 'c3', name: 'COMPLETED', type: 'ENUM', isNullable: false },
          ],
        },
      },
    ],
  },
  {
    category: 'Column Types',
    items: [
      {
        id: 'er-col-pk',
        label: 'Primary Key',
        icon: Key,
        color: '#a855f7',
        placement: {
          kind: 'er-table',
          tableType: 'table',
          label: 'Entity',
          color: '#a855f7',
          columns: [
            { id: 'pk-1', name: 'id', type: 'UUID', isPk: true, isNullable: false },
          ],
        },
      },
    ],
  },
  {
    category: 'Relationships',
    items: [
      { id: 'er-1-1', label: 'One to One', icon: ArrowLeftRight, color: '#3b82f6', placement: { kind: 'connection', edgeType: 'rest', relationshipType: 'one-to-one', sourceCardinality: '1', targetCardinality: '1', label: '1 : 1' } },
      { id: 'er-1-n', label: 'One to Many', icon: GitFork, color: '#10b981', placement: { kind: 'connection', edgeType: 'rest', relationshipType: 'one-to-many', sourceCardinality: '1', targetCardinality: 'N', label: '1 : N' } },
      { id: 'er-n-m', label: 'Many to Many', icon: Workflow, color: '#a855f7', placement: { kind: 'connection', edgeType: 'rest', relationshipType: 'many-to-many', sourceCardinality: 'N', targetCardinality: 'N', label: 'M : N' } },
    ],
  },
  {
    category: 'Others',
    items: [
      { id: 'er-note', label: 'Note', icon: StickyNote, color: '#f59e0b', placement: { kind: 'shape', shapeType: 'document', label: 'Note' } },
      { id: 'er-group', label: 'Group', icon: SquareDashed, color: '#94a3b8', placement: { kind: 'group', label: 'Group' } },
    ],
  },
];
