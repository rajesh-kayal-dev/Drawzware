import fs from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve('apps/web/out');
const destDir = path.resolve('out');

if (fs.existsSync(srcDir)) {
  fs.cpSync(srcDir, destDir, { recursive: true, force: true });
}
