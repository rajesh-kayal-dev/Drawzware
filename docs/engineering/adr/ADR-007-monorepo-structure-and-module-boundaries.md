# ADR-007: Monorepo Architecture and Package Boundary Enforcement

**Status:** Accepted  
**Date:** October 2026  
**Deciders:** Principal Software Engineer, Product Architect  

---

## 1. Context and Problem Statement

Drawzware began as a single-package Next.js 16 web application with an Electron desktop wrapper co-located in the same root.

As the product evolves toward:
1. Native multi-platform desktop releases (Windows, macOS, Linux),
2. Local-first atomic document persistence (`.drawz`),
3. Future optional collaboration sync services (`apps/api`),
4. Shared format validation across clients and future backends,

the single-package repository faces significant architecture risks:
- **Type Duplication**: `src/types/document.ts` and `src/types/ipc.ts` were already duplicated in `electron/types/` to prevent cross-boundary build errors.
- **Leaky Concerns**: Pure graph math (Dagre layout, line routing) was mixed with React Flow and browser DOM APIs.
- **Accidental Coupling**: A developer or AI agent could inadvertently import Electron native Node.js APIs into the web client, or cloud-backend assumptions into the offline desktop shell.

We must define a permanent monorepo architecture with clean package boundaries that preserves our zero-backend and desktop security invariants while enabling future multi-app scaling.

---

## 2. Options Considered

### Option 1: Polyrepo (Multiple Repositories)
Split web frontend, desktop shell, shared packages, and future API into separate Git repositories.
- *Pros*: Complete dependency isolation.
- *Cons*: Enormous development overhead, version desynchronization of `.drawz` document schemas, multi-repo PR coordination friction, complex local linking.

### Option 2: Monolithic Next.js Project (Status Quo with Folder Conventions)
Keep single `package.json` and enforce module boundaries through lint rules alone.
- *Pros*: Zero file movement.
- *Cons*: Fragile boundaries; dependency drift; inability to publish standalone desktop or API bundles cleanly; type duplication across Electron and Next.js compiler targets persists.

### Option 3: Modular Monorepo with npm Workspaces (Accepted)
Group deployable targets in `apps/` (`web`, `desktop`, future `api`) and reusable code in `packages/` (`contracts`, `domain`, `canvas-core`, `storage`, `ui`, future `database`).
- *Pros*:
  - Single version of truth for all schemas in `packages/contracts`.
  - Enforced unidirectional dependency flow.
  - Next.js static export (`output: "export"`) remains intact.
  - Electron security boundary strictly maintained.
  - Zero heavy tooling required; uses native npm workspaces.
- *Cons*: Requires staged, controlled file migration.

---

## 3. Decision

**We adopt Option 3: Modular Monorepo with npm Workspaces.**

### Core Structural Decisions:
1. **`packages/contracts` is the Root Source of Truth**: All document schemas, IPC channel names, and API interfaces reside here. Zero dependencies other than `zod`.
2. **`packages/domain` is Framework-Independent**: Business integrity rules, diagram validations, and schema version migrations reside here without React, Next.js, or Electron dependencies.
3. **`packages/canvas-core` is Headless**: Graph layouts, orthogonal routing calculations, and AST converters (Mermaid, Docker Compose) contain zero DOM or React dependencies.
4. **`packages/storage` Isolates Persistence**: The `StorageAdapter` interface allows `apps/web` to use `BrowserStorageAdapter` and `apps/desktop` to use `DesktopStorageAdapter` interchangeably.
5. **Client-First Invariant Maintained**: `apps/web` and `apps/desktop` must never depend on `packages/database` or `apps/api`. Offline diagramming is unconditionally guaranteed.
6. **Electron Isolation Maintained**: `apps/desktop` interacts with the renderer solely through typed preload contracts.

---

## 4. Consequences

### Positive:
- Type duplication between Next.js and Electron is permanently eliminated.
- Business rules and document migrations are testable in pure Node.js environments without DOM mocks.
- Clear mental model and explicit boundaries for human engineers and AI coding agents.
- Ready for future collaboration and cloud sync without refactoring the canvas core.

### Negative / Trade-offs:
- Incremental migration must be staged carefully to ensure zero regressions in existing tests and build targets.
- Relative import paths must be converted to scoped workspace package names (`@drawzware/*`).

---

## 5. References

- [ADR-001: Desktop Framework Selection and Frontend Packaging](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/engineering/adr/ADR-001-desktop-framework-and-packaging.md)
- [ADR-002: Workspace Model and Project Persistence](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/engineering/adr/ADR-002-workspace-model-and-persistence.md)
- [ADR-004: Desktop Security Boundaries and IPC Design](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/engineering/adr/ADR-004-desktop-security-boundaries-and-ipc.md)
- [MONOREPO_ARCHITECTURE.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/engineering/MONOREPO_ARCHITECTURE.md)
