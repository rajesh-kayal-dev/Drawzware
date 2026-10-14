# Agent Rules: Architecture & Process Boundaries

**Applies to:** Architectural modifications, new modules, and subsystem integrations.

---

## 1. Process Separation & Boundaries

1. **Renderer Isolation:**
   - The renderer process (`src/*`) must remain a standard web environment.
   - **NEVER** import `electron`, `fs`, `path`, or `child_process` in `src/`.
   - All privileged system operations must delegate through `window.desktopApi` defined in `electron/preload.ts`.
2. **Main Process Authority:**
   - The main process (`electron/*`) owns all filesystem interactions, native dialogs, and OS menu bar definitions.
   - Do not perform UI rendering or heavy canvas calculation in the main process.
3. **Storage Abstraction:**
   - Always access project persistence through the `IStorageAdapter` interface ([src/lib/storage-adapter.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/src/lib/storage-adapter.ts)).
   - Do not bind UI components directly to `localStorage` or `window.desktopApi`.

---

## 2. Desktop Route & Navigation Boundaries

1. **Direct Launch:**
   - The desktop application launches into the `/app` dashboard (`out/app.html`).
   - The marketing page (`/`, `src/app/page.tsx`) must never be used as a desktop home route.
2. **Static Export Adherence:**
   - Next.js is configured with `output: "export"`.
   - Never introduce dynamic route segments (e.g. `/canvas/[id]/page.tsx`). Use query parameters (e.g. `/canvas?id=...`) via `canvasPath(id)` from `src/lib/routes.ts`.
   - Do not use server-only features (`headers()`, `cookies()`, Server Actions, or route handlers in `src/app/api/`).

---

## 3. Technology Selection Guardrails

1. **No Unneeded Infrastructure:**
   - Do not introduce SQLite, databases, GraphQL servers, microservices, or background worker daemons.
   - Projects are self-contained JSON-serialized graphs loaded into memory.
2. **Preserve React Flow Controlled Mode:**
   - React Flow nodes and edges live in Zustand (`useCanvasStore.ts`).
   - `applyNodeChanges` and `applyEdgeChanges` must run inside the store, not in unmanaged component state.
