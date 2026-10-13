# Contributing to Drawzware

Thank you for your interest in contributing to **Drawzware**! We welcome contributions of all kinds, including bug reports, feature requests, documentation improvements, and code changes.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing to ensure a welcoming environment for everyone.

---

## Table of Contents

- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Contributing Code](#contributing-code)
- [Development Setup](#development-setup)
- [Project Architecture & Conventions](#project-architecture--conventions)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Commit Message Format](#commit-message-format)

---

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report:
1. Check the [existing issues](https://github.com/rajesh-kayal-dev/Drawzware/issues) to see if the issue has already been reported.
2. Ensure you are testing against the latest `main` branch.

When opening an issue, please include:
- A clear, descriptive title.
- Steps to reproduce the bug.
- Expected behavior vs. actual behavior.
- Screenshots, browser console error logs, and your environment (OS, browser and version).

### Suggesting Features

We welcome ideas that enhance system architecture diagramming, diagram types, performance, or user experience:
1. Check existing issues and discussions to avoid duplicates.
2. Clearly describe the problem your feature solves and how you envision it working.
3. Keep in mind Drawzware's core philosophy: **focused system design building blocks, 100% client-side privacy, and zero required server infrastructure**.

### Contributing Code

If you would like to work on an issue or add a feature:
1. For non-trivial changes, open an issue first to discuss the design with maintainers.
2. Fork the repository and create a descriptive branch from `main`.

---

## Development Setup

### Prerequisites

- **Node.js**: version `20` or higher (`20` or `22` LTS recommended)
- **Package Manager**: `npm`

### Local Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/Drawzware.git
   cd Drawzware
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Verify linting and build:**
   ```bash
   npm run lint     # Runs ESLint checks
   npm run build    # Compiles static Next.js production export
   ```

---

## Project Architecture & Conventions

### Tech Stack

- **Framework**: Next.js 16 (App Router + Turbopack) & React 19
- **Language**: TypeScript 5
- **Canvas Engine**: `@xyflow/react` (React Flow v12)
- **State Management**: Zustand v5 (`src/stores/`)
- **Styling**: Tailwind CSS v4 & OKLCH color tokens (`src/app/globals.css`)
- **UI Components**: Radix UI primitives & Lucide React icons
- **Graph Layout**: `@dagrejs/dagre`

### Key Guidelines

1. **Client-Side Privacy**: Drawzware operates entirely in the browser with `localStorage` persistence. Do not introduce mandatory remote servers, external tracking scripts, or telemetry without explicit maintainer consensus.
2. **Type Safety**: Avoid `any` types. Provide well-structured TypeScript interfaces under `src/types/` or co-located with components.
3. **Component Structure**:
   - Canvas elements, toolbars, and palettes reside in `src/components/canvas/`.
   - Custom node definitions reside in `src/components/nodes/`.
   - Custom edges and connection lines reside in `src/components/edges/`.
4. **Theme Compatibility**: Ensure all visual components render properly in both Light and Dark themes using existing design tokens.

---

## Pull Request Guidelines

1. **Branch Naming**: Use clear branch prefixes:
   - `feat/feature-name` for new features
   - `fix/bug-description` for bug fixes
   - `docs/topic-name` for documentation updates
   - `refactor/component-name` for refactoring
2. **Keep PRs Focused**: Address one bug or feature per pull request. Avoid bundled, unrelated changes.
3. **Include Visuals**: For any UI or canvas changes, include screenshots or screen recordings comparing the before and after states.
4. **Pass Automated Checks**: Ensure both `npm run lint` and `npm run build` pass locally before submitting.

---

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature (e.g., `feat(canvas): add ER relationship cardinalities`)
- `fix:` A bug fix (e.g., `fix(export): resolve transparent background clipping`)
- `docs:` Documentation only changes (e.g., `docs: update setup instructions in README`)
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `chore:` Maintenance tasks, dependency updates, or configuration changes

---

Thank you for helping make Drawzware better!
