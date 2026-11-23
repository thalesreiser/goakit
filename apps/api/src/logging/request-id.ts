import { randomUUID } from 'node:crypto';

/** Header that carries the request id, in both directions. */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Longest incoming request id the API keeps. */
export const MAX_REQUEST_ID_LENGTH = 128;

const VALID_REQUEST_ID = new RegExp(`^[A-Za-z0-9._-]{1,${MAX_REQUEST_ID_LENGTH}}$`);

/**
 * Returns the incoming `X-Request-Id` when it is a single value of 1 to 128
 * letters, digits, `.`, `_` or `-`, so a caller (or a proxy in front of the
 * API) can correlate its own logs. Anything else, including a repeated
 * header, is replaced by a new random UUID; the invalid value is never logged.
 */
export function resolveRequestId(incoming: unknown): string {
  return typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
}
