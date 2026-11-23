export declare const COVERAGE_THRESHOLDS: Readonly<{
  domain: 90;
  api: 80;
  app: 70;
}>;

export type CoverageLayer = keyof typeof COVERAGE_THRESHOLDS;

export interface CoverageScope {
  /** Files measured. Default: `src/**\/*.ts`. */
  include?: string[];
  /** Files left out of the measurement. */
  exclude?: string[];
}

export declare function coverage(
  layer: CoverageLayer,
  scope?: CoverageScope,
): {
  enabled: true;
  provider: 'v8';
  include: string[];
  exclude: string[];
  reporter: ['text', 'json-summary', 'lcov'];
  reportsDirectory: 'coverage';
  thresholds: { lines: number; statements: number; functions: number; branches: number };
};
