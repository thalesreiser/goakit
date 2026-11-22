import 'reflect-metadata';
import type { LogLevel as NestLogLevel } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import type { AppConfig, LogLevel } from './config/config';
import { loadConfig } from './config/config';

/** Prefix for every business route. Health stays outside it. */
export const API_PREFIX = 'v1';

const LEVEL_ORDER = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
const NEST_LEVEL: Record<(typeof LEVEL_ORDER)[number], NestLogLevel> = {
  fatal: 'fatal',
  error: 'error',
  warn: 'warn',
  info: 'log',
  debug: 'debug',
  trace: 'verbose',
};

/** Maps `LOG_LEVEL` to the Nest logger levels it enables (`false` = silent). */
export function nestLogLevels(level: LogLevel): NestLogLevel[] | false {
  if (level === 'silent') return false;
  return LEVEL_ORDER.slice(0, LEVEL_ORDER.indexOf(level) + 1).map((name) => NEST_LEVEL[name]);
}

/**
 * Validates the configuration, then builds the Nest application on Fastify.
 * Throws `ConfigValidationError` before creating anything if the environment
 * is invalid.
 */
export async function createApp(
  env: Readonly<Record<string, string | undefined>>,
): Promise<{ app: NestFastifyApplication; config: AppConfig }> {
  const config = loadConfig(env);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(config),
    new FastifyAdapter(),
    { logger: nestLogLevels(config.logLevel), abortOnError: false },
  );
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.enableShutdownHooks();
  return { app, config };
}
