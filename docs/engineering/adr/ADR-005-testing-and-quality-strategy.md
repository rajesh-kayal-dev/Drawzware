# ADR-005: Testing and Quality Verification Strategy

**Status:** Proposed (Recommended)  
**Date:** October 2026  
**Deciders:** Principal Software Engineer, Product Architect  

---

## 1. Context and Problem Statement

The repository audit revealed that `drawzware-system-design-canvas` currently has **zero automated tests** (no unit, integration, or end-to-end test framework in `package.json`). Existing quality gates are limited to `npm run lint` (ESLint) and `npm run build` (Next.js static export compilation).

Transforming this codebase into a production-ready desktop application introduces critical state transitions, IPC boundaries, file serialization, atomic save mechanisms, and native dialogs that cannot be verified manually on every commit.

We must define a comprehensive, lightweight automated testing strategy.

---

## 2. Options Considered

### Option 1: Vitest (Unit/Integration) + Playwright for Electron (E2E) (Recommended)
- **Unit & Logic Testing:** Use **Vitest** for fast, native TypeScript testing of stores, schema validation, serialization, auto-layout algorithms, and Docker Compose parsing.
- **IPC & Storage Integration:** Vitest tests verifying the main-process storage controller against a mock/temp filesystem.
- **End-to-End Testing:** Use **Playwright for Electron** (`_electron.launch`) to boot the actual packaged application, verify direct `/app` dashboard launch, test canvas drag-and-drop, assert native dialog behaviors, and validate export output.

### Option 2: Jest + Spectron
Use Jest for unit tests and Spectron for Electron automation. (Note: Spectron is officially deprecated and unmaintained by the Electron team).

### Option 3: Manual Testing Only
Rely entirely on developer smoke testing on local machines before tagging releases.

---

## 3. Decision & Provisional Recommendation

**We provisionally recommend Option 1: Vitest + Playwright for Electron.**

### Rationale:
1. **Speed & Modern Tooling:** Vitest shares Vite/esbuild's blazing-fast compilation speed and native TypeScript/ESM support without complex Babel or ts-jest transforms. It executes hundreds of store tests in milliseconds.
2. **Official Electron Support:** Playwright is the official industry standard recommended by the Electron core team for automating and testing Chromium-based desktop applications.
3. **High Confidence on Critical Paths:** Enables headless automated regression testing for:
   - Atomic save resilience under simulated process interruption.
   - Corrupted file handling and recovery.
   - High-DPI export image fidelity.
   - Complete offline operation verification.

---

## 4. Consequences

### Positive Consequences:
- High engineering velocity: developers and AI agents can verify changes with `npm test` before committing.
- Automated quality gates in GitHub Actions prevent regressions from ever reaching release binaries.
- Covers both headless fast unit tests and real binary integration tests.

### Negative Consequences:
- Adds testing dependencies (`vitest`, `@playwright/test`) to `devDependencies`.

---

## 5. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Flaky headless E2E tests in CI runners | Medium | Use explicit Playwright locator assertions (`toBeVisible()`) rather than arbitrary sleep timers; isolate test user data in temporary directories. |
| Slow CI runs | Low | Run unit tests on all PRs; run full Playwright Electron tests on merge to `main` and release tags. |
