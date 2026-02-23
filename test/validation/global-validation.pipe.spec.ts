import { Test, TestingModule } from '@nestjs/testing';
import { GlobalValidationPipe } from '../../src/common/validation/pipes/global-validation.pipe';
import { ValidationException } from '../../src/common/validation/errors/validation.exception';

class TestDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(0)
  age: number;
}

class InvalidDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(0)
  age: number;
}

describe('GlobalValidationPipe', () => {
  let pipe: GlobalValidationPipe;

  beforeEach(() => {
    pipe = new GlobalValidationPipe();
  });

  it('should validate valid DTO', async () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
    };

    const result = await pipe.transform(validData, { metatype: TestDto });
    expect(result).toEqual(validData);
  });

  it('should throw ValidationException for invalid DTO', async () => {
    const invalidData = {
      name: '',
      email: 'invalid-email',
      age: -5,
    };

    await expect(pipe.transform(invalidData, { metatype: TestDto }))
      .rejects.toThrow(ValidationException);
  });

  it('should handle non-DTO types', async () => {
    const simpleString = 'test string';
    const result = await pipe.transform(simpleString, { metatype: String });
    expect(result).toEqual(simpleString);
  });

  it('should strip non-whitelisted properties', async () => {
    const dataWithExtra = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
      maliciousProperty: 'should be removed',
    };

    const result = await pipe.transform(dataWithExtra, { metatype: TestDto });
    expect(result).not.toHaveProperty('maliciousProperty');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('email');
    expect(result).toHaveProperty('age');
  });

  it('should transform strings to numbers when appropriate', async () => {
    const dataWithStringNumbers = {
      name: 'John Doe',
      email: 'john@example.com',
      age: '25', // String that should be converted to number
    };

    const result = await pipe.transform(dataWithStringNumbers, { metatype: TestDto });
    expect(typeof result.age).toBe('number');
    expect(result.age).toBe(25);
  });

  it('should handle nested validation errors', async () => {
    const nestedInvalidData = {
      name: '',
      email: 'invalid-email',
      age: -5,
    };

    try {
      await pipe.transform(nestedInvalidData, { metatype: TestDto });
      fail('Should have thrown ValidationException');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationException);
      const response = error.getResponse();
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toBeDefined();
    }
  });
});

// Mock decorators for testing
import { IsString, IsNotEmpty, IsEmail, IsNumber, Min } from 'class-validator';
