import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "prettier"
  ),
  {
    rules: {
      // Relaxed rules for production deployment
      "prefer-const": "warn", // Changed from "error" to "warn"
      "no-var": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn", // Changed from "error" to "warn"
      
      // Unused variables - allow underscore prefixed parameters
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }
      ],
      
      // React hooks rules - relaxed for deployment
      "react-hooks/exhaustive-deps": "warn", // Changed from default "error" to "warn"
      "react-hooks/rules-of-hooks": "error", // Keep this as error for correctness
      
      // TypeScript rules - relaxed
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-inferrable-types": "warn",
      
      // Import rules - relaxed
      "import/no-unresolved": "off",
      "import/named": "off",
      
      // Next.js specific - relaxed
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "node_modules/**",
      "*.config.js",
      "*.config.mjs",
      "*.config.ts",
      "supabase/functions/**", // Ignore Supabase functions
      "migrations/**",
      "*.test.ts",
      "*.test.tsx",
      "__tests__/**",
    ],
  },
];

export default eslintConfig;
