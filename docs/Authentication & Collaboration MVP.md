# DrawzWare — Authentication & Collaboration MVP

## 1. MVP Overview

### Goal

Build a secure email-based authentication and canvas-sharing flow for DrawzWare. Users can create private canvases, invite others as Editors or Viewers, and collaborate in real time.

### User Story

A user signs up with email and password, verifies their email, and logs in. They create a canvas and invite someone by email with an Editor or Viewer role.

The invited user opens the invitation link, signs in or creates an account using the invited email, verifies their email if needed, and accepts the invitation. They can then access the shared canvas with the assigned permissions and collaborate in real time.

Existing local canvas editing must continue working without requiring login.

## 2. Locked Decisions

| Area | Decision |
|---|---|
| Authentication | Email and password |
| Email verification | Required for cloud collaboration |
| Sessions | Short-lived access JWT and rotating refresh token, subject to code review |
| Password recovery | Email-based password reset |
| Canvas access | Private by default |
| Roles | Owner, Editor, Viewer |
| Invitations | Email-bound secure invitation links |
| Invitation expiry | 7 days, with single-use acceptance |
| Invitation permissions | Owner manages invitations and member roles |
| Email delivery | SMTP using Nodemailer and a configured provider |
| Real-time collaboration | Reuse existing Yjs and WebSocket implementation |
| Storage | Local editing plus cloud sync for shared canvases |
| Offline support | Local editing continues; collaboration reconnects online |
| Security | Rate limits, input validation, token expiry and server-side permission checks |
| OAuth | Google and GitHub later |
| Public sharing | Not included in this MVP |
| Deployment | Single API instance initially |
| UI | Separate login, signup, verification and invitation pages |

## 3. Trade-offs and Compatibility Checks

- **Existing authentication:** Inspect the current code and reuse working features instead of rebuilding them.
- **Session security:** Review token storage, refresh rotation, logout and WebSocket authentication before finalizing the implementation.
- **Email delivery:** Configure an SMTP provider and sender details; Nodemailer alone does not deliver email.
- **Invitation security:** Validate the invitation token, expiry, invited email and canvas permissions on the server.
- **Local-first support:** Authentication and cloud sync must not break existing local projects.
- **Real-time collaboration:** Keep the current Yjs flow if it passes security and regression checks.
- **Deployment:** Keep the existing Express API as the authentication backend unless code review identifies a blocker.
- **Security validation:** Run tests only in an environment permitted by the security-audit rules. Report tests that were not run.

## 4. Implementation Plan

### Phase 1 — Review Existing Code
- Review the security remediation report.
- Inspect authentication, email verification, user models, sessions and email configuration.
- Identify what is already implemented and what is missing.
- Check the current Git changes and preserve them.

### Phase 2 — Finalize the Technical Design
- Confirm the session and token strategy.
- Define the required user, verification, session and invitation data.
- Define API routes, validation rules and permission checks.
- Confirm email configuration and testing requirements.

### Phase 3 — Authentication
- Implement or complete signup and login.
- Complete email verification and resend verification.
- Add refresh, logout and session revocation.
- Add password reset and rate limiting.

### Phase 4 — Canvas Invitations
- Invite users by email with Editor or Viewer access.
- Validate invitation tokens and expiry.
- Accept invitations only after authentication and required email verification.
- Enforce permissions on API and WebSocket connections.

### Phase 5 — UI and Testing
- Connect the authentication pages to the API.
- Build the invitation acceptance flow.
- Test Owner, Editor and Viewer permissions.
- Test real-time sync, reconnects and local-first behavior.
- Run regression tests and resolve failures.

## 5. Definition of Done

- Users can sign up, verify their email, log in and reset their password.
- Owners can invite users by email as Editors or Viewers.
- Invitations expire and cannot be accepted by an unrelated email account.
- Owners, Editors and Viewers have the correct permissions.
- Unauthorized API requests and WebSocket writes are rejected.
- Logout and session revocation work as designed.
- Real-time collaboration and reconnect behavior work.
- Existing local projects, imports and canvas editing continue working.
- Tests and remaining issues are documented accurately.
- Deployment readiness is checked separately from local test results.

## 6. Explicitly Out of Scope

- Google and GitHub OAuth.
- Public canvas links.
- Custom roles and advanced permission settings.
- Multi-instance collaboration infrastructure.
- Full workspace administration.
- Unrelated UI redesigns or broad refactoring.

## Implementation Rule

Do not rewrite existing features without a clear reason. Inspect first, make small changes, add tests, and verify each phase before moving to the next one. Do not commit, push or deploy without approval.