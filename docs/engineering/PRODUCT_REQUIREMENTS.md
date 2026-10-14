# Drawzware Desktop — Product Requirements Document (PRD)

**Status:** Proposed / Under Review  
**Author:** Principal Software Engineer & Product Architect  
**Target Release:** Drawzware Desktop v1.0.0 (MVP)  
**Last Updated:** October 2026  

---

## 1. Product Purpose & Target Audience

### 1.1 Purpose
Drawzware Desktop is a standalone, cross-platform visual architecture and systems design studio for software architects, systems engineers, devops practitioners, and technical interview candidates. It translates distributed system concepts into concrete, structured architecture diagrams, sequence diagrams, and entity-relationship (ER) models.

Unlike generic vector-drawing tools (Figma, Miro, Excalidraw) or cloud-tied tools (Lucidchart), Drawzware provides an opinionated domain model with typed infrastructure nodes, structured connection protocols (REST, gRPC, Pub/Sub, etc.), automated directed-graph layouts, live architectural validation, and presentation walkthroughs.

The desktop product transforms the web-based canvas into a native, local-first application operating 100% offline with zero external network dependencies, direct filesystem project storage, atomic save protection, and operating system window/menu integration.

### 1.2 Target Users
1. **Software & Systems Architects:** Planning distributed systems, high-level designs, cloud migrations, and evaluating failure domains/bottlenecks.
2. **Staff / Principal Engineers & Tech Leads:** Authoring Architecture Decision Records (ADRs), system documentation, and presenting design walkthroughs to stakeholders.
3. **Engineering Teams in Secure/Regulated Environments:** Organizations with strict data governance prohibiting third-party cloud diagram storage (finance, healthcare, defense, enterprise intranet).
4. **Candidates Preparing for System Design Interviews:** Practicing system design frameworks (requirements, capacity estimation, high-level architecture, deep dives, scaling).

---

## 2. Evidence-Based Requirements Classification

To ensure rigorous requirements engineering, all statements throughout this document are classified as:
- **[Verified Fact]:** Directly supported by existing code in `drawzware-system-design-canvas`.
- **[Proposed Requirement]:** Recommended desktop requirement based on technical feasibility and desktop UX patterns.
- **[Provisional Assumption]:** Working assumption subject to validation or future user needs.
- **[Decision Required]:** Unresolved item requiring explicit approval before final implementation.

---

## 3. User Journeys

### Journey 1: First Launch & Dashboard Access
1. **Action:** User launches the Drawzware desktop application from the OS application launcher (Start Menu, Spotlight, Application Drawer).
2. **Behavior [Proposed Requirement]:** Application boots directly into the Projects Dashboard (`/app` route, compiled as `app.html`), bypassing the public marketing landing page (`/`).
3. **Outcome:** User immediately sees existing local projects, pre-built architecture templates (Microservices, Monolith, Event-Driven, Kubernetes, etc.), and quick-start actions.
4. **Context [Verified Fact]:** The web application landing page lives at `src/app/page.tsx`, while the dashboard lives at `src/app/app/page.tsx`. In the web build, `public/manifest.json` already sets `"start_url": "/app"`.

### Journey 2: Diagram Creation, Editing & Continuous Autosave
1. **Action:** User clicks "New Project" or selects a template (e.g. "Microservices").
2. **Behavior:** Next.js navigates to `/canvas?id=<uuid>`. Canvas loads from local storage/file.
3. **Editing:** User drags infrastructure components (API Gateway, Redis Cache, Kafka Stream) from the component palette, draws connection protocols (gRPC, WebSocket), runs DAG auto-layout, or switches diagram modes (Sequence, ER).
4. **Autosave [Proposed Requirement]:** Edits trigger an atomic disk write via IPC after a 500 ms idle debounce. A status indicator in the canvas header displays `Saved`, `Saving…`, or `Error`.
5. **Context [Verified Fact]:** The canvas engine is `@xyflow/react` running in controlled mode driven by `useCanvasStore.ts`. Auto-save is handled by `useAutoSave.ts` debounced at 500 ms and on `window.beforeunload`.

### Journey 3: Standalone File Export, Import & Git Workflow
1. **Action:** User wants to commit their architecture diagram to a Git repository alongside project source code.
2. **Behavior [Proposed Requirement]:** User clicks "File > Save As…" or "Export > Project File (.drawz / .json)". The desktop app opens the native OS file picker (`dialog.showSaveDialog`).
3. **Outcome:** A standalone, versioned JSON-based diagram file (`architecture.drawz`) is saved directly into the user's workspace folder.
4. **Re-opening [Proposed Requirement]:** User or teammate double-clicks `architecture.drawz` or selects "File > Open…". The desktop application loads the project without requiring any cloud connection.

### Journey 4: Artifact Generation for Documentation
1. **Action:** User needs high-resolution diagrams for READMEs, RFCs, or presentations.
2. **Behavior:** User opens the Export dialog (`⌘E` or menu). User selects format (PNG at 1x/2x/3x scale with optional transparency, SVG vector, or Mermaid code).
3. **Execution [Proposed Requirement]:** Desktop app renders the canvas via `html-to-image` and prompts the user with a native Save dialog targeting their chosen folder, or copies the raster image directly to the OS clipboard.
4. **Context [Verified Fact]:** Export rendering logic exists in `src/lib/export.ts` and `src/lib/mermaid.ts`. In the web app, downloads use `<a download>` DOM injection.

---

## 4. Functional Requirements

### 4.1 Canvas & Diagram Modes (Parity with Web App)
- **FR-01 [Verified Fact]:** The application MUST preserve the full canvas editing experience: infinite pan, zoom (10% to 200%), dot-grid background, box selection, undo/redo stack (`⌘Z` / `⇧⌘Z`), copy/paste (`⌘C` / `⌘V`), and alignment tools.
- **FR-02 [Verified Fact]:** The application MUST support all three diagramming modes within any project:
  1. *Architecture Canvas:* 19+ infrastructure primitives, cloud provider icons (AWS, GCP, Azure), custom shapes, and 9 connection protocols.
  2. *Sequence Diagrams:* Actor/service lifelines, synchronous/asynchronous messages, self-calls, and condition fragments (`alt`, `loop`, `opt`).
  3. *Entity-Relationship (ER) Models:* Entities with typed attribute columns, Primary Key (`PK`) and Foreign Key (`FK`) markers, and cardinality relationships.
- **FR-03 [Verified Fact]:** The application MUST provide one-click hierarchical auto-layout powered by `@dagrejs/dagre` ([src/lib/auto-layout.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/src/lib/auto-layout.ts)).
- **FR-04 [Verified Fact]:** The application MUST provide real-time architectural validation checks (`computeIssues()` in [src/lib/validation.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/src/lib/validation.ts)) identifying single points of failure (SPOF), disconnected nodes, and unassigned technologies.
- **FR-05 [Verified Fact]:** The application MUST support interactive Presentation Mode ([PresentationOverlay.tsx](file:///d:/AI%20Projects/drawzware-system-design-canvas/src/components/canvas/PresentationOverlay.tsx)) performing breadth-first graph walkthroughs with contextual story cards.

### 4.2 Application Shell & Desktop Navigation
- **FR-06 [Proposed Requirement]:** The application MUST boot directly to the main dashboard (`/app`). The public marketing landing page (`src/app/page.tsx`) MUST be omitted from desktop navigation.
- **FR-07 [Proposed Requirement]:** The application MUST integrate with the native OS menu bar (File, Edit, View, Canvas, Window, Help) on macOS, Windows, and Linux, mapping menu items to registered canvas accelerators.
- **FR-08 [Proposed Requirement]:** The application MUST support single-instance execution (`app.requestSingleInstanceLock()`). Launching a second instance must focus the existing window.
- **FR-09 [Proposed Requirement]:** Window dimensions, maximized state, and position MUST be persisted across application restarts in a local configuration file (`config.json`).

### 4.3 Persistence & Project Management
- **FR-10 [Proposed Requirement]:** The desktop app MUST replace the single-blob `localStorage` engine with a native filesystem storage engine.
- **FR-11 [Proposed Requirement]:** Each project MUST be stored as an individual, self-contained file (`<id>.drawz` or `<id>.json`) adhering to the versioned `ProjectSchema`.
- **FR-12 [Proposed Requirement]:** The application MUST provide an internal library directory under the OS user-data directory (`userData/library/projects/`) to populate the dashboard project grid automatically.
- **FR-13 [Proposed Requirement]:** The application MUST support opening and saving arbitrary standalone diagram files located outside the internal library (e.g. in local Git repositories).
- **FR-14 [Proposed Requirement]:** File writes MUST be atomic: write to a temporary file (`.tmp`), sync to disk, rotate backup (`.bak`), and atomically rename over the target file.
- **FR-15 [Proposed Requirement]:** The application MUST detect unsaved changes or active writing before window close and prevent data loss.

### 4.4 Import & Export
- **FR-16 [Verified Fact]:** The application MUST support importing diagrams from:
  - Native Drawzware project JSON (`.json`, `.drawz`).
  - Multi-project backup bundles (`{ version: 1, projects: [...] }`).
  - Docker Compose files (`docker-compose.yml`, `.yaml`) mapped via `src/lib/docker-compose.ts`.
- **FR-17 [Proposed Requirement]:** Import and export file dialogs MUST use native operating system dialogs (`dialog.showOpenDialog`, `dialog.showSaveDialog`) via IPC instead of DOM `<input type="file">` and `<a download>` elements.
- **FR-18 [Verified Fact]:** Image export MUST support PNG (1x, 2x, 3x pixel ratio, optional transparent background) and SVG vector formats.
- **FR-19 [Verified Fact]:** Code export MUST support Mermaid diagram format (`.mmd`) and formatted JSON.
- **FR-20 [Verified Fact]:** Direct clipboard copy of PNG diagram images MUST be supported.

---

## 5. Non-Functional Requirements (NFRs)

### 5.1 Performance Targets [Proposed]
- **NFR-01 (Startup Latency):** Cold start time to interactive dashboard MUST be under **1,500 ms** on standard SSD hardware.
- **NFR-02 (Canvas Rendering):** Smooth panning and zooming at **60 fps** for diagrams containing up to 250 nodes and 400 edges.
- **NFR-03 (Autosave Overhead):** Background disk serialization and write MUST complete in under **50 ms** without blocking renderer main-thread UI interactions.
- **NFR-04 (Memory Footprint):** Idle memory consumption MUST remain under **250 MB** RAM.

### 5.2 Offline Availability & Resilience [Proposed]
- **NFR-05 (Zero Network Dependency):** 100% of core features (create, edit, layout, validate, present, save, export, import) MUST function with network adapters disabled.
- **NFR-06 (Data Durability):** Zero data loss across application crashes, process kills (`SIGKILL`), or system power loss during autosave operations.
- **NFR-07 (Corrupt Data Isolation):** Invalid or malformed project files MUST NOT cause application crashes and MUST NOT overwrite existing valid data with empty states.

### 5.3 Security & Privacy [Proposed]
- **NFR-08 (Zero Telemetry):** No user tracking, analytics, telemetry, or external API calls without explicit opt-in.
- **NFR-09 (Process Isolation):** Chromium renderer MUST run with `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`.
- **NFR-10 (Privilege Separation):** Privileged Node.js filesystem and OS dialog APIs MUST be accessible ONLY via a strongly typed, whitelisted IPC preload bridge (`window.desktopApi`).
- **NFR-11 (Content Security Policy):** Strict CSP preventing remote script execution, inline eval, or external resource loading.

---

## 6. MVP Scope vs. Non-Goals

### 6.1 In-Scope for MVP (P0)
- Electron desktop wrapper packaging the static Next.js export (`out/`).
- Direct launch into the `/app` dashboard.
- Full canvas parity across Architecture, Sequence, ER, and Shape modes.
- Local filesystem project storage replacing `localStorage`.
- Atomic autosave and `.bak` file recovery.
- Native OS Open/Save file dialogs for export (PNG, SVG, Mermaid, JSON) and import (JSON, Docker Compose).
- Native application menu with standard keyboard accelerators.
- Cross-platform build automation via GitHub Actions for Windows (`.exe` NSIS), macOS (`.dmg` Universal), and Linux (`.AppImage`, `.deb`).

### 6.2 Post-MVP Enhancements (P1 / P2)
- Auto-updates via `electron-updater` and GitHub Releases (P1).
- OS file-type association for `.drawz` files (double-click to open) (P1).
- Crash journal recovery prompt for abrupt process terminations (P1).
- Tabbed multi-diagram workspace (P2).
- Local Git integration (commit diagrams directly from UI) (P2).

### 6.3 Explicit Non-Goals (Out of Scope)
- **Cloud Backend / Remote Databases:** No Postgres, MySQL, Supabase, or Firebase backends.
- **User Authentication / Accounts:** No login, OAuth, passwords, or tenant management.
- **Real-Time Multi-User Collaboration:** No WebSocket/CRDT operational transforms in MVP.
- **In-App Payment / Licensing:** 100% open-source MIT license.

---

## 7. Measurable Acceptance Criteria

| ID | Criterion | Verification Method |
|---|---|---|
| **AC-01** | App launches directly to dashboard in under 1.5s cold. | Automated performance timer in Playwright test. |
| **AC-02** | Marketing page `/` is inaccessible from within the desktop app. | Route navigation test asserting no landing page components render. |
| **AC-03** | Canvas edits trigger atomic disk write within 500ms of inactivity. | File system watcher verifying `.drawz` timestamp update in `userData`. |
| **AC-04** | Process kill during edit causes zero data corruption; `.bak` exists. | Chaos testing script killing Electron PID during save; verifying recovery file. |
| **AC-05** | Native Save dialog correctly exports PNG, SVG, and Mermaid files. | E2E integration test asserting file presence and valid binary/text header. |
| **AC-06** | Complete disconnection from internet yields zero functional errors or console network errors. | Playwright offline mode testing with network interception verifying zero failed fetches. |
| **AC-07** | Installers build cleanly on Windows, macOS, and Linux runners in CI. | GitHub Actions release matrix workflow completion with attached artifacts. |
