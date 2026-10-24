# monorepo.md — Drawzware Monorepo Rules & Invariants

This rule governs all code placement, dependencies, and architecture changes across the Drawzware repository.

---

## 1. Prime Architecture Rules

1. **Client-First Invariant**:
   - `apps/web` and `apps/desktop` must operate 100% offline without network dependencies.
   - Never import `apps/api` or `packages/database` into client applications.
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
- `packages/ui`: Pure presentation primitives and tokens. No canvas math or diagram domain logic.
- Circular dependencies between packages are strictly forbidden.

---

## 3. Placement Protocol

Before creating any file, check [docs/engineering/AGENT_PLACEMENT_GUIDE.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/engineering/AGENT_PLACEMENT_GUIDE.md):
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
