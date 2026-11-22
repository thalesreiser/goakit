import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { ConfigValidationError } from '../src/config/config';

describe('API startup', () => {
  it('fails to start with a clear message when a required variable is missing', async () => {
    const startup = createApp({ PORT: '3000', LOG_LEVEL: 'silent' });
    await expect(startup).rejects.toBeInstanceOf(ConfigValidationError);
    await expect(startup).rejects.toThrow('NODE_ENV: is required');
  });
});

describe('GET /health', () => {
  let app: NestFastifyApplication | undefined;

  const server = (): NestFastifyApplication => {
    if (!app) throw new Error('app failed to start');
    return app;
  };

  beforeAll(async () => {
    const created = await createApp({ NODE_ENV: 'test', PORT: '3000', LOG_LEVEL: 'silent' });
    app = created.app;
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('responds 200 with the status and uptime', async () => {
    const response = await server().inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    const body: unknown = response.json();
    expect(body).toEqual({ status: 'ok', uptime: expect.any(Number) });
  });

  it('is not served under the /v1 prefix', async () => {
    const response = await server().inject({ method: 'GET', url: '/v1/health' });
    expect(response.statusCode).toBe(404);
  });
});
