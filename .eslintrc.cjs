const customRules = require('./.eslintrc.custom-rules.js');

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', '.eslintrc.custom-rules.js'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'local-rules'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Custom rule to prevent hardcoded colors
    'local-rules/no-hardcoded-colors': 'warn',
  },
  // Register local rules
  overrides: [
    {
      files: ['src/**/*.{ts,tsx,js,jsx}'],
      excludedFiles: [
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        '**/theme*.{ts,tsx,js,jsx}',
        '**/colors*.{ts,tsx,js,jsx}',
        'tailwind.config.js'
      ],
      rules: {
        // Apply the no-hardcoded-colors rule to component files
        'no-restricted-syntax': [
          'warn',
          {
            selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
            message: 'Avoid hardcoded hex colors. Use theme tokens from hsl(var(--token)) instead.',
          },
          {
            selector: 'TemplateLiteral[value=/rgba?\\(/]',
            message: 'Avoid hardcoded RGB colors. Use theme tokens from hsl(var(--token)) instead.',
          },
        ],
      },
    },
  ],
}
