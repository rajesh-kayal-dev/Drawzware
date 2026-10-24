# Drawzware --- Collaborative AI Canvas MVP

## 1. Product Goal

Upgrade the existing Drawzware web app into a collaborative,
offline-capable architecture design tool without rebuilding the current
canvas.

### MVP scope

-   Keep the existing React Flow canvas, diagram types, templates,
    export tools, Zustand stores, and undo/redo.
-   Let signed-in users create workspaces and invite collaborators.
-   Let multiple users edit the same diagram in real time.
-   Keep editing available offline and sync changes when the connection
    returns.
-   Add an AI assistant that can generate and explain architecture
    diagrams.

### Not in MVP

-   Desktop app / Electron release.
-   Billing, public marketplace, comments, video calls, or advanced
    organization administration.
-   AI making silent edits without user approval.
-   Multi-region deployment or horizontal scaling of the collaboration
    server.

## 2. Recommended Technology Stack

  -----------------------------------------------------------------------
  Area                    Recommendation          Reason
  ----------------------- ----------------------- -----------------------
  Web app                 Existing Next.js,       Preserve the working
                          React, TypeScript       product

  Canvas                  Existing React Flow +   Avoid replacing the
                          Zustand                 canvas engine

  Collaboration model     Yjs                     Merges concurrent edits
                                                  and supports offline
                                                  changes

  Live connection         WebSocket               Sends document updates
                          provider/server         and presence

  Offline persistence     `y-indexeddb`           Keeps local Yjs
                                                  document data in the
                                                  browser

  Backend API             Node.js + TypeScript +  Familiar stack;
                          Express                 separate API from
                                                  static frontend

  Database                PostgreSQL              Stores users' workspace
                                                  metadata, access rules,
                                                  and document
                                                  snapshots/updates

  Validation              Zod                     Validate API input and
                                                  AI-generated diagram
                                                  operations

  AI                      Server-side LLM API     Keeps provider keys out
                                                  of the browser

  Frontend hosting        Cloudflare Pages or     Works with the current
                          Vercel                  static-export
                                                  deployment

  API + WebSocket hosting Render        Runs the Node services
                                                  separately

  Managed database/auth   MongoDB via Mongoose +  Persistent document
                          JWT Authentication      store and standard token
                                                  authentication
  -----------------------------------------------------------------------

**Deployment constraint:** the current `next.config.ts` uses
`output: "export"`. Keep the frontend static and deploy the
API/WebSocket service separately. Do not depend on Next.js server routes
unless the deployment model is changed.

## 3. Target Architecture

``` mermaid
flowchart TD
    U[Browser / Drawzware UI] --> FE[Static Next.js App]
    FE -->|HTTPS REST| API[Node.js API]
    FE <-->|WSS document updates + presence| WS[Yjs WebSocket Service]
    FE <--> IDB[IndexedDB + y-indexeddb]
    API --> AUTH[Auth Provider]
    API --> DB[(PostgreSQL)]
    WS --> DB
    API --> AI[LLM API]
```

### Responsibilities

-   **Frontend:** canvas, local Zustand UI state, login, workspace UI,
    collaboration status, offline status, AI panel.
-   **API:** workspace and diagram metadata, invitations, access checks,
    AI requests, validation.
-   **Yjs WebSocket service:** live document updates, user presence,
    reconnect handling, and document access checks.
-   **PostgreSQL:** workspace membership, diagram metadata, saved Yjs
    snapshots and update persistence.
-   **IndexedDB:** local document copy and pending offline edits.
-   **AI provider:** returns proposed diagram operations; it does not
    write directly to the database.

## 4. Data Model

Start with these tables:

-   `workspaces`: `id`, `name`, `owner_id`, `created_at`
-   `workspace_members`: `workspace_id`, `user_id`, `role`, `created_at`
-   `diagrams`: `id`, `workspace_id`, `title`, `diagram_type`,
    `created_by`, `created_at`, `updated_at`
-   `diagram_snapshots`: `diagram_id`, `state` (binary), `version`,
    `updated_at`
-   `diagram_updates`: `id`, `diagram_id`, `update` (binary),
    `created_at`

Use the authentication provider's user table rather than maintaining
passwords yourself. Add foreign keys and indexes for workspace
membership and diagram lookup.

For the first release, run one WebSocket instance and persist Yjs
updates/snapshots in PostgreSQL. Define a snapshot/compaction policy so
the update log does not grow forever. Do not use an ephemeral local
filesystem as the only production copy of collaborative data.

## 5. Implementation Plan

### Phase 0 --- Protect the existing app

1.  Create a feature branch and tag the current working release.
2.  Add tests for loading, editing, autosaving, importing, and exporting
    diagrams.
3.  Keep the current local-only mode working during migration.
4.  Define a storage/document adapter so local persistence and cloud
    persistence do not become mixed throughout canvas components.

**Done when:** existing diagrams still open and export correctly, and
there is a tested migration path for existing local data.

### Phase 1 --- Backend, accounts, and workspaces

1.  Set up authentication.
2.  Add workspace creation and membership roles: `owner`, `editor`,
    `viewer`.
3.  Add diagram metadata endpoints:
    -   `GET /workspaces`
    -   `POST /workspaces`
    -   `GET /workspaces/:workspaceId/diagrams`
    -   `POST /workspaces/:workspaceId/diagrams`
    -   `PATCH /diagrams/:diagramId`
    -   `POST /workspaces/:workspaceId/invitations`
4.  Enforce membership and role checks on every request.
5.  Add an explicit import/migration flow for existing local diagrams;
    do not overwrite local data automatically.

**Done when:** a user can sign in, create a workspace, create a diagram,
invite another user, and open the same saved diagram on another device.

### Phase 2 --- Real-time collaboration

1.  Represent shared diagram content in a Yjs document. Store node and
    edge data in shared Yjs types; keep temporary UI state (selected
    node, open menus, local panels) local to each browser.
2.  Integrate a Yjs WebSocket provider with the existing React
    Flow/Zustand layer.
3.  Add collaborator cursors, online presence, and a connection status
    indicator.
4.  Authenticate WebSocket connections and authorize access to each
    diagram before joining its room.
5.  Persist document updates and periodically write compacted snapshots
    to PostgreSQL.
6.  Test simultaneous edits to different nodes, the same node, edge
    creation/deletion, refresh, disconnect, and reconnect.

**Done when:** two browser sessions can edit the same diagram without
one user's full state replacing the other's changes, and both recover
the latest persisted document after refresh.

### Phase 3 --- Offline editing and synchronization

1.  Add `y-indexeddb` to persist each Yjs document locally.
2.  Load the local document immediately; connect to the server when
    online.
3.  Show clear states: `Saved`, `Saving`,
    `Offline — changes stored locally`, and `Syncing`.
4.  Reconnect automatically and let Yjs merge local and remote updates.
5.  Handle sign-out and shared-device behavior deliberately: clear or
    lock account-specific local data where appropriate.
6.  Test offline edits, browser restart while offline, reconnect,
    duplicate tabs, and conflicting edits.

**Done when:** a user can edit a previously opened diagram offline,
close and reopen the browser, reconnect, and see the changes merged with
the shared document.

**Important:** PWA asset caching only makes the app shell available
offline. It does not, by itself, synchronize diagram edits.

### Phase 4 --- AI architecture assistant

Start with three actions: 1. **Generate:** "Create a scalable food
delivery architecture." 2. **Explain:** "Explain this diagram and the
request flow." 3. **Review:** "Find single points of failure and suggest
improvements."

Flow: 1. Send the user's prompt and a bounded diagram representation to
the backend. 2. Ask the model for structured operations, not arbitrary
code. 3. Validate the response with Zod and the existing node/edge
registries. 4. Show a preview/diff of the proposed changes. 5. Apply
changes only after the user confirms. 6. Save the accepted operations
through the normal Yjs document path so collaborators receive them.

Keep API keys server-side. Add request limits, sensible diagram-size
limits, and clear error handling. Treat diagram text and imported
content as untrusted input.

**Done when:** AI can propose a valid diagram or targeted changes, the
user can review them before applying, and the result syncs to other
collaborators.

## 6. API and Collaboration Rules

-   REST API handles accounts, workspaces, permissions, diagram
    metadata, and AI requests.
-   WebSockets carry Yjs updates and presence; do not send the whole
    diagram on every small edit.
-   Every REST request and WebSocket room join must verify the user's
    access to the workspace/diagram.
-   `viewer` users cannot write document updates.
-   Validate node types, edge types, IDs, and payload sizes on the
    server.
-   Do not trust client-provided `user_id`, role, or workspace
    ownership.
-   Keep AI output as a proposal until it has been validated and
    approved.
-   Use HTTPS/WSS only in production.

## 7. Deployment Plan

### Services

1.  **Frontend:** deploy the static Next.js export to Cloudflare Pages
    or Vercel.
2.  **API:** deploy the Node.js TypeScript API as a separate service on
    Render or Fly.io.
3.  **Yjs WebSocket service:** deploy alongside the API initially, but
    keep it as a distinct process/module so it can be scaled separately
    later.
4.  **Database and authentication:** use MongoDB via Mongoose with standard JWT authentication.
5.  **AI:** call the chosen LLM provider only from the backend.

### Required environment variables
-   `MONGO_URI`
-   `JWT_SECRET`
-   `PORT`
-   `WEB_ORIGIN`
-   `LLM_API_KEY`
-   `API_BASE_URL`
-   `WS_BASE_URL`

Use the exact names required by the chosen providers; never commit real
secrets to Git.

### Release checklist

-   Apply database migrations in deployment.
-   Configure production CORS to allow only the real frontend origin.
-   Configure HTTPS/WSS and WebSocket upgrade support.
-   Enable database backups and test a restore.
-   Add request logging, error reporting, rate limits, and health
    checks.
-   Run unit and integration tests in CI before deploying.
-   Test two real accounts in separate browsers before calling
    collaboration complete.
-   Document how to export and back up a diagram.

## 8. MVP Acceptance Checklist

-   [ ] Existing local diagrams remain usable and can be exported.
-   [ ] A user can sign in and create a workspace.
-   [ ] Workspace owners can invite members and assign roles.
-   [ ] Two users can edit one diagram in real time.
-   [ ] Cursors/presence and connection state are visible.
-   [ ] Unauthorized users cannot read or update a diagram.
-   [ ] Previously opened diagrams can be edited offline.
-   [ ] Offline changes survive browser restart and sync after
    reconnect.
-   [ ] AI can generate, explain, and review diagrams.
-   [ ] AI changes are validated and require user approval.
-   [ ] Production secrets are server-side; HTTPS/WSS is enabled.
-   [ ] Database backup and restore have been tested.

## 9. Scope and Engineering Decisions

-   Build the web MVP first; defer Electron/desktop packaging until the
    web collaboration model is stable.
-   Keep React Flow and Zustand. Add Yjs as the shared document layer
    rather than replacing the UI state store wholesale.
-   Start with one collaboration server instance. Before horizontal
    scaling, add shared pub/sub or a compatible distributed Yjs provider
    and verify persistence behavior.
-   Avoid Redis in the first MVP unless measured load or the selected
    provider requires it.
-   Do not add vector search/RAG yet. The first AI release can use the
    current diagram plus user prompt and structured tool output.
-   Measure reliability with tests rather than promising unsupported
    latency or scale numbers.
