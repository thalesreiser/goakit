import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { OpenAPIObject } from '@nestjs/swagger';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createOpenApiDocument } from '../src/openapi/document';

const PROBLEM_REF = {
  'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } },
};

describe('OpenAPI document', () => {
  let app: NestFastifyApplication | undefined;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const created = await createApp({ NODE_ENV: 'test', PORT: '3000', LOG_LEVEL: 'silent' });
    app = created.app;
    document = createOpenApiDocument(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('is OpenAPI 3.1', () => {
    expect(document.openapi).toBe('3.1.0');
    expect(document.info.title).toBe('Goakit API');
  });

  it('describes the demo route under /v1 with its Zod body and query schemas', () => {
    const operation = document.paths['/v1/echo']?.post;
    expect(operation).toBeDefined();
    expect(JSON.stringify(operation?.requestBody)).toContain('message');
    expect(operation?.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'uppercase', in: 'query' })]),
    );
    expect(operation?.responses['200']).toBeDefined();
    expect(operation?.responses['400']).toMatchObject({ content: PROBLEM_REF });
    expect(operation?.responses['default']).toMatchObject({ content: PROBLEM_REF });
  });

  it('describes /health outside the /v1 prefix', () => {
    expect(document.paths['/health']?.get?.responses['200']).toBeDefined();
    expect(document.paths['/v1/health']).toBeUndefined();
  });

  it('defines the Problem Details schema with the errors extension', () => {
    const schema = document.components?.schemas?.['ProblemDetails'];
    expect(schema).toMatchObject({
      type: 'object',
      required: ['type', 'title', 'status', 'detail', 'instance'],
      properties: { errors: { type: 'array' } },
    });
  });
});
