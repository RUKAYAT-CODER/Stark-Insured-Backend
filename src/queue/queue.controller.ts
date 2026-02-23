import { Controller, Get } from '@nestjs/common';

@Controller('queue')
export class AppController {
  constructor() {}

  @Get('health')
async checkQueue() {
  return { status: 'RabbitMQ connected' };
}
}
