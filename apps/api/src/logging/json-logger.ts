import type { LoggerService } from '@nestjs/common';
import type { Log } from './logging';
import { currentRequestLog } from './logging';

type PinoLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

/**
 * Nest `LoggerService` that writes through Fastify's pino logger, so the
 * application's own lines (`new Logger('Context').log(...)`, Nest's startup
 * messages) share the JSON format of the request lines. Inside a request it
 * uses that request's logger, which adds the `reqId`.
 *
 * Nest passes the logger context as the last parameter and, for errors, a
 * stack before it. An `Error` message is logged as `err` (type, message and
 * stack); a plain object message is merged into the line.
 */
export class JsonLogger implements LoggerService {
  constructor(private readonly root: Log) {}

  fatal(message: unknown, ...params: unknown[]): void {
    this.write('fatal', message, params);
  }

  error(message: unknown, ...params: unknown[]): void {
    this.write('error', message, params);
  }

  warn(message: unknown, ...params: unknown[]): void {
    this.write('warn', message, params);
  }

  log(message: unknown, ...params: unknown[]): void {
    this.write('info', message, params);
  }

  debug(message: unknown, ...params: unknown[]): void {
    this.write('debug', message, params);
  }

  verbose(message: unknown, ...params: unknown[]): void {
    this.write('trace', message, params);
  }

  private write(level: PinoLevel, message: unknown, params: readonly unknown[]): void {
    const log = currentRequestLog() ?? this.root;
    const { context, stack } = splitParams(params);
    const fields: Record<string, unknown> = {
      ...(context === undefined ? {} : { context }),
      ...(stack === undefined ? {} : { stack }),
    };

    if (message instanceof Error) {
      log[level]({ ...fields, err: message }, message.message);
    } else if (typeof message === 'object' && message !== null) {
      log[level]({ ...fields, ...(message as Record<string, unknown>) });
    } else {
      log[level](fields, String(message));
    }
  }
}

/**
 * Nest appends the context (a single word, such as `RoutesResolver`) as the
 * last parameter; a string before it, or one with spaces, is an error stack.
 */
function splitParams(params: readonly unknown[]): { context?: string; stack?: string } {
  const strings = params.filter((param): param is string => typeof param === 'string');
  const last = strings.at(-1);
  const context = last !== undefined && /^\S+$/.test(last) ? last : undefined;
  const stack = (context === undefined ? strings : strings.slice(0, -1))[0];
  return { context, stack };
}
