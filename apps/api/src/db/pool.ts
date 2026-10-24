import { Pool } from 'pg';
import { config } from '../config';
import { DatabasePool } from './interface';

let poolInstance: DatabasePool | null = null;

export function getDbPool(): DatabasePool {
  if (!poolInstance) {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required to connect to PostgreSQL');
    }
    const pgPool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
    });
    poolInstance = pgPool;
  }
  return poolInstance;
}

export function setDbPool(pool: DatabasePool): void {
  poolInstance = pool;
}
