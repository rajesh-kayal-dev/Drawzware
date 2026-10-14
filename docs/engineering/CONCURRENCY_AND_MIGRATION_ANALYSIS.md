# Concurrency & Migration Analysis — Drawzware Desktop

## 1. Concurrency Analysis of the Storage Service

### Identified Hazards Under Rapid Concurrent Writes

The `StorageService` implemented in Milestone 2A provides atomic, durable writes for isolated single-operation saves using the `write-temp -> fsync -> backup -> rename` pattern. However, if rapid, uncoordinated concurrent writes occur (e.g. un-debounced canvas keystrokes or parallel multi-tab/multi-window saves), two specific race conditions arise:

#### Hazard 1: File Replacement & Backup Race
When two saves targeting the same `projectId` execute concurrently:
1. Save $A$ flushes `$id.drawz.tmp.A`.
2. Save $B$ flushes `$id.drawz.tmp.B`.
3. Save $A$ initiates `copyFile($id.drawz, $id.drawz.bak)`.
4. Save $B$ also initiates `copyFile($id.drawz, $id.drawz.bak)` concurrently.
5. Save $A$ calls `fs.promises.rename(tempA, $id.drawz)`.
6. On Windows NTFS file systems, opening, copying, or renaming a target while another file handle is actively renaming can throw `EBUSY` or `EPERM`.

#### Hazard 2: Library Index (`index.json`) Lost-Update Anomaly
The `updateIndexForProject(project)` method performs a Read-Modify-Write cycle on `library/index.json`:
1. Save $A$ reads `index.json` into memory.
2. Save $B$ reads `index.json` into memory concurrently (both have identical state).
3. Save $A$ updates metadata for Project $A$ and commits `index.json`.
4. Save $B$ updates metadata for Project $B$ and commits `index.json`.
5. **Result:** Save $B$'s write overwrites Save $A$'s commit, resulting in a lost index entry until `repairIndex()` is executed.

### Concurrency Safety Invariant
> **Notice:** The `StorageService` in its current state is **NOT** concurrently safe for overlapping asynchronous writes. Rapid autosave events must **NOT** be connected directly to `StorageService.saveProject` without a serialization layer.

### Recommendation for Milestone 2B2 (Store Integration)
Before wiring `useProjectStore` or `useAutoSave` to the desktop storage adapter:
1. **Per-Project Write Serialization Queue:** Maintain a `Map<string, Promise<unknown>>` queue inside `StorageService`. Successive saves for the same project ID will automatically chain onto the active promise.
2. **Global Index Lock:** Enforce a single FIFO queue for all `updateIndexForProject` and `repairIndex` calls to prevent lost index updates.
3. **Renderer Debounce & In-Flight Coalescing:** In `useAutoSave`, retain the 500ms debounce and skip redundant intermediate saves while a save request is in flight.

---

## 2. Browser Data Migration Architecture

### Web-to-Desktop Data Isolation
When running on the web (e.g. `https://drawzware.com` or Cloudflare Pages), project data resides in the browser's origin-specific `localStorage`.
In the desktop application, the renderer is served via the custom privileged scheme `app://drawzware`.

Under the browser Same-Origin Policy and Chromium sandbox:
- `app://drawzware` cannot access the `localStorage` partition of `https://...`.
- The desktop shell cannot silently read the user's browser disk cache or cookies from external browsers (Chrome, Firefox, Safari).

### Explicit Export / Import Migration Strategy
To guarantee complete user control and zero data loss:
1. **Manual Web Export:** The web application already supports exporting a single project (`exportProject`) and the entire workspace (`saveAppData`).
2. **Explicit Desktop Import:** Drawzware Desktop will provide a first-launch prompt or dashboard action: *"Import projects from web backup"*.
3. **Validated Ingestion:** The import workflow will use `parseProjectDocument()`, recognizing both single project JSONs and multi-project `AppData` backup bundles, validate each against `ProjectSchema`, and persist them into `userData/library/projects/`.
4. **No Automated Guessing:** Projects will never be silently overwritten or merged without user confirmation.
