/**
 * App routes. The canvas takes the project id as a query parameter so the app can be
 * exported as static files (no dynamic segments) and served from any static host.
 */
export function canvasPath(projectId: string) {
  return `/canvas?id=${encodeURIComponent(projectId)}`;
}

/**
 * Known legitimate internal client route prefixes in DrawzWare.
 */
export const ALLOWED_INTERNAL_ROUTES = [
  '/app',
  '/canvas',
  '/settings',
  '/import',
  '/invitations',
] as const;

/**
 * Validates and sanitizes a return URL to prevent open-redirect vulnerabilities.
 * Preserves safe canvas parameters (e.g. ?id=...&diagramType=...) while discarding
 * unknown parameters, protocol-relative escapes (//), backslashes, and external schemes.
 */
export function sanitizeReturnUrl(url: string | null | undefined, fallback = '/app'): string {
  if (!url || typeof url !== 'string') {
    return fallback;
  }

  const trimmed = url.trim();
  // Length limit and basic structure checks
  if (!trimmed || trimmed.length > 1024) {
    return fallback;
  }

  // Must start with single slash, not protocol-relative or backslash escape
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.includes('\\')) {
    return fallback;
  }

  try {
    // Parse using a dummy origin to safely isolate pathname and query params
    const parsed = new URL(trimmed, 'https://drawzware.internal');
    if (parsed.origin !== 'https://drawzware.internal') {
      return fallback;
    }

    const pathname = parsed.pathname;
    const isAllowedRoute = ALLOWED_INTERNAL_ROUTES.some(
      (prefix) => pathname === prefix || pathname === `${prefix}/` || pathname.startsWith(`${prefix}/`)
    );

    if (!isAllowedRoute) {
      return fallback;
    }

    // Handle query parameters per route
    if (pathname === '/canvas' || pathname === '/canvas/') {
      const id = parsed.searchParams.get('id');
      if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        return fallback;
      }
      const cleanParams = new URLSearchParams();
      cleanParams.set('id', id);

      const diagramType = parsed.searchParams.get('diagramType');
      if (diagramType && ['architecture', 'flowchart', 'sequence', 'er'].includes(diagramType)) {
        cleanParams.set('diagramType', diagramType);
      }

      return `/canvas?${cleanParams.toString()}`;
    }

    if (pathname === '/canvas/shared' || pathname === '/canvas/shared/') {
      const d = parsed.searchParams.get('d');
      if (!d) return fallback;
      const cleanParams = new URLSearchParams();
      cleanParams.set('d', d);
      return `/canvas/shared?${cleanParams.toString()}`;
    }

    if (pathname === '/invitations' || pathname === '/invitations/') {
      const id = parsed.searchParams.get('id');
      if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        return fallback;
      }
      return `/invitations?id=${encodeURIComponent(id)}`;
    }

    // For /app, /settings, /import
    return pathname;
  } catch {
    return fallback;
  }
}
