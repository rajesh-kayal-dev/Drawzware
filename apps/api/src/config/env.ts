import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || '',
  mongoUri: process.env.MONGO_URI || '',
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:3000',
} as const;

export function validateEnvironment(): void {
  const missing: string[] = [];
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.MONGO_URI) missing.push('MONGO_URI');

  if (missing.length > 0) {
    console.error(`[Fatal Startup Error] Missing required environment variable(s): ${missing.join(', ')}`);
    process.exit(1);
  }
}
