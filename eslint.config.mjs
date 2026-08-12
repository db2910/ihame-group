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
    // Prisma's generated client — not source we own or want linted.
    "src/generated/**",
    // Claude Design's exported prototype bundle — reference material, not
    // production code (see dashboard-and-login-ui-design/README.md).
    "dashboard-and-login-ui-design/**",
  ]),
]);

export default eslintConfig;
