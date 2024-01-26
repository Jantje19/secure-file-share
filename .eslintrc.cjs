module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module',
    ecmaVersion: 2021,
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    es6: true,
    node: true,
    browser: true,
    serviceworker: true,
    worker: true,
    commonjs: true,
    es2021: true,
    jest: true,
  },
  extends: 'eslint-config-duodeka',
  // NOTE: Specifically empty
  //  New rules should be added to the eslint-config-duodeka repository
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
  settings: {
    react: {
      version: '17.0.2',
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
    },
  },
};
