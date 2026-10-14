# Drawzware Desktop — Outstanding Architectural Decisions Register

**Status:** Awaiting User Decision & Confirmation  
**Author:** Principal Software Engineer & Product Architect  
**Scope:** Material Architecture, UX, and Infrastructure Choices Requiring Direction  

---

## 1. Overview of Decision Register

The following decisions materially influence user experience, persistence topology, or build infrastructure. 

To prevent blocking progress, each decision includes a **Provisional Default** that will be used unless you explicitly instruct otherwise.

---

## 2. Decision Register

### Decision 1: Workspace Architecture — Library vs. Document Model

- **Context & Why It Matters:**
  The web app maintains an automatic list of all diagrams inside the browser. Desktop applications generally follow one of two models:
  1. *Library-Managed Model (e.g. Apple Notes, Notion, Obsidian):* All diagrams live inside an internal application catalog; users never manually choose file paths.
  2. *Document-Centric Model (e.g. VS Code, Photoshop, Draw.io):* Diagrams are standalone files (`.drawz`) saved anywhere on the user's hard drive; users manage files via the operating system explorer.
- **Available Options:**
  - **Option A (Hybrid — Recommended):** Provide an internal application library in `userData/library/` that populates the dashboard project grid automatically, while simultaneously supporting "Save As…" and "Open…" for arbitrary standalone files in Git repositories or shared drives.
  - **Option B (Document-Only):** Remove the dashboard project grid entirely. Boot into a blank canvas or an "Open File" dialog.
  - **Option C (Library-Only):** Keep all files inside the internal library. Disallow opening or saving standalone files outside `userData`.
- **Recommendation:** **Option A (Hybrid).** Gives users the instant convenience of the existing dashboard for quick sketches while providing the file portability engineers demand for Git commits.
- **Consequences:**
  - *Option A:* Best user experience; requires `electron/services/storage.service.ts` to manage both the library index and standalone file paths.
  - *Option B:* Breaks existing dashboard and template discovery flows.
  - *Option C:* Prevents committing `.drawz` files into project codebases alongside READMEs.
- **Can Implementation Proceed Without Decision?** **Yes.** Provisional default is **Option A (Hybrid)**.

---

### Decision 2: Window Framing & Aesthetics — Native vs. Custom Seamless Frame

- **Context & Why It Matters:**
  Drawzware features a polished, dark/light studio design system with curated OKLCH tokens ([src/styles/tokens.css](file:///d:/AI%20Projects/drawzware-system-design-canvas/src/styles/tokens.css)). The window frame influences whether the desktop app feels like an operating system utility or a sleek modern studio.
- **Available Options:**
  - **Option A (Native OS Title Bar — Recommended):** Use standard operating system title bars and window control buttons (minimize, maximize, close).
  - **Option B (Custom Frameless / Title Bar Overlay):** Hide the native OS frame (`titleBarStyle: 'hidden'`) and embed custom window control buttons directly inside the Drawzware canvas header (`CanvasHeader.tsx`).
- **Recommendation:** **Option A (Native OS Title Bar for MVP).**
- **Consequences:**
  - *Option A:* Guaranteed 100% platform consistency across Windows 11 Snap Layouts, macOS full-screen spaces, and diverse Linux window managers (GNOME, KDE). Zero window dragging bugs.
  - *Option B:* Slightly sleeker aesthetic, but requires maintaining custom `-webkit-app-region: drag` regions, platform-specific window control buttons for Windows and Linux, and custom double-click maximize behavior.
- **Can Implementation Proceed Without Decision?** **Yes.** Provisional default is **Option A (Native Title Bar for MVP)**. Option B can be evaluated in Milestone 3 as a cosmetic polish.

---

### Decision 3: Code Signing Certificates & Distribution Channel

- **Context & Why It Matters:**
  Distributing desktop software triggers operating system security gates:
  - macOS Gatekeeper blocks unsigned and unnotarized binaries by default.
  - Windows SmartScreen shows "Windows protected your PC" for unsigned binaries.
- **Available Options:**
  - **Option A (Unsigned MVP with Clear Documentation — Recommended for Initial Phase):** Produce unsigned binaries in GitHub Actions for the initial release; document how users can bypass Gatekeeper (`xattr -cr /Applications/Drawzware.app`) and SmartScreen ("More info > Run anyway"). Add signing secrets whenever certificates are acquired.
  - **Option B (Signed Release via Paid Apple Developer & Azure Trusted Signing):** Acquire an Apple Developer Program account ($99/yr) and an Azure Trusted Signing / DigiCert Authenticode certificate before releasing v1.0.0.
- **Recommendation:** **Option A for initial MVP CI setup**, transitioning to **Option B** as soon as organizational credentials are confirmed.
- **Consequences:**
  - *Option A:* Zero monetary cost; GitHub Actions release pipeline can be built and tested immediately. First-time users see OS reputation warnings.
  - *Option B:* Seamless enterprise distribution with zero security warnings; requires ongoing paid subscriptions and hardware/cloud HSM setup.
- **Can Implementation Proceed Without Decision?** **Yes.** The CI release workflow is designed to automatically sign binaries if repository secrets (`APPLE_ID`, `CSC_LINK`, etc.) exist, and fallback cleanly to building unsigned binaries if they do not.

---

### Decision 4: Automatic Background Updates in MVP

- **Context & Why It Matters:**
  `electron-updater` allows desktop apps to automatically check GitHub Releases on boot, download differential delta updates in the background, and prompt the user to restart.
- **Available Options:**
  - **Option A (Manual Update Prompts via GitHub Releases for MVP — Recommended):** The app checks the latest GitHub Release version tag on boot; if a newer version exists, a notification pill appears in Settings ("New version available: Download v1.1.0").
  - **Option B (Full Background Auto-Update via electron-updater):** Install `electron-updater` and configure silent background downloads and restarts.
- **Recommendation:** **Option A for MVP (P0)**, deferring Option B to P1.
- **Consequences:**
  - *Option A:* Zero risk of broken background updater loops or corrupted binary replacements; works reliably even on unsigned binaries.
  - *Option B:* Better long-term user convenience, but requires code-signed binaries on macOS and Windows to apply updates automatically without permission errors.
- **Can Implementation Proceed Without Decision?** **Yes.** Provisional default is **Option A**.

---

## 3. Summary of Provisional Defaults

Unless instructed otherwise, the implementation plan will proceed with:
1. **Workspace Model:** Option A (Hybrid: internal library + standalone file support).
2. **Window Frame:** Option A (Standard OS native window frame for MVP stability).
3. **Signing Strategy:** Option A (CI workflow supports secrets; builds unsigned artifacts if secrets are absent).
4. **Updates:** Option A (Version check notification linking to GitHub Releases for MVP).
