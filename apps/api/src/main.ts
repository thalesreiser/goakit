import { createApp } from './app';
import { ConfigValidationError } from './config/config';

async function bootstrap(): Promise<void> {
  const { app, config } = await createApp(process.env);
  await app.listen(config.port, config.host);
}

bootstrap().catch((error: unknown) => {
  if (error instanceof ConfigValidationError) {
    // Fail fast with a readable message instead of a stack trace.
    process.stderr.write(`${error.message}\n`);
  } else {
    console.error(error);
  }
  process.exit(1);
});
