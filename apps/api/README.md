# Drawzware API (Reserved Scaffold)

This directory is reserved for the future Drawzware backend collaboration and synchronization services.

## Architecture Guidelines
- Core diagramming and canvas functionality remains 100% offline-first.
- This backend is an optional sync/collaboration layer.
- Dependencies must strictly follow the monorepo architecture rules defined in `docs/engineering/MONOREPO_ARCHITECTURE.md`:
  - Allowed: `packages/contracts`, `packages/domain`, `packages/database` (future).
  - Prohibited: `apps/web`, `apps/desktop`, UI components.
