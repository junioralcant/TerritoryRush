import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Typing convention (techspec "Convenção de tipagem"):
 *   - `interface` is reserved for contracts / ports that classes implement
 *     (`*Service`, `*Repository`, `*Client`, `*Gateway`). These live in `*.port.ts`.
 *   - Every other type declaration (domain models, DTOs, request/response,
 *     job payloads, string unions/enums) MUST use `type`.
 *
 * We enforce `consistent-type-definitions: 'type'` globally so that declaring a
 * model/DTO with `interface` fails lint, and relax it only for `*.port.ts`,
 * where contracts are allowed to be interfaces.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.port.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.int-spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
