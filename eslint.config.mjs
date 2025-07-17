import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // ...compat.extends("next/core-web-vitals", "next/typescript"),
  // ...compat.extends("prettier"),
  {
    rules: {
      // // TypeScript specific rules
      // "@typescript-eslint/no-unused-vars": ["warn", { 
      //   argsIgnorePattern: "^_",
      //   varsIgnorePattern: "^_" 
      // }],
      // "@typescript-eslint/no-explicit-any": "warn",
      // // "@typescript-eslint/prefer-const": "error",
      // "prefer-const": "error",

      // // React specific rules
      // "react/prop-types": "off",
      // "react/react-in-jsx-scope": "off",
      // "react-hooks/exhaustive-deps": "warn",

      // // General code quality rules
      // "no-console": "warn",
      // "prefer-const": "error",
      // "no-var": "error",

      // // Import organization
      // "import/order": [
      //   "warn",
      //   {
      //     groups: [
      //       "builtin",
      //       "external",
      //       "internal",
      //       "parent",
      //       "sibling",
      //       "index"
      //     ],
      //     "newlines-between": "never",
      //     alphabetize: {
      //       order: "asc",
      //       caseInsensitive: true
      //     }
      //   }
      // ]
    }
  }
];

export default eslintConfig;
