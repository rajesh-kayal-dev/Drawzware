import dotenv from 'dotenv';

dotenv.config();

export interface ApiConfig {
  port: number;
  nodeEnv: string;
  databaseUrl?: string;
  supabaseJwtSecret?: string;
  webOrigin: string;
}

export const config: ApiConfig = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET,
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:3000',
};
