// Minimum test coverage per layer (EST-02.2). Every Vitest workspace builds
// its `test.coverage` options from here, so CI fails when a package drops
// below its layer's bar. apps/mobile runs on the Node.js test runner instead
// and repeats the `app` value in its `test` script flags; keep them in sync.
const COVERAGE_THRESHOLDS = Object.freeze({
  // packages/domain: pure rules shared by the app and the API.
  domain: 90,
  // apps/api.
  api: 80,
  // apps/mobile and apps/web.
  app: 70,
});

/**
 * Vitest coverage options for one layer: V8 provider, enabled on every
 * `vitest run`, text output in the log plus `coverage/lcov.info` and
 * `coverage/coverage-summary.json`, and the layer's minimum for lines,
 * statements, functions and branches.
 *
 * @param {keyof typeof COVERAGE_THRESHOLDS} layer
 * @param {{ include?: string[], exclude?: string[] }} [scope] Files measured
 *   (default `src/**\/*.ts`) and files left out (entry points that only wire
 *   the process, generated code).
 */
function coverage(layer, { include = ['src/**/*.ts'], exclude = [] } = {}) {
  const minimum = COVERAGE_THRESHOLDS[layer];
  if (minimum === undefined) {
    throw new Error(
      `Unknown coverage layer "${layer}"; use one of: ${Object.keys(COVERAGE_THRESHOLDS).join(', ')}`,
    );
  }
  return {
    enabled: true,
    provider: 'v8',
    include,
    exclude,
    reporter: ['text', 'json-summary', 'lcov'],
    reportsDirectory: 'coverage',
    thresholds: {
      lines: minimum,
      statements: minimum,
      functions: minimum,
      branches: minimum,
    },
  };
}

module.exports = { COVERAGE_THRESHOLDS, coverage };
