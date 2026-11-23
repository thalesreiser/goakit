import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const healthStatusSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number().int().nonnegative().describe('Seconds since the process started.'),
});

export type HealthStatus = z.output<typeof healthStatusSchema>;

class HealthStatusDto extends createZodDto(healthStatusSchema) {}

/** Liveness probe. Served at `/health`, outside the `/v1` prefix. */
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe (unversioned, outside /v1)' })
  @ApiOkResponse({ type: HealthStatusDto.Output })
  check(): HealthStatus {
    return { status: 'ok', uptime: Math.floor(process.uptime()) };
  }
}
