import fs from 'node:fs';
import path from 'node:path';

// Sync static export out directory
const webOut = path.resolve('apps/web/out');
const rootOut = path.resolve('out');
if (fs.existsSync(webOut)) {
  fs.cpSync(webOut, rootOut, { recursive: true, force: true });
}

// Sync .next build directory to root for Vercel deployment detection
const webNext = path.resolve('apps/web/.next');
const rootNext = path.resolve('.next');
if (fs.existsSync(webNext)) {
  fs.cpSync(webNext, rootNext, { recursive: true, force: true });
}
