export function isDuplicateKeyError(err: unknown): boolean {
  if (typeof err === 'object' && err !== null) {
    const error = err as { code?: number; message?: string };
    return error.code === 11000 || (typeof error.message === 'string' && error.message.includes('E11000'));
  }
  return false;
}
