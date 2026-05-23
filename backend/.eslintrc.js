// backend/.eslintrc.js
//
// Phase 0.5 hardening — ESLint rules that enforce:
//   1. next(error) instead of res.status(500).json()  [Threat 1]
//   2. successResponse/errorResponse instead of res.json() [Threat 4]
//
// Install ESLint if not already present:
//   npm install --save-dev eslint
//
// Run:
//   npx eslint controllers/        (check controllers only)
//   npx eslint controllers/ --fix  (auto-fix what it can)

module.exports = {
  env: {
    node:   true,
    es2021: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 2021 },
  rules: {
    // ── Threat 1: Force next(error) for 500-level errors ──────────────────
    // Prevents controllers from calling res.status(500).json() directly,
    // which bypasses the global errorHandler and leaks internals to clients.
    'no-restricted-syntax': [
      'error',

      // Fix 1: catches res.status(500) followed by ANY method (.json, .send, .end, etc.)
      {
        selector:
          "CallExpression[callee.object.type='CallExpression']" +
          "[callee.object.callee.property.name='status']" +
          "[callee.object.arguments.0.value=500]",
        message:
          "Do not manually send 500 responses. Pass the error to next(error) " +
          "so the global errorHandler handles it cleanly.",
      },

      // Fix 2: blocks bare res.json() but NOT res.status(X).json() chains
      // The :not() excludes calls where res is already a chained status() result
      {
        selector:
          "CallExpression[callee.object.name='res'][callee.property.name='json']" +
          ":not(CallExpression[callee.object.type='CallExpression'])",
        message:
          "Do not use res.json() directly. " +
          "Use successResponse() or errorResponse() from utils/response.js.",
      },
    ],

    // Standard hygiene
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',   
  },

  // Only lint controllers and routes — not node_modules or config files
  ignorePatterns: ['node_modules/', 'logs/', '*.config.js'],
};
