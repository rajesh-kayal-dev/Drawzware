import { describe, it, expect } from 'vitest';
import { sanitizeReturnUrl } from '../apps/web/src/shared/utils/routes';

describe('Open Redirect Defenses & Return URL Sanitization', () => {
  it('preserves valid /canvas URL with id and diagramType parameters', () => {
    const valid = '/canvas?id=proj-123_abc&diagramType=architecture';
    expect(sanitizeReturnUrl(valid)).toBe('/canvas?id=proj-123_abc&diagramType=architecture');
  });

  it('preserves valid /app, /settings, /import routes', () => {
    expect(sanitizeReturnUrl('/app')).toBe('/app');
    expect(sanitizeReturnUrl('/settings')).toBe('/settings');
    expect(sanitizeReturnUrl('/import')).toBe('/import');
  });

  it('preserves valid /invitations route with id parameter', () => {
    expect(sanitizeReturnUrl('/invitations?id=inv-456')).toBe('/invitations?id=inv-456');
  });

  it('rejects external absolute URLs and falls back to /app', () => {
    expect(sanitizeReturnUrl('https://evil.com')).toBe('/app');
    expect(sanitizeReturnUrl('http://evil.com/canvas?id=123')).toBe('/app');
    expect(sanitizeReturnUrl('//evil.com')).toBe('/app');
    expect(sanitizeReturnUrl('//evil.com/canvas')).toBe('/app');
  });

  it('rejects protocol-relative and backslash injection bypasses', () => {
    expect(sanitizeReturnUrl('/\\evil.com')).toBe('/app');
    expect(sanitizeReturnUrl('\\evil.com')).toBe('/app');
    expect(sanitizeReturnUrl('/canvas\\evil.com')).toBe('/app');
    expect(sanitizeReturnUrl('javascript:alert(1)')).toBe('/app');
    expect(sanitizeReturnUrl('data:text/html,<script>alert(1)</script>')).toBe('/app');
  });

  it('rejects /canvas with missing or malicious id parameters', () => {
    // Missing id parameter
    expect(sanitizeReturnUrl('/canvas')).toBe('/app');
    expect(sanitizeReturnUrl('/canvas?id=')).toBe('/app');
    // Path traversal or invalid characters in id
    expect(sanitizeReturnUrl('/canvas?id=../secret')).toBe('/app');
    expect(sanitizeReturnUrl('/canvas?id=proj<script>')).toBe('/app');
    expect(sanitizeReturnUrl('/canvas?id=proj%20space')).toBe('/app');
  });

  it('strips suspicious or unallowlisted query parameters from /canvas', () => {
    const mixed = '/canvas?id=proj-123&evil=payload&auth=leakedToken';
    expect(sanitizeReturnUrl(mixed)).toBe('/canvas?id=proj-123');
  });

  it('safely handles empty, null, or undefined values with custom fallback', () => {
    expect(sanitizeReturnUrl(null)).toBe('/app');
    expect(sanitizeReturnUrl(undefined)).toBe('/app');
    expect(sanitizeReturnUrl('')).toBe('/app');
    expect(sanitizeReturnUrl('', '/settings')).toBe('/settings');
  });
});
