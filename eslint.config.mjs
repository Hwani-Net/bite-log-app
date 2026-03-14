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
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Firebase build artifacts
    ".firebase/**",
    // Build utility scripts (CommonJS)
    "resize_assets.js",
    "resize_real.js",
    "resize_tablet.js",
    // Temporary files
    "temp_old_page.tsx",
  ]),
]);

export default eslintConfig;
