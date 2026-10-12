import { z } from 'zod';
import type { Node, Edge, Viewport } from '@xyflow/react';

export type CanvasTool =
  | 'select'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'pencil'
  | 'hand'
  | 'eraser'
  | 'text'
  | 'junction';

export interface DrawingFormatting {
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  fillColor: string;
  arrowStart: boolean;
  arrowEnd: boolean;
  routeType?: 'smoothstep' | 'bezier' | 'straight';
}

export interface BrushColorOption {
  name: string;
  value: string;
}

export const BRUSH_COLORS: readonly BrushColorOption[] = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' },
] as const;

// Node types
export const SYSTEM_NODE_TYPES = [
  'service',
  'database',
  'cache',
  'queue',
  'load-balancer',
  'client',
  'cdn',
  'api-gateway',
  'group',
  'dns',
  'waf',
  'worker',
  'serverless',
  'container-cluster',
  'object-storage',
  'search-index',
  'stream',
  'scheduler',
  'logging',
  'monitoring',
] as const;

export type SystemNodeType = (typeof SYSTEM_NODE_TYPES)[number];

// Edge types
export const SYSTEM_EDGE_TYPES = [
  'rest',
  'grpc',
  'graphql',
  'websocket',
  'pub-sub',
  'mqtt',
  'event-stream',
  'tcp',
  'db-query',
] as const;

export type SystemEdgeType = (typeof SYSTEM_EDGE_TYPES)[number];

// Node status & environment
export const NODE_STATUSES = ['operational', 'degraded', 'down', 'maintenance'] as const;
export type NodeStatus = (typeof NODE_STATUSES)[number];

export const NODE_ENVIRONMENTS = ['production', 'staging', 'development'] as const;
export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

export const SHAPE_TYPES = [
  'rectangle',
  'rounded-rectangle',
  'circle',
  'ellipse',
  'diamond',
  'triangle',
  'hexagon',
  'pill',
  'parallelogram',
  'document',
  'callout',
  'divider',
  'star',
  'arrow',
  'line',
] as const;

export type ShapeType = (typeof SHAPE_TYPES)[number];

export const STEP_IDS = [
  'requirements',
  'capacity-estimation',
  'api-design',
  'data-model',
  'high-level-design',
  'deep-dive',
  'scalability-reliability',
  'trade-offs',
  'security',
  'monitoring-observability',
] as const;

export type StepId = (typeof STEP_IDS)[number];

export interface PlacementItem {
  kind: 'component' | 'group' | 'shape' | 'step' | 'connection' | 'junction';
  type?: SystemNodeType | string;
  shapeType?: ShapeType;
  stepId?: StepId;
  edgeType?: SystemEdgeType;
  label?: string;
}

// Node data
export const SystemNodeDataSchema = z.object({
  label: z.string(),
  nodeType: z.enum(SYSTEM_NODE_TYPES),
  description: z.string().optional(),
  /** Narration shown on the story card in presentation mode. */
  story: z.string().optional(),
  techStack: z.array(z.string()).default([]),
  status: z.enum(NODE_STATUSES).optional(),
  environment: z.enum(NODE_ENVIRONMENTS).optional(),
  owner: z.string().optional(),
  links: z.array(z.object({
    label: z.string(),
    url: z.string(),
  })).optional(),
  points: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  color: z.string().optional(),
  strokeWidth: z.number().optional(),
  text: z.string().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.enum(['sans', 'serif', 'mono', 'casual']).or(z.string()).optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  widthMode: z.enum(['auto', 'fixed']).optional(),
  isNew: z.boolean().optional(),
  shapeType: z.enum(SHAPE_TYPES).optional(),
  stepId: z.enum(STEP_IDS).or(z.string()).optional(),
  stepTitle: z.string().optional(),
  stepDescription: z.string().optional(),
  stepContent: z.string().optional(),
  stepNumber: z.number().optional(),
  shapeFill: z.string().optional(),
  shapeStroke: z.string().optional(),
  strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
  arrowStart: z.boolean().optional(),
  arrowEnd: z.boolean().optional(),
  routeType: z.enum(['smoothstep', 'bezier', 'straight']).optional(),
});

export type SystemNodeData = z.infer<typeof SystemNodeDataSchema>;

// Edge data
export const SystemEdgeDataSchema = z.object({
  edgeType: z.enum(SYSTEM_EDGE_TYPES).optional().default('rest'),
  label: z.string().optional(),
  description: z.string().optional(),
  latency: z.string().optional(),
  dataFormat: z.string().optional(),
  throughput: z.string().optional(),
  color: z.string().optional(),
  strokeWidth: z.number().optional(),
  strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
  arrowStart: z.boolean().optional(),
  arrowEnd: z.boolean().optional(),
  routeType: z.enum(['smoothstep', 'bezier', 'straight']).optional(),
});

export type SystemEdgeData = z.infer<typeof SystemEdgeDataSchema>;

// React Flow typed aliases
export type SystemNode = Node<SystemNodeData, string>;
export type SystemEdge = Edge<SystemEdgeData>;

// Project
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number(),
  }).default({ x: 0, y: 0, zoom: 1 }),
});

export type Project = z.infer<typeof ProjectSchema>;

// App data (persisted)
export const AppDataSchema = z.object({
  version: z.number().default(1),
  projects: z.array(ProjectSchema).default([]),
  lastOpenedProjectId: z.string().nullable().default(null),
});

export type AppData = z.infer<typeof AppDataSchema>;

// Default viewport
export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
