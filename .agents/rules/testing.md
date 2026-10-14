# Agent Rules: Testing & Verification Requirements

**Applies to:** Test authoring, execution, CI verification, and code quality reporting.

---

## 1. Truth in Testing (Non-Negotiable)

1. **No False Claims:**
   - **NEVER** claim that tests, builds, or lints passed unless you executed the command and observed success.
   - If a test fails, state the exact error output and diagnose the issue honestly.
   - If an environment constraint prevents running a check (e.g. headless GUI limitations, missing platform runners), explicitly state: *"Check not executed due to [reason]"*.

---

## 2. Test Authoring Standards

1. **Unit Tests (Vitest):**
   - Place unit tests alongside the code in `__tests__/` directories or as `*.test.ts`.
   - Test domain logic, state transitions, auto-layout outputs, and schema parsers.
   - Tests must execute deterministically without network access.
2. **Integration Tests (IPC & Storage):**
   - Test atomic write protocols, temporary staging, and `.bak` backup creation against isolated temporary directories (`os.tmpdir()`).
   - Clean up temporary files in `afterEach()` / `afterAll()`.
3. **End-to-End Tests (Playwright):**
   - Test real user journeys: launch app, assert dashboard renders, create diagram, drag node, connect edge, trigger save, assert file existence.
   - Use semantic locators (`getByRole`, `getByText`) rather than brittle CSS hierarchy paths.
   - Avoid hardcoded `page.waitForTimeout()`. Wait on explicit UI states or locators.

---

## 3. Required Pre-Commit Verification

Before declaring any implementation task complete:
1. Run `npm run lint` — zero warnings or errors allowed.
2. Run `npx tsc --noEmit` — zero type errors allowed.
3. Run `npm test` — all existing and new unit/integration tests must pass.
4. Run `npm run build` — Next.js static export must compile successfully to `./out`.
