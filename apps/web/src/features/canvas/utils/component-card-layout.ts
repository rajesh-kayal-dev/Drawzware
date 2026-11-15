export const COMPONENT_NODE_SIZE = 96;
export const COMPONENT_NODE_MIN_SIZE = 88;
export const COMPONENT_NODE_WIDE_WIDTH = 136;
export const COMPONENT_NODE_WIDE_MIN_HEIGHT = 48;

export function isHorizontalComponentCard(width: number, height: number) {
  return width >= COMPONENT_NODE_WIDE_WIDTH && width >= height * 1.3;
}
