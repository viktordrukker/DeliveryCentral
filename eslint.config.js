const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const prettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...prettier.rules,
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      // `no-explicit-any` is a guideline, not a hard rule for this codebase.
      // Several legitimate `any` uses exist (Prisma client dynamic-table access
      // in seeds, large literal dataset arrays). Keeping it as `warn` surfaces
      // the issue in editor + CI output without blocking CI on inherited debt.
      // Goal is to drive the warning count down over time; if it ever hits zero
      // on its own, promote back to `error`.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
];
