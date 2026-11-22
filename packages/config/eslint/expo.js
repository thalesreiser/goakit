// Flat config for Expo apps, built on Expo's official config.
const expo = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier/flat');
const { defineConfig, globalIgnores } = require('eslint/config');
const ignores = require('./ignores');

module.exports = defineConfig([
  globalIgnores(ignores),
  expo,
  // Last: turns off stylistic rules that would conflict with Prettier.
  prettier,
]);
