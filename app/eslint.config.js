import globals from 'globals';

// Catches the mistakes that matter in this codebase (undefined names, e.g. a
// missing import after moving code between modules). Style is not enforced.
export default [
  { ignores: ['dist/**', 'tools/port/out/**', 'tools/verify/out/**'] },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    rules: { 'no-undef': 'error', 'no-dupe-keys': 'error', 'no-redeclare': 'error', 'no-const-assign': 'error', 'no-unreachable': 'error' }
  },
  { files: ['tools/**', 'tests/**', '*.config.js'], languageOptions: { globals: { ...globals.node } } }
];
