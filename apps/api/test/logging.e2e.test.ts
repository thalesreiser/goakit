import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { JsonLogger } from '../src/logging/json-logger';
import { loggerOptions, requestLogLevel } from '../src/logging/logging';
import { MAX_REQUEST_ID_LENGTH, resolveRequestId } from '../src/logging/request-id';

type LogRecord = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LEVEL = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

/** Collects the JSON lines the app writes, instead of printing them. */
function captureLogs() {
  const lines: string[] = [];
  return {
    destination: {
      write: (line: string) => {
        lines.push(line);
      },
    },
    text: () => lines.join(''),
    records: () => lines.map((line) => JSON.parse(line) as LogRecord),
    requestLines: () =>
      lines
        .map((line) => JSON.parse(line) as LogRecord)
        .filter((record) => record['msg'] === 'request completed'),
  };
}

type Logs = ReturnType<typeof captureLogs>;

let app: NestFastifyApplication | undefined;

async function startApp(
  logLevel: string,
  configure?: (created: NestFastifyApplication) => void,
): Promise<{ server: NestFastifyApplication; logs: Logs }> {
  const logs = captureLogs();
  const created = await createApp(
    { NODE_ENV: 'test', PORT: '3000', LOG_LEVEL: logLevel },
    { logDestination: logs.destination },
  );
  app = created.app;
  configure?.(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return { server: app, logs };
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('request log line', () => {
  it('is one JSON line with the request id, method, route, status and response time', async () => {
    const { server, logs } = await startApp('info');
    const response = await server.inject({
      method: 'POST',
      url: '/v1/echo?uppercase=false',
      payload: { message: 'oi' },
    });

    const requestId = response.headers['x-request-id'];
    expect(requestId).toMatch(UUID);
    expect(logs.text().endsWith('\n')).toBe(true);
    const lines = logs.requestLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual({
      level: LEVEL.info,
      time: expect.any(Number),
      pid: expect.any(Number),
      hostname: expect.any(String),
      reqId: requestId,
      method: 'POST',
      route: '/v1/echo',
      statusCode: 200,
      responseTime: expect.any(Number),
      msg: 'request completed',
    });
  });

  it('never contains bodies, query strings, path values or credentials, even for errors', async () => {
    const { server, logs } = await startApp('trace');
    const secrets = {
      authorization: 'Bearer token-a1b2c3',
      cookie: 'session=cookie-d4e5f6',
    };
    await server.inject({
      method: 'POST',
      url: '/v1/echo?uppercase=true&tripStart=2031-07-04',
      headers: secrets,
      payload: { message: 'Lista da Marina: protetor solar' },
    });
    await server.inject({
      method: 'POST',
      url: '/v1/echo?tripEnd=2031-07-09',
      headers: secrets,
      payload: { message: 'Lista da Marina: protetor solar', repeat: 9 },
    });
    await server.inject({
      method: 'POST',
      url: '/v1/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{"message":"Lista da Marina',
    });
    await server.inject({ method: 'GET', url: '/v1/lists/marina-festival-2031?token=t0k3n' });

    expect(logs.requestLines().map((line) => [line['route'], line['statusCode']])).toEqual([
      ['/v1/echo', 200],
      ['/v1/echo', 400],
      ['/v1/echo', 400],
      [null, 404],
    ]);
    const text = logs.text();
    for (const leak of [
      'Marina',
      'protetor',
      'tripStart',
      'tripEnd',
      '2031-07-04',
      '2031-07-09',
      'marina-festival',
      'uppercase',
      't0k3n',
      'token-a1b2c3',
      'cookie-d4e5f6',
      'remoteAddress',
    ]) {
      expect(text).not.toContain(leak);
    }
  });

  it('logs GET /health at debug, so the default level skips probes', async () => {
    const quiet = await startApp('info');
    await quiet.server.inject({ method: 'GET', url: '/health' });
    expect(quiet.logs.requestLines()).toEqual([]);
    await quiet.server.close();

    const verbose = await startApp('debug');
    await verbose.server.inject({ method: 'GET', url: '/health' });
    expect(verbose.logs.requestLines()).toEqual([
      expect.objectContaining({ level: LEVEL.debug, route: '/health', statusCode: 200 }),
    ]);
  });

  it('writes nothing when LOG_LEVEL is silent', async () => {
    const { server, logs } = await startApp('silent');
    await server.inject({ method: 'POST', url: '/v1/echo', payload: { message: 'oi' } });
    expect(logs.text()).toBe('');
  });
});

describe('unexpected errors', () => {
  it('log the error with the request id of the response header and Problem Details', async () => {
    const { server, logs } = await startApp('info', (created) =>
      created.useGlobalInterceptors({
        intercept() {
          throw new Error('connect ECONNREFUSED db.internal:5432');
        },
      }),
    );
    const response = await server.inject({
      method: 'POST',
      url: '/v1/echo',
      payload: { message: 'oi' },
    });

    expect(response.statusCode).toBe(500);
    const requestId = response.headers['x-request-id'];
    expect(requestId).toMatch(UUID);
    expect(response.json()).toMatchObject({ status: 500, requestId });

    const errorLine = logs.records().find((record) => record['context'] === 'ProblemDetails');
    expect(errorLine).toMatchObject({
      level: LEVEL.error,
      reqId: requestId,
      msg: 'connect ECONNREFUSED db.internal:5432',
      err: { type: 'Error', message: 'connect ECONNREFUSED db.internal:5432' },
    });
    expect(errorLine?.['err']).toHaveProperty('stack', expect.stringContaining('Error: connect'));
    expect(logs.requestLines()).toEqual([
      expect.objectContaining({ level: LEVEL.error, reqId: requestId, statusCode: 500 }),
    ]);
  });
});

describe('request id', () => {
  it('propagates a valid incoming X-Request-Id to the response, Problem Details and logs', async () => {
    const { server, logs } = await startApp('info');
    const incoming = 'edge-01.Req_42';
    const response = await server.inject({
      method: 'GET',
      url: '/v1/nothing-here',
      headers: { 'x-request-id': incoming },
    });

    expect(response.headers['x-request-id']).toBe(incoming);
    expect(response.json()).toMatchObject({ status: 404, requestId: incoming });
    expect(logs.requestLines()).toEqual([expect.objectContaining({ reqId: incoming })]);
  });

  it.each([
    ['contains spaces', 'id with spaces'],
    ['contains markup', '<script>alert(1)</script>'],
    ['is too long', 'a'.repeat(MAX_REQUEST_ID_LENGTH + 1)],
    ['is empty', ''],
  ])('replaces an incoming X-Request-Id that %s', async (_reason, incoming) => {
    const { server, logs } = await startApp('info');
    const response = await server.inject({
      method: 'POST',
      url: '/v1/echo',
      headers: { 'x-request-id': incoming },
      payload: { message: 'oi' },
    });

    const requestId = response.headers['x-request-id'];
    expect(requestId).toMatch(UUID);
    expect(logs.requestLines()).toEqual([expect.objectContaining({ reqId: requestId })]);
    if (incoming !== '') expect(logs.text()).not.toContain(incoming);
  });

  it('gives each request its own id', async () => {
    const { server } = await startApp('silent');
    const first = await server.inject({ method: 'GET', url: '/health' });
    const second = await server.inject({ method: 'GET', url: '/health' });
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
  });
});

describe('resolveRequestId', () => {
  it('keeps a valid id and replaces anything else', () => {
    expect(resolveRequestId('a'.repeat(MAX_REQUEST_ID_LENGTH))).toBe('a'.repeat(128));
    expect(resolveRequestId(['one', 'two'])).toMatch(UUID);
    expect(resolveRequestId(undefined)).toMatch(UUID);
  });
});

describe('Nest logger', () => {
  it('writes Nest application lines as JSON with their context and no request id', async () => {
    const { logs } = await startApp('info');
    const started = logs.records().find((record) => record['context'] === 'NestApplication');
    expect(started).toMatchObject({ level: LEVEL.info, msg: expect.any(String) });
    expect(started).not.toHaveProperty('reqId');
  });

  it('maps every Nest level and message shape onto pino', async () => {
    const { server, logs } = await startApp('trace');
    const logger = new JsonLogger(server.getHttpAdapter().getInstance().log);
    const before = logs.records().length;

    logger.fatal('fatal message', 'Test');
    logger.error('error message', 'Error: boom\n    at x (y.ts:1:1)', 'Test');
    logger.warn({ listCount: 3 }, 'Test');
    logger.log('plain message');
    logger.debug(42, 'Test');
    logger.verbose('verbose message', 'Test');
    new Logger('Scoped').warn('scoped message');

    expect(logs.records().slice(before)).toEqual([
      expect.objectContaining({ level: LEVEL.fatal, context: 'Test', msg: 'fatal message' }),
      expect.objectContaining({
        level: LEVEL.error,
        context: 'Test',
        stack: 'Error: boom\n    at x (y.ts:1:1)',
        msg: 'error message',
      }),
      expect.objectContaining({ level: LEVEL.warn, context: 'Test', listCount: 3 }),
      expect.objectContaining({ level: LEVEL.info, msg: 'plain message' }),
      expect.objectContaining({ level: LEVEL.debug, context: 'Test', msg: '42' }),
      expect.objectContaining({ level: LEVEL.trace, context: 'Test', msg: 'verbose message' }),
      expect.objectContaining({ level: LEVEL.warn, context: 'Scoped', msg: 'scoped message' }),
    ]);
  });
});

describe('logger options', () => {
  it('serialize requests and replies without URL, headers or client address', () => {
    const { serializers, redact } = loggerOptions('info');
    expect(serializers.req({ method: 'GET', routeOptions: { url: '/v1/lists/:id' } })).toEqual({
      method: 'GET',
      route: '/v1/lists/:id',
    });
    expect(serializers.res({ statusCode: 204 })).toEqual({ statusCode: 204 });
    expect(redact.paths).toEqual(
      expect.arrayContaining(['headers', '*.headers', 'body', '*.body', 'query', '*.query']),
    );
  });

  it('pick the request line level from the status and the route', () => {
    expect(requestLogLevel('/v1/echo', 200)).toBe('info');
    expect(requestLogLevel('/v1/echo', 404)).toBe('info');
    expect(requestLogLevel('/health', 200)).toBe('debug');
    expect(requestLogLevel('/health', 503)).toBe('error');
    expect(requestLogLevel(null, 500)).toBe('error');
  });
});
