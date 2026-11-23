import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { INTERNAL_ERROR_DETAIL, toProblem } from '../src/problem/problem-details.filter';

const TEST_ENV = { NODE_ENV: 'test', PORT: '3000', LOG_LEVEL: 'silent' };
const PROBLEM_JSON = /^application\/problem\+json/;

async function startApp(
  configure?: (app: NestFastifyApplication) => void,
): Promise<NestFastifyApplication> {
  const { app } = await createApp(TEST_ENV);
  configure?.(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe('POST /v1/echo (validation)', () => {
  let app: NestFastifyApplication | undefined;
  const server = (): NestFastifyApplication => {
    if (!app) throw new Error('app failed to start');
    return app;
  };

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns the parsed body and query for a valid request', async () => {
    const response = await server().inject({
      method: 'POST',
      url: '/v1/echo?uppercase=true',
      payload: { message: 'oi', repeat: 2 },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: 'OI OI' });
  });

  it('applies schema defaults', async () => {
    const response = await server().inject({
      method: 'POST',
      url: '/v1/echo',
      payload: { message: 'oi' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: 'oi' });
  });

  it('answers an invalid request with a 400 Problem Details listing every invalid field', async () => {
    const response = await server().inject({
      method: 'POST',
      url: '/v1/echo?uppercase=true&token=secret',
      payload: { message: '', repeat: 9 },
    });
    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.json()).toEqual({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'The request has 2 invalid fields.',
      instance: '/v1/echo',
      errors: [
        { location: 'body', field: 'message', message: expect.any(String), code: 'too_small' },
        { location: 'body', field: 'repeat', message: expect.any(String), code: 'too_big' },
      ],
    });
  });

  it('reports invalid query parameters', async () => {
    const response = await server().inject({
      method: 'POST',
      url: '/v1/echo?uppercase=yes',
      payload: { message: 'oi' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      status: 400,
      errors: [{ location: 'query', field: 'uppercase', code: 'invalid_value' }],
    });
  });

  it('reports a missing body as an error on the whole body', async () => {
    const response = await server().inject({ method: 'POST', url: '/v1/echo' });
    expect(response.statusCode).toBe(400);
    const body = response.json<{ errors: Array<Record<string, unknown>> }>();
    expect(body.errors).toEqual([
      { location: 'body', message: expect.any(String), code: 'invalid_type' },
    ]);
  });

  it('answers malformed JSON with a 400 Problem Details', async () => {
    const response = await server().inject({
      method: 'POST',
      url: '/v1/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{"message":',
    });
    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.json()).toMatchObject({ type: 'about:blank', status: 400 });
  });

  it('answers an unsupported media type with a 415 Problem Details', async () => {
    const response = await server().inject({
      method: 'POST',
      url: '/v1/echo',
      headers: { 'content-type': 'text/xml' },
      payload: '<message/>',
    });
    expect(response.statusCode).toBe(415);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.json()).toMatchObject({ status: 415, title: 'Unsupported Media Type' });
  });

  it('answers an unknown route with a 404 Problem Details', async () => {
    const response = await server().inject({ method: 'GET', url: '/v1/nothing-here?x=1' });
    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.json()).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: expect.any(String),
      instance: '/v1/nothing-here',
    });
  });
});

describe('unexpected errors', () => {
  let app: NestFastifyApplication | undefined;

  beforeAll(async () => {
    // Simulates a bug or a failing dependency inside a route.
    app = await startApp((created) =>
      created.useGlobalInterceptors({
        intercept() {
          throw new Error('connect ECONNREFUSED db.internal:5432 password=hunter2');
        },
      }),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  it('become a generic 500 Problem Details without internals', async () => {
    if (!app) throw new Error('app failed to start');
    const response = await app.inject({
      method: 'POST',
      url: '/v1/echo',
      payload: { message: 'oi' },
    });
    expect(response.statusCode).toBe(500);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.json()).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: INTERNAL_ERROR_DETAIL,
      instance: '/v1/echo',
    });
    expect(response.body).not.toMatch(/ECONNREFUSED|hunter2|stack|\.ts/);
  });
});

describe('toProblem', () => {
  it('keeps the message of a 4xx HttpException', () => {
    expect(toProblem(new NotFoundException('List not found.'), '/v1/lists/1')).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'List not found.',
      instance: '/v1/lists/1',
    });
  });

  it('hides the message of a 5xx HttpException', () => {
    expect(toProblem(new InternalServerErrorException('pool exhausted'), '/v1/x')).toMatchObject({
      status: 500,
      detail: INTERNAL_ERROR_DETAIL,
    });
  });

  it('turns a thrown non-error into a 500', () => {
    expect(toProblem('boom', '/v1/x')).toMatchObject({
      status: 500,
      detail: INTERNAL_ERROR_DETAIL,
    });
  });
});
