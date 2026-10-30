# DrawzWare Codebase Architecture & MVP Audit Report

> **Audit Date:** 2026-10-25  
> **Auditor:** Senior Software Architect  
> **Target Baseline:** [MVP_PLAN.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/MVP_PLAN.md) & [System_Design.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/System_Design.md)  
> **Repository Commit Verified:** `b7dc733d`  
> **Test Suite Status:** 26/26 test suites passed (392 tests total)  
> **Overall Production Readiness Score:** **58 / 100 (Risky)**

---

## 1. Executive Summary

DrawzWare exhibits a duality between a mature, production-grade local-first diagramming engine and an incomplete cloud/collaboration layer:

1. **Local-First & Desktop Subsystem (Production-Grade):** The canvas engine (`@xyflow/react` + Zustand), FIFO sequential auto-save hook ([useAutoSave.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/projects/hooks/useAutoSave.ts)), Electron desktop sandbox with close-handshake protection ([main.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/desktop/main.ts)), and canonical file formats (`.drawz`, JSON, PNG, SVG, Mermaid) are implemented, tested, and reliable.
2. **Web Collaboration UI (Mocked Prototype):** In [apps/web/src/features/collaboration](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/collaboration), the authentication modal, invite dialog, collaborator avatars, and publish/embed dialog are in-memory UI simulations that mutate local Zustand state using `setTimeout` and hardcode mock users and 404 URLs (`/p/abc123`). No network requests (`fetch`) leave `apps/web` for any backend service.
3. **Backend API (`apps/api`) (Isolated REST Service):** A functional Express + Mongoose REST API exists with JWT authentication, workspace membership RBAC, and initial diagram import schemas. However, it lacks an endpoint to update canvas snapshots after creation, has zero WebSocket/CRDT transport, dispatches no emails, enforces no storage quotas, and provides no public read-only route.
4. **Foundational Conflict:** [AGENTS.md line 14](file:///d:/AI%20Projects/drawzware-system-design-canvas/AGENTS.md#L14) asserts a strict *"Client-First, Zero-Backend Invariant"* that conflicts directly with the authoritative backend mandate in [MVP_PLAN.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/MVP_PLAN.md) and [System_Design.md](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/System_Design.md).

---

## 2. Requirements Verification Matrix

*Classifications: `Implemented` (verified by code and tests), `Partial` (partially functional or backend-only), `Mocked` (UI prototype with local simulation), `Missing` (no code exists), `Unverified` (cannot be proven).*

| # | MVP Requirement | Status | Code Evidence & File Paths | Architectural Impact |
|---|---|---|---|---|
| **1** | **Local Personal Canvas & Auto-Save** | **Implemented** | [useAutoSave.ts line 54-127](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/projects/hooks/useAutoSave.ts#L54-L127)<br/>[WebStorageAdapter.ts line 46-96](file:///d:/AI%20Projects/drawzware-system-design-canvas/packages/storage/src/web-adapter.ts#L46-L96)<br/>`tests/canvas-persistence.test.ts` | 500ms debounce, FIFO write order, retry on failure, Electron close-handshake flush. Reliable. |
| **2** | **Desktop Isolation & Local Filesystem** | **Implemented** | [apps/desktop/main.ts line 255-263](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/desktop/main.ts#L255-L263)<br/>[apps/desktop/preload.ts line 45-94](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/desktop/preload.ts#L45-L94)<br/>`tests/window-close-handshake.test.ts` | Electron sandbox enabled, nodeIntegration false, contextIsolation true, strict IPC whitelist, atomic file quarantine. |
| **3** | **Document Format & File Safety** | **Implemented** | [document.ts line 50-74](file:///d:/AI%20Projects/drawzware-system-design-canvas/packages/contracts/src/document.ts#L50-L74)<br/>[export.ts line 1-100](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/import-export/utils/export.ts#L1-L100)<br/>`tests/document-format.test.ts` | Canonical `.drawz` envelope, PNG/SVG/JSON/Mermaid export. Untrusted SVG import disabled. |
| **4** | **Offline URL Diagram Sharing** | **Implemented** | [share.ts line 4-30](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/sharing/utils/share.ts#L4-L30)<br/>[canvas/shared/page.tsx line 23-67](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/app/canvas/shared/page.tsx#L23-L67) | LZ-string URL compression (`/canvas/shared?d=...`). Creates an independent local copy. Warning for >8KB URLs. |
| **5** | **Authoritative Backend Authentication** | **Partial** | [apps/api/src/routes/auth.routes.ts line 10-12](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/routes/auth.routes.ts#L10-L12)<br/>[apps/api/src/services/auth.service.ts line 15-55](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/services/auth.service.ts#L15-L55)<br/>[AuthModal.tsx line 61-90](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/collaboration/components/AuthModal.tsx#L61-L90) | API has working `/register` and `/login` with bcrypt + JWT. Web frontend has ZERO network calls; simulates OAuth/email with `setTimeout`. |
| **6** | **Cloud Canvas Persistence** | **Partial** | [diagram.routes.ts line 20-25](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/routes/diagram.routes.ts#L20-L25)<br/>[diagram.service.ts line 45-52](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/services/diagram.service.ts#L45-L52) | API allows diagram creation and initial local project import (`/import`). Has NO endpoint to save canvas updates (nodes/edges) post-creation. |
| **7** | **Workspace Role-Based Access Control** | **Partial** | [workspace-auth.ts line 5-37](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/middleware/workspace-auth.ts#L5-L37)<br/>[workspace.routes.ts line 17-21](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/routes/workspace.routes.ts#L17-L21) | API strictly validates `owner` / `editor` / `viewer` hierarchy on workspace routes. Web frontend manages roles in local memory only. |
| **8** | **Real-Time Collaboration & CRDT** | **Missing** | [apps/api/package.json](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/package.json)<br/>[useCollaborationStore.ts line 12-54](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/collaboration/stores/useCollaborationStore.ts#L12-L54) | No WebSocket, SSE, or WebRTC transport exists. No CRDT library (Yjs / Automerge). Frontend hardcodes static users (`Sneha`, `Aman`, `Priya`). |
| **9** | **Invitations & Email Dispatch** | **Missing** | [workspace-invitation.model.ts line 19-62](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/models/workspace-invitation.model.ts#L19-L62)<br/>[workspace.service.ts line 92-104](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/services/workspace.service.ts#L92-L104) | Invitations are recorded in MongoDB, but no email service (Nodemailer, Resend) exists. No revoke or resend routes implemented. |
| **10** | **Public Publish & Embed** | **Missing** | [PublishEmbedDialog.tsx line 26-30](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/collaboration/components/PublishEmbedDialog.tsx#L26-L30)<br/>[apps/web/src/app](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/app) | UI generates a dummy link `${window.location.origin}/p/abc123`. Next.js has no `/p/` route (returns 404). API has no publish/unpublish route. |
| **11** | **Canvas Trash, Restore, & 7-Day Purge** | **Missing** | [diagram.model.ts line 15-42](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/models/diagram.model.ts#L15-L42)<br/>[diagram.routes.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/routes/diagram.routes.ts) | No `lifecycleState` (`active`, `trash`, `purged`), `deletedAt`, or `purgeAt`. No `DELETE` route. No background cleanup worker. |
| **12** | **Storage Quota & Rate Limiting** | **Missing** | [apps/api/src/app.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/app.ts) | No storage accounting schemas or middlewares. No rate-limiting middleware (`express-rate-limit`) on auth or invitation routes. |
| **13** | **Account Deletion Lifecycle** | **Missing** | [auth.routes.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/routes/auth.routes.ts) | No `DELETE /api/me` or user purge endpoint exists in the API. |

---

## 3. Data Flow Traces: Actual vs Expected

### Trace 1: Canvas Editing & Auto-Save
```
[User Action] Edit node on canvas
  │
  ▼ (Synchronous Zustand update)
[Canvas Store] useCanvasStore.getState().setNodes(...)
  │
  ▼ (React Hook subscription)
[AutoSave Hook] useAutoSave (apps/web/src/features/projects/hooks/useAutoSave.ts)
  ├─ Updates versionRef (FIFO sequence counter)
  ├─ Triggers 500ms debounce timer
  │
  ▼ (Timer fires)
[Storage Adapter Bridge] useProjectStore.getState().saveProjectAsync(...)
  │
  ├─► Web Context: WebStorageAdapter -> window.localStorage.setItem('system-design-canvas')
  │
  └─► Electron Desktop: DesktopStorageAdapter -> IPC 'library:save' -> StorageService -> Atomic File Write
```
*Assessment:* **100% Functional & Verified.** Survived all concurrency and corruption test scenarios in `tests/canvas-persistence.test.ts`.

---

### Trace 2: User Sign-In (Collaboration Entry)
- **Expected Flow ([MVP_PLAN.md Section 6.1](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/MVP_PLAN.md)):** User clicks sign-in -> Submits credentials -> `POST /api/auth/login` -> Receives verified JWT -> Stores secure session -> Connects to collaboration rooms.
- **Actual Code Trace:**
  1. User clicks "Sign In" in [AuthModal.tsx line 53](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/collaboration/components/AuthModal.tsx#L53).
  2. Clicking "Continue with Google" or "Continue with GitHub" executes:
     ```ts
     // AuthModal.tsx lines 61-73
     const handleProviderMockClick = (provider: 'google' | 'github') => {
       setLoadingProvider(provider);
       setTimeout(() => {
         signIn(mockEmail, name);
         toast({ message: `Signed in with ${provider} (Local mock)`, tone: 'ok' });
       }, 600);
     };
     ```
  3. Clicking "Sign In with Email" executes:
     ```ts
     // AuthModal.tsx lines 75-90
     setTimeout(() => {
       signIn(cleanEmail, `${capitalized} (You)`);
       toast({ message: `Welcome, ${capitalized}! Collaboration enabled.`, tone: 'ok' });
     }, 500);
     ```
  4. `signIn` updates [useCollaborationStore.ts line 120-140](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/collaboration/stores/useCollaborationStore.ts#L120-L140) in memory.
  5. `@drawzware/api` is **never called**.
*Assessment:* **Mock Simulation.** False sense of authentication.

---

### Trace 3: Sending Workspace Invitations
- **Expected Flow ([MVP_PLAN.md Section 7](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/MVP_PLAN.md)):** Owner inputs email and role -> `POST /api/workspaces/:id/invitations` -> Generates cryptographically secure token hash -> Dispatches email invitation -> Recipient receives link with token -> Accepts via `POST /api/invitations/:id/accept`.
- **Actual Code Trace:**
  1. Owner fills out [InvitePeopleDialog.tsx line 78-100](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/collaboration/components/InvitePeopleDialog.tsx#L78-L100).
  2. Dialog runs a 500ms `setTimeout`:
     ```ts
     validEmails.forEach((r) => addCollaborator(r.email, r.role));
     toast({ message: `Sent ${validEmails.length} invitation(s)!`, tone: 'ok' });
     ```
  3. Appends collaborator directly to in-memory store [useCollaborationStore.ts line 179-203](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/collaboration/stores/useCollaborationStore.ts#L179-L203).
  4. In `apps/api`, endpoint `POST /api/workspaces/:id/invitations` exists in [workspace.routes.ts line 21](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/routes/workspace.routes.ts#L21), but is **never invoked** by the web client.
  5. The API itself contains **no email sending transport**; invitations stored in MongoDB sit unnotified.
*Assessment:* **Disconnected Mock.**

---

### Trace 4: Publish & Embed
- **Expected Flow ([MVP_PLAN.md Section 9](file:///d:/AI%20Projects/drawzware-system-design-canvas/docs/MVP_PLAN.md)):** Owner confirms publication -> `POST /api/diagrams/:id/publish` -> Backend generates public identifier -> Serves sanitized read-only document at `GET /api/public/diagrams/:slug` -> Embed iframe loads `/p/:slug`.
- **Actual Code Trace:**
  1. User opens [PublishEmbedDialog.tsx line 26-30](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/collaboration/components/PublishEmbedDialog.tsx#L26-L30).
  2. Dialog hardcodes:
     ```ts
     const publicUrl = typeof window !== 'undefined'
       ? `${window.location.origin}/p/abc123`
       : 'https://drawzware.app/p/abc123';
     const embedCode = `<iframe src="${publicUrl}" width="100%" height="500" frameborder="0"></iframe>`;
     ```
  3. Clicking "Copy" copies `/p/abc123`.
  4. In [apps/web/src/app](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/app), only `/app`, `/canvas`, `/import`, and `/settings` exist. Route `/p/` does not exist.
  5. Navigating to the copied URL results in an immediate **HTTP 404**.
*Assessment:* **Broken / Non-Existent.**

---

## 4. Prioritized Architectural, Security, and Data-Loss Risks

### Critical Risks (Must Fix Before Any Multi-User Release)

1. **False Save Confirmation & Silent Data Loss Risk:**
   - *Risk:* The web UI displays "Live" badge ([CanvasHeader.tsx line 310](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/canvas/components/CanvasHeader.tsx#L310)) and tells users invitations were sent and collaboration is active. Users believe their diagram is backed up to the cloud. In reality, work exists only in browser `localStorage` and will be permanently lost if cache is cleared.
2. **Missing Canvas Write Endpoint (API Architectural Flaw):**
   - *Risk:* [diagram.routes.ts line 20-25](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/routes/diagram.routes.ts#L20-L25) exposes `PATCH /api/diagrams/:diagramId`, but [diagram.service.ts line 45-52](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/services/diagram.service.ts#L45-L52) only updates `{ title, diagramType }`. Even if the frontend were wired to the backend today, the backend cannot receive or persist updated canvas node/edge snapshots.
3. **Absence of Real-Time Sync & CRDT:**
   - *Risk:* The system has no concurrency resolution layer. If two users edit the same diagram, there is no transport (WebSocket) or operational merge (CRDT).

### High Risks

1. **Unhashed Invitation Tokens (BOLA/IDOR Vulnerability):**
   - *Risk:* In [workspace-invitation.model.ts line 21-24](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/models/workspace-invitation.model.ts#L21-L24), the invitation `_id` is an unhashed UUID. The acceptance route `POST /api/invitations/:invitationId/accept` accepts anyone who holds the UUID and presents a matching email claim. If an invitation link is logged or forwarded, there is no single-use cryptographically hashed secret protecting it.
2. **Unprotected Endpoints (Brute-Force & Denial of Service):**
   - *Risk:* [apps/api/src/app.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/app.ts) applies no rate-limiting middleware. `/api/auth/login`, `/api/auth/register`, and `/api/workspaces/:id/invitations` are vulnerable to credential stuffing, account enumeration, and email invitation spam.
3. **No Canvas Trash, Recovery, or 7-Day Purge Lifecycle:**
   - *Risk:* [diagram.model.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/models/diagram.model.ts) lacks soft-delete flags (`deletedAt`, `purgeAt`, `lifecycleState`). There is no endpoint to delete or restore a diagram and no worker to enforce the 7-day retention period.

### Medium Risks

1. **Unbounded Storage Consumption (No Quota):**
   - *Risk:* The API has no quota enforcement middleware. A user can import hundreds of large diagrams via `POST /api/workspaces/:workspaceId/diagrams/import` with 10MB payloads each, exhausting database storage.
2. **Static Export Configuration Obstacle:**
   - *Risk:* [apps/web/next.config.ts line 5](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/next.config.ts#L5) enforces `output: "export"`. When dynamic server routes (like `/p/[id]` or server-side authentication redirects) are added, static export will fail unless handled via client-side routing or a Next.js server configuration.

---

## 5. Verification Limitations

1. **Live MongoDB Daemon:** Verification of `@drawzware/api` routes was conducted via `supertest` and in-memory mock repositories in Vitest (`apps/api/tests/real-http-audit.test.ts`). A live MongoDB daemon was not connected during this test run.
2. **Electron GUI Runtime:** Desktop verification utilized the headless test suite (`tests/window-close-handshake.test.ts`, `tests/preload-api.test.ts`, `tests/storage-service.test.ts`) and `--smoke-test` verification script rather than interactive physical display inspection.

---

## 6. Recommended Phase-Gated Next Steps

```
Phase 0: Governance & Contract Alignment
   │
   ▼
Phase 1: Real HTTP Client & Auth Integration
   │
   ▼
Phase 2: Cloud Persistence (Diagram Snapshots)
   │
   ▼
Phase 3: Public Publish & Embed Route
   │
   ▼
Phase 4: Real-Time Collaboration Gateway (CRDT + WS)
```

### Phase 0: Resolve Repository Governance
- **Action:** Update [AGENTS.md line 14](file:///d:/AI%20Projects/drawzware-system-design-canvas/AGENTS.md#L14) to clarify that while `@drawzware/web` remains offline-first by default, `@drawzware/api` is the authorized optional backend for cloud synchronization and multi-user collaboration.

### Phase 1: Connect Web Authentication to API
- **Action:** Create a typed API client in `apps/web/src/lib/api-client.ts`.
- **Action:** Replace `setTimeout` mocks in [AuthModal.tsx](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/collaboration/components/AuthModal.tsx) with actual calls to `POST /api/auth/login` and `POST /api/auth/register`. Store JWT in secure browser storage / HTTP-only cookies.

### Phase 2: Implement Cloud Canvas Snapshot Saving
- **Action:** Add `PUT /api/diagrams/:diagramId/snapshot` route in [apps/api/src/routes/diagram.routes.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/routes/diagram.routes.ts).
- **Action:** Add `saveDiagramSnapshotDoc` in [diagram.repository.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/api/src/repositories/diagram.repository.ts) to upsert the `DiagramSnapshotModel`.
- **Action:** Wire `useAutoSave` to synchronize dirty canvas state to this endpoint when in cloud-backed mode.

### Phase 3: Deliver Real Public Read-Only Publish & Embed
- **Action:** Add `POST /api/diagrams/:diagramId/publish` and `POST /api/diagrams/:diagramId/unpublish` routes in the API.
- **Action:** Implement dynamic Next.js route `apps/web/src/app/p/[id]/page.tsx` that fetches the published diagram and renders it in read-only mode with pan/zoom controls.

### Phase 4: Implement Real-Time Collaboration Core
- **Action:** Install a proven CRDT library (e.g. `yjs` + `y-websocket`).
- **Action:** Build a WebSocket collaboration gateway server in `apps/api/src/websocket/` that verifies JWT tokens and workspace roles before subscribing clients to diagram rooms.
- **Action:** Replace static mock collaborator roster in [useCollaborationStore.ts](file:///d:/AI%20Projects/drawzware-system-design-canvas/apps/web/src/features/collaboration/stores/useCollaborationStore.ts) with dynamic Yjs awareness presence.
