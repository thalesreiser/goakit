import { Body, Controller, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { EchoResponse } from './echo.dto';
import { EchoBodyDto, EchoQueryDto, EchoResponseDto } from './echo.dto';

/**
 * Diagnostic route that proves request validation, Problem Details errors and
 * OpenAPI generation end to end. It is not a business route: remove it, with
 * its module and tests, once the first real `/v1` route exists.
 */
@ApiTags('diagnostics')
@Controller('echo')
export class EchoController {
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Echo a message (temporary diagnostic route)',
    description:
      'Returns the message it receives. It only exercises validation and error responses, and will be removed when business routes land.',
  })
  @ApiOkResponse({ type: EchoResponseDto.Output })
  echo(@Body() body: EchoBodyDto, @Query() query: EchoQueryDto): EchoResponse {
    const text = query.uppercase === 'true' ? body.message.toUpperCase() : body.message;
    return { message: Array.from({ length: body.repeat }, () => text).join(' ') };
  }
}
