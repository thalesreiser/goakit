import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import type { AppConfig } from './config/config';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [AppConfigModule.forRoot(config), HealthModule],
    };
  }
}
