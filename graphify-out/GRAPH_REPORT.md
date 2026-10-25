# Graph Report - drawzware-system-design-canvas  (2026-10-25)

## Corpus Check
- 330 files · ~221,341 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .example 2, (none) 2, .ico 2)

## Summary
- 2422 nodes · 6824 edges · 130 communities (123 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 112 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b7dc733d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dialog.tsx
- LandingNavbar.tsx
- real-infrastructure-persistence.test.ts
- json-import.ts
- NodePalette.tsx
- LibraryProjectMetadata
- desktop/types/ipc.ts
- electron-builder.json
- vitest
- CommandMenu.tsx
- global-search-registry.ts
- shortcuts.ts
- workspace.service.ts
- Agent Rules: Architecture & Process Boundaries
- package.json
- security-remediations.test.ts
- contracts/src/index.ts
- desktop/types/document.ts
- api/package.json
- package.json
- StorageService
- canvas.types.ts
- diagram.controller.ts
- real-infrastructure-persistence.test.ts
- DrawzWare MVP Plan
- src/app/page.tsx
- Canvas.tsx
- next
- ShapeDrawingOverlay.tsx
- dependencies
- LandingHeroSection.tsx
- DashboardIntroProvider.tsx
- BaseSystemNode.tsx
- components.json
- steps
- NodeEditor.tsx
- compilerOptions
- react
- SystemEdge.tsx
- scripts
- cn
- compilerOptions
- manifest.json
- ExportDialog.tsx
- compilerOptions
- compilerOptions
- WindowCloseManager
- compilerOptions
- DrawzWare — Authentication & Collaboration MVP
- CanvasToolbar.tsx
- web/package.json
- Project
- with
- domain/package.json
- @drawzware/contracts
- desktop/package.json
- useCollaborationStore.ts
- publish-release
- ./tsconfig.base.json
- compilerOptions
- WebSocket
- toast
- build-and-test
- contracts/package.json
- storage/package.json
- utils.ts
- env
- sync-out.mjs
- eslint.config.mjs
- steps
- domain/tsconfig.json
- storage/tsconfig.json
- CanvasHeader.tsx
- Coding Style
- canvas-helpers.ts
- CanvasToolbar.tsx
- eslint.config.js
- useCollaborationStore.ts
- DrawzWare Codebase Architecture & MVP Audit Report
- True
- vercel.json
- postcss.config.mjs
- sw.js
- DrawzWare System Design
- CanvasTextNode.tsx
- PencilOverlay.tsx
- serverError
- README.md
- TypeScript/JavaScript Patterns
- Code Review Standards
- @drawzware/api — Drawzware Collaboration REST API
- Contributing to Drawzware
- Hooks System
- 5. Logical Components
- 6. Core Data Model (Logical)
- 8. Main Flows
- common-code-review.md
- common-git-workflow.md
- Testing Requirements
- Contributor Covenant Code of Conduct
- AGENTS.md — Drawzware Engineering Principles & AI Agent Guidelines
- Agent Orchestration
- Performance Optimization
- Security Policy
- serverError
- common-testing.md
- Agent Rules: Desktop Security & Electron IPC Constraints
- monorepo.md — Drawzware Monorepo Rules & Invariants
- Agent Rules: Testing & Verification Requirements
- Agent Rules: TypeScript, React, and Design System
- Drawzware Canonical Brand Assets
- 13. Non-Functional Requirements
- Features
- Screenshots
- Common Issues to Catch
- Security Guidelines
- auth.service.ts
- ws.d.ts
- 14. Test Strategy and Release Gates
- 7. Authorization Model
- Quick Start
- settings/page.tsx
- providers.tsx
- ProjectModal.tsx
- crdt-collaboration.test.ts
- auth-contracts-models.test.ts
- LandingDesktopAppModal.tsx
- OnboardingOverlay.tsx
- useIsDesktop.ts
- zod@^4.3.6

## God Nodes (most connected - your core abstractions)
1. `cn()` - 157 edges
2. `useCanvasStore` - 105 edges
3. `react` - 91 edges
4. `Button()` - 82 edges
5. `Project` - 71 edges
6. `lucide-react` - 67 edges
7. `SystemNode` - 50 edges
8. `CanvasInner()` - 46 edges
9. `toast` - 41 edges
10. `vitest` - 41 edges

## Surprising Connections (you probably didn't know these)
- `1. Dedicated Diagram Modes & Component Library` --references--> `WebSocket`  [INFERRED]
  README.md → apps/api/src/types/ws.d.ts
- `1. Process Separation & Boundaries` --references--> `StorageAdapter`  [INFERRED]
  .agents/rules/architecture.md → packages/storage/src/storage-adapter.interface.ts
- `Phase 2: Implement Cloud Canvas Snapshot Saving` --references--> `saveDiagramSnapshotDoc()`  [INFERRED]
  AUDIT_REPORT.md → apps/api/src/repositories/diagram.repository.ts
- `Key Architecture Decisions` --references--> `MigrationBanner()`  [INFERRED]
  CLAUDE.md → apps/web/src/features/projects/components/MigrationBanner.tsx
- `Phase 2: Implement Cloud Canvas Snapshot Saving` --references--> `useAutoSave()`  [INFERRED]
  AUDIT_REPORT.md → apps/web/src/features/projects/hooks/useAutoSave.ts

## Import Cycles
- None detected.

## Communities (130 total, 7 thin omitted)

### Community 0 - "dialog.tsx"
Cohesion: 0.27
Nodes (23): ClearCanvasDialog(), CommandMenu(), ShortcutsBody(), ShortcutsDialog(), AccessControlDialog(), AuthModal(), CollaborationController(), InvitationAcceptDialog() (+15 more)

### Community 1 - "LandingNavbar.tsx"
Cohesion: 0.39
Nodes (5): DrawzwareLogo(), DrawzwareLogoProps, LandingFooter(), LandingNavbar(), NavbarProps

### Community 2 - "real-infrastructure-persistence.test.ts"
Cohesion: 0.15
Nodes (5): CollabServer, formatCloseReason(), CrdtManager, initYDocFromProject(), yDocToProject()

### Community 3 - "json-import.ts"
Cohesion: 0.06
Nodes (60): MinimapThumbComponent(), ASYNC_EDGES, Direction, facingSides(), getLayoutedElements(), isLayoutNode(), orientEdgeHandles(), Side (+52 more)

### Community 4 - "NodePalette.tsx"
Cohesion: 0.08
Nodes (43): ALL_CATEGORIES, CategoryGroup, CategoryKey, DiagramType, EmptySearch(), EXPANDED_CATEGORY_ICONS, filterCategories(), filterExpandedComponents() (+35 more)

### Community 5 - "LibraryProjectMetadata"
Cohesion: 0.09
Nodes (22): persistCanvasSnapshot(), LibraryProjectMetadata, IpcErrorCode, DesktopStorageAdapter, DesktopStorageApiLike, getStorageAdapter(), setStorageAdapterForTesting(), StorageAdapter (+14 more)

### Community 6 - "desktop/types/ipc.ts"
Cohesion: 0.08
Nodes (25): DesktopApi, IPC_CHANNELS, WindowCloseManagerOptions, DesktopApi, DesktopFileApi, DesktopStorageApi, DesktopWindowApi, Window (+17 more)

### Community 7 - "electron-builder.json"
Cohesion: 0.05
Nodes (43): appId, asar, copyright, entry, directories, buildResources, output, dmg (+35 more)

### Community 8 - "vitest"
Cohesion: 0.12
Nodes (25): defaultWriteFileAtomic(), FileHandlerDeps, handleImportBackupFile(), handleOpenDrawzFile(), handleSaveDrawzFile(), registerFileIpcHandlers(), sanitizeFilename(), handleDeleteProject() (+17 more)

### Community 9 - "CommandMenu.tsx"
Cohesion: 0.29
Nodes (11): ActionIcon(), CommandItem, CommandMenuBody(), GROUP_ORDER, GroupName, Highlight(), includes(), formatKey() (+3 more)

### Community 10 - "global-search-registry.ts"
Cohesion: 0.09
Nodes (40): GlobalInsertPanel(), GlobalInsertPanelProps, GROUP_COLORS, GROUP_ICONS, GROUP_ORDER, ALL_SEARCHABLE_ITEMS, CLOUD_ITEMS, COMPONENT_ITEMS (+32 more)

### Community 11 - "shortcuts.ts"
Cohesion: 0.33
Nodes (5): BY_ID, Shortcut, SHORTCUT_GROUPS, ShortcutGroup, ShortcutId

### Community 12 - "workspace.service.ts"
Cohesion: 0.12
Nodes (30): IWorkspaceInvitation, WorkspaceInvitationModel, workspaceInvitationSchema, IWorkspaceMember, IWorkspace, WorkspaceModel, workspaceSchema, createInvitationDoc() (+22 more)

### Community 13 - "Agent Rules: Architecture & Process Boundaries"
Cohesion: 0.40
Nodes (4): 1. Process Separation & Boundaries, 2. Desktop Route & Navigation Boundaries, 3. Technology Selection Guardrails, Agent Rules: Architecture & Process Boundaries

### Community 14 - "package.json"
Cohesion: 0.10
Nodes (21): devDependencies, electron@^44.7.2, tailwindcss@^4, @tailwindcss/postcss@^4, tw-animate-css@^1.4.0, @types/lz-string@^1.3.34, @types/node@^20, @types/react@^19 (+13 more)

### Community 15 - "security-remediations.test.ts"
Cohesion: 0.10
Nodes (24): authRateLimiter, ClientRecord, createRateLimiter(), RateLimiterMiddleware, RateLimiterOptions, ValidationWarningsContext, decodeCanvasFromUrl(), isValidEdge() (+16 more)

### Community 16 - "contracts/src/index.ts"
Cohesion: 0.05
Nodes (78): Express, Request, ForgotPasswordInputDto, LoginInputDto, RefreshTokenInputDto, RegisterInputDto, ResendVerificationInputDto, ResetPasswordInputDto (+70 more)

### Community 17 - "desktop/types/document.ts"
Cohesion: 0.29
Nodes (19): BackupParseResult, CURRENT_BACKUP_SCHEMA_VERSION, CURRENT_DOCUMENT_SCHEMA_VERSION, DocumentParseResult, DRAWZ_BACKUP_TYPE, DRAWZ_FILE_TYPE, DrawzBackupDocument, DrawzBackupDocumentSchema (+11 more)

### Community 18 - "api/package.json"
Cohesion: 0.05
Nodes (48): dependencies, cors@^2.8.5, dotenv@^16.4.7, @drawzware/contracts@*, @drawzware/domain@*, express@^4.21.2, jsonwebtoken@^9.0.2, mongoose@^8.24.7 (+40 more)

### Community 19 - "package.json"
Cohesion: 0.12
Nodes (15): author, react-dom@19.2.3, description, electron-builder@^26.15.3, shadcn@^3.8.5, @types/js-yaml@^4.0.9, main, name (+7 more)

### Community 20 - "StorageService"
Cohesion: 0.20
Nodes (6): importDrawzFileFromDisk(), handleOpenFile(), StorageError, StorageService, isValidProjectId(), LibraryIndex

### Community 21 - "canvas.types.ts"
Cohesion: 0.10
Nodes (31): PRESET_COLORS, STROKE_WIDTH_PRESETS, MinimapThumbProps, CanvasStore, HistoryEntry, Template, BrushColorOption, DEFAULT_VIEWPORT (+23 more)

### Community 22 - "diagram.controller.ts"
Cohesion: 0.16
Nodes (28): createDiagramHandler(), getDiagramHandler(), getDiagramSnapshotHandler(), importDiagramHandler(), listDiagramsHandler(), saveDiagramSnapshotHandler(), updateDiagramHandler(), requireWorkspaceRole() (+20 more)

### Community 23 - "real-infrastructure-persistence.test.ts"
Cohesion: 0.14
Nodes (22): app, connectDB(), disconnectDB(), sanitizeError(), sanitizeMongoUri(), config, isOriginAllowed(), validateEnvironment() (+14 more)

### Community 24 - "DrawzWare MVP Plan"
Cohesion: 0.04
Nodes (44): 10. Import, Export, and File Safety, 11. Storage Quota and Abuse Prevention, 12.1 Canvas deletion, 12.2 Account deletion, 12. Deletion, Trash, and Account Data Lifecycle, 13. UX, Accessibility, and Onboarding, 14. Performance, Reliability, and Observability, 15. Testing and Release Gates (+36 more)

### Community 25 - "src/app/page.tsx"
Cohesion: 0.20
Nodes (10): LandingPage(), websiteStructuredData, LandingDarkValueSection(), ExportFormat, LandingExportSection(), LandingFeatureHighlights(), LandingFinalCTA(), LandingHowItWorks() (+2 more)

### Community 26 - "Canvas.tsx"
Cohesion: 0.11
Nodes (29): edgeTypes, nodeTypes, ValidationPanel(), clamp(), ConnectionTypePicker(), DEFAULT_COLUMNS, ERTableComponent(), ERTableNode (+21 more)

### Community 27 - "next"
Cohesion: 0.08
Nodes (9): nextConfig, metadata, metadata, metadata, metadata, dynamic, metadata, dynamic (+1 more)

### Community 28 - "ShapeDrawingOverlay.tsx"
Cohesion: 0.22
Nodes (20): DRAWING_TOOLS, ShapeDrawingOverlay(), getCaretOffsetFromPoint(), getStrokeDasharray(), ShapeNode, ShapeNodeComponent(), ShapeSvg(), ShapeSvgProps (+12 more)

### Community 29 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, @dagrejs/dagre@^2.0.4, html-to-image@^1.11.13, js-yaml@^4.1.1, lucide-react@^0.575.0, lz-string@^1.5.0 (+15 more)

### Community 30 - "LandingHeroSection.tsx"
Cohesion: 0.50
Nodes (4): ArchitecturePreview(), ArchNode, HeroSectionProps, LandingHeroSection()

### Community 31 - "DashboardIntroProvider.tsx"
Cohesion: 0.14
Nodes (17): BrandedLoadingTransition(), BrandedLoadingTransitionProps, Window, DashboardIntroContext, DashboardIntroContextValue, DashboardIntroProvider(), useDashboardIntro(), DASHBOARD_INTRO_STORAGE_KEY (+9 more)

### Community 32 - "BaseSystemNode.tsx"
Cohesion: 0.12
Nodes (19): EmptyCanvas(), QUICK_ADD, PresentationOverlay(), BaseSystemNode, BaseSystemNodeComponent(), NODE_ENV_META, NODE_STATUS_META, CATEGORY_ICONS (+11 more)

### Community 33 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 34 - "steps"
Cohesion: 0.10
Nodes (19): runs-on, steps, strategy, jobs, build, node-version, name, branches (+11 more)

### Community 35 - "NodeEditor.tsx"
Cohesion: 0.20
Nodes (28): ArchitectureEdgeEditorContent(), DETAILS, EdgeEditorContent(), ERRelationshipEditorContent(), SectionLabel(), SequenceMessageEditorContent(), ENV_OPTIONS, ERTableEditorContent() (+20 more)

### Community 36 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, lib, module, moduleResolution (+10 more)

### Community 37 - "react"
Cohesion: 0.17
Nodes (21): CanvasPage(), CanvasRoute(), InvitationContent(), InvitationsPage(), ResetPasswordContent(), ResetPasswordPage(), VerifyEmailContent(), VerifyEmailPage() (+13 more)

### Community 38 - "SystemEdge.tsx"
Cohesion: 0.24
Nodes (13): EDGE_REGISTRY, edgeAnimationClass(), EdgeTypeConfig, moveFocus(), ProtocolMenu(), ProtocolMenuItem(), ProtocolMenuProps, ProtocolMenuSeparator() (+5 more)

### Community 39 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, build:electron, deploy:cloudflare, desktop, dev, dist, dist:dir (+9 more)

### Community 40 - "cn"
Cohesion: 0.10
Nodes (19): GroupNodeComponent(), JunctionNodeComponent(), SequenceFragmentComponent(), SequenceParticipantComponent(), StickyNoteComponent(), ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem() (+11 more)

### Community 41 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, lib, module, moduleResolution, noEmit, outDir, paths (+6 more)

### Community 42 - "manifest.json"
Cohesion: 0.13
Nodes (14): background_color, categories, description, display, icons, id, name, orientation (+6 more)

### Community 43 - "ExportDialog.tsx"
Cohesion: 0.14
Nodes (17): CHECKERBOARD, ExportBody(), ExportFormat, FORMAT_OPTIONS, Scale, SCALE_OPTIONS, copyPngToClipboard(), getJsonExport() (+9 more)

### Community 44 - "compilerOptions"
Cohesion: 0.08
Nodes (24): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+16 more)

### Community 45 - "compilerOptions"
Cohesion: 0.08
Nodes (25): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+17 more)

### Community 47 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, lib, module, moduleResolution, noEmit, outDir, rootDir (+4 more)

### Community 48 - "DrawzWare — Authentication & Collaboration MVP"
Cohesion: 0.12
Nodes (15): 1. MVP Overview, 2. Locked Decisions, 3. Trade-offs and Compatibility Checks, 4. Implementation Plan, 5. Definition of Done, 6. Explicitly Out of Scope, DrawzWare — Authentication & Collaboration MVP, Goal (+7 more)

### Community 49 - "CanvasToolbar.tsx"
Cohesion: 0.12
Nodes (29): Divider(), ERASER_SIZE_PRESETS, PENCIL_SIZE_PRESETS, ToolbarIconButton(), useToolbarActions(), ContextualDrawingToolbar(), SelectionActions(), cleanRawMarkdownSymbols() (+21 more)

### Community 50 - "web/package.json"
Cohesion: 0.13
Nodes (19): dependencies, @drawzware/canvas-core@*, @drawzware/contracts@*, @drawzware/domain@*, @drawzware/storage@*, yjs@^13.6.33, description, @drawzware/contracts (+11 more)

### Community 51 - "Project"
Cohesion: 0.18
Nodes (15): DiagramModel, diagramSchema, IDiagram, DiagramSnapshotModel, diagramSnapshotSchema, IDiagramSnapshot, saveDiagramSnapshotDoc(), SaveSnapshotDocResult (+7 more)

### Community 52 - "with"
Cohesion: 0.17
Nodes (12): with, cache, draft, files, generate_release_notes, if-no-files-found, merge-multiple, name (+4 more)

### Community 53 - "domain/package.json"
Cohesion: 0.20
Nodes (11): dependencies, @drawzware/contracts@*, lz-string@^1.5.0, description, @drawzware/contracts, lz-string, main, name (+3 more)

### Community 54 - "@drawzware/contracts"
Cohesion: 0.22
Nodes (9): dependencies, @drawzware/contracts@*, description, @drawzware/contracts, main, name, private, types (+1 more)

### Community 55 - "desktop/package.json"
Cohesion: 0.22
Nodes (10): dependencies, @drawzware/contracts@*, @drawzware/storage@*, description, @drawzware/contracts, @drawzware/storage, main, name (+2 more)

### Community 56 - "useCollaborationStore.ts"
Cohesion: 0.24
Nodes (15): CollabClientConnection, InviteRow, UseCollaborationSyncOptions, CollabClientOptions, CollabConnectionStatus, CollaborationState, DEFAULT_COLLABORATORS, AccessControlState (+7 more)

### Community 57 - "publish-release"
Cohesion: 0.20
Nodes (10): jobs, publish-release, name, permissions, contents, if, name, needs (+2 more)

### Community 58 - "./tsconfig.base.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 59 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, declaration, module, moduleResolution, noEmit, outDir, rootDir, target (+3 more)

### Community 61 - "toast"
Cohesion: 0.13
Nodes (30): AppDashboardPage(), ImportPage(), State, hasFiles(), ImportDropZone(), pickFile(), BannerState, MigrationBanner() (+22 more)

### Community 62 - "build-and-test"
Cohesion: 0.20
Nodes (10): name, runs-on, strategy, build-cmd, os, platform, build-and-test, include (+2 more)

### Community 63 - "contracts/package.json"
Cohesion: 0.22
Nodes (9): dependencies, zod@^4.3.6, description, zod, main, name, private, types (+1 more)

### Community 64 - "storage/package.json"
Cohesion: 0.22
Nodes (9): dependencies, @drawzware/contracts@*, description, @drawzware/contracts, main, name, private, types (+1 more)

### Community 65 - "utils.ts"
Cohesion: 0.15
Nodes (22): SharedCanvasInner(), SharedCanvasPage(), MinimapThumb, ProjectCard, CreateNewProjectDashedCard(), isTypingTarget(), latest(), ModalState (+14 more)

### Community 66 - "env"
Cohesion: 0.29
Nodes (7): CSC_IDENTITY_AUTO_DISCOVERY, CSC_KEY_PASSWORD, CSC_LINK, GITHUB_TOKEN, WIN_CSC_KEY_PASSWORD, WIN_CSC_LINK, env

### Community 67 - "sync-out.mjs"
Cohesion: 0.29
Nodes (4): rootNext, rootOut, webNext, webOut

### Community 68 - "eslint.config.mjs"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.1.6, eslint, eslint-config-next

### Community 69 - "steps"
Cohesion: 0.47
Nodes (6): steps, steps, if, name, run, uses

### Community 70 - "domain/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 71 - "storage/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 72 - "CanvasHeader.tsx"
Cohesion: 0.14
Nodes (22): CanvasBackgroundLayer(), CanvasInner(), BACKGROUND_OPTIONS, CanvasHeader(), ProjectName(), STATUS, useDisplayedSaveStatus(), SaveStatus (+14 more)

### Community 73 - "Coding Style"
Cohesion: 0.07
Nodes (26): Code Quality Checklist, Code Smells to Avoid, Coding Style, Core Principles, Deep Nesting, DRY (Don't Repeat Yourself), Error Handling, File Organization (+18 more)

### Community 74 - "canvas-helpers.ts"
Cohesion: 0.10
Nodes (28): UtilityItem, EXPANDED_COMPONENT_CATEGORIES, EXPANDED_COMPONENTS, ExpandedComponentCategory, ExpandedComponentItem, POPULAR_SERVICE_CATEGORIES, POPULAR_SERVICES, PopularServiceCategory (+20 more)

### Community 75 - "CanvasToolbar.tsx"
Cohesion: 0.16
Nodes (35): AddComponentSubmenus(), CATEGORIES, CanvasContextMenu(), ContextMenuState, CanvasToolbar(), DrawingToolbar(), MoreMenu(), SidebarDrawingToolsMenu() (+27 more)

### Community 77 - "useCollaborationStore.ts"
Cohesion: 0.18
Nodes (14): base64ToUint8Array(), uint8ArrayToBase64(), useCollaborationSync(), CollabClient, getDefaultWsUrl(), applyCanvasDiffToYDoc(), base64ToUint8Array(), createCollabUndoManager() (+6 more)

### Community 78 - "DrawzWare Codebase Architecture & MVP Audit Report"
Cohesion: 0.10
Nodes (19): 1. Executive Summary, 2. Requirements Verification Matrix, 3. Data Flow Traces: Actual vs Expected, 4. Prioritized Architectural, Security, and Data-Loss Risks, 5. Verification Limitations, 6. Recommended Phase-Gated Next Steps, Critical Risks (Must Fix Before Any Multi-User Release), DrawzWare Codebase Architecture & MVP Audit Report (+11 more)

### Community 79 - "True"
Cohesion: 0.50
Nodes (4): tags, True, push, workflow_dispatch

### Community 83 - "DrawzWare System Design"
Cohesion: 0.13
Nodes (14): 10. Storage Quota, 11. Security and Privacy Requirements, 12. Error and Status Model, 15. Repository Audit Plan (No Coding), 16. Delivery Phases After Audit, 17. Post-MVP, 18. Repository Verification Checklist, 1. Purpose (+6 more)

### Community 84 - "CanvasTextNode.tsx"
Cohesion: 0.32
Nodes (11): ALLOWED_TAGS, CanvasTextNode, CanvasTextNodeComponent(), DANGEROUS_TAGS, domNodeToReact(), extractSafeColor(), getFontFamilyClass(), hasHtml() (+3 more)

### Community 85 - "PencilOverlay.tsx"
Cohesion: 0.28
Nodes (11): checkPointHitsEdge(), checkPointHitsNonDrawingNode(), distanceToSegment(), eraseDrawingStroke(), getSegmentCircleIntersections(), PencilOverlay(), Point, FreehandDrawingNode (+3 more)

### Community 86 - "serverError"
Cohesion: 0.27
Nodes (16): acceptInvitationHandler(), createInvitationHandler(), createWorkspaceHandler(), getInvitationPreviewHandler(), getWorkspaceHandler(), listInvitationsHandler(), listMembersHandler(), listWorkspacesHandler() (+8 more)

### Community 87 - "README.md"
Cohesion: 0.17
Nodes (10): Architecture Templates, Available Scripts, Community & Contributing, Deployment, Keyboard Shortcuts, License, Modern System Design & Architecture Diagramming, Overview (+2 more)

### Community 88 - "TypeScript/JavaScript Patterns"
Cohesion: 0.18
Nodes (9): API Response Format, Common Patterns, Design Patterns, Repository Pattern, Skeleton Projects, API Response Format, Custom Hooks Pattern, Repository Pattern (+1 more)

### Community 89 - "Code Review Standards"
Cohesion: 0.20
Nodes (10): Agent Usage, Approval Criteria, Code Review Standards, Integration with Other Rules, Purpose, Review Checklist, Review Severity Levels, Review Workflow (+2 more)

### Community 90 - "@drawzware/api — Drawzware Collaboration REST API"
Cohesion: 0.20
Nodes (9): 1. Architectural Principles, 2. Directory Structure, 3. Environment Configuration, 4. API Endpoints, 5. Development & Testing, Diagrams, @drawzware/api — Drawzware Collaboration REST API, System & Authentication (+1 more)

### Community 91 - "Contributing to Drawzware"
Cohesion: 0.14
Nodes (14): Commit Message Format, Contributing Code, Contributing to Drawzware, Development Setup, How Can I Contribute?, Key Guidelines, Local Setup, Prerequisites (+6 more)

### Community 92 - "Hooks System"
Cohesion: 0.22
Nodes (7): Auto-Accept Permissions, Hook Types, Hooks System, TodoWrite Best Practices, PostToolUse Hooks, Stop Hooks, TypeScript/JavaScript Hooks

### Community 93 - "5. Logical Components"
Cohesion: 0.22
Nodes (9): 5.1 Web and desktop clients, 5.2 Local storage adapter, 5.3 HTTP API, 5.4 Collaboration gateway, 5.5 Public read-only endpoint, 5.6 Persistence layer, 5.7 Background jobs, 5.8 Email provider integration (+1 more)

### Community 94 - "6. Core Data Model (Logical)"
Cohesion: 0.25
Nodes (8): 6. Core Data Model (Logical), Canvas, Ephemeral presence, Invitation, Membership, Publication, Quota/accounting, User

### Community 95 - "8. Main Flows"
Cohesion: 0.25
Nodes (8): 8.1 Local canvas to cloud, 8.2 Invitation acceptance, 8.3 Real-time edit, 8.4 Role change or removal, 8.5 Delete, restore, and purge, 8.6 Publish and unpublish, 8.7 Connection loss, 8. Main Flows

### Community 96 - "common-code-review.md"
Cohesion: 0.29
Nodes (3): Agent Support, Secret Management, TypeScript/JavaScript Security

### Community 97 - "common-git-workflow.md"
Cohesion: 0.29
Nodes (5): Development Workflow, Feature Implementation Workflow, Commit Message Format, Git Workflow, Pull Request Workflow

### Community 98 - "Testing Requirements"
Cohesion: 0.29
Nodes (7): Agent Support, Minimum Test Coverage: 80%, Test-Driven Development, Test Naming, Test Structure (AAA Pattern), Testing Requirements, Troubleshooting Test Failures

### Community 99 - "Contributor Covenant Code of Conduct"
Cohesion: 0.29
Nodes (7): Attribution, Contributor Covenant Code of Conduct, Enforcement Responsibilities, Our Pledge, Our Standards, Reporting & Enforcement, Scope

### Community 100 - "AGENTS.md — Drawzware Engineering Principles & AI Agent Guidelines"
Cohesion: 0.33
Nodes (5): 1. Prime Directives, 2. Repository Overview & Stack, 3. Modular Rule System, 4. Verification & Quality Gates, AGENTS.md — Drawzware Engineering Principles & AI Agent Guidelines

### Community 101 - "Agent Orchestration"
Cohesion: 0.33
Nodes (6): Agent Orchestration, Available Agents, Delegation Completion Contract, Immediate Agent Usage, Multi-Perspective Analysis, Parallel Task Execution

### Community 102 - "Performance Optimization"
Cohesion: 0.33
Nodes (5): Build Troubleshooting, Context Window Management, Extended Thinking + Plan Mode, Model Selection Strategy, Performance Optimization

### Community 103 - "Security Policy"
Cohesion: 0.33
Nodes (5): Reporting a Vulnerability, Response Process & Handling, Security Policy, Supported Versions, What to Include in Your Report

### Community 104 - "serverError"
Cohesion: 0.16
Nodes (14): bcryptjs@^3.0.3, createApp(), errorHandler(), notFoundHandler(), authRoutes, workspaceRoutes, auditLog, AuditResult (+6 more)

### Community 105 - "common-testing.md"
Cohesion: 0.40
Nodes (3): Agent Support, E2E Testing, TypeScript/JavaScript Testing

### Community 106 - "Agent Rules: Desktop Security & Electron IPC Constraints"
Cohesion: 0.40
Nodes (4): 1. Electron Process Security Invariants, 2. IPC Channel Architecture & Input Validation, 3. Secret Management & Telemetry, Agent Rules: Desktop Security & Electron IPC Constraints

### Community 107 - "monorepo.md — Drawzware Monorepo Rules & Invariants"
Cohesion: 0.40
Nodes (4): 1. Prime Architecture Rules, 2. Dependency Invariants, 3. Placement Protocol, monorepo.md — Drawzware Monorepo Rules & Invariants

### Community 108 - "Agent Rules: Testing & Verification Requirements"
Cohesion: 0.40
Nodes (4): 1. Truth in Testing (Non-Negotiable), 2. Test Authoring Standards, 3. Required Pre-Commit Verification, Agent Rules: Testing & Verification Requirements

### Community 109 - "Agent Rules: TypeScript, React, and Design System"
Cohesion: 0.40
Nodes (4): 1. TypeScript & Schema Rigor, 2. React 19 & Component Conventions, 3. Design System ("Studio") & Styling Tokens, Agent Rules: TypeScript, React, and Design System

### Community 110 - "Drawzware Canonical Brand Assets"
Cohesion: 0.40
Nodes (4): 1. Asset Inventory, 2. Brand Color Palette, 3. Brand Identity Rules, Drawzware Canonical Brand Assets

### Community 111 - "13. Non-Functional Requirements"
Cohesion: 0.40
Nodes (5): 13. Non-Functional Requirements, Accessibility and usability, Observability, Performance, Reliability

### Community 112 - "Features"
Cohesion: 0.40
Nodes (5): 1. Dedicated Diagram Modes & Component Library, 2. Canvas & Editing Capabilities, 3. Presentation & Collaboration, 4. Application & System Settings, Features

### Community 113 - "Screenshots"
Cohesion: 0.40
Nodes (5): Presentation Mode, Projects Dashboard, Screenshots, Sequence Diagrams & Entity-Relationship (ER) Diagrams, System Architecture Canvas

### Community 114 - "Common Issues to Catch"
Cohesion: 0.50
Nodes (4): Code Quality, Common Issues to Catch, Performance, Security

### Community 115 - "Security Guidelines"
Cohesion: 0.50
Nodes (4): Mandatory Security Checks, Secret Management, Security Guidelines, Security Response Protocol

### Community 116 - "auth.service.ts"
Cohesion: 0.07
Nodes (60): forgotPasswordHandler(), getMeHandler(), loginHandler(), logoutAllHandler(), logoutHandler(), refreshHandler(), registerHandler(), resendVerificationHandler() (+52 more)

### Community 117 - "ws.d.ts"
Cohesion: 0.15
Nodes (4): RawData, ServerOptions, WebSocketServer, ws

### Community 118 - "14. Test Strategy and Release Gates"
Cohesion: 0.67
Nodes (3): 14. Test Strategy and Release Gates, Release gates, Tests

### Community 119 - "7. Authorization Model"
Cohesion: 0.67
Nodes (3): 7. Authorization Model, Required authorization checks, Role matrix

### Community 120 - "Quick Start"
Cohesion: 0.67
Nodes (3): Installation, Prerequisites, Quick Start

### Community 121 - "settings/page.tsx"
Cohesion: 0.22
Nodes (11): BACKGROUND_OPTIONS, Row(), Section(), SectionId, SECTIONS, SettingsPage(), THEME_OPTIONS, ConfirmDialog() (+3 more)

### Community 122 - "providers.tsx"
Cohesion: 0.05
Nodes (47): geistMono, geistSans, metadata, newsreader, plusJakartaSans, RootLayout(), viewport, getDismissedSnapshot() (+39 more)

### Community 123 - "ProjectModal.tsx"
Cohesion: 0.24
Nodes (10): TEMPLATES, ProjectModal(), ProjectModalContent(), ProjectModalProps, Tab, TemplateGrid(), TemplateGridProps, DialogFooter() (+2 more)

### Community 124 - "crdt-collaboration.test.ts"
Cohesion: 0.33
Nodes (4): TestWsClient, TestWsClient, CollabClientMessage, CollabServerMessage

### Community 125 - "auth-contracts-models.test.ts"
Cohesion: 0.14
Nodes (11): ISession, SessionModel, sessionSchema, EmailMessagePayload, emailService, EmailServiceOptions, ACCESS_TOKEN_TTL_SEC, constantTimeCompare() (+3 more)

### Community 126 - "LandingDesktopAppModal.tsx"
Cohesion: 0.50
Nodes (4): AppleIcon(), DesktopAppModalProps, LandingDesktopAppModal(), OS

### Community 127 - "OnboardingOverlay.tsx"
Cohesion: 0.33
Nodes (9): getOnboarded(), getServerOnboarded(), Illustration(), LIBRARY_TYPES, MiniNode(), OnboardingOverlay(), STEPS, subscribe() (+1 more)

### Community 128 - "useIsDesktop.ts"
Cohesion: 0.83
Nodes (3): emptySubscribe(), isDesktopEnvironment(), useIsDesktop()

## Knowledge Gaps
- **6 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 859 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `LibraryProjectMetadata`, `desktop/types/ipc.ts`, `global-search-registry.ts`, `workspace.service.ts`, `package.json`, `security-remediations.test.ts`, `contracts/src/index.ts`, `desktop/types/document.ts`, `package.json`, `canvas.types.ts`, `real-infrastructure-persistence.test.ts`, `ShapeDrawingOverlay.tsx`, `DashboardIntroProvider.tsx`, `useCollaborationStore.ts`, `CanvasHeader.tsx`, `canvas-helpers.ts`, `useCollaborationStore.ts`, `serverError`, `auth.service.ts`, `crdt-collaboration.test.ts`, `auth-contracts-models.test.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `real-infrastructure-persistence.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1455026455026455 - nodes in this community are weakly interconnected._
- **Why does `Project` connect `Project` to `utils.ts`, `LibraryProjectMetadata`, `desktop/types/ipc.ts`, `vitest`, `CanvasHeader.tsx`, `CanvasToolbar.tsx`, `useCollaborationStore.ts`, `security-remediations.test.ts`, `contracts/src/index.ts`, `desktop/types/document.ts`, `StorageService`, `canvas.types.ts`, `diagram.controller.ts`, `real-infrastructure-persistence.test.ts`, `settings/page.tsx`, `crdt-collaboration.test.ts`, `toast`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `json-import.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `dialog.tsx`, `LandingNavbar.tsx`, `useIsDesktop.ts`, `json-import.ts`, `NodePalette.tsx`, `CommandMenu.tsx`, `global-search-registry.ts`, `security-remediations.test.ts`, `package.json`, `canvas.types.ts`, `src/app/page.tsx`, `Canvas.tsx`, `ShapeDrawingOverlay.tsx`, `dependencies`, `LandingHeroSection.tsx`, `DashboardIntroProvider.tsx`, `BaseSystemNode.tsx`, `NodeEditor.tsx`, `SystemEdge.tsx`, `cn`, `ExportDialog.tsx`, `CanvasToolbar.tsx`, `toast`, `utils.ts`, `CanvasHeader.tsx`, `canvas-helpers.ts`, `CanvasToolbar.tsx`, `useCollaborationStore.ts`, `CanvasTextNode.tsx`, `PencilOverlay.tsx`, `settings/page.tsx`, `providers.tsx`, `ProjectModal.tsx`, `LandingDesktopAppModal.tsx`, `OnboardingOverlay.tsx`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `NodePalette.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07529411764705882 - nodes in this community are weakly interconnected._