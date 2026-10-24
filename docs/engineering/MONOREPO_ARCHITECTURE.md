# Drawzware Monorepo Architecture Specification

## 1. Overview & Architectural Vision

Drawzware is a high-performance visual architecture diagramming studio designed to run offline-first on the web and as a native desktop application (Windows, macOS, Linux).

To scale the project cleanly for future capabilities—such as an optional collaboration backend, database persistence, cloud sync, and AI features—without destabilizing the proven client-side engine, Drawzware adopts a modular monorepo structure.

This document serves as the permanent source of truth for repository structure, module boundaries, dependency rules, and operational invariants.

---

## 2. Prime Invariants

1. **Client-First, Zero-Backend Invariant (ADR-001, ADR-002)**:
   - The core web application compiles to static HTML/CSS/JS (`output: "export"`).
   - The application functions 100% offline using local browser storage (web) or atomic filesystem persistence (desktop).
   - Any backend service (`apps/api`) or database (`packages/database`) is strictly an optional sync/collaboration layer. Core diagramming functionality must never require or block on a network connection.
2. **Hardened Desktop Process Boundary (ADR-004)**:
   - Electron main and preload processes remain isolated from the renderer: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
   - Node.js APIs (`fs`, `path`, `crypto`, `child_process`) are strictly forbidden in renderer code.
   - Desktop capabilities are exposed exclusively through typed IPC contracts in `window.desktopApi`.
3. **Pure Domain & Contract Isolation**:
   - `packages/contracts` and `packages/domain` contain zero framework, UI, or platform-specific dependencies.
   - Schemas and business rules are defined once and shared across web, desktop, and future backend services.

---

## 3. Target Monorepo Taxonomy

```text
drawzware/
├── apps/
│   ├── web/                     # Next.js 16 Client & Canvas App (output: "export")
│   ├── desktop/                 # Electron 44 Native Desktop Shell
│   └── api/                     # [Future] Backend Service & Sync Server (unimplemented)
│
├── packages/
│   ├── contracts/               # Single Source of Truth: DTOs, Zod Schemas, IPC Protocols
│   ├── domain/                  # Framework-Agnostic Entities, Invariants, Migrations
│   ├── canvas-core/             # Headless Graph Calculations, Layouts, Importers/Exporters
│   ├── storage/                 # Storage Interfaces, Browser & Desktop Adapters
│   ├── database/                # [Future] Database Client, Schemas & Migrations (unimplemented)
│   └── ui/                      # Reusable UI Primitives, Studio Design Tokens, Icons
│
├── infrastructure/              # Cloudflare Wrangler, Docker definitions, CI/CD workflows
├── docs/                        # ADRs, Product Specs, Architecture, Runbooks
├── tests/                       # Integration, E2E (Playwright), Contract verification tests
├── scripts/                     # Validation, build, release, and packaging utilities
├── .agents/                     # AI Agent guidelines, rules, and skills
├── package.json                 # Root npm workspaces configuration
├── tsconfig.base.json           # Shared base compiler options
└── vitest.config.ts             # Workspace test orchestrator
```

---

## 4. Package Responsibilities & Boundaries

### `packages/contracts`
- **Responsibility**: Canonical data transfer objects, Zod validation schemas, document format specifications (`.drawz`), IPC message contracts, and REST/WebSocket payloads.
- **Allowed Dependencies**: `zod` only.
- **Prohibited Dependencies**: React, Next.js, Electron, Node.js built-ins, internal packages.

### `packages/domain`
- **Responsibility**: Pure domain models, graph integrity validation (cycle detection, orphan detection, boundary checks), and schema version migrations (v1 $\rightarrow$ v2 $\rightarrow$ v3).
- **Allowed Dependencies**: `packages/contracts`.
- **Prohibited Dependencies**: Frameworks, DOM APIs, React hooks, database drivers, filesystem.

### `packages/canvas-core`
- **Responsibility**: Headless mathematical and graph algorithms. Dagre auto-layout, orthogonal line routing calculations, grid snapping, and text/AST exporters/importers (Mermaid, Docker Compose).
- **Allowed Dependencies**: `packages/contracts`, `packages/domain`, `@dagrejs/dagre`, `js-yaml`.
- **Prohibited Dependencies**: React, `@xyflow/react`, DOM APIs (`window`, `document`), CSS.

### `packages/storage`
- **Responsibility**: Unified `StorageAdapter` interface and concrete implementations:
  - `BrowserStorageAdapter`: Browser LocalStorage and IndexedDB implementations.
  - `DesktopStorageAdapter`: Electron IPC client implementation.
  - `CloudStorageAdapter` [Future]: Remote sync client implementation.
- **Allowed Dependencies**: `packages/contracts`, `packages/domain`.
- **Prohibited Dependencies**: UI components, React hooks, Next.js page components.

### `packages/ui`
- **Responsibility**: Pure design system primitives (Button, Dialog, Popover, Menu, Tooltip), OKLCH studio design tokens (`tokens.css`), and generic UI icons.
- **Allowed Dependencies**: `packages/contracts`, `radix-ui`, `clsx`, `tailwind-merge`.
- **Prohibited Dependencies**: Canvas stores, diagram business logic, Next.js routing, Electron APIs.

### `packages/database` [Future]
- **Responsibility**: Relational schema definitions, migrations, and repository queries for cloud collaboration.
- **Allowed Dependencies**: `packages/contracts`, ORM/query builder (`drizzle-orm` / `prisma`).
- **Prohibited Dependencies**: UI, Next.js, Electron, canvas layout engines.

### `apps/web`
- **Responsibility**: Feature-based Next.js App Router client with zero-backend offline capability (`output: "export"`, target: `./out`).
- **Internal Structure**:
  - `src/features/canvas/`: Canvas components, custom nodes, edges, registries, diagram templates, and `useCanvasStore`.
  - `src/features/projects/`: Project CRUD, template instantiation, `.drawz` persistence, and `useProjectStore`.
  - `src/features/import-export/`: Format converters (Docker Compose YAML, JSON, SVG/PNG, Mermaid) and export dialogs.
  - `src/features/sharing/`: URL-based state sharing and hash encoding/decoding.
  - `src/features/settings/`: Studio settings and `useSettingsStore`.
  - `src/features/marketing/`: Marketing landing page components and hero sections.
  - `src/features/pwa/`: Offline PWA install prompt and registration.
  - `src/shared/`: Reusable Radix/Tailwind design system primitives (`ui/`), global layout (`Header.tsx`), and feedback components.
- **Allowed Dependencies**: `contracts`, `domain`, `canvas-core`, `storage`, `ui`, `@xyflow/react`, `zustand`, `lucide-react`.
- **Prohibited Dependencies**: `apps/desktop`, `apps/api`, Node.js native APIs (`fs`, `child_process`).

### `apps/desktop`
- **Responsibility**: Electron main process lifecycle, window state persistence, atomic disk storage service, safe window close handshake, and sandboxed preload bridge. Packages `apps/web/out` into desktop distributables (NSIS, DMG, AppImage).
- **Allowed Dependencies**: `contracts`, `domain`, `storage`, `electron`, `electron-builder`.
- **Prohibited Dependencies**: `apps/web` source files, `apps/api`.

### `apps/api` [Future]
- **Responsibility**: Headless HTTP REST routes, WebSocket real-time rooms, authentication, and project synchronization services.
- **Allowed Dependencies**: `contracts`, `domain`, `database`.
- **Prohibited Dependencies**: `apps/web`, `apps/desktop`, React, UI primitives.

---

## 5. Dependency Rules Matrix

```text
▲ HIGH LEVEL / APPLICATIONS
│  apps/web           apps/desktop          apps/api (future)
│   ├── ui                ├── storage           ├── database (future)
│   ├── storage           └── domain            └── domain
│   ├── canvas-core
│   └── domain
│
│  MIDDLEWARE / PACKAGES
│  packages/storage       packages/canvas-core  packages/database
│   └── domain             └── domain            └── contracts
│
│  CORE DOMAIN
│  packages/domain
│   └── contracts
│
│  BASE CONTRACTS
▼  packages/contracts (zero internal dependencies)
```

**Rule**: Dependencies flow strictly downward. Packages may never depend on sibling packages at the same tier or higher tiers unless explicitly declared above. Circular dependencies will fail build verification.

---

## 6. Incremental Migration Safety

The migration from the single-package repository to this monorepo is staged across distinct phases:
- **Phase 1**: Workspaces & TypeScript base scaffolding (Completed).
- **Phase 2**: Extract `packages/contracts` and eliminate type duplication.
- **Phase 3**: Extract `packages/ui`, `packages/domain`, `packages/canvas-core`, and `packages/storage`.
- **Phase 4**: Relocate `apps/web` and `apps/desktop`.
- **Phase 5**: Scaffold placeholder contracts for `packages/database` and `apps/api`.

At no point during any phase may existing test suites or production builds be broken.
