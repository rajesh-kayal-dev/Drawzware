# DrawzWare MVP Plan

> **Status:** Product and engineering planning baseline\
> **Scope:** MVP requirements, architecture constraints, security,
> delivery, and verification\
> **Implementation status:** Planning document only. This is not a
> repository audit report. Existing behavior must be verified against
> the current code before implementation.

## 1. Executive Summary

DrawzWare is an offline-first canvas and diagramming application. The
goal is to preserve the existing local editing experience and auto-save
while adding secure cloud persistence, owner-controlled collaboration,
and public read-only publishing. Security and data integrity are release
requirements, not optional follow-up work.

The MVP is intentionally not a large SaaS product. Pricing,
subscriptions, billing, ownership transfer, full document version
history, and advanced embed customization are out of scope.

### MVP success criteria

-   Existing local canvas workflows continue to work without requiring
    an account.
-   Local canvases are never uploaded without explicit user action.
-   Cloud canvas data is persisted and access-controlled by the backend.
-   Authorized collaborators can edit together using CRDT-based
    synchronization.
-   Permissions, invitations, deletion, quotas, and publishing are
    enforced server-side.
-   Failed saves and network interruptions do not silently lose
    recoverable work or report false success.
-   Existing dashboard, templates, `.drawz` handling, and export options
    are reused where they already satisfy requirements.
-   Security, concurrency, recovery, and deployment checks pass before
    release.

## 2. Product Principles

1.  **Offline-first:** Personal canvases remain usable locally without
    login.
2.  **Explicit cloud consent:** Signing in does not automatically upload
    local canvases.
3.  **Preserve existing work:** Extend existing auto-save, storage, UI,
    and export code where suitable.
4.  **Backend is authoritative:** Authentication, authorization, quotas,
    invitation state, publication state, and cloud persistence cannot
    rely on frontend checks alone.
5.  **Safe collaboration:** CRDT convergence must be combined with
    graph/domain validation.
6.  **Recoverability over false certainty:** Distinguish local save,
    pending sync, and server-confirmed save.
7.  **Simple UX:** Use understandable messages, contextual guidance, and
    lightweight status indicators.
8.  **Small, evidence-led changes:** Avoid unnecessary packages,
    duplicate systems, or broad restructuring.
9.  **Security by default:** Private canvases remain private; public
    publishing is explicit and read-only.
10. **Audit before implementation:** Do not assume a planned feature is
    missing or implemented until inspected.

## 3. Current Product Baseline

The following is based on prior discussion and screenshots, not a fresh
code audit.

  -----------------------------------------------------------------------
  Area                    Current understanding   Verification needed
  ----------------------- ----------------------- -----------------------
  Canvas auto-save        User reports it saves   Confirm storage
                          to browser              adapter, keys,
                          `localStorage`.         serialization, error
                                                  handling, and recovery.

  Projects dashboard      Screenshot shows        Verify routes and
                          project cards, search,  behavior; do not build
                          sorting, grid/list      a duplicate dashboard.
                          controls, and           
                          creation/opening        
                          actions.                

  Templates               Screenshot shows        Verify catalog and
                          categories including    template creation.
                          microservices,          
                          monolith, event-driven, 
                          client-server, and      
                          serverless.             

  Export menu             Screenshot shows        Verify output and
                          `.drawz`, PNG, SVG,     behavior; do not
                          JSON, Mermaid, and      duplicate PNG/SVG work.
                          Customize & Export.     

  Existing authentication User reports backend    Inspect providers,
                          authentication exists.  session design, and
                                                  route protection.

  Cloud canvas            User believes canvas    Verify models/routes;
  persistence             data is not yet stored  do not assume.
                          in backend/database.    

  Real-time collaboration Planned; current        Inspect transport,
                          implementation status   CRDT, persistence,
                          unknown.                authorization, and
                                                  tests.

  Publish & Embed         Product behavior has    Inspect public routes,
                          been discussed; code    payloads, cache
                          status unknown.         behavior, and controls.
  -----------------------------------------------------------------------

Use these statuses for every requirement: `Verified`, `Partial`,
`Missing`, `Unverified`, or `Not applicable`. Do not describe unverified
functionality as complete.

## 4. Scope

### 4.1 In scope for MVP

-   Preserve local-first editing and existing auto-save.
-   Reuse existing authentication and close verified security gaps.
-   Explicitly save a local canvas to the user's account.
-   Cloud persistence and multi-device access.
-   Owner-managed collaboration with Owner, Editor, and Viewer roles.
-   Secure email invitations with expiry, acceptance, resend, and
    revocation.
-   CRDT-based real-time editing, presence, cursors, selections, and
    user-specific Undo/Redo.
-   Safe connection-loss handling, pending-change recovery, and bounded
    retries.
-   Canvas Trash and seven-day recovery.
-   Public interactive, read-only Publish & Embed.
-   Backend storage quotas and clear quota warnings.
-   Account deletion and associated data lifecycle.
-   Clear loading states, errors, contextual onboarding, and
    accessibility.
-   Security, concurrency, import/export, performance, and deployment
    verification.

### 4.2 Explicitly out of scope for MVP

-   Pricing, subscriptions, payment processing, and billing.
-   Ownership transfer.
-   Full canvas version history and restore.
-   Collaboration activity history (post-MVP).
-   Advanced embed themes and complex styling.
-   Per-node privacy settings for published diagrams.
-   Offline editing of cloud collaboration sessions. Cached viewing is
    allowed; pending work must still be preserved safely.
-   Replacing the existing Projects dashboard or rebuilding working
    PNG/SVG export without evidence of a real gap.
-   AI assistant features unless separately prioritized later.

## 5. User Experience and Canvas Lifecycle

### 5.1 Local canvas

-   Users can create and edit personal canvases without signing in.
-   Preserve existing browser `localStorage` auto-save after inspection.
-   Show local save success only after the local write succeeds.
-   Keep local canvases device-local unless the user explicitly chooses
    account save.
-   Handle browser storage failures, quota errors, corrupted data, and
    refresh/restart recovery.
-   Do not introduce a second competing local document store without a
    demonstrated need.

### 5.2 Save a local canvas to an account

1.  Authenticate using the existing system.
2.  Return the user to the intended canvas and flow.
3.  Offer the agreed choice: **Save to my account** or **Keep as a
    personal canvas**.
4.  For account save, validate and upload the document, derive ownership
    from the authenticated server identity, and use an idempotent
    operation.
5.  Do not discard the local copy until the server confirms success.
6.  After successful save, the canvas becomes cloud-owned while its
    local cache may remain.
7.  If save fails, preserve the local canvas and show a clear recovery
    action.
8.  Handle stale-document conflicts explicitly; never blindly overwrite
    newer cloud data.

### 5.3 Cloud canvas and multiple devices

-   Cloud canvases are private by default.
-   Each device authenticates and independently verifies permissions.
-   Multiple authorized devices access the same cloud document.
-   Cached cloud canvases are view-only while disconnected.
-   On reconnect, revalidate membership, role, and lifecycle status
    before protected operations resume.
-   A stale device must not restore a deleted canvas or bypass a revoked
    role.
-   Keep local UI state (selection, menus, dialogs, local viewport by
    default) separate from shared CRDT document data.

### 5.4 Auto-save, cloud save, and synchronization

These are separate concepts:

-   **Local auto-save:** Persists work on the current device.
-   **Cloud persistence:** Durably stores authorized document data on
    the backend.
-   **Collaboration sync:** Distributes accepted shared updates to
    authorized participants.

Distinguish local save success, pending synchronization,
server-confirmed save, and sync failure. Never claim server confirmation
without acknowledgment. Define the acknowledgment contract against the
actual persistence architecture.

### 5.5 Connection loss and recovery

-   Show states such as `Connected`, `Reconnecting…`, `Offline`,
    `Syncing…`, and `Sync failed`.
-   Disable new collaborative edits while disconnected, consistent with
    the MVP offline policy.
-   Preserve already-made or pending work wherever possible; do not
    silently discard in-progress edits.
-   Retry with bounded backoff, then offer manual retry/recovery.
-   On reconnect, validate permissions and canvas status, reconcile
    pending operations safely, and confirm sync before normal editing
    resumes.
-   Do not show fake progress percentages or success messages before
    confirmation.

## 6. Authentication, Roles, and Authorization

### 6.1 Existing authentication

-   Reuse the existing backend authentication system; do not create a
    second auth system.
-   Verify session/token storage and lifecycle before deciding on
    changes.
-   If Google/GitHub OAuth is supported or added, validate callback
    state, nonce where applicable, redirect handling, provider identity,
    and verified-email status.
-   Protect login, signup, and recovery against abuse and account
    enumeration.
-   Require reauthentication for sensitive actions where appropriate.
-   Provide sign-out-all-sessions behavior.
-   Review CSRF, XSS, CORS, secure cookie/storage configuration, and
    secret handling based on the actual session design.

### 6.2 Roles

  Capability                    Owner   Editor   Viewer
  ----------------------- ----------- -------- --------
  View canvas                     Yes      Yes      Yes
  Edit graph                      Yes      Yes       No
  Invite users                    Yes       No       No
  Revoke invitations              Yes       No       No
  Change member roles             Yes       No       No
  Remove collaborators            Yes       No       No
  Delete/restore canvas           Yes       No       No
  Transfer ownership        No in MVP       No       No

The backend must enforce every permission on HTTP/API routes and
collaboration transport. UI controls are not a security boundary.

### 6.3 Access revocation and role changes

-   Removal and role changes take effect immediately on the server.
-   Active collaboration sessions must be invalidated or re-authorized.
-   Revalidate queued operations before acceptance.
-   Editor-to-Viewer immediately removes editing capability.
-   Viewer-to-Editor enables editing only after the server confirms the
    role change.
-   Preserve valid prior contributions when removing a member.
-   A removed member needs a new valid owner-issued invitation to
    rejoin.

## 7. Invitations and Email Notifications

### 7.1 Invitation flow

-   Only the owner may invite users.
-   The owner selects recipient email and role (`Editor` or `Viewer`).
-   Use secure, expiring, single-use invitation tokens; proposed expiry
    is seven days.
-   Recipient must authenticate and verify the invited email address.
-   Backend validates token, recipient, expiry, revocation, canvas
    status, and current permissions before creating membership.
-   Forwarded links must not grant access to a different account.
-   Acceptance must be idempotent and not create duplicate memberships.
-   Expired, revoked, used, or deleted-canvas invitations cannot grant
    access.

### 7.2 Invitation management

The owner can see status, recipient email, role, and expiry, and can
resend or revoke invitations. Resends must be rate-limited and safe
against duplicate membership or email spam.

### 7.3 Notifications

Email notifications are planned for invitations, role changes, member
removal, and canvas deletion. Email failure must not undo permission
changes or access revocation. Avoid duplicate messages and sensitive
canvas content in emails.

### 7.4 Activity history

A simple collaboration activity history is **post-MVP**. Planned events
include join/leave, role changes, invitations, and collaborator removal.
Detailed node-by-node edit history is not in MVP.

## 8. CRDT Collaboration Requirements

### 8.1 Shared and local state

Shared CRDT data: - Nodes and edges. - Positions and dimensions. -
Diagram properties and selected shared metadata.

Local-only state by default: - Selected node. - Menus, dialogs, and
other local UI state. - Local viewport/zoom unless a later decision
explicitly makes it shared.

Ephemeral presence channel: - Online status. - Live cursors. - Remote
selections and user labels/avatars.

Presence, cursors, and selections must not be permanent graph document
state or activity history.

### 8.2 Concurrent edits and graph validity

-   Multiple editors can edit simultaneously; do not lock nodes for
    normal editing.
-   CRDT convergence does not guarantee graph validity.
-   Define rules for deleted nodes, connected edges, concurrent edge
    creation, and updates to deleted elements.
-   Enforce domain and canvas-core graph invariants before persisting or
    broadcasting invalid operations.
-   Keep React lifecycle/UI state separate from pure graph topology and
    domain logic.
-   Avoid adding CRDT alongside an existing store without a clear source
    of truth and adapter boundary.

### 8.3 Undo/Redo

-   User-specific Undo/Redo reverses the current user's operation
    without reverting unrelated collaborators' work.
-   Avoid restoring whole old document snapshots where that could erase
    other users' subsequent changes.
-   Test undo/redo when another user modifies or deletes the same
    element.

### 8.4 Presence and real-time delivery

-   Show authorized online members, cursors, and remote selections.
-   Presence is ephemeral and uses heartbeat/timeout handling for
    unexpected disconnects.
-   Viewers receive updates but cannot modify the graph.
-   Revalidate authorization for active transport connections and
    incoming messages.
-   Set limits for connection counts, message sizes, update rates, and
    resource use.

## 9. Public Publish & Embed

-   Publishing is an explicit owner action, never automatic.
-   Preview and clearly warn that the entire canvas becomes publicly
    viewable.
-   Public view is interactive and read-only; visitors can pan, zoom,
    and explore without an account.
-   Use a dedicated public URL and embed representation separate from
    private collaboration access.
-   Public endpoints expose only the intended published document
    representation.
-   Do not expose member lists, invitations, authentication data,
    privileged secrets, or private collaboration metadata.
-   Owner can unpublish at any time. Future origin access and embed
    fetches must stop serving the published document.
-   Consider HTTP/browser caches and preview metadata; previously copied
    or downloaded content cannot be remotely erased.
-   Do not intentionally index published canvases by default. `noindex`
    is not access control.
-   MVP embed settings: responsive size, toolbar visibility, background
    behavior where supported, and pan/zoom.
-   Avoid advanced themes and per-node privacy controls.
-   Define and test iframe/CSP behavior and required origin
    restrictions.

## 10. Import, Export, and File Safety

Prior screenshot showed `.drawz`, PNG, SVG, JSON, Mermaid, and Customize
& Export options. Verify actual behavior before changing it.

-   Preserve working export options; do not duplicate PNG/SVG
    functionality.
-   Validate format, schema, file size, node counts, nesting, and
    resource consumption.
-   Import errors must not crash the app or corrupt an existing canvas.
-   Preserve compatibility with existing `.drawz` files and project
    data.
-   Verify labels, edges, layout, dimensions, and background
    consistency.
-   **SVG decision:** Prefer strict sanitization for imported SVG,
    reject/remove scripts and unsafe references, and never render
    untrusted SVG as active HTML. If safe sanitization cannot be
    established, disable SVG import until safe. SVG export may remain if
    safe.
-   Test external references, embedded active content, malformed files,
    and resource-exhaustion inputs.

## 11. Storage Quota and Abuse Prevention

-   Use a simple per-account cloud storage quota. No pricing,
    subscriptions, or billing.
-   Determine the quota after measuring typical canvas sizes and
    infrastructure capacity.
-   Enforce quota on the backend, not only in the UI.
-   Define what counts toward quota, including associated document data
    and Trash contents.
-   Handle parallel saves atomically or with safe reservation/accounting
    to prevent quota bypass.
-   Warn users near the limit.
-   At limit, prevent new cloud data from being saved, keep existing
    cloud canvases viewable, allow export/deletion, and clearly explain
    when work may remain local-only.
-   Never silently discard work or claim an unsuccessful cloud save
    succeeded.
-   Add rate limits to authentication, invitations, verification,
    publishing, and expensive endpoints.
-   Limit canvas sizes, import sizes, WebSocket messages, update rates,
    and concurrent connections.

## 12. Deletion, Trash, and Account Data Lifecycle

### 12.1 Canvas deletion

-   Owner deletion moves a cloud canvas to Trash for seven days.
-   Collaborators lose access immediately, including active sessions.
-   Restore is allowed within the recovery period.
-   Access returns only to memberships that remain valid; revoked
    memberships remain revoked.
-   After seven days, eligible canvas and associated data are
    permanently purged through retry-safe cleanup.
-   Cleanup rechecks status and deadline before deletion to avoid races
    with restore.
-   Offline clients must revalidate after reconnect and cannot restore
    deleted data from stale cache.
-   Invitations cannot grant access while a canvas is in Trash.

### 12.2 Account deletion

-   Require explicit confirmation after explaining consequences.
-   Revoke active sessions and protected access immediately.
-   Remove the deleting user's memberships from other people's canvases;
    those canvases remain unaffected.
-   Invalidate invitations created by the deleted account where
    appropriate.
-   Move canvases owned by the deleted account into the seven-day Trash
    lifecycle; collaborators lose access immediately.
-   Do not automatically transfer ownership.
-   Cleanup must work independently of the account record.
-   Explain that local browser copies, exports, screenshots, and other
    users' copies may remain outside DrawzWare's control.
-   Define backup retention separately; do not promise immediate backup
    erasure unless supported.

## 13. UX, Accessibility, and Onboarding

-   Use plain-language client messages; keep detailed diagnostics in
    protected logs.
-   Only say data is saved locally if the local write succeeded; only
    say server-synced after server confirmation.
-   Show meaningful loading states for opening, saving, joining
    collaboration, publishing, and upload operations.
-   Prevent duplicate submissions while an operation is processing.
-   Use contextual onboarding: brief optional introduction for new
    users, guidance when a feature is first relevant, no repeated
    dismissed tips, and a manual Help path.
-   Returning users skip onboarding and return to the last relevant
    screen/canvas where practical.
-   Signed-in onboarding preferences should follow the account where
    practical; anonymous preferences can remain local.
-   Warn before leaving only when genuinely pending or unsaved work
    exists.
-   Make essential dialogs, menus, and controls keyboard-accessible.
-   Keep collaboration UI usable on narrow screens.
-   Keep interaction patterns consistent between web and desktop.

## 14. Performance, Reliability, and Observability

-   Benchmark large canvases and realistic concurrent editing.
-   Measure CRDT memory growth, update frequency, persistence cost, and
    cleanup.
-   Batch high-frequency operations where appropriate without making the
    UI feel delayed.
-   Prevent reconnect storms with backoff/jitter and server-side limits
    where suitable.
-   Set request, job, and connection timeouts.
-   Handle database, email, and transport failures gracefully.
-   Monitor failed saves, sync errors, permission denials, cleanup
    failures, quota rejections, and service outages.
-   Do not log tokens, invitation secrets, or private canvas content.
-   Alert on repeated cleanup failures and persistent synchronization
    failures.

## 15. Testing and Release Gates

### Required test categories

1.  **Unit:** Domain rules, graph invariants, invitation transitions,
    quota accounting, serialization.
2.  **Integration:** Authentication middleware, object-level
    authorization, persistence, publishing routes, email workflows,
    deletion jobs.
3.  **Concurrency:** Simultaneous edits, delete-vs-edit, duplicate
    requests, reconnects, quota races.
4.  **Security:** IDOR/BOLA, role bypass, token replay, invitation
    forwarding, public endpoint leakage, active-session revocation.
5.  **Recovery:** Refresh/restart, network loss, failed save, server
    restart, local recovery, stale client reconnect.
6.  **Compatibility:** Existing `.drawz`, JSON, SVG, PNG, and Mermaid
    flows.
7.  **Performance:** Large canvases, many connections, high update
    rates, reconnect storms.
8.  **Operations:** Environment configuration, secrets, migrations,
    backup restore, monitoring, rollback.

### Release gates

-   No known critical authorization or data-exposure defects.
-   Cloud persistence and acknowledgment semantics are tested.
-   Access revocation works for HTTP and active collaboration
    connections.
-   Trash, restore, and cleanup lifecycle tests pass.
-   Failed saves never produce false success.
-   Import validation and resource limits are tested.
-   Backup/restore and rollback procedures are documented and exercised
    as appropriate.
-   Existing local auto-save, dashboard, templates, `.drawz`, and export
    functionality remain intact.

## 16. Repository Audit Plan (Before Coding)

Audit in this risk order:

1.  Authentication, authorization, and API middleware.
2.  Collaboration transport and CRDT.
3.  Database models and canvas lifecycle.
4.  Publishing and embed routes.
5.  Quota and email services.
6.  Import/export and file safety.
7.  Tests, deployment, and operations.
8.  Existing local auto-save and storage adapter baseline.

For each area collect: - Exact file paths and entry points. - Data flow
from UI through services/routes to storage. - Existing models,
contracts, middleware, and tests. - Test commands and actual results. -
Known gaps, evidence, and reproduction steps. - Smallest change that
closes each verified gap.

Classify each requirement as `Verified`, `Partial`, `Missing`,
`Unverified`, or `Not applicable`. Do not infer missing functionality
from screenshots. Do not refactor or add abstractions when existing code
meets requirements.

### Audit deliverable

Produce a gap report with requirement, priority, status/evidence,
affected files, security/data-loss implications, dependencies, minimal
fix, tests needed, and whether the fix blocks MVP.

No code changes, commits, or deployments during the audit phase.

## 17. Suggested Delivery Phases After Audit

Actual order may change based on repository evidence and dependencies.

  ------------------------------------------------------------------------------
  Phase                   Focus                          Exit condition
  ----------------------- ------------------------------ -----------------------
  0\. Audit and baseline  Map existing code, tests,      Evidence-based gap
                          formats, and boundaries.       report agreed.

  1\. Security foundation Auth/session, authorization,   Protected operations
                          validation, rate limits.       consistently enforce
                                                         permissions.

  2\. Cloud lifecycle     Persistence, local-to-cloud    Lifecycle and recovery
                          save, quota, Trash, restore,   tests pass.
                          account deletion.              

  3\. Collaboration core  CRDT integration, persistence, Concurrent and recovery
                          concurrency, reconnect,        scenarios pass.
                          revocation.                    

  4\. Invitations and     Owner-only invitations, roles, Invitation and
  presence                email,                         active-session tests
                          presence/cursors/selections.   pass.

  5\. Publishing and file Public read-only routes,       Public/private boundary
  safety                  embed, import/export           and file-safety tests
                          safeguards.                    pass.

  6\. UX and reliability  Loading/errors, accessibility, User-facing states are
                          performance, monitoring.       accurate and limits
                                                         tested.

  7\. Release readiness   Security regression,           Release gates pass.
                          migrations, backup, rollback,  
                          compatibility.                 
  ------------------------------------------------------------------------------

## 18. Post-MVP Roadmap

-   Basic collaboration activity history.
-   Full canvas version history and restore.
-   Advanced embed customization.
-   Potential offline collaborative editing after reliable
    pending-update persistence and reconciliation are proven.
-   Potential ownership transfer with explicit acceptance and
    safeguards.
-   Further enhancements based on user feedback.

## 19. Final Engineering Rules

-   Do not implement until the repository audit establishes real gaps.
-   Do not rebuild existing features without evidence that they fail
    requirements.
-   Do not add pricing, billing, or subscription systems to this MVP.
-   Do not treat client-side checks as authorization.
-   Do not treat local auto-save as cloud persistence.
-   Do not treat CRDT convergence as graph validation.
-   Do not report saves, publishes, or role changes as successful before
    authoritative confirmation.
-   Do not silently discard recoverable user work.
-   Do not promise deletion of copies outside DrawzWare's control.
-   Prefer the smallest safe change that fits existing architecture.
-   Keep architecture documentation and tests aligned with actual
    implementation.

------------------------------------------------------------------------

**Next action:** Audit the current repository, produce the
evidence-backed gap report, and review it before any implementation
begins.
