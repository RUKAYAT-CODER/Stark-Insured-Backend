import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass, ClassTransformOptions } from 'class-transformer';
import { ValidationException } from '../errors/validation.exception';

interface ValidationPipeOptions {
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  transform?: boolean;
  transformOptions?: ClassTransformOptions;
}

@Injectable()
export class GlobalValidationPipe implements PipeTransform<any> {
  constructor(private readonly options: ValidationPipeOptions = {}) {
    this.options = {
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted values are provided
      transform: true, // Transform payloads to be objects typed according to their DTO classes
      transformOptions: {
        enableImplicitConversion: true,
      },
      ...this.options,
    };
  }

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value, this.options.transformOptions);
    const errors = await validate(object, {
      whitelist: this.options.whitelist,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted,
    });

    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      throw new ValidationException(formattedErrors);
    }

    return object;
  }

  private toValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: ValidationError[]): any {
    const formattedErrors = {};

    errors.forEach(error => {
      const constraints = error.constraints;
      const property = error.property;

      if (constraints) {
        formattedErrors[property] = Object.values(constraints);
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedErrors = this.formatErrors(error.children);
        formattedErrors[property] = {
          ...formattedErrors[property],
          ...nestedErrors,
        };
      }
    });

    return formattedErrors;
  }
}
