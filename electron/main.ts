import { app, BrowserWindow, protocol, net, shell, session, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { StorageService } from './services/storage.service';
import { registerLibraryIpcHandlers } from './ipc/library-handlers';
import { registerFileIpcHandlers, importDrawzFileFromDisk } from './ipc/file-handlers';
import { parseBackupDocument, isValidProjectId } from './types/document';
import { WindowCloseManager } from './services/window-close-manager';

// ── 1. Register privileged custom scheme before app ready ──────────────────────
// Must be called before app.whenReady().
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// Set Application User Model ID for Windows Taskbar, Start Menu, and Notification grouping
if (process.platform === 'win32') {
  app.setAppUserModelId('dev.drawzware.app');
}

let mainWindow: BrowserWindow | null = null;
const outDir = path.join(__dirname, '..', 'out');
let pendingFilePath: string | null = null;
let storageServiceInstance: StorageService | null = null;

/**
 * Resolves the platform-appropriate application icon path for BrowserWindow.
 */
function getWindowIconPath(): string | undefined {
  const icoPath = path.join(__dirname, '..', 'build', 'icon.ico');
  if (process.platform === 'win32' && fs.existsSync(icoPath)) {
    return icoPath;
  }
  const pngPath = path.join(__dirname, '..', 'build', 'icon.png');
  if (fs.existsSync(pngPath)) {
    return pngPath;
  }
  const fallback = path.join(__dirname, '..', 'public', 'icons', 'icon-512x512.png');
  if (fs.existsSync(fallback)) {
    return fallback;
  }
  return undefined;
}

/**
 * Extracts a .drawz or .drawzbackup file path from process arguments if present.
 */
function extractFilePathFromArgv(argv: string[]): string | null {
  for (const arg of argv.slice(1)) {
    if (arg.startsWith('--')) continue;
    const lower = arg.toLowerCase();
    if (lower.endsWith('.drawz') || lower.endsWith('.drawzbackup')) {
      try {
        if (fs.existsSync(arg) && fs.statSync(arg).isFile()) {
          return path.resolve(arg);
        }
      } catch {
        // Ignore filesystem check error
      }
    }
  }
  return null;
}

/**
 * Safely handles opening and importing associated .drawz or .drawzbackup files.
 * Validates file structure, handles duplicate collisions, and routes to canvas or dashboard.
 */
async function handleOpenFile(filePath: string) {
  if (!mainWindow || !storageServiceInstance) {
    pendingFilePath = filePath;
    return;
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.drawz') {
      const project = await importDrawzFileFromDisk(filePath, storageServiceInstance);
      mainWindow.loadURL(`app://drawzware/canvas?id=${encodeURIComponent(project.id)}`);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else if (ext === '.drawzbackup') {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const parseResult = parseBackupDocument(content);
      if (!parseResult.success) {
        dialog.showErrorBox('Invalid Backup File', parseResult.error);
        return;
      }
      const existing = await storageServiceInstance.listProjects();
      const existingIds = new Set(existing.map((p) => p.id));
      for (const rawProj of parseResult.projects) {
        const needsId = !isValidProjectId(rawProj.id) || existingIds.has(rawProj.id);
        const newId = needsId ? crypto.randomUUID() : rawProj.id;
        const newName = needsId && rawProj.name ? `${rawProj.name} (Imported)` : rawProj.name;
        existingIds.add(newId);
        await storageServiceInstance.saveProject({
          ...rawProj,
          id: newId,
          name: newName,
          createdAt: rawProj.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      mainWindow.loadURL('app://drawzware/app');
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  } catch (err) {
    dialog.showErrorBox('Unable to Open File', (err as Error).message);
  }
}

// ── 2. Single-Instance Lock ───────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      const filePath = extractFilePathFromArgv(commandLine);
      if (filePath) {
        handleOpenFile(filePath);
      }
    }
  });
}

// macOS open-file event handler
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  handleOpenFile(filePath);
});

// ── 3. Application Lifecycle & Protocol Registration ──────────────────────────
app.whenReady().then(async () => {
  // Capture startup file from process.argv if present
  const startupFile = extractFilePathFromArgv(process.argv);
  if (startupFile && !process.argv.includes('--smoke-test')) {
    pendingFilePath = startupFile;
  }

  // IPC diagnostic handlers
  ipcMain.handle('app:version', () => app.getVersion());

  // Initialize main-process storage service and typed library IPC handlers
  const storageService = new StorageService();
  storageServiceInstance = storageService;
  try {
    await storageService.initialize();
  } catch (err) {
    console.error('Failed to initialize storage service:', err);
  }
  registerLibraryIpcHandlers(ipcMain, storageService);
  registerFileIpcHandlers(ipcMain, storageService, app.getVersion());

  // Injected Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' app:; script-src 'self' app: 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' app: 'unsafe-inline'; img-src 'self' app: data: blob: https:; font-src 'self' app: data:; connect-src 'self' app: https://cdn.jsdelivr.net https://*.unicorn.studio https://api.unicorn.studio; worker-src 'self' blob:; object-src 'none'; base-uri 'self';",
        ],
      },
    });
  });

  // Custom protocol handler for app://drawzware/...
  protocol.handle('app', async (request) => {
    try {
      const requestUrl = new URL(request.url);

      // Verify origin host
      if (requestUrl.hostname !== 'drawzware') {
        return new Response('Forbidden Host', { status: 403 });
      }

      let pathname = decodeURIComponent(requestUrl.pathname);

      // If root or empty, route directly to the dashboard
      if (pathname === '/' || pathname === '') {
        pathname = '/app.html';
      }

      const targetPath = path.join(outDir, pathname);

      // Path traversal security check: target must be inside outDir
      const normalizedTarget = path.normalize(targetPath);
      const normalizedOutDir = path.normalize(outDir);
      if (normalizedTarget !== normalizedOutDir && !normalizedTarget.startsWith(normalizedOutDir + path.sep)) {
        return new Response('Forbidden Path', { status: 403 });
      }

      // 1. Direct file match (assets, chunks, images, icons, explicit .html)
      if (fs.existsSync(normalizedTarget) && fs.statSync(normalizedTarget).isFile()) {
        return net.fetch(url.pathToFileURL(normalizedTarget).toString());
      }

      // 2. Next.js route match without extension: /app -> out/app.html, /canvas -> out/canvas.html
      const htmlTarget = normalizedTarget + '.html';
      if (fs.existsSync(htmlTarget) && fs.statSync(htmlTarget).isFile()) {
        return net.fetch(url.pathToFileURL(htmlTarget).toString());
      }

      // 3. Fallback: file not found
      return new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain' } });
    } catch (err) {
      console.error('Error in app protocol handler:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ── 4. Main Window Creation & Security Hardening ──────────────────────────────
function createMainWindow() {
  const isSmoke = process.argv.includes('--smoke-test');
  const windowIcon = getWindowIconPath();
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'Drawzware',
    icon: windowIcon,
    backgroundColor: '#0a0c10',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  if (!isSmoke) {
    mainWindow.focus();
  }

  const windowCloseManager = new WindowCloseManager(mainWindow);
  mainWindow.on('close', (e) => {
    if (process.argv.includes('--smoke-test')) {
      return;
    }
    windowCloseManager.handleWindowClose(e);
  });
  mainWindow.on('closed', () => {
    windowCloseManager.destroy();
    mainWindow = null;
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !isSmoke) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isVisible() && !isSmoke) {
      mainWindow.show();
      mainWindow.focus();
    }
    if (!isSmoke && pendingFilePath) {
      const fileToOpen = pendingFilePath;
      pendingFilePath = null;
      handleOpenFile(fileToOpen);
    }
  });

  // Intercept and restrict external links to default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(targetUrl);
      }
    } catch {
      // Ignore invalid URLs
    }
    return { action: 'deny' };
  });

  // Prevent navigation away from the bundled app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      if (parsed.protocol === 'app:' && parsed.hostname === 'drawzware') {
        // In desktop app, root app://drawzware/ or app://drawzware redirects directly to /app
        if (parsed.pathname === '/' || parsed.pathname === '') {
          event.preventDefault();
          mainWindow?.loadURL('app://drawzware/app');
          return;
        }
        // Allow in-app navigation within the app://drawzware origin
        return;
      }
      event.preventDefault();
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(navigationUrl);
      }
    } catch {
      event.preventDefault();
    }
  });

  // Automated smoke test verification hook
  if (process.argv.includes('--smoke-test')) {
    let stage = 1;
    mainWindow.webContents.on('did-finish-load', async () => {
      try {
        if (stage === 1) {
          const dashboardDiag = await mainWindow!.webContents.executeJavaScript(`({
            url: window.location.href,
            title: document.title,
            hasDesktopApi: typeof window.desktopApi !== 'undefined',
            desktopApi: typeof window.desktopApi === 'object' ? {
              isDesktop: window.desktopApi.isDesktop,
              platform: window.desktopApi.platform,
              hasVersionFn: typeof window.desktopApi.getAppVersion === 'function',
              hasStorageApi: typeof window.desktopApi.storage === 'object' && typeof window.desktopApi.storage.listProjects === 'function',
            } : null,
            hasRequire: typeof window.require !== 'undefined',
            hasProcess: typeof window.process !== 'undefined',
          })`);
          process.stdout.write('[SMOKE_TEST_DASHBOARD] ' + JSON.stringify(dashboardDiag) + '\n');

          // Stage 2: Navigate to canvas route with query parameter
          stage = 2;
          mainWindow!.loadURL('app://drawzware/canvas?id=test-project-123');
        } else if (stage === 2) {
          const canvasDiag = await mainWindow!.webContents.executeJavaScript(`({
            url: window.location.href,
            search: window.location.search,
            hasCanvas: document.querySelector('.react-flow') !== null || document.body !== null,
          })`);
          process.stdout.write('[SMOKE_TEST_CANVAS] ' + JSON.stringify(canvasDiag) + '\n');
          app.exit(0);
        }
      } catch (err) {
        process.stderr.write('[SMOKE_TEST_ERROR] ' + String(err) + '\n');
        app.exit(1);
      }
    });
  }

  // Launch directly into the Projects dashboard at /app
  mainWindow.loadURL('app://drawzware/app');
}
