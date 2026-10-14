# ADR-006: Cross-Platform Release Packaging and Code Signing Strategy

**Status:** Proposed (Recommended)  
**Date:** October 2026  
**Deciders:** Principal Software Engineer, Product Architect  

---

## 1. Context and Problem Statement

Distributing a native desktop application across Windows, macOS, and Linux requires automated packaging and adherence to platform security requirements:
- **macOS:** Gatekeeper blocks unnotarized binaries, displaying "App is damaged and can't be opened". Valid distribution requires an Apple Developer Account ($99/year), Developer ID Application signing, and notarization stapled to the installer.
- **Windows:** Microsoft Defender SmartScreen displays untrusted publisher warnings ("Windows protected your PC") on unsigned binaries or newly signed binaries without established reputation.
- **Linux:** Requires cross-distribution packaging (`.AppImage` for standalone universal execution, `.deb` for Debian/Ubuntu).

We must decide the build packaging toolchain, CI matrix, and code signing roadmap for Drawzware Desktop.

---

## 2. Options Considered

### Option 1: electron-builder with Multi-Runner GitHub Actions Matrix (Recommended)
- **Tooling:** Use `electron-builder` configured via `electron-builder.yml`.
- **CI/CD:** Multi-platform GitHub Actions release workflow running on `windows-latest`, `macos-latest`, and `ubuntu-latest`.
- **Packaging Formats:**
  - Windows: NSIS Installer (`.exe`) + Portable executable.
  - macOS: Universal DMG (`x64` + `arm64`) and ZIP.
  - Linux: AppImage + Debian package (`.deb`).
- **Code Signing Strategy:**
  - Automated signing and notarization hooks configured in CI.
  - Graceful fallback: If code-signing secrets are not configured in repository secrets, CI still builds unsigned release binaries with clear documentation on how users can bypass Gatekeeper / SmartScreen.

### Option 2: Electron Forge
Use Electron Forge with `@electron-forge/maker-*` plugins.

### Option 3: Manual Local Machine Builds
Have maintainers build binaries on their individual laptops and upload them manually to GitHub Releases.

---

## 3. Decision & Provisional Recommendation

**We provisionally recommend Option 1: electron-builder with Multi-Runner GitHub Actions Matrix.**

### Rationale:
1. **Industry Standard:** `electron-builder` has the largest ecosystem, built-in NSIS script customization, automated macOS notarization integration (`@electron/notarize`), and automatic differential delta update generation.
2. **Reproducible Cross-Platform Automation:** Packaging native desktop binaries on developer laptops leads to "works on my machine" defects, unversioned dependencies, and exposed private keys. Running dedicated GitHub Actions runners ensures clean, reproducible, and verifiable builds.
3. **Realistic Signing Posture:** We do not pretend that code signing is free or that open-source developers always have corporate EV certificates on day one. By designing CI to build release artifacts with or without signing keys, the project can ship immediately while allowing maintainers to plug in credentials whenever available.

---

## 4. Consequences

### Positive Consequences:
- Tagging a Git release (`v1.0.0`) automatically produces complete, downloadable installer assets for Windows, macOS, and Linux.
- SHA-256 checksums are generated automatically for security verification.
- Secret injection via GitHub Actions secrets keeps signing credentials completely out of source code.

### Negative Consequences:
- macOS builds require a paid Apple Developer subscription for official notarization.
- Windows binaries will encounter SmartScreen reputation warnings until sufficient download volume or EV signing is acquired.

---

## 5. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Gatekeeper blocking unsigned macOS builds | High | Provide clear installation instructions for open-source users (`xattr -cr /Applications/Drawzware.app`) until an Apple Developer certificate is provisioned. |
| SmartScreen warning on Windows | Medium | Document "More info > Run anyway" workflow in release notes; investigate Azure Trusted Signing for affordable cloud-based Authenticode signing. |
| macOS Universal binary build times | Low | Run parallel CI jobs for `arm64` and `x64` if universal builds exceed time budgets. |
