import base from '@goakit/config/eslint/base';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  base,
  {
    languageOptions: {
      parserOptions: {
        // Lets `consistent-type-imports` keep value imports of classes used in
        // decorated constructors, which NestJS needs at runtime for injection.
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
  },
]);
