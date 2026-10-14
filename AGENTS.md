# AGENTS.md — Drawzware Engineering Principles & AI Agent Guidelines

This repository contains **Drawzware**, an opinionated system architecture diagramming studio. This file establishes the core engineering principles, operating rules, and non-negotiable constraints for any AI coding agent working in this codebase.

---

## 1. Prime Directives

1. **Client-First, Zero-Backend Invariant:** Drawzware has no backend server, no database daemon, and no remote authentication. Everything runs client-side. Never introduce remote API calls, cloud auth, or background server assumptions.
2. **Preserve Existing Working Functionality:** The Next.js static export (`output: "export"`), `@xyflow/react` controlled canvas, Zustand stores, and studio design system are proven and working. Do not perform speculative rewrites.
3. **Inspect Before Changing:** Read source code, types, and existing tests before modifying any file. Never assume API contracts or component props.
4. **Plan Non-Trivial Changes:** For any task involving multi-file edits, architecture shifts, or new dependencies, outline an evidence-based plan before implementing.
5. **No Hallucinated Test Results:** Never report that a test, build, or lint check passed unless you actually ran the command and observed success output. If an environment limitation prevents execution, report it explicitly.

---

## 2. Repository Overview & Stack

- **Framework:** Next.js 16.1.6 (App Router, Turbopack, `output: "export"`) + React 19.2.3 + TypeScript 5
- **Canvas Engine:** `@xyflow/react` v12.10.1 (React Flow in controlled Zustand mode)
- **State Management:** Zustand v5 (`useCanvasStore`, `useProjectStore`, `useSettingsStore`)
- **Styling:** Tailwind CSS v4 + Studio design tokens ([src/styles/tokens.css](file:///d:/AI%20Projects/drawzware-system-design-canvas/src/styles/tokens.css)) + Radix UI primitives
- **Desktop Subsystem:** Electron with isolated preload bridge and atomic file-based persistence

---

## 3. Modular Rule System

Specific, actionable constraints are maintained in `.agents/rules/`:
- [architecture.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/.agents/rules/architecture.md): Process isolation, main/preload/renderer boundaries, persistence abstraction.
- [typescript-react.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/.agents/rules/typescript-react.md): TypeScript rigor, React 19 conventions, Zustand rules, Studio tokens.
- [testing.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/.agents/rules/testing.md): Unit, integration, E2E expectations, and CI gate enforcement.
- [desktop-security.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/.agents/rules/desktop-security.md): Electron sandbox, IPC whitelist, CSP, and input validation.

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
