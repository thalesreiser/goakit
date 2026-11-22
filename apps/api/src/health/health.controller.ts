import { Controller, Get } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  /** Seconds since the process started. */
  uptime: number;
}

/** Liveness probe. Served at `/health`, outside the `/v1` prefix. */
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthStatus {
    return { status: 'ok', uptime: Math.floor(process.uptime()) };
  }
}
