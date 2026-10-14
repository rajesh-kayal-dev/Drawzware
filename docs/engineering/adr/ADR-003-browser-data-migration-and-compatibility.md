# ADR-003: Browser Data Migration and Compatibility

**Status:** Proposed (Recommended)  
**Date:** October 2026  
**Deciders:** Principal Software Engineer, Product Architect  

---

## 1. Context and Problem Statement

Existing users of the Drawzware web application have diagrams stored in their browser `window.localStorage` under the `system-design-canvas` key or have exported project bundles via `exportAllProjectsFile()` (`drawzware-YYYY-MM-DD.json`).

When these users install and launch the new desktop application, their desktop environment starts with an empty filesystem library.

We must decide:
1. How to import existing web diagrams into the desktop application.
2. How to ensure backward and forward compatibility between web export files and desktop project files.

---

## 2. Options Considered

### Option 1: First-Run Migration Prompt + Universal Import Drop Zone (Recommended)
- **Universal Import:** Retain and enhance the existing drag-and-drop import drop zone ([ImportDropZone.tsx](file:///d:/AI%20Projects/drawzware-system-design-canvas/src/components/project/ImportDropZone.tsx)) and "Import JSON" action to accept any legacy web export file.
- **First-Run Web Migration Assistant:** Provide an explicit banner or settings action ("Import from Drawzware Web") where users can drag in their exported JSON file or paste an export link.
- **Unified Schema Format:** The desktop `.drawz` file format uses the exact same `ProjectSchema` defined in [src/types/index.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/src/types/index.ts#L309-L325).

### Option 2: Automated Browser Sniffing / Cookie Stealing
Attempt to read browser profile directories (Chrome, Firefox, Edge, Safari) from the desktop main process to automatically discover and extract `localStorage` data for `drawzware.vercel.app`.

### Option 3: Mandatory Cloud Sync Intermediary
Require users to create an online account to sync diagrams between web and desktop.

---

## 3. Decision & Provisional Recommendation

**We provisionally recommend Option 1: First-Run Migration Prompt + Universal Import Drop Zone.**

### Rationale:
1. **Why NOT Automated Browser Sniffing (Option 2):**
   - Parsing SQLite/LevelDB browser storage files across various OS locations is brittle, triggers antivirus/antimalware warnings, violates user privacy expectations, and is blocked by macOS sandbox policies.
2. **Why NOT Cloud Sync (Option 3):**
   - Violates the core product principle of Drawzware: zero-backend, 100% private, client-first architecture.
3. **Why Option 1:**
   - Drawzware already has robust, battle-tested import logic in `src/components/project/project-io.ts` (`importFile`, `parseProjectsFile`).
   - The desktop file format (`.drawz`) is 100% structurally identical to the web `Project` JSON format, ensuring seamless two-way interoperability. A diagram created in the desktop app can be opened in the web app, and vice versa.

---

## 4. Consequences

### Positive Consequences:
- Safe, non-invasive, and privacy-respecting migration workflow.
- Complete interoperability between web and desktop files.
- Zero risk of corrupted browser data silently affecting desktop files.

### Negative Consequences:
- Users must export a JSON backup from the web app before importing into the desktop app (a one-time, 10-second action).

---

## 5. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| User imports legacy unversioned project JSON | Low | Run `ProjectSchema.safeParse()` with default fallbacks for missing properties (`viewport`, `diagramType`). |
| Importing file with conflicting project ID | Low | Desktop storage generates a fresh UUID for imported projects unless explicitly requested otherwise. |
