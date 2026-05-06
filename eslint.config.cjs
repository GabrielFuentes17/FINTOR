const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/**', 'src/output.css'],
  },
  js.configs.recommended,
  {
    files: ['src/main.js', 'src/preload.js', 'src/db.js', 'src/auth/**/*.js', 'src/login/auth-db.js', 'src/src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
      'no-redeclare': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/login/login.js', 'src/login/home.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/tabs.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
    },
  },
];
