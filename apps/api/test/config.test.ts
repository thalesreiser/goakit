import { describe, expect, it } from 'vitest';
import { ConfigValidationError, loadConfig } from '../src/config/config';

const validEnv = { NODE_ENV: 'production', PORT: '8080', HOST: '127.0.0.1', LOG_LEVEL: 'warn' };

function validationError(env: Record<string, string | undefined>): ConfigValidationError {
  try {
    loadConfig(env);
  } catch (error) {
    if (error instanceof ConfigValidationError) return error;
    throw error;
  }
  throw new Error('expected loadConfig to throw');
}

describe('loadConfig', () => {
  it('returns typed values for a complete environment', () => {
    expect(loadConfig(validEnv)).toEqual({
      nodeEnv: 'production',
      port: 8080,
      host: '127.0.0.1',
      logLevel: 'warn',
    });
  });

  it('applies defaults to optional variables and ignores unrelated ones', () => {
    expect(loadConfig({ NODE_ENV: 'development', PORT: '3000', PATH: '/usr/bin' })).toEqual({
      nodeEnv: 'development',
      port: 3000,
      host: '0.0.0.0',
      logLevel: 'info',
    });
  });

  it('reports every missing required variable at once', () => {
    const error = validationError({});
    expect(error.issues).toEqual(['NODE_ENV: is required', 'PORT: is required']);
    expect(error.message).toContain('Invalid API configuration:');
    expect(error.message).toContain('  - NODE_ENV: is required');
    expect(error.message).toContain('.env.example');
  });

  it('treats empty values as missing', () => {
    expect(validationError({ ...validEnv, NODE_ENV: '' }).issues).toEqual([
      'NODE_ENV: is required',
    ]);
  });

  it.each(['abc', '0', '65536', '3000.5', '-1'])('rejects PORT=%s', (port) => {
    expect(validationError({ ...validEnv, PORT: port }).issues).toEqual([
      'PORT: must be an integer between 1 and 65535',
    ]);
  });

  it('rejects unknown NODE_ENV and LOG_LEVEL values, listing the allowed ones', () => {
    expect(validationError({ ...validEnv, NODE_ENV: 'staging', LOG_LEVEL: 'loud' }).issues).toEqual(
      [
        'NODE_ENV: must be one of: development, test, production',
        'LOG_LEVEL: must be one of: fatal, error, warn, info, debug, trace, silent',
      ],
    );
  });
});
