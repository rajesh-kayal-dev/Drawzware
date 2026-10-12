import { NODE_REGISTRY } from '@/components/nodes/node-registry';
import type { ShapeType, StepId, SystemNode, SystemNodeData, SystemNodeType } from '@/types';
import { getStepConfig, SYSTEM_DESIGN_STEPS } from './steps-registry';

let counter = 0;

function nextId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

/** New component node (or group) of the given type at a flow position. */
export function createSystemNode(nodeType: SystemNodeType, position: { x: number; y: number }): SystemNode {
  const config = NODE_REGISTRY[nodeType];
  const isGroup = nodeType === 'group';
  const data: SystemNodeData = {
    label: isGroup ? 'Group' : config.label,
    nodeType,
    description: '',
    techStack: [...config.defaultTechStack],
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
    if (shapeType === 'circle' || shapeType === 'star') {
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
      ...customData,
    },
  };
}
