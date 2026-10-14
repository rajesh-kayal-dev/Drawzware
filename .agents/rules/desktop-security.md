# Agent Rules: Desktop Security & Electron IPC Constraints

**Applies to:** Electron main process, preload scripts, IPC handlers, filesystem access, and native dialogs.

---

## 1. Electron Process Security Invariants

1. **Mandatory BrowserWindow Settings:**
   All `BrowserWindow` instances must strictly specify:
   ```typescript
   webPreferences: {
     preload: path.join(__dirname, 'preload.js'),
     contextIsolation: true,
     nodeIntegration: false,
     sandbox: true,
     webSecurity: true,
     allowRunningInsecureContent: false,
   }
   ```
2. **No Dynamic Code Evaluation:**
   - Never use `eval()`, `new Function()`, or dynamic code execution in main or renderer processes.
3. **Navigation & External Links:**
   - Intercept and block arbitrary window navigation.
   - External links (e.g. GitHub repository, external documentation) must be opened strictly via Electron's `shell.openExternal(url)`. Validate that the URL uses `https:`.
   - Prevent new window creation:
     ```typescript
     mainWindow.webContents.setWindowOpenHandler(({ url }) => {
       if (url.startsWith('https:')) shell.openExternal(url);
       return { action: 'deny' };
     });
     ```

---

## 2. IPC Channel Architecture & Input Validation

1. **Preload Exposure:**
   - Use `contextBridge.exposeInMainWorld('desktopApi', {...})`.
   - Never expose raw `ipcRenderer` or `ipcRenderer.send` directly to `window`.
2. **Main Process Parameter Validation:**
   - Treat all IPC arguments from the renderer as potentially untrusted input.
   - Validate IDs, file paths, and project data schemas in `ipcMain.handle()` before performing any filesystem operation.
3. **Path Traversal Mitigation:**
   - Never allow the renderer to pass arbitrary relative paths containing `..`.
   - Canonicalize and resolve all paths against approved user-data directories or paths confirmed by native OS dialogs.

---

## 3. Secret Management & Telemetry

1. **Zero Hardcoded Credentials:**
   - Never commit code-signing keys, certificates, passwords, or API tokens into source files or configuration.
2. **CI Secret Access:**
   - Code-signing credentials must be injected solely via GitHub Actions encrypted repository secrets during release workflows.
3. **Zero Telemetry Invariant:**
   - Do not add analytics, tracking beacons, error monitoring reporting to external servers (e.g. Sentry, PostHog, Google Analytics) without explicit user opt-in and architectural approval.
