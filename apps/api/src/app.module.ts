import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import type { AppConfig } from './config/config';
import { AppConfigModule } from './config/config.module';
import { EchoModule } from './echo/echo.module';
import { HealthModule } from './health/health.module';
import { ProblemDetailsFilter } from './problem/problem-details.filter';
import { ZodValidationPipe } from './validation/zod-validation.pipe';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [AppConfigModule.forRoot(config), HealthModule, EchoModule],
      providers: [
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
        { provide: APP_PIPE, useValue: new ZodValidationPipe() },
      ],
    };
  }
}
