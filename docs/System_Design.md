# DrawzWare System Design

> **Status:** Proposed system design for MVP planning\
> **Based on:** DrawzWare MVP Plan and decisions made in
> product-planning discussions\
> **Implementation status:** This is a target design, not a claim about
> the current repository. Existing code, dependencies, models, and
> transport must be inspected before implementation.\
> **Rule:** Reuse existing architecture where it meets these
> requirements. Do not restructure or add technologies without evidence.

## 1. Purpose

DrawzWare is an offline-first canvas and diagramming application. The
MVP extends the existing local canvas experience with secure cloud
persistence, owner-controlled real-time collaboration, and public
read-only publishing.

The system must preserve local auto-save, support explicit
local-to-cloud migration, protect private canvases, and recover safely
from network failures, concurrent edits, and lifecycle changes.

## 2. Design Goals

-   Preserve local-first editing and existing browser `localStorage`
    auto-save.
-   Do not upload personal canvases unless the user explicitly chooses
    to save to their account.
-   Reuse existing backend authentication.
-   Keep the backend authoritative for identity, access, canvas
    lifecycle, quotas, invitations, and publication.
-   Support multi-device cloud canvases and CRDT-based collaboration.
-   Make graph invariants explicit; CRDT convergence alone is not
    sufficient.
-   Separate persistent document state from ephemeral presence and local
    UI state.
-   Preserve recoverable work and distinguish local save from
    server-confirmed save.
-   Keep public read-only access separate from private collaboration
    access.
-   Minimize new abstractions and avoid duplicating existing features.

## 3. Non-Goals for MVP

-   Billing, pricing, subscriptions, or payment processing.
-   Ownership transfer.
-   Full document version history.
-   Persistent collaboration activity history (post-MVP).
-   Advanced embed themes or per-node publication privacy.
-   Offline editing of collaborative cloud canvases.
-   AI assistant features unless separately prioritized.

## 4. High-Level Architecture

The exact package and service names must be mapped to the repository
during the audit. The following describes logical responsibilities, not
a mandate to create new packages.

``` mermaid
flowchart TB
    subgraph Clients
        WEB[Web App]
        DESKTOP[Desktop App]
        LOCAL[Local Canvas Store]
    end

    subgraph Backend
        API[HTTP API]
        AUTH[Existing Authentication]
        COLLAB[Collaboration Gateway]
        PUB[Public Read-only Endpoint]
        JOBS[Background Cleanup Jobs]
    end

    subgraph Persistence
        DB[(Database)]
        DOCS[(Cloud Document / CRDT State)]
        MAIL[Email Provider]
    end

    WEB --> LOCAL
    DESKTOP --> LOCAL
    WEB --> API
    DESKTOP --> API
    API --> AUTH
    API --> DB
    API --> DOCS
    WEB <--> COLLAB
    DESKTOP <--> COLLAB
    COLLAB --> AUTH
    COLLAB --> DB
    COLLAB --> DOCS
    PUB --> DB
    PUB --> DOCS
    API --> MAIL
    JOBS --> DB
    JOBS --> DOCS
```

### Architecture boundary rules

-   Web and desktop UI must not directly depend on backend/database
    implementation packages.
-   Personal canvases remain offline-first by default with zero required
    backend dependencies.
-   Shared contracts define validated request/response and collaboration
    message shapes.
-   Pure graph topology and graph invariants belong in the existing
    domain/canvas-core boundaries where appropriate.
-   React lifecycle and UI state remain in the web application.
-   Next.js static export compliance: `apps/web` builds as a static export
    (`output: "export"`). Public diagram viewing (`/p?id=...` or `/p/shared`)
    must be implemented as client-compatible routes fetching from secure
    public API endpoints in `@drawzware/api`.
-   Electron main/preload security boundaries must remain intact.
    Electron CSP permits network connections only to configured trusted API origins.
-   Backend cleanup workers are allowed and responsible for the 7-day Trash
    purge lifecycle.
-   Do not introduce a separate local persistence system without proving
    the current storage adapter is insufficient.
-   Do not choose a CRDT library, transport, or database change until
    the current repository is inspected.

## 5. Logical Components

### 5.1 Web and desktop clients

Responsibilities: - Canvas editing and rendering. - Existing local
auto-save and local document loading. - Display local-save, cloud-sync,
and connection status separately. - Authentication and protected route
navigation. - Local-to-cloud save flow with explicit consent. -
Collaboration panel, member management, invitations, presence, cursors,
and selections. - Read-only public canvas view. - Import/export user
interface.

Clients must not be trusted to enforce permissions. Client-side
disabling is for UX only.

### 5.2 Local storage adapter

Responsibilities: - Persist the local canvas using the existing
implementation. - Load and serialize local documents. - Handle storage
failures and malformed local data. - Preserve local copies until cloud
save is confirmed. - Keep local-only UI state separate from shared
document state where appropriate.

The user reports that current auto-save uses browser `localStorage`.
Verify exact behavior, keys, serialization, and error handling before
modifying it.

### 5.3 HTTP API

Logical responsibilities: - Account/session integration using existing
authentication. - Cloud canvas creation, read, update, save, delete,
restore, and listing. - Membership and role management. - Invitation
creation, resend, revoke, and acceptance. - Storage quota enforcement. -
Publish/unpublish controls. - Account deletion workflow. - Validated
responses and user-safe error codes/messages.

Every protected request must check authentication, canvas lifecycle
state, and the relevant owner/member role.

### 5.4 Collaboration gateway

Responsibilities: - Authenticate the connection. - Authorize membership
and role before joining a canvas session. - Validate each incoming
update and re-check relevant authorization/lifecycle conditions. -
Persist accepted updates according to the defined durability contract. -
Broadcast updates only to authorized active members. - Track ephemeral
presence, cursors, and selections. - Enforce message size, connection,
and update-rate limits. - Remove or restrict sessions after
membership/role changes, canvas deletion, or account deletion.

The transport (for example, WebSocket) and CRDT library are
implementation decisions to verify against the existing code, not
assumptions in this document.

### 5.5 Public read-only endpoint

Responsibilities: - Serve only explicitly published canvases. - Return a
minimized public document representation. - Exclude memberships,
invitations, account data, secrets, and private collaboration
metadata. - Reject access when a canvas is unpublished, deleted, or
otherwise not public. - Apply appropriate caching and embed security
policy.

Public viewing must never grant editing or collaboration access.

### 5.6 Persistence layer

Logical data groups: - User/account identity (existing auth system). -
Cloud canvas metadata and ownership. - Canvas membership and role. -
Invitations and expiry/revocation/acceptance state. - Cloud document /
CRDT state. - Publication state and public identifier. - Storage
quota/accounting data. - Deletion lifecycle metadata. - Minimal
operational/audit records as required.

Actual database technology and schema must be confirmed from the
repository. Do not create duplicate models if equivalent models already
exist.

### 5.7 Background jobs

Responsibilities: - Permanently purge eligible canvases after the
seven-day Trash window. - Clean associated records and document data
safely. - Retry failures idempotently. - Re-check current lifecycle
status and deletion deadline before purging. - Operate even if the
owner's account record has already been deleted. - Log failures without
sensitive canvas contents or tokens.

Backup retention is a separate policy from application-level deletion.

### 5.8 Email provider integration

Responsibilities: - Send invitation and agreed lifecycle/access
notifications. - Retry transient delivery failures safely. - Avoid
duplicate notifications where possible. - Keep email failure independent
from successful permission changes. - Never include invitation tokens or
private canvas contents in logs.

## 6. Core Data Model (Logical)

These are conceptual entities, not a required schema. Map them to
existing models first.

### User

-   `id`
-   Authentication-provider identity / account status
-   Verified email status where relevant
-   Session and deletion metadata as appropriate

### Canvas

-   `id`
-   `ownerId`
-   `title` or existing metadata
-   `lifecycleState`: active / trash / purged (exact representation to
    verify)
-   `createdAt`, `updatedAt`
-   `deletedAt`, `purgeAt`
-   Cloud document reference or persisted CRDT state
-   Publication state / public identifier if published
-   Storage-accounting metadata if required

### Membership

-   `canvasId`
-   `userId`
-   `role`: owner / editor / viewer (ownership may be represented
    separately)
-   Membership status and timestamps
-   Unique constraint on `(canvasId, userId)` where supported

### Invitation

-   `id`
-   `canvasId`
-   Invited email (normalized consistently)
-   Assigned role: editor / viewer
-   Secure token hash or equivalent safe token representation
-   `expiresAt`
-   Status: pending / accepted / expired / revoked
-   Inviter identity and timestamps

### Publication

Could be embedded in Canvas or a separate record depending on existing
schema: - Public identifier - Published state and timestamps - Minimal
public metadata

### Quota/accounting

-   Account identifier
-   Configured limit
-   Usage or a reliable way to calculate it
-   Reservation/transaction strategy for concurrent writes

### Ephemeral presence

Presence should generally be transient state, not permanent canvas
document data: - Connection/session identifier - User and canvas
references - Last heartbeat - Cursor/selection payload - Expiry/timeout
data

Do not persist cursors or selections in the permanent canvas document.

## 7. Authorization Model

### Role matrix

  Action                           Owner   Editor   Viewer      Public visitor
  -------------------------- ----------- -------- -------- -------------------
  View private canvas                Yes      Yes      Yes                  No
  Edit graph                         Yes      Yes       No                  No
  Invite user                        Yes       No       No                  No
  Resend/revoke invitation           Yes       No       No                  No
  Change member role                 Yes       No       No                  No
  Remove collaborator                Yes       No       No                  No
  Delete/restore canvas              Yes       No       No                  No
  Publish/unpublish                  Yes       No       No                  No
  View published canvas              Yes      Yes      Yes   Yes, if published
  Transfer ownership           No in MVP       No       No                  No

Enforce the matrix in backend routes and collaboration message handling.
Public access is a separate explicit path, not an anonymous membership.

### Required authorization checks

For every protected operation: 1. Authenticate the actor. 2. Load the
canvas and validate lifecycle state. 3. Verify owner or active
membership. 4. Verify role for the requested operation. 5. Validate
request payload and domain invariants. 6. Apply rate/resource limits. 7.
Perform the operation with concurrency-safe persistence. 8. Return a
response that accurately describes the outcome.

Do not trust client-provided `ownerId`, role, membership status,
published state, quota, or timestamps as authority.

## 8. Main Flows

### 8.1 Local canvas to cloud

``` mermaid
sequenceDiagram
    actor User
    participant Client
    participant Auth as Existing Auth
    participant API
    participant Store as Cloud Persistence

    User->>Client: Choose Save to my account
    Client->>Auth: Authenticate if needed
    Auth-->>Client: Return to intended canvas
    Client->>API: Submit validated canvas + idempotency key
    API->>API: Derive owner from authenticated identity
    API->>Store: Validate and persist
    Store-->>API: Durable success or failure
    API-->>Client: Confirmed result
    Client->>Client: Keep local copy; update cloud status
```

Requirements: - Local data remains until cloud persistence is
confirmed. - Retries must not create duplicate canvases. - Failed save
preserves local work. - Conflicting or stale cloud data must not be
overwritten blindly.

### 8.2 Invitation acceptance

1.  Owner creates invitation with email and role.
2.  Backend validates owner permission and rate limits.
3.  Store only the safe representation of the token; send invitation
    email.
4.  Recipient authenticates and verifies the invited email.
5.  Backend validates token, expiry, revocation, canvas state, and
    recipient identity.
6.  Membership creation is atomic/idempotent.
7.  Invitation becomes consumed/accepted.
8.  Authorized member can access the canvas under the assigned role.

### 8.3 Real-time edit

``` mermaid
sequenceDiagram
    actor Editor
    participant Client
    participant Gateway as Collaboration Gateway
    participant Auth
    participant Domain as Graph Validation
    participant Store as Durable Document Store
    participant Peers as Authorized Peers

    Editor->>Client: Edit graph
    Client->>Gateway: Submit operation
    Gateway->>Auth: Verify session, membership, role
    Auth-->>Gateway: Authorized
    Gateway->>Domain: Validate operation and graph rules
    Domain-->>Gateway: Valid / rejected
    Gateway->>Store: Persist accepted update
    Store-->>Gateway: Durable result
    Gateway-->>Client: Acknowledge accepted update
    Gateway-->>Peers: Broadcast accepted update
```

Exact ordering must match the selected CRDT and persistence
architecture. The core requirement is that the system must not claim
durable acceptance before its defined durability condition is met.
Invalid or unauthorized updates must not be broadcast as accepted
document state.

### 8.4 Role change or removal

1.  Owner submits role change/removal.
2.  Backend validates owner permission and commits the change.
3.  New authorization state becomes authoritative.
4.  Active sessions are invalidated or re-authorized.
5.  Queued and future operations are checked against the new state.
6.  Email notification is attempted independently.
7.  User-facing state reflects the confirmed permission change.

### 8.5 Delete, restore, and purge

-   Owner deletes: mark canvas as Trash with server-derived deletion
    time and seven-day purge deadline.
-   Immediately revoke collaborator access and invalidate active
    sessions.
-   Restore: owner restores before deadline; re-enable only still-valid
    memberships.
-   Purge job: re-check state/deadline, then delete eligible document
    and related records idempotently.
-   Failure: retry and alert on stuck cleanup.
-   Offline devices must revalidate before syncing after reconnect.

### 8.6 Publish and unpublish

-   Owner previews and explicitly confirms publication.
-   Backend marks canvas published and exposes a dedicated read-only
    public representation.
-   Public endpoint returns only approved fields.
-   Unpublish disables future origin fetches and embed loads; cache
    behavior must be defined.
-   Public visitors cannot use the public endpoint to edit, join
    collaboration, or access private metadata.

### 8.7 Connection loss

-   Show `Reconnecting…` and preserve recoverable local/pending work.
-   Disable new collaborative edits while disconnected.
-   Retry with bounded backoff.
-   On reconnect, re-authenticate/re-authorize and re-check canvas
    lifecycle state.
-   Reconcile pending work safely, then report sync success only after
    confirmation.
-   If recovery cannot be guaranteed, explain the state and offer safe
    export/recovery actions.

## 9. Graph Integrity and CRDT Rules

CRDT behavior must be combined with domain invariants. Define and
test: - Every edge references valid nodes. - Node deletion handles
connected edges deterministically. - Concurrent edge creation versus
node deletion cannot leave an invalid graph. - Updates to deleted nodes
are handled consistently. - Concurrent edits to the same property
converge predictably. - Undo/Redo is user-specific and does not restore
an entire stale document snapshot over collaborators' changes. -
Presence, cursors, and selections remain ephemeral. - The current React
store and CRDT document must not become competing sources of truth.

The exact CRDT library and integration architecture require repository
inspection.

## 10. Storage Quota

-   One simple cloud storage quota per account; no billing/pricing
    system.
-   Local-only canvas data does not count toward cloud quota.
-   Define whether Trash data counts until purged.
-   Use backend-enforced accounting and concurrency-safe
    reservations/transactions.
-   Concurrent requests cannot exceed the quota.
-   At limit: preserve local work, allow viewing existing cloud canvases
    and export/deletion, and clearly indicate cloud sync is blocked.
-   Quota usage must update correctly after save, delete, restore, and
    permanent purge.

## 11. Security and Privacy Requirements

-   Object-level authorization on every private resource.
-   Server-side role checks for HTTP and collaboration transport.
-   Secure session and OAuth handling based on the existing auth design.
-   Rate limits on login, invitations, verification, publishing, and
    expensive operations.
-   Validate all imported content and collaboration messages.
-   Treat SVG as untrusted: sanitize strictly and never render as active
    HTML; if safe sanitization cannot be established, disable SVG
    import.
-   Avoid logging tokens, invitation secrets, private canvas contents,
    or sensitive account details.
-   Public routes expose only published, minimized content.
-   `noindex` is a discoverability control, not a privacy boundary.
-   Define backup retention separately from the seven-day application
    Trash lifecycle.
-   Revoke access immediately after removal, role downgrade, deletion,
    or account deletion.

## 12. Error and Status Model

The client should use plain language and distinguish: - Local save
succeeded. - Cloud sync pending. - Server-confirmed save. -
Reconnecting/offline. - Sync failed. - Access denied. - Canvas in
Trash. - Storage quota reached. - Invitation expired/revoked. -
Publish/unpublish in progress or failed.

Examples: - "Your changes haven't synced yet. Your local copy is still
available." - "Connection lost. Reconnecting..." - "You no longer have
access to this canvas. Contact the owner if you think this is a
mistake." - "Your cloud storage is full. Delete an unwanted canvas to
save more." - "This invitation has expired. Ask the canvas owner for a
new invitation."

Only show "saved locally" after a successful local write and "synced"
after the server's defined confirmation. Do not expose stack traces or
secrets to end users.

## 13. Non-Functional Requirements

### Reliability

-   Idempotent retries for saves, invitations, and cleanup.
-   Bounded retry policies and timeouts.
-   Recovery after refresh, app restart, network loss, and service
    restart.
-   Durable storage acknowledgment semantics documented.

### Performance

-   Benchmark large graphs.
-   Limit payload sizes, node counts, update rates, and concurrent
    connections.
-   Measure CRDT memory growth and persistence overhead.
-   Prevent reconnect storms.

### Accessibility and usability

-   Keyboard-accessible dialogs, menus, and core controls.
-   Usable collaboration panel on small screens.
-   Contextual, dismissible onboarding; no repeated popups.
-   Accurate loading indicators; no fake progress.
-   Returning users go to the last relevant screen/canvas where
    practical.

### Observability

-   Monitor save/sync failures, permission denials, quota rejections,
    cleanup failures, and service outages.
-   Avoid sensitive data in logs.
-   Alert on repeated cleanup failures or persistent synchronization
    failures.

## 14. Test Strategy and Release Gates

### Tests

-   Unit: graph invariants, invitation transitions, quota accounting,
    serialization.
-   Integration: auth middleware, object-level access, persistence,
    publishing routes, email and cleanup jobs.
-   Security: IDOR/BOLA, role bypass, invitation replay/forwarding,
    public data leakage, active session revocation.
-   Concurrency: simultaneous edits, delete-vs-edit, duplicate requests,
    reconnects, quota races.
-   Recovery: refresh/restart, network loss, failed save, server
    restart, stale client reconnect.
-   Compatibility: existing `.drawz`, JSON, SVG, PNG, and Mermaid flows.
-   Performance: large canvas, many clients, high update rates,
    reconnect storms.
-   Operations: migration, backup restore, secret configuration,
    monitoring, rollback.

### Release gates

-   No known critical authorization or data-exposure defects.
-   Cloud persistence and acknowledgment semantics tested.
-   Revocation works for API and active collaboration sessions.
-   Trash/restore/purge tests pass.
-   Failed saves never produce false success.
-   Import validation and resource limits tested.
-   Backup/restore and rollback procedure documented and exercised as
    appropriate.
-   Existing local auto-save, dashboard, templates, and export flows
    remain intact.

## 15. Repository Audit Plan (No Coding)

Audit in this order: 1. Authentication, authorization, and API
middleware. 2. Collaboration transport and CRDT. 3. Database models and
canvas lifecycle. 4. Publishing and embed routes. 5. Quota and email
services. 6. Import/export and file safety. 7. Tests, deployment, and
operations. 8. Existing local auto-save/storage adapter baseline.

For each area, record: - Exact files and key entry points. - Data flow
from UI to service, route, and persistence. - Existing models,
contracts, middleware, and tests. - Test commands and actual results. -
Reproduction steps and evidence for any failure. - Smallest safe fix.

Classify each requirement as `Verified`, `Partial`, `Missing`,
`Unverified`, or `Not applicable`. Do not infer gaps from screenshots or
build duplicate systems. No code changes, refactoring, commits, or
deployment during audit.

## 16. Delivery Phases After Audit

  ------------------------------------------------------------------------------
  Phase                   Focus                          Exit condition
  ----------------------- ------------------------------ -----------------------
  0\. Audit               Map code, tests, formats,      Evidence-based gap
                          boundaries.                    report agreed.

  1\. Security            Auth/session, authorization,   Protected operations
                          validation, rate limits.       enforce permissions.

  2\. Cloud lifecycle     Persistence, local-to-cloud    Lifecycle and recovery
                          save, quota, Trash, restore,   tests pass.
                          account deletion.              

  3\. Collaboration       CRDT integration, persistence, Concurrency/recovery
                          concurrency, reconnect,        tests pass.
                          revocation.                    

  4\.                     Owner-only invitations, roles, Invitation and
  Invitations/presence    email,                         active-session tests
                          presence/cursors/selections.   pass.

  5\. Publishing/file     Public read-only endpoints,    Public/private boundary
  safety                  embed, import/export.          and file-safety tests
                                                         pass.

  6\. UX/reliability      Loading/errors, accessibility, Status is accurate and
                          performance, monitoring.       major limits tested.

  7\. Release readiness   Security regression,           Release gates pass.
                          migrations, backup, rollback,  
                          compatibility.                 
  ------------------------------------------------------------------------------

## 17. Post-MVP

-   Basic collaboration activity history.
-   Full canvas version history and restore.
-   Advanced embed customization.
-   Offline collaborative editing after pending-update
    persistence/reconciliation is proven.
-   Ownership transfer with explicit acceptance and safeguards.
-   Further enhancements based on user feedback.

## 18. Repository Verification Checklist

Before implementation, verify: - Current repository structure and
workspace scripts. - Existing auth middleware and session model. -
Canvas models, membership and invitation schemas. - Current local
storage adapter and document format. - Whether cloud persistence,
collaboration transport, and CRDT already exist. - Current public routes
and embed implementation. - Existing import/export code and tests. -
Quota, email, cleanup, and account deletion implementation. - Current
CI, migrations, monitoring, backup, and rollback capability.

Do not claim a feature is implemented based on plans or screenshots
alone. The final audit report must include evidence and exact file
paths.

------------------------------------------------------------------------

**Next action:** Inspect the existing repository and create an
evidence-backed gap report. Do not begin implementation until the gaps
and minimal changes are agreed.
