import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { z } from 'zod';
import { API_PREFIX } from '../app';
import { PROBLEM_CONTENT_TYPE, problemDetailsSchema } from '../problem/problem-details';

type PathItem = OpenAPIObject['paths'][string];
type Operation = NonNullable<PathItem['get']>;
type Schema = NonNullable<NonNullable<OpenAPIObject['components']>['schemas']>[string];

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;
const PROBLEM_SCHEMA = 'ProblemDetails';

/**
 * Builds the OpenAPI 3.1 document from the application's controllers. Request
 * and response schemas come from the Zod DTOs (`createZodDto`), so the Zod
 * schemas stay the single source of truth. Every operation also documents its
 * Problem Details errors: `400` when it takes input, and `default`.
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setOpenAPIVersion('3.1.0')
    .setTitle('Goakit API')
    .setDescription(
      `Business routes live under \`/${API_PREFIX}\`; \`/health\` stays outside it. Errors use RFC 9457 Problem Details (\`${PROBLEM_CONTENT_TYPE}\`).`,
    )
    .setVersion(API_PREFIX)
    .build();
  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config), {
    version: '3.1',
  });
  return withProblemResponses(document);
}

function withProblemResponses(document: OpenAPIObject): OpenAPIObject {
  const { $schema: _dialect, ...problemSchema } = z.toJSONSchema(problemDetailsSchema, {
    io: 'input',
  });
  document.components = {
    ...document.components,
    schemas: {
      ...document.components?.schemas,
      [PROBLEM_SCHEMA]: problemSchema as unknown as Schema,
    },
  };

  const problemResponse = (description: string) => ({
    description,
    content: {
      [PROBLEM_CONTENT_TYPE]: { schema: { $ref: `#/components/schemas/${PROBLEM_SCHEMA}` } },
    },
  });

  for (const pathItem of Object.values(document.paths)) {
    for (const method of METHODS) {
      const operation: Operation | undefined = pathItem[method];
      if (!operation) continue;
      const takesInput = Boolean(operation.requestBody) || (operation.parameters?.length ?? 0) > 0;
      operation.responses = {
        ...operation.responses,
        ...(takesInput
          ? { 400: problemResponse('Invalid request; `errors` lists the fields.') }
          : {}),
        default: problemResponse('Error, as RFC 9457 Problem Details.'),
      };
    }
  }
  return document;
}
