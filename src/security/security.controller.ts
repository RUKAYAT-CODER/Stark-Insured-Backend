import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('security')
export class SecurityController {
  @Get('csrf-token')
  getCsrfToken(@Req() req: Request) {
    return {
      csrfToken: req.csrfToken(),
    };
  }
}