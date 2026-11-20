// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // .claude/ holds agent skills (e.g. Impeccable's minified browser scripts), not app code.
    ignores: ['dist/*', '.claude/**'],
  },
]);
