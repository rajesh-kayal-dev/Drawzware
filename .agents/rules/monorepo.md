# monorepo.md — Drawzware Monorepo Rules & Invariants

This rule governs all code placement, dependencies, and architecture changes across the Drawzware repository.

---

## 1. Prime Architecture Rules

1. **Client-First Invariant**:
   - Personal canvas editing and local auto-save in `apps/web` and `apps/desktop` must operate 100% offline without network dependencies.
   - Cloud persistence and collaboration are opt-in client features communicating with `@drawzware/api` via network protocols (HTTP/WS).
   - Never import `apps/api` code, server files, or database drivers directly into client applications or shared UI packages. All client-server communication must adhere to shared contracts in `packages/contracts`.
   - Web static export requires client-compatible routes (e.g. query-parameter or client-hydrated routes) backed by secure public API endpoints in `@drawzware/api`.
   - Electron CSP permits network connections only to configured trusted API origins.
2. **Hardened Electron Security Boundary**:
   - The desktop renderer is isolated: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
   - Never import Node.js built-ins (`fs`, `path`, `crypto`, `child_process`) into renderer code or shared frontend packages.
   - All desktop operations pass through the typed `window.desktopApi` bridge.
3. **Single Source of Truth for Types**:
   - Document models, node structures, and IPC interfaces must be defined in `packages/contracts`.
   - Never create duplicate schema definitions across `electron/` and `src/`.

---

## 2. Dependency Invariants

- `packages/contracts`: Zero internal dependencies. External dependency limited to `zod`.
- `packages/domain`: May depend only on `packages/contracts`. Must remain free of UI, DOM, and React code.
- `packages/canvas-core`: May depend only on `packages/contracts` and `packages/domain`. Must remain headless (zero DOM/React dependencies).
- `packages/storage`: May depend only on `packages/contracts` and `packages/domain`.
- `packages/ui`: Pure presentation primitives and tokens (when extracted; currently in `apps/web/src/shared/components/ui/`). No canvas math or diagram domain logic.
- Circular dependencies between packages are strictly forbidden.

---

## 3. Placement Protocol

Before creating any file, check [System_Design.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/System_Design.md) and [MVP_PLAN.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/MVP_PLAN.md):
- Pure algorithms and math $\rightarrow$ `packages/canvas-core`
- Entity validations and migrations $\rightarrow$ `packages/domain`
- DTOs and Zod schemas $\rightarrow$ `packages/contracts`
- Visual React Flow nodes/edges $\rightarrow$ `apps/web/src/features/canvas/nodes/` or `edges/`
- Canvas UI registries & presets $\rightarrow$ `apps/web/src/features/canvas/registries/`
- Canvas diagram templates $\rightarrow$ `apps/web/src/features/canvas/templates/`
- Project persistence & native .drawz $\rightarrow$ `apps/web/src/features/projects/`
- Format conversion (Docker, Mermaid, SVG/PNG) $\rightarrow$ `apps/web/src/features/import-export/`
- Marketing & landing page UI $\rightarrow$ `apps/web/src/features/marketing/`
- OS file & window operations $\rightarrow$ `apps/desktop/src/`
- Generic UI controls $\rightarrow$ `apps/web/src/shared/components/ui/` or `packages/ui/src/primitives/`
