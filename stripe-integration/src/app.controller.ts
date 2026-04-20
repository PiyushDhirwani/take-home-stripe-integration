import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Health check' })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({ summary: 'Checkout success redirect page' })
  @Get('success')
  success(@Query('session_id') sessionId: string) {
    return { message: 'Payment successful!', sessionId };
  }

  @ApiOperation({ summary: 'Checkout cancel redirect page' })
  @Get('cancel')
  cancel() {
    return { message: 'Payment cancelled.' };
  }
}
