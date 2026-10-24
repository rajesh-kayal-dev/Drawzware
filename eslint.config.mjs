import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "apps/**/.next/**",
    "out/**",
    "apps/**/out/**",
    "build/**",
    "dist/**",
    "packages/**/dist/**",
    "dist-electron/**",
    "scratch/**",
    "next-env.d.ts",
    "apps/**/next-env.d.ts",
    ".playwright-mcp/**",
    ".agents/**",
  ]),
  {
    settings: {
      next: {
        rootDir: "apps/web/",
      },
    },
  },
]);

export default eslintConfig;
