# Drawzware Agent Placement Guide & Decision Rules

This guide instructs developers and AI coding agents on where to add new files, features, tests, and configuration in the Drawzware repository.

---

## 1. Golden Rules of Placement

1. **Ask "Does this touch React or DOM?":**
   - If **NO** $\rightarrow$ It belongs in `packages/contracts`, `packages/domain`, `packages/canvas-core`, or `packages/storage`. Never put pure math or schema logic in `apps/web`.
   - If **YES** $\rightarrow$ It belongs in `apps/web` (app features) or `packages/ui` (generic primitives).
2. **Ask "Does this touch Node.js built-ins (`fs`, `path`, `child_process`)?":**
   - If **YES** $\rightarrow$ It belongs in `apps/desktop` (main process or IPC handler) or `scripts/`. It is strictly forbidden in `apps/web`, `packages/domain`, or `packages/contracts`.
3. **Ask "Is this a data format or schema definition?":**
   - It belongs in `packages/contracts`. Never create ad-hoc schema types inside components.
4. **Never introduce backend assumptions into offline targets:**
   - Code in `apps/web` or `apps/desktop` must never assume an active backend or database server.

---

## 2. Feature Placement Lookup Table

| What You Are Creating | Where It Belongs | Example File Path |
| :--- | :--- | :--- |
| **New Document Schema or Zod Type** | `packages/contracts/src/document/` | `packages/contracts/src/document/schemas.ts` |
| **New IPC Channel or API Contract** | `packages/contracts/src/ipc/` | `packages/contracts/src/ipc/channels.ts` |
| **REST / WebSocket DTO** | `packages/contracts/src/api/` | `packages/contracts/src/api/sync-dtos.ts` |
| **Architecture Rule / Diagram Validator** | `packages/domain/src/validation/` | `packages/domain/src/validation/cycle-detector.ts` |
| **Document Migration (e.g. v2 to v3)** | `packages/domain/src/migration/` | `packages/domain/src/migration/migrate-v2-to-v3.ts` |
| **Pure Routing Algorithm / Geometry Math** | `packages/canvas-core/src/` | `packages/canvas-core/src/line-routing.ts` |
| **Diagram Importer / Exporter** | `packages/canvas-core/src/exporters/`| `packages/canvas-core/src/exporters/terraform.ts` |
| **Generic UI Primitive (Button, Dialog)** | `apps/web/src/shared/components/ui/` | `apps/web/src/shared/components/ui/button.tsx` |
| **Studio Design Tokens / Colors** | `apps/web/src/styles/` | `apps/web/src/styles/tokens.css` |
| **Storage Backend (e.g. OPFS, Cloud)** | `packages/storage/src/` | `packages/storage/src/browser/opfs-adapter.ts` |
| **Visual Custom Node (React Flow)** | `apps/web/src/features/canvas/nodes/` | `apps/web/src/features/canvas/nodes/StepNode.tsx` |
| **Visual Custom Edge (React Flow)** | `apps/web/src/features/canvas/edges/` | `apps/web/src/features/canvas/edges/SystemEdge.tsx` |
| **Canvas Toolbars, Overlays, Menus** | `apps/web/src/features/canvas/components/`| `apps/web/src/features/canvas/components/CanvasToolbar.tsx` |
| **Canvas Catalog & Tech Registries** | `apps/web/src/features/canvas/registries/`| `apps/web/src/features/canvas/registries/cloud-registry.ts` |
| **Diagram & Canvas Templates** | `apps/web/src/features/canvas/templates/`| `apps/web/src/features/canvas/templates/templates.ts` |
| **Canvas State (Zustand)** | `apps/web/src/features/canvas/stores/` | `apps/web/src/features/canvas/stores/useCanvasStore.ts` |
| **Project Persistence & Templates** | `apps/web/src/features/projects/` | `apps/web/src/features/projects/stores/useProjectStore.ts` |
| **Native .drawz File Operations** | `apps/web/src/features/projects/utils/` | `apps/web/src/features/projects/utils/file-operations.ts` |
| **Format Conversion (Docker/JSON/SVG/PNG)** | `apps/web/src/features/import-export/utils/` | `apps/web/src/features/import-export/utils/file-import.ts` |
| **Marketing & Landing Page UI** | `apps/web/src/features/marketing/components/` | `apps/web/src/features/marketing/components/LandingHeroSection.tsx` |
| **Next.js Page / Route** | `apps/web/src/app/` | `apps/web/src/app/canvas/page.tsx` |
| **Electron Main Process Service** | `apps/desktop/src/services/` | `apps/desktop/src/services/tray-manager.ts` |
| **Electron IPC Handler** | `apps/desktop/src/ipc/` | `apps/desktop/src/ipc/native-export-handlers.ts` |
| **Database Schema or Migration** | `packages/database/src/schema/` | `packages/database/src/schema/projects.ts` |
| **Backend REST Route or Controller** | `apps/api/src/routes/` | `apps/api/src/routes/health.ts` |
| **E2E Browser Test (Playwright)** | `tests/e2e/` | `tests/e2e/canvas-export.spec.ts` |
| **Desktop Smoke Test** | `tests/desktop/` | `tests/desktop/window-lifecycle.test.ts` |

---

## 3. Naming Conventions

- **Files & Directories**: `kebab-case` (e.g. `orthogonal-router.ts`, `storage-adapter.interface.ts`).
- **React Components**: `PascalCase.tsx` (e.g. `BaseSystemNode.tsx`, `ConfirmDialog.tsx`).
- **Hooks**: `camelCase` starting with `use` (e.g. `useKeyboardShortcuts.ts`, `useTheme.ts`).
- **Types & Interfaces**: `PascalCase` (e.g. `ProjectEnvelope`, `CanvasNodeData`).
- **IPC Channels**: Colon-delimited `domain:action` strings (e.g. `'library:list'`, `'file:save-drawz'`).
- **Tests**: Mirror target file with `.test.ts` or `.spec.ts` suffix (e.g. `orthogonal-router.test.ts`).

---

## 4. File Size & Granularity Guidelines

- Organize by **single cohesive responsibility**, not arbitrary line counts.
- Keep components under 300 lines where practical; extract sub-components or helpers when logic branches into multiple distinct responsibilities.
- Co-locate unit tests alongside package source files (`foo.ts` $\rightarrow$ `foo.test.ts`) for pure libraries. Keep end-to-end and multi-application tests in root `tests/`.
