import LZString from 'lz-string';
import type { SystemNode, SystemEdge } from '@/features/canvas/types/canvas.types';

export function encodeCanvasToUrl(nodes: SystemNode[], edges: SystemEdge[]): string {
  const payload = JSON.stringify({ n: nodes, e: edges });
  const compressed = LZString.compressToEncodedURIComponent(payload);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/canvas/shared?d=${compressed}`;
}

/** Share links above this size may be truncated by chat apps and some browsers. */
export const SHARE_URL_WARN_BYTES = 8 * 1024;

/** Byte length of a share URL (UTF-8). */
export function getShareStats(url: string): { bytes: number; tooLong: boolean } {
  const bytes = new TextEncoder().encode(url).length;
  return { bytes, tooLong: bytes > SHARE_URL_WARN_BYTES };
}

export const MAX_SHARE_ENCODED_CHARS = 128 * 1024;
export const MAX_SHARE_DECOMPRESSED_CHARS = 2 * 1024 * 1024;
export const MAX_SHARED_NODES = 2000;
export const MAX_SHARED_EDGES = 5000;

function isValidNode(node: unknown): node is SystemNode {
  if (!node || typeof node !== 'object') return false;
  const n = node as Record<string, unknown>;
  if (typeof n.id !== 'string' || !n.id) return false;
  if (!n.position || typeof n.position !== 'object') return false;
  const pos = n.position as Record<string, unknown>;
  return typeof pos.x === 'number' && typeof pos.y === 'number';
}

function isValidEdge(edge: unknown): edge is SystemEdge {
  if (!edge || typeof edge !== 'object') return false;
  const e = edge as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    !!e.id &&
    typeof e.source === 'string' &&
    !!e.source &&
    typeof e.target === 'string' &&
    !!e.target
  );
}

export function decodeCanvasFromUrl(encoded: string): { nodes: SystemNode[]; edges: SystemEdge[] } | null {
  if (!encoded || typeof encoded !== 'string' || encoded.length > MAX_SHARE_ENCODED_CHARS) {
    return null;
  }

  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed || decompressed.length > MAX_SHARE_DECOMPRESSED_CHARS) {
      return null;
    }

    const data = JSON.parse(decompressed);
    if (!data || typeof data !== 'object') return null;
    if (!Array.isArray(data.n) || !Array.isArray(data.e)) return null;

    if (data.n.length > MAX_SHARED_NODES || data.e.length > MAX_SHARED_EDGES) {
      return null;
    }

    const validNodes = data.n.filter(isValidNode);
    const validEdges = data.e.filter(isValidEdge);

    return { nodes: validNodes, edges: validEdges };
  } catch {
    return null;
  }
}
