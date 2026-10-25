# AGENTS.md — Drawzware Engineering Principles & AI Agent Guidelines

This repository contains **Drawzware**, an opinionated system architecture diagramming studio. This file establishes the core engineering principles, operating rules, and non-negotiable constraints for any AI coding agent working in this codebase.

---

## 1. Prime Directives

1. **Client-First, Offline-Primary Invariant:** Drawzware's personal canvas experience is 100% offline and client-side by default with zero required backend dependencies. Local auto-save and native exports must never depend on remote services. Cloud authentication, remote persistence, and multi-user collaboration are strictly opt-in and handled via the dedicated `@drawzware/api` service and typed contracts in `@drawzware/contracts`. Client applications (`apps/web` and `apps/desktop`) must never directly import database or server packages.
2. **Preserve Existing Working Functionality:** The Next.js static export (`output: "export"`), `@xyflow/react` controlled canvas, Zustand stores, and studio design system are proven and working. Do not perform speculative rewrites. Static export requires client-compatible routes (e.g., query-parameter or client-hydrated routes for public views) backed by secure public API endpoints in `@drawzware/api`.
3. **Inspect Before Changing:** Read source code, types, and existing tests before modifying any file. Never assume API contracts or component props.
4. **Plan Non-Trivial Changes:** For any task involving multi-file edits, architecture shifts, or new dependencies, outline an evidence-based plan before implementing.
5. **No Hallucinated Test Results:** Never report that a test, build, or lint check passed unless you actually ran the command and observed success output. If an environment limitation prevents execution, report it explicitly.

---

## 2. Repository Overview & Stack

- **Framework:** Next.js 16.1.6 (App Router, Turbopack, `output: "export"`) + React 19.2.3 + TypeScript 5
- **Canvas Engine:** `@xyflow/react` v12.10.1 (React Flow in controlled Zustand mode)
- **State Management:** Zustand v5 (`useCanvasStore`, `useProjectStore`, `useSettingsStore`)
- **Styling:** Tailwind CSS v4 + Studio design tokens ([src/styles/tokens.css](file:///d:/AI%20Projects/drawzware-system-design-canvas/src/styles/tokens.css)) + Radix UI primitives
- **Desktop Subsystem:** Electron with isolated preload bridge, atomic file-based persistence, and hardened CSP permitting only configured trusted API origins
- **Collaboration & Cloud Backend (Opt-In):** Node.js / Express REST & WebSocket API (`@drawzware/api`) backed by MongoDB for workspaces, invitations, remote canvas sync, and background cleanup workers when required (7-day Trash lifecycle)

---

## 3. Modular Rule System

Specific, actionable constraints are maintained in `.agents/rules/`:
- [monorepo.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/.agents/rules/monorepo.md): Monorepo package boundaries, dependency rules, and placement invariants.
- [architecture.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/.agents/rules/architecture.md): Process isolation, main/preload/renderer boundaries, persistence abstraction.
- [typescript-react.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/.agents/rules/typescript-react.md): TypeScript rigor, React 19 conventions, Zustand rules, Studio tokens.
- [testing.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/.agents/rules/testing.md): Unit, integration, E2E expectations, and CI gate enforcement.
- [desktop-security.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/.agents/rules/desktop-security.md): Electron sandbox, IPC whitelist, CSP, and input validation.

Architecture specifications and placement guides:
- [System_Design.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/System_Design.md): Complete system architecture, state models, and collaboration lifecycle.
- [MVP_PLAN.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/MVP_PLAN.md): Feature scope, acceptance gates, and delivery requirements.
- [AUDIT_REPORT.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/AUDIT_REPORT.md): Codebase audit findings, gap analysis, and verified invariants.

---

## 4. Verification & Quality Gates

Every non-trivial modification must pass these checks:
```bash
npm run lint         # ESLint check
npx tsc --noEmit     # TypeScript type verification
npm test             # Automated unit and integration tests (when configured)
npm run build        # Production Next.js static export
```

If any check fails, resolve the root cause before completing the task.
