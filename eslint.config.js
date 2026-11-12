// Lint for real defects, not style: formatting belongs to Prettier.
// TypeScript files (Convex wrappers, schema, route config) are type-checked by
// `npm run typecheck:convex` and the build, so ESLint reads JavaScript only.
// Existing findings are recorded in tests/lint-baseline.json and may only go
// down; see scripts/lint-ratchet.mjs.
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      'dist/**',
      'build/**',
      '.react-router/**',
      'public/**',
      'work/**',
      'convex/_generated/**',
      '**/*.generated.*',
      'config/mcp/hasib-contracts.js',
      '**/*.ts',
      // Agent tooling, not application code
      '.*/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
    rules: {
      // Input sanitisers strip control characters on purpose.
      'no-control-regex': 'off',
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }],
    },
  },
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  { files: ['src/**/*worker*.js'], languageOptions: { globals: { ...globals.worker } } },
  // Playwright suites and audits run callbacks inside the page (page.evaluate).
  {
    files: ['tests/**/*browser*.mjs', 'tests/helpers/**/*.mjs', 'scripts/**/*.mjs', 'playbook/**/*.mjs'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
];
