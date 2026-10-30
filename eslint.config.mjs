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
    "apps/**/dist/**",
    "packages/**/dist/**",
    "dist-electron/**",
    "scratch/**",
    "next-env.d.ts",
    "apps/**/next-env.d.ts",
    ".playwright-mcp/**",
    ".agents/**",
    "**/node_modules/**",
    "apps/api/authentication/**",
    "graphify-out/**",
  ]),
  {
    settings: {
      next: {
        rootDir: "apps/web/",
      },
    },
  },
  {
    files: ["tests/**/*.ts", "**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);

export default eslintConfig;
