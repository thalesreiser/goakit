import { BadRequestException } from '@nestjs/common';
import type { FieldError } from '../problem/problem-details';

/** Thrown by `ZodValidationPipe`; rendered as a 400 listing `errors`. */
export class RequestValidationException extends BadRequestException {
  constructor(readonly errors: readonly FieldError[]) {
    super(
      errors.length === 1
        ? 'The request has 1 invalid field.'
        : `The request has ${errors.length} invalid fields.`,
    );
  }
}
