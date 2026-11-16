/** Font choices for user-authored canvas text. Keep studio UI typography separate. */
export function getCanvasFontClass(family?: string): string {
  if (!family || family === 'sketch') return 'font-sketch';

  switch (family) {
    case 'serif':
      return 'font-serif';
    case 'mono':
      return 'font-mono';
    case 'sans':
      return 'font-sans';
    case 'casual':
      return 'font-sans tracking-wide';
    default:
      return 'font-sans';
  }
}
