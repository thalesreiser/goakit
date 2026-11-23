import { AsyncLocalStorage } from 'node:async_hooks';
import type { FastifyAdapter } from '@nestjs/platform-fastify';
import type { LogLevel } from '../config/config';
import { REQUEST_ID_HEADER } from './request-id';

/** The pino logger Fastify creates, and the child it binds to each request. */
export type Log = Parameters<FastifyAdapter['getRequestMethod']>[0]['log'];

/** Where log lines go: one JSON document per line. Defaults to stdout. */
export interface LogDestination {
  write(line: string): void;
}

/** Route of `GET /health`, logged at `debug` so probes do not flood the logs. */
export const HEALTH_ROUTE = '/health';

/**
 * Fields removed from every log line, at the top level or one level deep, as
 * a safety net: request lines never include them, but a future
 * `log.info({ request })` must not leak credentials or user content either.
 */
export const REDACTED_PATHS = ['headers', 'body', 'query', 'params', 'authorization', 'cookie'];

const requestLogs = new AsyncLocalStorage<Log>();

/** The logger of the request being handled, which adds its `reqId`, if any. */
export function currentRequestLog(): Log | undefined {
  return requestLogs.getStore();
}

/**
 * Options for Fastify's built-in pino logger. The request and reply
 * serializers keep only the method, the route pattern and the status code, so
 * the URL (with its query string), the headers and the client address never
 * reach the logs.
 */
export function loggerOptions(level: LogLevel, destination?: LogDestination) {
  return {
    level,
    ...(destination ? { stream: destination } : {}),
    serializers: {
      req: (request: { method?: string; routeOptions?: { url?: string } }) => ({
        method: request.method,
        route: request.routeOptions?.url,
      }),
      res: (reply: { statusCode?: number }) => ({ statusCode: reply.statusCode }),
    },
    redact: {
      paths: REDACTED_PATHS.flatMap((path) => [path, `*.${path}`]),
      remove: true,
    },
  };
}

/** Level of the request line: `error` for 5xx, `debug` for health probes. */
export function requestLogLevel(
  route: string | null,
  statusCode: number,
): 'error' | 'debug' | 'info' {
  if (statusCode >= 500) return 'error';
  return route === HEALTH_ROUTE ? 'debug' : 'info';
}

/**
 * Echoes the request id in the `X-Request-Id` response header, makes the
 * request's logger the current one for Nest code (so `Logger` lines carry the
 * `reqId` too), and writes one line per request when the response is sent:
 * method, route pattern, status code and response time. Bodies, headers and
 * the query string are never logged.
 */
export function installRequestLogging(adapter: FastifyAdapter): void {
  const fastify = adapter.getInstance();

  fastify.addHook('onRequest', (request, reply, done) => {
    reply.header(REQUEST_ID_HEADER, request.id);
    requestLogs.run(request.log, done);
  });

  // Entered again once the body is parsed: stream callbacks may run outside
  // the context `onRequest` started.
  fastify.addHook('preValidation', (request, _reply, done) => {
    requestLogs.run(request.log, done);
  });

  fastify.addHook('onResponse', (request, reply, done) => {
    const route = request.routeOptions.url ?? null;
    request.log[requestLogLevel(route, reply.statusCode)](
      {
        method: request.method,
        route,
        statusCode: reply.statusCode,
        responseTime: Math.round(reply.elapsedTime * 10) / 10,
      },
      'request completed',
    );
    done();
  });
}
