# Drawzware Desktop — Implementation Readiness Review

**Document:** Implementation Readiness Assessment & Milestone 1 Definition  
**Role:** Principal Software Engineer & Technical Lead  
**Date:** October 2026  
**Status:** Approved for Implementation  

---

## 1. Readiness Verdict

### **Verdict: READY TO START**

### Evidence-Based Justification:
1. **Frontend Architecture Verified:** The Next.js 16.1.6 App Router application is already configured with `output: "export"` in [next.config.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/next.config.ts#L5) and compiles directly to static HTML, CSS, JavaScript, and asset chunks in `./out`.
2. **Zero Backend Runtime Dependencies:** Verified that the entire `src/` codebase contains 0 HTTP `fetch()` calls to external APIs, 0 database clients, 0 authentication providers, and 0 Node.js server routes. The app is 100% client-side.
3. **Sound Engineering Specifications:** The planning package ([PRODUCT_REQUIREMENTS.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/engineering/PRODUCT_REQUIREMENTS.md), [ARCHITECTURE.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/engineering/ARCHITECTURE.md), [DATA_AND_MIGRATION.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/engineering/DATA_AND_MIGRATION.md), [TEST_STRATEGY.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/engineering/TEST_STRATEGY.md), and [ADR-001 through ADR-006](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/engineering/adr/)) establishes an actionable, modular design with strict boundaries.
4. **Clear First Step:** The transition can be executed without risking the existing working application by staging an isolated **Electron Shell Proof of Concept (Milestone 1)** that tests bundling and routing before altering any persistence logic.

---

## 2. Approved Decisions & Outstanding Questions

### 2.1 The Three Approved Product Decisions
| Approved Decision | Implementation Consequence |
|---|---|
| **1. Hybrid Workspace Model** | The storage architecture must maintain an internal application library index (`userData/library/index.json`) for automatic dashboard project discovery, while simultaneously supporting native "Open File" and "Save As…" for standalone `.drawz` / `.json` files in Git repositories or external folders. |
| **2. Preserve & Migrate Web Projects** | The desktop application must retain the universal drag-and-drop import drop zone ([ImportDropZone.tsx](file:///d:/AI%20Projects/drawzware-system-design-canvas/src/components/project/ImportDropZone.tsx)) and provide a first-run onboarding prompt allowing users to import existing backup files (`drawzware-YYYY-MM-DD.json`) without data loss. |
| **3. Initial Cross-Platform Release (Win, Mac, Linux)** | The build system must use `electron-builder` with a multi-runner GitHub Actions release matrix targeting Windows (`.exe` NSIS / portable), macOS (`.dmg` Universal), and Linux (`.AppImage` / `.deb`). |

### 2.2 Material vs. Deferrable Questions
- **Blocking Questions for Milestone 1:** **None.** Milestone 1 is a localized shell proof-of-concept that requires no external credentials or architectural commitments.
- **Deferrable to Milestone 3 / 5 (Non-Blocking):**
  - *Window Frame Aesthetic (Native OS vs. Custom Frameless):* Milestone 1 will proceed with the native OS title bar for platform stability and snap layout support.
  - *Code Signing Credentials:* Milestone 5 CI will be structured to build unsigned binaries by default while supporting signing secrets whenever Apple Developer and Authenticode certificates are provided.
  - *Silent Auto-Updates:* Milestone 1 and MVP will use manual version checks linking to GitHub Releases, avoiding update-loop hazards on unsigned binaries.

---

## 3. Planning Consistency Review

A rigorous cross-document review of all planning artifacts identified three technical nuances that must be handled carefully during implementation:

### 3.1 Static Export Asset Resolution (`out/app.html`)
- **Audit Observation:** Inspection of [out/app.html](file:///d:/AI%20Projects/drawzware-system-design-canvas/out/app.html) reveals all stylesheet, font, and script chunks are referenced with absolute leading slashes (e.g. `/_next/static/chunks/...`).
- **Technical Consequence:** If Electron attempts to load the page via `win.loadFile('out/app.html')` using the raw `file://` protocol, Chromium will attempt to resolve `/_next/...` against the root of the filesystem drive (`file:///C:/_next/...`), triggering 404 errors.
- **Required Implementation Correction:** In `electron/main.ts`, register a standard privileged custom scheme (`app://`) or use `protocol.handle('app', ...)` to map `app://drawzware/` directly to the `./out` directory. When the window loads `app://drawzware/app.html`, all absolute paths (`/_next/...`) resolve seamlessly.

### 3.2 Dashboard-to-Canvas Query Parameter Routing
- **Audit Observation:** [src/lib/routes.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/src/lib/routes.ts) constructs canvas paths as `/canvas?id=${projectId}`, and [src/app/canvas/page.tsx](file:///d:/AI%20Projects/drawzware-system-design-canvas/src/app/canvas/page.tsx) reads `useSearchParams().get('id')`.
- **Technical Consequence:** In a static export served via custom protocol, the protocol handler must preserve query string parameters when serving `canvas.html` so that React Suspense and `useSearchParams()` can extract the project UUID accurately.
- **Required Implementation Correction:** Ensure the `app://` protocol handler in `electron/main.ts` strips query parameters before looking up file paths on disk, while passing the full URL with query string to the web contents.

### 3.3 Test Strategy Alignment
- **Audit Observation:** [TEST_STRATEGY.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/engineering/TEST_STRATEGY.md) defines unit, integration, and E2E test suites, but the repository currently has zero test packages installed in `package.json`.
- **Technical Consequence:** Milestone 1 cannot run automated Playwright Electron tests until the test harness dependencies are introduced.
- **Required Implementation Correction:** Milestone 1 acceptance criteria will be verified via explicit manual and non-destructive terminal validation commands. Test harness installation (`vitest`, `@playwright/test`) is scheduled as the opening task of Milestone 2.

---

## 4. Definition of Milestone 1: Electron Desktop Shell PoC

### 4.1 Purpose
The purpose of Milestone 1 is to create a lightweight, minimal **Electron Desktop Shell Proof of Concept (PoC)** to prove that:
1. The existing production Next.js static build (`./out`) runs cleanly inside Electron.
2. The window launches directly into the `/app` dashboard.
3. In-memory navigation between the dashboard (`/app`) and the canvas (`/canvas?id=...`) works with full query parameter fidelity.
4. Canvas rendering, fonts, and `@xyflow/react` interactions work 100% offline.
5. Strict security boundaries (`contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`) are verified before writing filesystem persistence code.

### 4.2 Minimum File Changes Required (Do NOT Create Yet)
To achieve this proof of concept, only the following files will be created or modified:
1. `package.json`: Add devDependencies (`electron`, `concurrently`, `wait-on`, `cross-env`) and scripts (`dev:electron`, `build:electron`, `start:electron`).
2. `electron/tsconfig.json`: TypeScript configuration compiling `electron/*.ts` to `dist-electron/*.js`.
3. `electron/main.ts`: Main process setting up single-instance lock, custom protocol `app://`, and secure `BrowserWindow` loading `app://drawzware/app.html`.
4. `electron/preload.ts`: Initial isolated preload bridge exposing minimal diagnostics (`getAppVersion`, `platform`).

*Note: Application source code in `src/` will remain 100% untouched in Milestone 1.*

---

## 5. Acceptance Criteria for Milestone 1

| ID | Verification Item | Command / Procedure | Expected Outcome | Platform / Runner |
|---|---|---|---|---|
| **AC-01** | Production Static Build | `npm run build` | Next.js exports static assets into `./out` with zero compilation errors. | Current Machine (Windows) |
| **AC-02** | Main Process Compilation | `npm run build:electron` (Proposed) | `tsc -p electron/tsconfig.json` compiles cleanly to `dist-electron/main.js`. | Current Machine (Windows) |
| **AC-03** | Direct Dashboard Launch | `npx electron .` (Proposed) | Electron launches; window displays the Drawzware Projects Dashboard (`/app`); marketing landing page is never shown. | Current Machine (Windows) |
| **AC-04** | Route & Query Parameter Navigation | Click any template card (e.g. "Microservices") | App navigates to `/canvas?id=...`; canvas mounts with 9 nodes and connection edges rendered cleanly. | Current Machine (Windows) |
| **AC-05** | Offline Canvas Fidelity | Disable network adapter (Airplane mode); pan, zoom, add a node | Canvas pans and zooms smoothly at 60 fps; dot grid renders; zero network error popups. | Current Machine (Windows) |
| **AC-06** | Process Security Audit | Run `window.process` and `window.require` in DevTools console | Both evaluate to `undefined`; `window.desktopApi` is defined; sandboxing is active. | Current Machine (Windows) |
| **AC-07** | Safe External Link Handling | Click the GitHub icon in header | Opens default external web browser (Chrome/Edge/Firefox) at GitHub repo; does NOT navigate the Electron window. | Current Machine (Windows) |

*Validation distinctions:*
- **AC-01 through AC-07:** Executable immediately on the current development workstation (Windows).
- **Cross-Platform Verification (macOS / Linux):** Automated via GitHub Actions runner matrix once CI is configured in Milestone 5.
- **Packaged Binary Verification:** Executed when `electron-builder` packages the installer in Milestone 5.

---

## 6. Explicit Non-Goals for Milestone 1

To prevent scope creep and ensure an airtight proof of concept, the following are **explicitly excluded** from Milestone 1:
- ❌ Do NOT replace `localStorage` with filesystem persistence (let `localStorage` handle draft state during the PoC).
- ❌ Do NOT build the native atomic file storage engine or write `.drawz` files.
- ❌ Do NOT implement web project migration dialogs.
- ❌ Do NOT build native OS Save/Open file dialogs.
- ❌ Do NOT build the complete native OS application menu bar.
- ❌ Do NOT configure `electron-builder` packaging or GitHub Actions release publishing.

---

## 7. Next-Step Handoff

### 7.1 Prerequisites for Milestone 1
- Node.js environment operational.
- Existing `package-lock.json` and `node_modules` intact.
- Next.js static build verified (`npm run build` generates `./out`).

### 7.2 Required Planning Corrections to Note
- When implementing `electron/main.ts`, use custom protocol handling (`app://`) to prevent absolute path asset resolution failures (`/_next/...`) under `file://`.

### 7.3 The First Implementation Task (Task 1.1)
- **Task Description:** Install Electron development dependencies and author `electron/tsconfig.json`, `electron/main.ts`, and `electron/preload.ts` to launch the static `./out/app.html` dashboard.
- **Files to Change / Create:**
  - `package.json` (scripts & devDependencies)
  - `electron/tsconfig.json` (create)
  - `electron/main.ts` (create)
  - `electron/preload.ts` (create)
- **Validation Commands:**
  ```bash
  npm run build
  npm run build:electron
  npm run start:electron
  ```
- **Definition of Done:** An Electron window boots locally on Windows, renders the dashboard at `/app`, allows entering the canvas, and demonstrates verified Chromium sandboxing.
- **Subsequent Milestone:** Upon successful verification of Milestone 1, the agent will proceed to **Milestone 2: Atomic Filesystem Persistence Layer**.

---

*End of Implementation Readiness Review.*
