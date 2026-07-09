import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// Same typing convention as the backend: `interface` only for contracts/ports
// (files named `*.port.ts`), `type` for everything else.
export default tseslint.config(
  {
    ignores: ['node_modules/**', '.expo/**', 'babel.config.js', 'jest.config.js', 'jest.setup.js', 'eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.port.ts'],
    rules: { '@typescript-eslint/consistent-type-definitions': ['error', 'interface'] },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/testUtils.tsx'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
