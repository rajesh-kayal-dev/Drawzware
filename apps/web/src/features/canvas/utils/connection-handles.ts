/** Keep each endpoint attached to a handle with the role React Flow expects. */
export function normalizeConnectionHandles<T extends { sourceHandle?: string | null; targetHandle?: string | null }>(connection: T): T {
  const sourceHandle = connection.sourceHandle?.replace(/-target$/, '-source') ?? null;
  const targetHandle = connection.targetHandle?.replace(/-source$/, '-target') ?? null;
  if (sourceHandle === connection.sourceHandle && targetHandle === connection.targetHandle) return connection;
  return { ...connection, sourceHandle, targetHandle };
}
