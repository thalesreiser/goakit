import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import type { AppConfig } from './config';
import { APP_CONFIG } from './config';

/** Makes the validated configuration injectable everywhere via `APP_CONFIG`. */
@Module({})
export class AppConfigModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppConfigModule,
      global: true,
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
