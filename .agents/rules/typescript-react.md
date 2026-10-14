# Agent Rules: TypeScript, React, and Design System

**Applies to:** TypeScript code, React components, hooks, Zustand stores, and CSS styling.

---

## 1. TypeScript & Schema Rigor

1. **Strict Types Everywhere:**
   - `"strict": true` is enforced in `tsconfig.json`. No implicit `any`.
   - Prefer discriminated unions for polymorphic UI or state variants.
2. **Runtime Validation with Zod:**
   - All external, imported, or filesystem data must be validated with Zod schemas (`src/types/index.ts`) before being admitted to store state.
   - Use `schema.safeParse()`. Never trust raw JSON strings.
3. **Preserve Node Handle IDs:**
   - Handle IDs follow the strict convention: `{top|right|bottom|left}-{source|target}`.
   - Never rename or alter this format; doing so breaks edge connections in existing saved diagrams.

---

## 2. React 19 & Component Conventions

1. **Component Purity:**
   - Keep React Flow nodes and edges performant. Avoid heavy calculations during drag events.
   - Memoize expensive graph traversals with `useMemo`.
2. **Hook Integrity:**
   - Follow React Hooks rules strictly. Do not conditionally call hooks.
   - For auto-save or debounced side effects, clean up timeouts on unmount (`useAutoSave.ts`).
3. **Client Directives:**
   - All interactive UI components in the App Router must include `'use client';` at the top of the file.

---

## 3. Design System ("Studio") & Styling Tokens

1. **Token Hierarchy:**
   - Tokens live in `src/styles/tokens.css` (OKLCH color space).
   - Tailwind maps these to utilities: `bg`, `paper`, `ink`, `ink-2`, `ink-3`, `line`, `line-2`, `accent`, `accent-ink`, `dots`, `ok`, `warn`, `danger`.
2. **Forbidden Colors:**
   - **NEVER** use Tailwind's default palette (`gray-*`, `slate-*`, `zinc-*`, `blue-500`, etc.) in application chrome.
   - **NEVER** use default shadcn names (`muted`, `primary`, `destructive`, `bg-card`).
3. **Theme Handling:**
   - Theme is managed via the `data-theme` attribute on `<html>` (`dark` or `light`).
   - Use `dark:` variants targeting the attribute.
4. **Component Styling Rules:**
   - All interactive controls are rounded pills.
   - Node component colors (from `node-registry.ts`) apply only to the icon, its tinted chip (`tint(color)`), and minimap. Node backgrounds remain neutral `bg-paper`.
