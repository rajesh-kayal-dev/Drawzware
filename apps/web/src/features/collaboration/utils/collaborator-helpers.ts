/**
 * Collaborator display name and deterministic color helpers
 */

const COLLABORATOR_PALETTE = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#14b8a6', // Teal
];

/**
 * Cleanly format collaborator name:
 * - Prefers explicit display name
 * - Otherwise parses email: removes numbers, delimiters, and extracts clean capitalized first name
 */
export function formatCollaboratorName(name?: string | null, email?: string | null): string {
  if (name && name.trim().length > 0) {
    return name.trim();
  }

  if (!email || !email.includes('@')) {
    return 'Collaborator';
  }

  const prefix = email.split('@')[0].trim();
  // If dot, underscore, or dash separated (e.g. rajesh.kayal or rajesh_kayal), take the first name
  const firstPart = prefix.split(/[._-]/)[0];
  // Strip trailing numbers (e.g. rajesh8001 -> rajesh)
  const clean = firstPart.replace(/\d+$/, '');

  if (!clean || clean.length === 0) {
    return 'Collaborator';
  }

  // Capitalize first letter
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Returns a stable, distinct vibrant color for each user based on their ID or email
 */
export function getCollaboratorColor(identifier: string): string {
  if (!identifier) return COLLABORATOR_PALETTE[0];

  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % COLLABORATOR_PALETTE.length;
  return COLLABORATOR_PALETTE[index];
}

/**
 * Returns single uppercase initial for avatar
 */
export function getCollaboratorInitial(name?: string | null, email?: string | null): string {
  const formatted = formatCollaboratorName(name, email);
  return formatted.charAt(0).toUpperCase();
}
