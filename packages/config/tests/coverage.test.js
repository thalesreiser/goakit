const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { COVERAGE_THRESHOLDS, coverage } = require('../vitest/coverage');

describe('coverage preset', () => {
  it('applies the layer minimum to every metric', () => {
    for (const [layer, minimum] of Object.entries(COVERAGE_THRESHOLDS)) {
      assert.deepEqual(coverage(layer).thresholds, {
        lines: minimum,
        statements: minimum,
        functions: minimum,
        branches: minimum,
      });
    }
  });

  it('keeps the per-layer bars of EST-02.2', () => {
    assert.deepEqual({ ...COVERAGE_THRESHOLDS }, { domain: 90, api: 80, app: 70 });
  });

  it('measures src/ by default and takes the package scope', () => {
    assert.deepEqual(coverage('domain').include, ['src/**/*.ts']);
    const scoped = coverage('api', { exclude: ['src/main.ts'] });
    assert.deepEqual(scoped.exclude, ['src/main.ts']);
    assert.equal(scoped.enabled, true);
  });

  it('rejects an unknown layer instead of measuring without a bar', () => {
    assert.throws(() => coverage('web'), /Unknown coverage layer "web"/);
  });
});
