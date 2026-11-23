import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import type { AppConfig } from './config/config';
import { loadConfig } from './config/config';
import { JsonLogger } from './logging/json-logger';
import type { LogDestination } from './logging/logging';
import { installRequestLogging, loggerOptions } from './logging/logging';
import { REQUEST_ID_HEADER, resolveRequestId } from './logging/request-id';

/** Prefix for every business route. Health stays outside it. */
export const API_PREFIX = 'v1';

export interface CreateAppOptions {
  /** Where JSON log lines go; stdout by default. Tests pass a capture. */
  logDestination?: LogDestination;
}

/**
 * Validates the configuration, then builds the Nest application on Fastify.
 * Throws `ConfigValidationError` before creating anything if the environment
 * is invalid.
 */
export async function createApp(
  env: Readonly<Record<string, string | undefined>>,
  options: CreateAppOptions = {},
): Promise<{ app: NestFastifyApplication; config: AppConfig }> {
  const config = loadConfig(env);
  const adapter = new FastifyAdapter({
    logger: loggerOptions(config.logLevel, options.logDestination),
    // The id is validated here instead of trusting the header as is.
    requestIdHeader: false,
    genReqId: (request: { headers: Readonly<Record<string, unknown>> }) =>
      resolveRequestId(request.headers[REQUEST_ID_HEADER]),
    // Replaced by the request line of `installRequestLogging`, which logs the
    // route pattern instead of the URL and its query string.
    disableRequestLogging: true,
  });
  installRequestLogging(adapter);

  const app = await NestFactory.create<NestFastifyApplication>(AppModule.forRoot(config), adapter, {
    logger: new JsonLogger(adapter.getInstance().log),
    abortOnError: false,
  });
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.enableShutdownHooks();
  return { app, config };
}
