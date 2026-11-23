import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { RequestValidationException } from '../validation/request-validation.exception';
import type { ProblemDetails } from './problem-details';
import { PROBLEM_CONTENT_TYPE, httpProblem } from './problem-details';

/** Replaces the real message of every 5xx, so internals never leak. */
export const INTERNAL_ERROR_DETAIL = 'The server could not complete the request.';

/**
 * Turns every exception into an RFC 9457 Problem Details response: Nest
 * `HttpException`s, request validation errors, unknown routes (Nest's 404),
 * Fastify errors such as malformed JSON or an unsupported media type, and
 * unexpected errors, which become a generic 500 and are logged server-side.
 * Every response carries the request id as `requestId`.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemDetails');

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const http = host.switchToHttp();
    // Fastify's request; `id` is the request id (see `resolveRequestId`).
    const request = http.getRequest<{ id: string }>();
    const url = String(httpAdapter.getRequestUrl(request));
    const problem = toProblem(exception, url.split('?')[0] ?? url, request.id);

    if (problem.status >= 500) {
      // Logged as `err` (type, message, stack) on the request's log line.
      this.logger.error(exception instanceof Error ? exception : String(exception));
    }

    const response: unknown = http.getResponse();
    httpAdapter.setHeader(response, 'Content-Type', `${PROBLEM_CONTENT_TYPE}; charset=utf-8`);
    httpAdapter.reply(response, JSON.stringify(problem), problem.status);
  }
}

/** Maps any thrown value to the Problem Details body sent to the client. */
export function toProblem(exception: unknown, instance: string, requestId: string): ProblemDetails {
  const request = { instance, requestId };
  if (exception instanceof RequestValidationException) {
    return httpProblem(HttpStatus.BAD_REQUEST, exception.message, request, exception.errors);
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    if (status < 500) return httpProblem(status, clientMessage(exception), request);
    return httpProblem(status, INTERNAL_ERROR_DETAIL, request);
  }
  return httpProblem(HttpStatus.INTERNAL_SERVER_ERROR, INTERNAL_ERROR_DETAIL, request);
}

/** The message a 4xx `HttpException` was created with. */
function clientMessage(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') return response;
  const message = (response as { message?: unknown }).message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.map(String).join('; ');
  return exception.message;
}
