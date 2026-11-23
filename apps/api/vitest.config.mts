import { coverage } from '@goakit/config/vitest/coverage';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC instead of Vite's default transform: it emits the decorator metadata
  // NestJS needs for dependency injection (read from tsconfig.json).
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Every `vitest run` measures coverage and fails below the API minimum
    // (80%). The entry points only start the process or write the OpenAPI
    // file; what they call is covered through createApp().
    coverage: coverage('api', { exclude: ['src/main.ts', 'src/openapi/generate.ts'] }),
  },
});
