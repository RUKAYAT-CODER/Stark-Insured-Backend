import { Controller, Get, Req, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CsrfService } from './csrf.service';

@ApiTags('csrf')
@Controller('api/csrf')
export class CsrfController {
  constructor(private readonly csrfService: CsrfService) {}

  @Get('token')
  @ApiOperation({ summary: 'Get CSRF token for state-changing requests' })
  @ApiResponse({ status: 200, description: 'CSRF token retrieved successfully' })
  getCsrfToken(@Req() req: Request, @Res() res: Response) {
    const csrfToken = (req as any).csrfToken();
    res.status(HttpStatus.OK).json({ csrfToken });
  }
}
