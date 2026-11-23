import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const echoBodySchema = z.object({
  message: z.string().min(1).max(280).describe('Text to send back.'),
  repeat: z.number().int().min(1).max(3).default(1).describe('How many times to repeat it.'),
});

export const echoQuerySchema = z.object({
  uppercase: z
    .enum(['true', 'false'])
    .default('false')
    .describe('Whether to send the text back in upper case.'),
});

export const echoResponseSchema = z.object({
  message: z.string().describe('The text, repeated and separated by spaces.'),
});

export type EchoResponse = z.output<typeof echoResponseSchema>;

export class EchoBodyDto extends createZodDto(echoBodySchema) {}
export class EchoQueryDto extends createZodDto(echoQuerySchema) {}
export class EchoResponseDto extends createZodDto(echoResponseSchema) {}
