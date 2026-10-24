export function toIso(d: Date | string | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}
