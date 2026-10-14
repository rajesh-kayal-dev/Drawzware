# ADR-002: Workspace Model and Project Persistence

**Status:** Proposed (Recommended)  
**Date:** October 2026  
**Deciders:** Principal Software Engineer, Product Architect  

---

## 1. Context and Problem Statement

The current web application persists all user projects inside browser `window.localStorage` under a single key (`system-design-canvas`), serialized as a monolithic `AppData` JSON blob.

This approach exhibits severe desktop limitations:
1. **Capacity Limit:** Browsers cap `localStorage` around 5 MB, which is quickly exhausted by freehand drawings, large ER schemas, or multi-diagram projects.
2. **Serialization Thrashing:** Every 500 ms debounced autosave re-serializes the entire array of all projects.
3. **Data Loss Vulnerability:** In [src/lib/storage.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/src/lib/storage.ts#L20-L22), if Zod parsing fails on load, the storage loader silently returns an empty array, which will overwrite user data on the next save cycle.
4. **Desktop Disconnect:** Users expect native desktop file integration: individual files they can save to custom directories, share with colleagues, and check into Git repositories.

We must decide the persistence engine and workspace model for Drawzware Desktop.

---

## 2. Options Considered

### Option 1: Hybrid Workspace with Discrete Atomic JSON/Drawz Files (Recommended)
- **Library Workspace:** Maintain an internal application directory (`userData/library/projects/`) where dashboard projects are saved as individual `<id>.drawz` (formatted JSON) files, indexed by a lightweight `index.json`.
- **Standalone Documents:** Allow users to use "Save As…" and "Open…" to work with files anywhere on their local disk.
- **Persistence Mechanism:** Atomic filesystem writes (write to `.tmp`, flush to disk via `fs.fdatasync`, rotate `.bak`, and atomically rename).

### Option 2: Embedded Relational Database (SQLite via better-sqlite3)
Store all projects, revisions, and metadata inside a local `drawzware.db` SQLite file in `userData`.

### Option 3: Pure Document-Only Model (No Dashboard Library)
Eliminate the dashboard project catalog entirely. Treat Drawzware like Photoshop or VS Code, requiring an explicit "Open File" or "New File" on every session.

---

## 3. Decision & Provisional Recommendation

**We provisionally recommend Option 1: Hybrid Workspace with Discrete Atomic JSON/Drawz Files.**

### Rationale:
1. **Why NOT SQLite (Option 2):**
   - Drawzware diagrams are cohesive, hierarchical graph structures that are always loaded and modified in-memory as a single unit by React Flow and Zustand. There are no relational joins, row-level queries, or concurrent multi-user database transactions.
   - SQLite introduces native compiled C-bindings (`better-sqlite3` or `sqlite3`). These require platform-specific native compilation and cross-compilation toolchains in CI for Windows x64, macOS x64, macOS arm64, and Linux x64, adding significant release brittleness with zero functional benefit for graph storage.
2. **Why NOT Pure Document-Only (Option 3):**
   - The Drawzware web application has a polished, popular Projects Dashboard with templates and project previews. Stripping this would degrade user experience for quick architectural sketches.
3. **Why Hybrid Atomic Files (Option 1):**
   - Solves the 5 MB quota completely.
   - Saves only the active project on autosave (O(1) instead of O(N) projects).
   - Atomic `.tmp -> rename` prevents partial writes during system crashes.
   - Project files remain plain JSON, making them human-readable, Git-diffable, and easily recoverable.

---

## 4. Consequences

### Positive Consequences:
- High data safety with atomic writes and automatic `.bak` backup copies.
- Native Git compatibility: users can save `.drawz` files into their repository trees.
- Zero native compilation dependencies in `package.json`.
- Easy migration: reading existing exported JSON files is identical to native format.

### Negative Consequences:
- Requires managing an `index.json` metadata cache in the internal library directory.

---

## 5. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Index desynchronization if user deletes files manually from AppData | Low | Reconcile `index.json` against actual directory contents on startup. |
| Disk-full error during save | Medium | Catch write errors before atomic rename; keep existing file intact and alert user via UI toast. |
