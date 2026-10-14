# Release Automation & Desktop Packaging Guide

This document describes how **Drawzware Desktop** is packaged into multi-platform distributables, verified across operating systems, and published via automated GitHub Actions releases.

---

## 1. Packaging Architecture

Drawzware uses **`electron-builder`** to produce offline, installable, and portable desktop packages for Windows, macOS, and Linux.

### Distributable Targets

| Platform | Target Formats | Architectures | Target File Types |
| :--- | :--- | :--- | :--- |
| **Windows** | NSIS Installer, Portable | `x64` | `Drawzware Setup <version>.exe`<br>`Drawzware <version>.exe` |
| **macOS** | DMG, ZIP Archive | `x64`, `arm64` | `Drawzware-<version>.dmg`<br>`Drawzware-<version>-mac.zip` |
| **Linux** | AppImage, DEB | `x64` | `Drawzware-<version>.AppImage`<br>`drawzware_<version>_amd64.deb` |

### Bundled Content & Offline Guarantee

The packaged application is fully self-contained in an ASAR archive:
- **`dist-electron/`**: Compiled Electron main process, preload script, IPC bridges, and storage service.
- **`out/`**: Pre-rendered Next.js static export containing all client pages, canvas engines, styles, tokens, and embedded assets.
- **`package.json`**: App version and metadata.
- **Zero Remote Dependencies**: App startup and diagram editing work 100% offline. Diagram documents and local libraries are persisted directly in OS user data directories (`%APPDATA%`, `~/Library/Application Support`, `~/.config`).

---

## 2. Automated Release Workflow

Releases are managed by the GitHub Actions workflow in [`.github/workflows/release.yml`](../../.github/workflows/release.yml).

### Workflow Triggers

- **Version Tags (`v*.*.*`):** Triggers multi-platform matrix builds, verifies all quality gates, packages distributables, creates a GitHub Release, and attaches binary artifacts.
- **Pull Requests & Main Branch Pushes:** Runs the full validation suite (`lint`, `tsc`, `test`, `build`, `smoke-test`) to ensure continuous release-readiness without publishing releases.
- **Manual Dispatch (`workflow_dispatch`):** Allows maintainers to trigger builds manually from the GitHub Actions tab.

---

## 3. Step-by-Step Release Instructions

### Step 1: Update Application Version

Bump the version in `package.json`:
```json
{
  "name": "drawzware",
  "version": "1.0.0"
}
```

### Step 2: Verify Quality Gates Locally

Before creating a release tag, verify that all local quality gates pass:
```bash
npm run lint          # ESLint static analysis
npx tsc --noEmit      # TypeScript type verification
npm test              # Automated unit and integration tests
npm run build:electron # Electron main and preload build
npm run build         # Next.js static export
npm run test:smoke    # Electron application smoke test
```

### Step 3: Commit and Tag

Commit the version bump and create an annotated git tag matching `v*.*.*`:
```bash
git add package.json package-lock.json
git commit -m "chore(release): v1.0.0"
git tag -a v1.0.0 -m "Drawzware Desktop Release v1.0.0"
```

### Step 4: Push the Tag

Push the commit and tag to GitHub:
```bash
git push origin main
git push origin v1.0.0
```

### Step 5: Monitor GitHub Actions

1. Open the repository's **Actions** tab on GitHub.
2. Select the **Release Drawzware Desktop** workflow run.
3. The `build-and-test` matrix will execute across:
   - `windows-latest`
   - `macos-latest`
   - `ubuntu-latest`
4. Once all matrix builds pass, the `publish-release` job aggregates the artifacts, generates release notes, and publishes the official release.

---

## 4. Required GitHub Repository Configuration

### Workflow Permissions

To allow GitHub Actions to publish releases using the default `GITHUB_TOKEN`:
1. Navigate to **Settings** > **Actions** > **General**.
2. Scroll down to **Workflow permissions**.
3. Select **Read and write permissions**.
4. Check **Allow GitHub Actions to create and approve pull requests**.
5. Click **Save**.

---

## 5. Code Signing & Platform Security Considerations

### Current Status: Unsigned Distributables

By default, builds produced in CI without dedicated code signing certificates are **unsigned**.

### Platform-Specific Behavior

1. **Windows:**
   - Windows Defender SmartScreen may display: *"Windows protected your PC: Unknown Publisher"*.
   - Users must click *"More info"* -> *"Run anyway"* to install or execute unsigned builds.
   - To eliminate SmartScreen warnings, configure an EV Code Signing Certificate or Microsoft Trusted Signing.

2. **macOS:**
   - macOS Gatekeeper blocks downloaded apps that are not signed with an Apple Developer ID and notarized by Apple: *"Drawzware cannot be opened because the developer cannot be verified"*.
   - Users can open the application by navigating to **System Settings** > **Privacy & Security** > scroll to **Security** > click **Open Anyway**, or by right-clicking `Drawzware.app` and selecting **Open**.
   - To sign and notarize automatically in CI, configure Apple Developer secrets (see below).

3. **Linux:**
   - AppImage requires executable permissions before running:
     ```bash
     chmod +x Drawzware-*.AppImage
     ./Drawzware-*.AppImage
     ```
   - DEB packages can be installed via standard package managers:
     ```bash
     sudo dpkg -i drawzware_*_amd64.deb
     ```

### Optional Secrets for Code Signing

If the maintainer acquires code signing certificates, add the following repository secrets (**Settings** > **Secrets and variables** > **Actions**):

| Secret Name | Platform | Description |
| :--- | :--- | :--- |
| `CSC_LINK` | macOS | Base64-encoded `.p12` / Developer ID certificate |
| `CSC_KEY_PASSWORD` | macOS | Password for the macOS `.p12` certificate |
| `APPLE_ID` | macOS | Apple Developer Account ID (for notarization) |
| `APPLE_APP_SPECIFIC_PASSWORD` | macOS | App-specific password generated on appleid.apple.com |
| `APPLE_TEAM_ID` | macOS | 10-character Apple Developer Team ID |
| `WIN_CSC_LINK` | Windows | Base64-encoded `.pfx` code signing certificate |
| `WIN_CSC_KEY_PASSWORD` | Windows | Password for the Windows `.pfx` certificate |

If these secrets are not provided, `electron-builder` automatically falls back to generating clean, unsigned distributables without failing the build.
