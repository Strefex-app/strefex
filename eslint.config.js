import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'

/** CI lint scope — expand gradually to full `src/` once baseline is clean. */
export const lintCiPaths = [
  'src/utils/loginErrors.js',
  'src/utils/spreadsheet.js',
  'src/utils/devLog.js',
  'src/hooks/useAuditProDemoKitVisible.js',
  'src/components/AuthPageShell.jsx',
  'src/components/AuthPageBackdrop.jsx',
  'src/test/superadminAuth.test.js',
  'src/test/loginErrors.test.js',
  'src/test/useAuditProDemoKitVisible.test.js',
]

export default [
  { ignores: ['dist/**', 'node_modules/**', 'backend/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react },
    settings: { react: { version: '18.2' } },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
]
