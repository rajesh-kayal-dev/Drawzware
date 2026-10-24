import { NODE_REGISTRY } from '@/components/nodes/node-registry';
import type { ERColumn, ShapeType, StepId, SystemNode, SystemNodeData, SystemNodeType } from '@/types';
import { getStepConfig, getStepFormatting, SYSTEM_DESIGN_STEPS } from './steps-registry';

let counter = 0;

function nextId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

/** New component node (or group) of the given type at a flow position. */
export function createSystemNode(
  nodeType: SystemNodeType,
  position: { x: number; y: number },
  overrideData?: Partial<SystemNodeData>
): SystemNode {
  const config = NODE_REGISTRY[nodeType] ?? NODE_REGISTRY.service;
  const isGroup = nodeType === 'group';
  const data: SystemNodeData = {
    label: isGroup ? 'Group' : config.label,
    nodeType,
    description: '',
    techStack: [...config.defaultTechStack],
    ...overrideData,
  };
  return {
    id: nextId(isGroup ? 'group' : 'node'),
    type: isGroup ? 'group' : 'system',
    position,
    ...(isGroup ? { style: { width: 320, height: 200 } } : {}),
    data,
  };
}

/** New sticky note at a flow position. */
export function createNoteNode(position: { x: number; y: number }): SystemNode {
  return {
    id: nextId('note'),
    type: 'note',
    position,
    data: { label: '', nodeType: 'service', description: '', techStack: [] },
  };
}

/** New freehand pencil drawing node at a flow position. */
export function createDrawingNode(
  position: { x: number; y: number },
  width: number,
  height: number,
  points: { x: number; y: number }[],
  color = 'var(--ink)',
  strokeWidth = 2.5
): SystemNode {
  return {
    id: nextId('drawing'),
    type: 'drawing',
    position,
    style: { width: Math.max(width, 10), height: Math.max(height, 10) },
    data: {
      label: 'Drawing',
      nodeType: 'service',
      description: '',
      techStack: [],
      points,
      color,
      strokeWidth,
    },
  };
}

/** New standalone text node at a flow position. */
export function createCanvasTextNode(
  position: { x: number; y: number },
  initialText = '',
  formatting?: Partial<SystemNodeData>
): SystemNode {
  return {
    id: nextId('text'),
    type: 'text',
    position,
    data: {
      label: initialText,
      text: initialText,
      nodeType: 'service',
      description: '',
      techStack: [],
      fontSize: formatting?.fontSize ?? 16,
      fontFamily: formatting?.fontFamily ?? 'sans',
      color: formatting?.color ?? 'var(--ink)',
      bold: formatting?.bold ?? false,
      italic: formatting?.italic ?? false,
      underline: formatting?.underline ?? false,
      align: formatting?.align ?? 'left',
      widthMode: 'auto',
      isNew: formatting?.isNew ?? true,
    },
  };
}

/** New shape node at a flow position. */
export function createShapeNode(
  shapeType: ShapeType,
  position: { x: number; y: number },
  initialLabel = '',
  dimensions?: { width: number; height: number },
  formatting?: Partial<SystemNodeData>
): SystemNode {
  let width = dimensions?.width ?? 160;
  let height = dimensions?.height ?? 90;

  if (!dimensions) {
    if (shapeType === 'circle' || shapeType === 'star' || shapeType === 'user') {
      width = 110;
      height = 110;
    } else if (shapeType === 'diamond') {
      width = 130;
      height = 130;
    } else if (shapeType === 'triangle') {
      width = 130;
      height = 110;
    } else if (shapeType === 'hexagon') {
      width = 140;
      height = 100;
    } else if (shapeType === 'divider' || shapeType === 'line' || shapeType === 'arrow') {
      width = 160;
      height = 30;
    } else if (shapeType === 'callout') {
      width = 170;
      height = 100;
    }
  }

  return {
    id: nextId('shape'),
    type: 'shape',
    position,
    style: { width, height },
    data: {
      label: initialLabel,
      nodeType: 'service',
      description: '',
      techStack: [],
      shapeType,
      color: formatting?.color ?? 'var(--ink)',
      shapeFill: formatting?.shapeFill ?? 'transparent',
      shapeStroke: formatting?.shapeStroke ?? '#3b82f6',
      strokeWidth: formatting?.strokeWidth ?? 2.5,
      strokeStyle: formatting?.strokeStyle ?? 'solid',
      arrowStart: formatting?.arrowStart ?? false,
      arrowEnd: formatting?.arrowEnd ?? true,
      points: formatting?.points,
    },
  };
}

/** New junction connection anchor at a flow position. */
export function createJunctionNode(
  position: { x: number; y: number }
): SystemNode {
  return {
    id: nextId('junction'),
    type: 'junction',
    position,
    data: {
      label: '',
      nodeType: 'service',
      description: '',
      techStack: [],
    },
  };
}

/** New System Design Step documentation card at a flow position. */
export function createStepNode(
  stepId: StepId,
  position: { x: number; y: number },
  customData?: Partial<SystemNodeData>
): SystemNode {
  const stepConfig = getStepConfig(stepId) ?? SYSTEM_DESIGN_STEPS[0];
  const savedFormatting = getStepFormatting(stepId);

  return {
    id: nextId('step'),
    type: 'step',
    position,
    style: { width: 340, height: 280 },
    data: {
      label: stepConfig.title,
      nodeType: 'service',
      description: stepConfig.subtitle,
      techStack: [],
      stepId,
      stepNumber: stepConfig.stepNumber,
      stepTitle: stepConfig.title,
      stepDescription: stepConfig.subtitle,
      stepContent: stepConfig.defaultContent,
      ...savedFormatting,
      ...customData,
    },
  };
}

/** New sequence participant (actor, service, database) at a flow position. */
export function createSequenceParticipantNode(
  participantType: 'actor' | 'service' | 'database' = 'service',
  position: { x: number; y: number },
  label?: string,
  color?: string
): SystemNode {
  const defaultLabel = participantType === 'actor' ? 'Actor' : participantType === 'database' ? 'Database' : 'Service';
  return {
    id: nextId('seq-part'),
    type: 'sequence-participant',
    position,
    data: {
      label: label || defaultLabel,
      nodeType: 'service',
      description: '',
      techStack: [],
      participantType,
      color: color || (participantType === 'actor' ? '#a855f7' : participantType === 'database' ? '#06b6d4' : '#22c55e'),
      lifelineLength: 380,
    },
  };
}

/** New sequence combined fragment (alt, loop, opt, par) at a flow position. */
export function createSequenceFragmentNode(
  fragmentType: 'alt' | 'loop' | 'opt' | 'par' = 'alt',
  position: { x: number; y: number },
  label?: string,
  color?: string
): SystemNode {
  return {
    id: nextId('seq-frag'),
    type: 'sequence-fragment',
    position,
    style: { width: 320, height: 160 },
    data: {
      label: label || `${fragmentType} [Condition]`,
      nodeType: 'service',
      description: '',
      techStack: [],
      fragmentType,
      fragmentCondition: label || `${fragmentType} [Condition]`,
      color,
    },
  };
}

/** New ER entity table at a flow position. */
export function createERTableNode(
  tableType: 'table' | 'view' | 'enum' = 'table',
  position: { x: number; y: number },
  label?: string,
  columns?: ERColumn[],
  color?: string
): SystemNode {
  const defaultCols = columns || [
    { id: 'col-1', name: 'id', type: 'UUID', isPk: true },
    { id: 'col-2', name: 'name', type: 'string' },
    { id: 'col-3', name: 'created_at', type: 'timestamp' },
  ];

  return {
    id: nextId('er-table'),
    type: 'er-table',
    position,
    data: {
      label: label || 'table_name',
      nodeType: 'database',
      description: '',
      techStack: [],
      tableType,
      columns: defaultCols,
      color: color || (tableType === 'table' ? '#38bdf8' : tableType === 'view' ? '#8b5cf6' : '#10b981'),
    },
  };
}

