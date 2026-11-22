import { z } from 'zod';

export const NODE_ENVS = ['development', 'test', 'production'] as const;
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

export type NodeEnv = (typeof NODE_ENVS)[number];
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Injection token for the validated {@link AppConfig}. */
export const APP_CONFIG = Symbol('APP_CONFIG');

const REQUIRED = 'is required';
const PORT_RANGE = 'must be an integer between 1 and 65535';

const oneOf = (values: readonly string[]) => (issue: { input?: unknown }) =>
  issue.input === undefined ? REQUIRED : `must be one of: ${values.join(', ')}`;

const envSchema = z
  .object({
    NODE_ENV: z.enum(NODE_ENVS, { error: oneOf(NODE_ENVS) }),
    PORT: z
      .string({ error: REQUIRED })
      .regex(/^\d+$/, { error: PORT_RANGE })
      .transform(Number)
      .refine((port) => port >= 1 && port <= 65535, { error: PORT_RANGE }),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z.enum(LOG_LEVELS, { error: oneOf(LOG_LEVELS) }).default('info'),
  })
  .transform((env) => ({
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    host: env.HOST,
    logLevel: env.LOG_LEVEL,
  }));

/** Typed API configuration, validated once at startup. */
export type AppConfig = z.output<typeof envSchema>;

/** Thrown when the environment does not describe a valid configuration. */
export class ConfigValidationError extends Error {
  override readonly name = 'ConfigValidationError';

  constructor(readonly issues: readonly string[]) {
    super(
      [
        'Invalid API configuration:',
        ...issues.map((issue) => `  - ${issue}`),
        'Set the variables in the environment or in apps/api/.env (see apps/api/.env.example).',
      ].join('\n'),
    );
  }
}

/**
 * Validates the environment and returns the typed configuration. Empty values
 * count as missing. Every problem is reported at once.
 */
export function loadConfig(env: Readonly<Record<string, string | undefined>>): AppConfig {
  const input = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ''),
  );
  const result = envSchema.safeParse(input);
  if (!result.success) {
    throw new ConfigValidationError(
      result.error.issues.map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`),
    );
  }
  return result.data;
}
