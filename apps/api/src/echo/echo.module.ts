import { Module } from '@nestjs/common';
import { EchoController } from './echo.controller';

/** Temporary diagnostic module; see `EchoController`. */
@Module({
  controllers: [EchoController],
})
export class EchoModule {}
