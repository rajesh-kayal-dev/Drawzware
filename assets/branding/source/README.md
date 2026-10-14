# Drawzware Canonical Brand Assets

This directory contains the canonical source brand assets for **Drawzware**.

---

## 1. Asset Inventory

| Asset Name | Dimensions | Format | Usage Context |
| :--- | :--- | :--- | :--- |
| **`app-icon.png`** | 512 × 512 px | PNG (32-bit RGBA) | Master square application icon mark for desktop packaging (Windows, macOS, Linux). |
| **`app-icon.svg`** | 512 × 512 px | SVG | Scalable vector wrapper for the master application icon mark. |
| **`wordmark-dark.png`** | 1907 × 487 px | PNG (32-bit RGBA) | Horizontal brand wordmark for light surfaces. |
| **`wordmark-light.png`** | 1907 × 487 px | PNG (32-bit RGBA) | Horizontal brand wordmark for dark surfaces (desktop header, dark theme). |
| **`emblem.png`** | 314 × 487 px | PNG (32-bit RGBA) | Isolated emblem mark used in compact UI badges and about modal. |

---

## 2. Brand Color Palette

- **Primary Studio Background:** `#0a0c10` (Deep obsidian dark surface)
- **Primary Accent / Brand Emerald:** `#10b981` (Oklch green highlight)
- **Border / Structure Green:** `#1d6f42`
- **Ink Primary (Light on Dark):** `#f8fafc`
- **Ink Muted:** `#94a3b8`
- **Surface Elevation:** `#111620`

---

## 3. Brand Identity Rules

1. **App Icon Mark vs. Wordmark:**
   - Use the **square app icon mark** (`app-icon.png`) for all desktop OS surfaces: Windows Taskbar, Start Menu, Desktop shortcuts, macOS Dock, Finder, Linux Application Menus, and NSIS installers.
   - Use the **horizontal wordmark** (`wordmark-light.png` / `wordmark-dark.png`) only where horizontal layout space permits (such as web headers, README banners, and about dialogs). Never compress the wordmark into a square icon.
2. **Aspect Ratio:**
   - The square mark must always maintain a strict 1:1 aspect ratio.
   - Never stretch, squish, or distort the mark.
3. **Packaging Assets (`build/`):**
   - `build/icon.png` (512×512) is derived from `app-icon.png` and serves as the master asset for multi-platform packaging.
   - `build/icon.ico` contains multi-resolution mipmaps (16×16, 24×24, 32×32, 48×48, 64×64, 128×128, 256×256) for native Windows shells.
