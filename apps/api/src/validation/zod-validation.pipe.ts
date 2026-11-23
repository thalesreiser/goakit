import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { isZodDto } from 'nestjs-zod/dto';
import type { z } from 'zod';
import type { FieldError, FieldLocation } from '../problem/problem-details';
import { RequestValidationException } from './request-validation.exception';

const LOCATIONS: Partial<Record<ArgumentMetadata['type'], FieldLocation>> = {
  body: 'body',
  query: 'query',
  param: 'path',
};

/**
 * Validates and parses `@Body()`, `@Query()` and `@Param()` values with Zod.
 *
 * Registered globally, it validates every argument typed with a DTO made by
 * `createZodDto(schema)` (from `nestjs-zod`) and leaves other arguments
 * untouched. Pass a schema to validate a single value instead, for example
 * `@Param('id', new ZodValidationPipe(z.uuid())) id: string`.
 *
 * A failure throws `RequestValidationException`, listing every invalid field
 * at once.
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: z.ZodType) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const location = LOCATIONS[metadata.type];
    const schema = this.schema ?? schemaOf(metadata.metatype);
    if (!location || !schema) return value;

    const result = schema.safeParse(value);
    if (result.success) return result.data;
    throw new RequestValidationException(
      result.error.issues.map((issue) => toFieldError(issue, location, metadata.data)),
    );
  }
}

function schemaOf(metatype: unknown): z.ZodType | undefined {
  return isZodDto(metatype) ? (metatype.schema as z.ZodType) : undefined;
}

function toFieldError(
  issue: z.core.$ZodIssue,
  location: FieldLocation,
  key: string | undefined,
): FieldError {
  const path = [...(key ? [key] : []), ...issue.path.map(String)];
  return {
    location,
    ...(path.length > 0 ? { field: path.join('.') } : {}),
    message: issue.message,
    code: issue.code,
  };
}
