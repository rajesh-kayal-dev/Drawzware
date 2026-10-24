export interface QueryResult<T> {
  rows: T[];
  rowCount?: number;
}

export interface DatabasePool {
  query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}
