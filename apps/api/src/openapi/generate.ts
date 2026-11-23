import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createApp } from '../app';
import { createOpenApiDocument } from './document';

/**
 * Writes the OpenAPI document to `dist/openapi.json` (`pnpm --filter
 * @goakit/api run openapi`, after `build`). It builds the application without
 * listening on a port, so it needs no running server and no real environment.
 */
async function generate(): Promise<string> {
  const { app } = await createApp({ NODE_ENV: 'production', PORT: '3000', LOG_LEVEL: 'error' });
  try {
    const output = join(__dirname, '..', 'openapi.json');
    await writeFile(output, `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`);
    return output;
  } finally {
    await app.close();
  }
}

generate().then(
  (output) => process.stdout.write(`OpenAPI document written to ${output}\n`),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
