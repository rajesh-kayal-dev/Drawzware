# Drawzware Desktop Branding, Native OS Identity & Packaging Reference

**Document Version:** 1.0.0  
**Status:** Active / Pre-Release  
**Author:** Drawzware Engineering Team  
**Scope:** Milestone 3A.1 Pre-Release Polish  

---

## 1. Executive Summary

This document establishes the canonical branding asset architecture, native operating system identities, file association bindings, and packaging configurations for **Drawzware Desktop** across Windows, macOS, and Linux.

Drawzware is a client-first, zero-backend visual architecture studio. Native desktop packaging preserves this guarantee with offline capability, sandboxed renderer execution, isolated preload IPC, and atomic local persistence.

---

## 2. Canonical Brand Asset Directory Structure

To maintain separation between design-time brand master assets and build-time packaging artifacts, the asset directory is strictly organized as follows:

```
drawzware-system-design-canvas/
├── assets/
│   └── branding/
│       └── source/
│           ├── app-icon.png         # Canonical 512x512 square brand mark master
│           ├── app-icon.svg         # SVG vector wrapper of master mark
│           ├── wordmark-dark.png    # 1907x487 primary horizontal wordmark (dark text on transparent)
│           ├── wordmark-light.png   # 1907x487 contrast horizontal wordmark (light text on transparent)
│           ├── emblem.png           # 314x487 standalone emblem mark
│           └── README.md            # Brand guidelines, color tokens, and asset usage rules
├── build/
│   ├── icon.png                     # Master 512x512 packaging icon (Linux AppImage/DEB, macOS, fallback)
│   └── icon.ico                     # Multi-tier Windows icon (16, 24, 32, 48, 64, 128, 256 px)
├── public/
│   ├── drawzware-icon.png           # Web/PWA master square brand icon (512x512)
│   ├── drawzware-logo.png           # Web/PWA full horizontal logo
│   ├── favicon.ico                  # Web favicon
│   └── icons/
│       ├── icon-192x192.png         # Web manifest standard icon
│       └── icon-512x512.png         # Web manifest large icon
```

### Brand Tokens & Colors
- **Brand Purple Accent:** `#7c3aed` (`hsl(262.1 83.3% 57.8%)`)
- **Brand Violet Secondary:** `#6d28d9` (`hsl(263.4 70% 50.4%)`)
- **Dark Canvas Surface:** `#0a0c10` (Electron window background & canvas viewport)
- **Border Surface:** `rgba(255, 255, 255, 0.08)`

---

## 3. Platform Icon & Native Identity Mapping

| Platform | Target Artifacts | Icon Source | Formats / Resolution | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | NSIS Installer, Portable EXE | `build/icon.ico` | Multi-resolution ICO: 16, 24, 32, 48, 64, 128, 256 px | Windows Explorer, Taskbar, Start Menu, Add/Remove Programs |
| **macOS** | DMG, ZIP Archive | `build/icon.png` | 512x512 PNG (auto-converted to `.icns` by `electron-builder`) | macOS Dock, Finder, App Switcher |
| **Linux** | AppImage, DEB package | `build/icon.png` | 512x512 PNG | GNOME Shell, KDE launcher, desktop environment menus |
| **Browser / PWA** | Web Application | `public/icons/*` | 192x192, 512x512 PNG, favicon.ico | Web manifest and responsive browser tabs |

### Operating System Identity Configuration

| Config Element | Value | Target Purpose |
| :--- | :--- | :--- |
| **Application ID (`appId`)** | `dev.drawzware.app` | Windows Taskbar grouping, macOS bundle identifier, Linux desktop file |
| **Product Name (`productName`)** | `Drawzware` | Window title, Start Menu, installer header, macOS App menu |
| **Executable Name (`executableName`)** | `drawzware` | Binary name on PATH (`drawzware.exe` / `drawzware`) |
| **Windows AppUserModelID** | `dev.drawzware.app` | Configured via `app.setAppUserModelId()` in `electron/main.ts` |
| **Linux `StartupWMClass`** | `drawzware` | Ensures running instances group under the single application dock icon |
| **macOS Category** | `public.app-category.developer-tools` | App Store / macOS system classification |
| **Linux Category** | `Development` | XDG desktop menu classification |

---

## 4. Native File Associations (`.drawz` and `.drawzbackup`)

Drawzware Desktop registers native file associations in `electron-builder.json` and supports end-to-end file opening across runtime states:

### 1. Document Types
- **`.drawz`** — *Drawzware Architecture Diagram Document*
  - Role: `Editor`
  - MIME: `application/vnd.drawzware.diagram+json` (vendor schema `drawzware-project` v1)
  - Icon: Bound to application icon.
- **`.drawzbackup`** — *Drawzware Multi-Project Backup Archive*
  - Role: `Editor`
  - MIME: `application/vnd.drawzware.backup+json` (vendor schema `drawzware-backup` v1)
  - Icon: Bound to application icon.

### 2. Runtime Launch Lifecycle Handling
In `electron/main.ts` and `electron/ipc/file-handlers.ts`:
- **Initial Cold Launch:** Command line arguments (`process.argv`) are inspected via `extractFilePathFromArgv()`. If an associated `.drawz` or `.drawzbackup` file is detected, it is queued into `pendingFilePath` and dispatched automatically once the window loads (`did-finish-load`).
- **Second-Instance Launch (Windows / Linux):** Controlled via `app.requestSingleInstanceLock()`. When a second instance attempts to run (e.g. double-clicking a file while the app is already open), the primary instance focuses its window and opens the file via `handleOpenFile()`.
- **macOS Event Launch:** Listens to `app.on('open-file', (event, filePath) => ...)` and dispatches to `handleOpenFile()`.
- **Duplicate Project Collision Protection:** When importing a `.drawz` or `.drawzbackup` file that shares an ID with an existing local project, `importDrawzFileFromDisk` assigns a clean UUID and appends `(Imported)` to the project name, strictly guaranteeing that existing user work is never overwritten.
- **Corrupted / Unsupported File Handling:** Schema validation executes upfront. If an unrecognized schema version or malformed JSON is supplied, a native error dialog (`dialog.showErrorBox`) informs the user with actionable instructions.

---

## 5. Summary of Changes in Milestone 3A.1

### Changes Completed:
1. **Brand Source Asset Preservation:**
   - Isolated canonical design master files in `assets/branding/source/` (`app-icon.png`, `app-icon.svg`, `wordmark-dark.png`, `wordmark-light.png`, `emblem.png`, `README.md`).
2. **Multi-Resolution Windows Icon Generation:**
   - Generated true multi-image `build/icon.ico` with 7 standard mipmap resolutions (16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256).
   - Updated `.gitignore` to track `!/build/icon.png` and `!/build/icon.ico`.
3. **Packaging Configuration Hardening (`electron-builder.json`):**
   - Configured `fileAssociations` for `.drawz` and `.drawzbackup`.
   - Wired `win.icon` to `build/icon.ico`.
   - Wired `nsis.installerIcon`, `nsis.uninstallerIcon`, and `nsis.installerHeaderIcon` to `build/icon.ico`.
   - Added `linux.desktop.StartupWMClass: "drawzware"` to fix duplicate dock icons on Linux.
4. **Native Application Window & Process Identity (`electron/main.ts`):**
   - Added `app.setAppUserModelId('dev.drawzware.app')` for native Windows taskbar icon pinning and notification identity.
   - Added `getWindowIconPath()` helper resolving `build/icon.ico` on Windows and `build/icon.png` on Linux/macOS.
   - Provided `icon` in `new BrowserWindow(...)` for taskbar and Alt+Tab rendering.
   - Added command line and macOS event file-open handlers (`extractFilePathFromArgv`, `handleOpenFile`, `second-instance`, `open-file`).
5. **Direct Disk File Import Pipeline (`electron/ipc/file-handlers.ts`):**
   - Added `importDrawzFileFromDisk` supporting direct file imports without IPC dialog triggers, with duplicate collision protection and schema validation.
6. **Automated Verification Coverage:**
   - Extended `tests/packaging-config.test.ts` to assert brand assets, ICO presence, file associations, and NSIS icon configurations.
   - Extended `tests/file-operations.test.ts` to assert `importDrawzFileFromDisk` behavior, collision handling, and corrupted file rejection.

### What Remains Incomplete / Out of Scope for Milestone 3A.1:
- Final installer compilation (`npm run dist` / `npm run dist:win`) was intentionally NOT executed, in compliance with the pre-release preparation constraint.
- Publishing GitHub releases or pushing tags was deferred until final signoff.
- Custom NSIS sidebar BMP artwork (`installerSidebar.bmp`, 164x314) and custom macOS DMG background (`background.png`, 540x380) remain optional visual enhancements if customized installer wizards are requested.

---

## 6. Commands to Build Distributable Packages

When ready for release packaging, run the following commands:

### Prerequisites:
```bash
# 1. Clean verify dependencies and source code
npm ci
npm run lint
npx tsc --noEmit
npm test

# 2. Build Next.js static frontend and Electron main/preload bundles
npm run build
npm run build:electron

# 3. Run headless smoke test to verify protocol and IPC contracts
npm run test:smoke
```

### Distributable Generation Commands:
```bash
# Package all platforms (or current host platform):
npm run dist

# Package Windows NSIS installer and portable executable:
npm run dist:win

# Package macOS DMG and ZIP (on macOS runner):
npm run dist:mac

# Package Linux AppImage and DEB (on Linux runner):
npm run dist:linux

# Unpacked directory build for rapid local testing without installers:
npm run dist:dir
```
