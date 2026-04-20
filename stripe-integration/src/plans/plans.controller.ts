import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  @ApiOperation({ summary: 'List available subscription plans' })
  @Get()
  getPlans() {
    return [
      {
        id: 'basic',
        name: 'Basic',
        priceMonthlyUsd: 9,
      },
      {
        id: 'standard',
        name: 'Standard',
        priceMonthlyUsd: 19,
      },
      {
        id: 'premium',
        name: 'Premium',
        priceMonthlyUsd: 29,
      },
    ];
  }
}
