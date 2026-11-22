// Import boundaries between workspaces (EST-01.5). Add one preset to a
// workspace's eslint.config.js after its base config:
//
//   apps/*            -> boundaries.app
//   packages/domain   -> boundaries.domain
//   other packages/*  -> boundaries.package
//
// Each preset owns the `no-restricted-imports` rule. ESLint replaces a rule's
// options instead of merging them, so a workspace that needs extra
// restrictions must spread the exported lists into its own entry rather than
// configure the rule a second time.
const noCrossWorkspaceImports = require('./rules/no-cross-workspace-imports');

const DOCS = 'See "Package boundaries" in AGENTS.md.';

// Package names of the apps. Keep in sync with apps/*/package.json.
const APP_PACKAGES = ['@goakit/api', '@goakit/mobile', '@goakit/web'];

const plugin = {
  meta: { name: '@goakit/eslint-boundaries' },
  rules: { 'no-cross-workspace-imports': noCrossWorkspaceImports },
};

// Matches a module name and any of its subpaths, for example `react` and
// `react/jsx-runtime`, but not `react-native` or `./react`.
const moduleRegex = (names) =>
  `^(${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(/.*)?$`;

const appImportPatterns = (who) => [
  {
    regex: moduleRegex(APP_PACKAGES),
    caseSensitive: true,
    message: `${who} must not import an app. Move shared code to a package under packages/. ${DOCS}`,
  },
];

// Everything packages/domain must not depend on: it holds pure TypeScript
// rules shared by the mobile app and the API and runs offline on the phone.
const domainImportPatterns = [
  {
    regex:
      '^(react|react-dom|react-native|next|expo|nativewind|tailwind-variants|react-aria|react-stately)(/.*)?$|^react-native-|^expo-|^@(expo|react-native|react-native-community|gluestack-ui|gluestack-style|legendapp)/',
    caseSensitive: true,
    message: `packages/domain must stay free of UI code (React, React Native, Expo, Next.js, UI kits). Keep UI in the apps and pass plain data in. ${DOCS}`,
  },
  {
    regex:
      '^(axios|ky|got|node-fetch|cross-fetch|isomorphic-fetch|undici|superagent|ofetch|ws|socket\\.io-client|graphql-request)(/.*)?$|^@(apollo|trpc)/',
    caseSensitive: true,
    message: `packages/domain must not do networking (HTTP clients, sockets, API clients). Call the network from an app and pass the result to the domain function. ${DOCS}`,
  },
  {
    regex:
      '^(fastify|express|firebase|drizzle-orm|drizzle-kit|pg|postgres|better-sqlite3)(/.*)?$|^@(nestjs|fastify|aws-sdk|google-cloud|supabase|firebase|react-native-async-storage)/',
    caseSensitive: true,
    message: `packages/domain must not depend on server frameworks, SDKs or storage. Keep these behind adapters in the apps. ${DOCS}`,
  },
  {
    regex:
      '^(node:)?(fs|http|https|http2|net|tls|dgram|dns|child_process|cluster|worker_threads)(/.*)?$',
    caseSensitive: true,
    message: `packages/domain runs on the phone and must not use Node.js I/O modules. ${DOCS}`,
  },
];

const domainRestrictedGlobals = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'localStorage',
  'sessionStorage',
  'indexedDB',
].map((name) => ({
  name,
  message: `packages/domain must not do networking or storage through the global '${name}'. ${DOCS}`,
}));

const preset = (name, patterns, extraRules = {}) => [
  {
    name: `@goakit/config/boundaries/${name}`,
    plugins: { '@goakit': plugin },
    rules: {
      'no-restricted-imports': ['error', { patterns }],
      '@goakit/no-cross-workspace-imports': 'error',
      ...extraRules,
    },
  },
];

module.exports = {
  app: preset('app', appImportPatterns('An app')),
  package: preset('package', appImportPatterns('A package')),
  domain: preset('domain', [...appImportPatterns('A package'), ...domainImportPatterns], {
    'no-restricted-globals': ['error', ...domainRestrictedGlobals],
  }),
  plugin,
  APP_PACKAGES,
  appImportPatterns,
  domainImportPatterns,
  domainRestrictedGlobals,
};
