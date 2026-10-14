import type { SystemNode } from '@/types';

export interface Point {
  x: number;
  y: number;
}

/**
 * Converts a sequence of waypoints into an SVG path string with optional rounded corners.
 */
export function pointsToSvgPath(points: Point[], radius = 8): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2 || radius === 0) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);

    const r = Math.min(radius, len1 / 2, len2 / 2);
    if (r < 1) {
      d += ` L ${curr.x} ${curr.y}`;
    } else {
      const p1 = { x: curr.x + (v1.x / len1) * r, y: curr.y + (v1.y / len1) * r };
      const p2 = { x: curr.x + (v2.x / len2) * r, y: curr.y + (v2.y / len2) * r };
      d += ` L ${p1.x} ${p1.y} Q ${curr.x} ${curr.y} ${p2.x} ${p2.y}`;
    }
  }
  d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  return d;
}

export function perpendicularDistance(p: Point, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
  const u = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / len2;
  const clampedU = Math.max(0, Math.min(1, u));
  const projX = p1.x + clampedU * dx;
  const projY = p1.y + clampedU * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Ramer-Douglas-Peucker (RDP) algorithm to extract corners and bends from a sampled mouse trail.
 */
export function simplifyPoints(pts: Point[], epsilon = 16): Point[] {
  if (pts.length <= 2) return pts;

  let maxDist = 0;
  let index = 0;
  const first = pts[0];
  const last = pts[pts.length - 1];

  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpendicularDistance(pts[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPoints(pts.slice(0, index + 1), epsilon);
    const right = simplifyPoints(pts.slice(index), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [first, last];
  }
}

/**
 * Snaps near-orthogonal segments (within 18px threshold) to crisp horizontal/vertical lines.
 */
export function snapOrthogonalPoints(pts: Point[]): Point[] {
  if (pts.length <= 1) return pts;
  const result: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = result[i - 1];
    const curr = pts[i];
    const dx = Math.abs(curr.x - prev.x);
    const dy = Math.abs(curr.y - prev.y);

    if (dy < 18 && dx > 20) {
      result.push({ x: curr.x, y: prev.y });
    } else if (dx < 18 && dy > 20) {
      result.push({ x: prev.x, y: curr.y });
    } else {
      result.push(curr);
    }
  }
  return result;
}

/**
 * Simplifies and cleans up waypoints by removing redundant collinear points
 * and micro-segments while preserving intended corners and angles.
 */
export function cleanWaypoints(pts: Point[]): Point[] {
  if (!pts || pts.length <= 2) return pts ?? [];

  // 1. Remove duplicate adjacent points
  const deduped: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = deduped[deduped.length - 1];
    const curr = pts[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) >= 4) {
      deduped.push(curr);
    }
  }

  if (deduped.length <= 2) return deduped;

  // 2. Remove collinear points on straight horizontal or vertical lines
  const cleaned: Point[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = cleaned[cleaned.length - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];

    const isCollinearX = Math.abs(prev.x - curr.x) <= 3 && Math.abs(curr.x - next.x) <= 3;
    const isCollinearY = Math.abs(prev.y - curr.y) <= 3 && Math.abs(curr.y - next.y) <= 3;

    if (!isCollinearX && !isCollinearY) {
      cleaned.push(curr);
    }
  }
  cleaned.push(deduped[deduped.length - 1]);

  return cleaned;
}

/**
 * Finds if a point in flow coordinates is inside any architecture component or junction.
 */
export function findNodeAt(point: Point, nodes: SystemNode[]): SystemNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    // Ignore decorative lines and arrows so they are not treated as component endpoints
    if (n.type === 'shape' && (n.data?.shapeType === 'line' || n.data?.shapeType === 'arrow')) {
      continue;
    }
    // Ignore transparent boundary shapes so enclosed nodes can be connected
    if (
      n.type === 'shape' &&
      (n.data?.shapeFill === 'transparent' || n.data?.shapeFill === 'none')
    ) {
      continue;
    }
    // Ignore freehand drawings
    if (n.type === 'drawing') continue;

    const x = n.position.x;
    const y = n.position.y;
    const w = (typeof n.style?.width === 'number' ? n.style.width : n.width) ?? (n.type === 'junction' ? 14 : 160);
    const h = (typeof n.style?.height === 'number' ? n.style.height : n.height) ?? (n.type === 'junction' ? 14 : 80);
    const pad = n.type === 'junction' ? 14 : 6;

    if (point.x >= x - pad && point.x <= x + w + pad && point.y >= y - pad && point.y <= y + h + pad) {
      return n;
    }
  }
  return null;
}

/**
 * Calculates the best facing source and target handles between two connected nodes.
 */
export function getBestHandles(sourceNode: SystemNode, targetNode: SystemNode) {
  const sPos = sourceNode.position;
  const sW = (typeof sourceNode.style?.width === 'number' ? sourceNode.style.width : sourceNode.width) ?? (sourceNode.type === 'junction' ? 14 : 160);
  const sH = (typeof sourceNode.style?.height === 'number' ? sourceNode.style.height : sourceNode.height) ?? (sourceNode.type === 'junction' ? 14 : 80);
  const sCenter = { x: sPos.x + sW / 2, y: sPos.y + sH / 2 };

  const tPos = targetNode.position;
  const tW = (typeof targetNode.style?.width === 'number' ? targetNode.style.width : targetNode.width) ?? (targetNode.type === 'junction' ? 14 : 160);
  const tH = (typeof targetNode.style?.height === 'number' ? targetNode.style.height : targetNode.height) ?? (targetNode.type === 'junction' ? 14 : 80);
  const tCenter = { x: tPos.x + tW / 2, y: tPos.y + tH / 2 };

  const dx = tCenter.x - sCenter.x;
  const dy = tCenter.y - sCenter.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) {
      return { sourceHandle: 'right-source', targetHandle: 'left-target' };
    } else {
      return { sourceHandle: 'left-source', targetHandle: 'right-target' };
    }
  } else {
    if (dy > 0) {
      return { sourceHandle: 'bottom-source', targetHandle: 'top-target' };
    } else {
      return { sourceHandle: 'top-source', targetHandle: 'bottom-target' };
    }
  }
}
