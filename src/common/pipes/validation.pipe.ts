/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ValidationPipe,
  ValidationError,
  BadRequestException,
} from '@nestjs/common';

export const AppValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
  validationError: {
    target: false,
    value: false,
  },
  exceptionFactory: (errors: ValidationError[]) => {
    const formattedErrors = errors.map((error: ValidationError) => {
      const result: {
        property: string;
        value: any;
        constraints?: Record<string, string>;
      } = {
        property: error.property,
        value: error.value,
      };

      if (error.constraints) {
        result.constraints = error.constraints as Record<string, string>;
      }

      return result;
    });

    return new BadRequestException({
      message: 'Validation failed',
      errors: formattedErrors,
    });
  },
});
