import { STATUS_CODES } from 'node:http';
import { z } from 'zod';

/** Media type of every error response (RFC 9457). */
export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

/**
 * Problem type catalogue. Every problem the API returns today is a plain HTTP
 * error, so it uses `about:blank` with the HTTP status phrase as its title
 * (RFC 9457, section 4.2.1); clients branch on `status` and, for 400s, on
 * `errors`. Add an entry here, with its own dereferenceable URI and title, only
 * when a problem needs meaning beyond its HTTP status.
 */
export const PROBLEM_TYPES = {
  http: 'about:blank',
} as const;

/** Where an invalid value was found, named like OpenAPI parameter locations. */
export const FIELD_LOCATIONS = ['body', 'query', 'path'] as const;
export type FieldLocation = (typeof FIELD_LOCATIONS)[number];

export const fieldErrorSchema = z.object({
  location: z.enum(FIELD_LOCATIONS).describe('Part of the request that holds the invalid value.'),
  field: z
    .string()
    .optional()
    .describe(
      'Dot-separated path to the value, such as `items.0.name`; absent for the whole part.',
    ),
  message: z.string().describe('Why the value is invalid.'),
  code: z.string().describe('Machine-readable reason from Zod, such as `too_small`.'),
});

export const problemDetailsSchema = z
  .object({
    type: z.string().describe('URI of the problem type; `about:blank` for plain HTTP errors.'),
    title: z.string().describe('Short summary of the problem type.'),
    status: z.number().int().describe('HTTP status code.'),
    detail: z.string().describe('Explanation specific to this occurrence.'),
    instance: z
      .string()
      .describe('Path of the request that caused the problem, without the query.'),
    errors: z
      .array(fieldErrorSchema)
      .optional()
      .describe('Invalid fields; present on validation errors (400).'),
  })
  .describe('An error response in RFC 9457 Problem Details format.');

export type FieldError = z.infer<typeof fieldErrorSchema>;
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

/** Builds the Problem Details body of a plain HTTP error. */
export function httpProblem(
  status: number,
  detail: string,
  instance: string,
  errors?: readonly FieldError[],
): ProblemDetails {
  return {
    type: PROBLEM_TYPES.http,
    title: STATUS_CODES[status] ?? 'Error',
    status,
    detail,
    instance,
    ...(errors ? { errors: [...errors] } : {}),
  };
}
