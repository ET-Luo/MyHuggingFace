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
    // Tauri / Rust build outputs (generated)
    "src-tauri/target/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Too strict for common client-side patterns (e.g. IDs/timestamps in event handlers and init code)
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
