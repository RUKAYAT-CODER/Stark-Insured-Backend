import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(errors: Record<string, string[]>) {
    super({
      message: 'Validation failed',
      errors: errors,
      statusCode: HttpStatus.BAD_REQUEST,
    }, HttpStatus.BAD_REQUEST);
  }
}
