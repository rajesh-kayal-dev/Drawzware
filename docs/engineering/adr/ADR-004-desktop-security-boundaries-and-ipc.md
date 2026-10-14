# ADR-004: Desktop Security Boundaries and IPC Design

**Status:** Proposed (Recommended)  
**Date:** October 2026  
**Deciders:** Principal Software Engineer, Product Architect  

---

## 1. Context and Problem Statement

Electron applications bundle a full Chromium browser and Node.js runtime. If misconfigured, a vulnerability in a third-party UI library, a maliciously crafted diagram file, or an XSS vulnerability could grant an attacker full remote code execution (RCE) on the user's host operating system.

We must define the security boundaries and IPC architecture to ensure Drawzware Desktop satisfies enterprise-grade security standards.

---

## 2. Options Considered

### Option 1: Hardened Multi-Process Isolation with Typed Preload Bridge (Recommended)
- Enable `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`.
- Prohibit arbitrary Node.js access in the renderer process.
- Expose a minimal, strictly typed API via `contextBridge.exposeInMainWorld('desktopApi', ...)`.
- Validate all IPC arguments in the main process before executing any filesystem or OS operation.
- Implement strict Content Security Policy (CSP) headers and disallow arbitrary web navigation.

### Option 2: Permissive Node Integration (nodeIntegration: true)
Directly invoke `require('fs')` inside React components and Zustand stores to avoid IPC boilerplate.

### Option 3: Remote Module (@electron/remote)
Use the deprecated `@electron/remote` bridge to access main-process objects directly from the renderer.

---

## 3. Decision & Provisional Recommendation

**We provisionally recommend Option 1: Hardened Multi-Process Isolation with Typed Preload Bridge.**

### Rationale:
1. **Industry Security Standards:** The Electron project explicitly considers Option 2 and Option 3 dangerous anti-patterns. Enabling `nodeIntegration` exposes the entire local disk, environment variables, and shell execution to any script running in the renderer.
2. **Untrusted Data Ingestion:** Drawzware imports external files (Docker Compose YAML, JSON diagrams, URL shared strings). A malicious actor could embed XSS vectors or prototype pollution payloads in component labels or descriptions. With Option 1, even a successful renderer XSS exploit cannot escape the Chromium sandbox to access host files or execute system processes.
3. **Defense-in-Depth:**
   - External links (e.g. GitHub repo) are intercepted and opened exclusively in the default system browser via `shell.openExternal()`.
   - New window creation (`window.open`) is intercepted and blocked via `setWindowOpenHandler()`.
   - Injected Content Security Policy:
     `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';`

---

## 4. Consequences

### Positive Consequences:
- Completely mitigates Remote Code Execution (RCE) vulnerabilities.
- Safe to run in enterprise and government environments.
- Clear, auditable boundary between UI logic and system side-effects.

### Negative Consequences:
- All filesystem and dialog operations must be defined as asynchronous IPC contracts (`ipcRenderer.invoke` <-> `ipcMain.handle`).

---

## 5. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Path traversal attack via IPC file write | Critical | Main process normalizes and validates all target file paths; rejects any path attempting to write outside allowed directories or user-selected targets. |
| IPC channel pollution or eavesdropping | Low | `contextIsolation` ensures the renderer cannot modify or inspect private IPC internals. |
