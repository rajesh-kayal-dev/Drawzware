# ADR-001: Desktop Framework Selection and Frontend Packaging

**Status:** Proposed (Recommended)  
**Date:** October 2026  
**Deciders:** Principal Software Engineer, Product Architect  

---

## 1. Context and Problem Statement

Drawzware currently operates as a client-side web application built with Next.js 16.1.6, React 19.2.3, TypeScript 5, Tailwind CSS v4, Zustand 5, and `@xyflow/react` 12.10.1. The project already configures Next.js with `output: "export"`, generating a static bundle in `./out`.

The product goal is to deliver a production-ready, native desktop experience for Windows (x64), macOS (Apple Silicon & Intel), and Linux (x64) with offline-first execution, fast startup, native file operations, and low engineering risk.

We must decide:
1. Which desktop runtime framework to select.
2. How to bundle and serve the existing frontend assets inside the desktop shell.

---

## 2. Options Considered

### Option 1: Electron with Bundled Static Frontend (Recommended)
Package the static `./out` bundle directly inside an Electron application using `BrowserWindow.loadFile()` or a custom secure protocol (`app://`). Privileged Node.js APIs reside in the main process behind an isolated `preload.ts` bridge.

### Option 2: Tauri v2 (Rust Core + System Webview)
Use Tauri v2 to load the static `./out` bundle into the platform's native webview (WebView2 on Windows, WebKit on macOS, WebKitGTK on Linux) with Rust IPC commands.

### Option 3: Local Node.js / Express Background Server
Spawn a background Node.js server running `next start` on `localhost:<random-port>` inside an Electron or lightweight browser wrapper.

---

## 3. Decision & Provisional Recommendation

**We provisionally recommend Option 1: Electron with Bundled Static Frontend.**

### Rationale:
1. **Zero Browser Webview Discrepancies:** `@xyflow/react`, `html-to-image` (SVG/PNG DOM rasterization), OKLCH CSS token evaluation, and high-frequency canvas pan/zoom transformations are heavily dependent on Chromium's layout engine. Tauri's WebKitGTK (Linux) and older WebKit (macOS) engines introduce known layout and rendering variances with modern CSS color gamuts and foreignObject SVG rendering.
2. **Immediate Time-to-Market & Team Velocity:** The entire existing codebase is TypeScript and Node.js. Electron enables 100% code and type sharing between main process IPC contracts and frontend models without requiring a Rust toolchain or native platform C-libraries in CI.
3. **No Local Server Hazards:** Because Next.js already compiles cleanly to static HTML/CSS/JS in `./out`, Option 3 is completely unnecessary. Option 1 runs with zero port collisions, zero local firewall prompts, and zero startup delay waiting for an HTTP port to bind.

---

## 4. Consequences

### Positive Consequences:
- 100% of the existing canvas, components, hooks, stores, and export engines work without rendering disparities.
- Direct integration with `electron-builder` for multi-platform NSIS, DMG, and AppImage generation.
- Full type safety across main, preload, and renderer via shared TypeScript interfaces.
- Zero network exposure on localhost.

### Negative Consequences:
- Larger installer download size (~75–110 MB compressed) compared to Tauri (<15 MB).
- Higher baseline memory usage (~150–220 MB RAM vs. ~60 MB RAM in Tauri).

---

## 5. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Large installer file size | Medium | Enable LZMA maximum compression in `electron-builder`; strip unused locales and Chromium binaries. |
| Insecure default Electron configurations | High | Strictly enforce `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and inject a rigorous Content Security Policy (CSP). |
| Static relative path resolution in Electron | Low | Verified that Next.js static export generates relative asset paths; test with local file loading in Milestone 1. |
