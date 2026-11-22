// Flat config for plain TypeScript packages (no React Native).
const js = require('@eslint/js');
const prettier = require('eslint-config-prettier/flat');
const { defineConfig, globalIgnores } = require('eslint/config');
const tseslint = require('typescript-eslint');
const ignores = require('./ignores');

module.exports = defineConfig([
  globalIgnores(ignores),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  // Last: turns off stylistic rules that would conflict with Prettier.
  prettier,
]);
