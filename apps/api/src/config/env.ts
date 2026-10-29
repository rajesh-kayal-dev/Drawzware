import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || '',
  mongoUri: process.env.MONGO_URI || '',
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:3000',
  appUrl: process.env.APP_URL || process.env.WEB_ORIGIN || 'http://localhost:3000',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'DrawzWare <noreply@drawzware.com>',
    secure: process.env.SMTP_SECURE === 'true',
  },
} as const;

export function isOriginAllowed(origin?: string): boolean {
  if (!origin) {
    // Non-browser client, test runner, or desktop client without Origin header
    return true;
  }
  const isProd = process.env.NODE_ENV === 'production';
  const defaultOrigin = isProd ? '' : 'http://localhost:3000';
  const configured = process.env.WEB_ORIGIN || defaultOrigin;
  const allowed = configured
    ? configured.split(',').map((s) => s.trim().toLowerCase().replace(/\/+$/, '')).filter(Boolean)
    : [];
  const standardOrigins = isProd
    ? ['app://drawzware']
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'app://drawzware',
      ];
  const allAllowed = new Set([...allowed, ...standardOrigins]);

  try {
    const originLower = origin.toLowerCase().replace(/\/+$/, '');
    return allAllowed.has(originLower);
  } catch {
    return false;
  }
}

export function validateEnvironment(): void {
  const missing: string[] = [];
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.MONGO_URI) missing.push('MONGO_URI');

  if (missing.length > 0) {
    console.error(`[Fatal Startup Error] Missing required environment variable(s): ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      console.error('[Fatal Startup Error] JWT_SECRET must be at least 32 characters in production');
      process.exit(1);
    }
  }
}
