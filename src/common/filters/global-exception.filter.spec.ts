import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { ArgumentsHost, Logger } from '@nestjs/common';
import { Response, Request } from 'express';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ApiErrorResponse } from '../interfaces/api-response.interface';
import { DomainError, EntityNotFoundError, ExternalServiceError } from '../errors/domain.error';
import { ErrorCode } from '../constants/error-codes';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockArgumentsHost: Partial<ArgumentsHost>;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test/path',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HttpException handling', () => {
    it('should handle HttpException with standardized error format', () => {
      const testException = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(testException, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalled();

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const errorResponse = jsonCall as ApiErrorResponse;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(errorResponse.message).toBe('Test error');
      expect(errorResponse.errorCode).toBe('BAD_REQUEST');
      expect(errorResponse.timestamp).toBeDefined();
      expect(errorResponse.path).toBe('/test/path');
    });

    it('should handle HttpException with object response', () => {
      const testException = new HttpException(
        { message: 'Custom error message', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(testException, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalled();

      const errorResponse = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;

      expect(errorResponse.message).toBe('Custom error message');
      expect(errorResponse.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should handle validation errors and set appropriate error code', () => {
      const testException = new HttpException(
        { message: ['Email is required'], error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(testException, mockArgumentsHost as ArgumentsHost);

      const errorResponse = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;

      expect(errorResponse.errorCode).toBe('VALIDATION_ERROR');
      expect(errorResponse.details).toBeDefined();
      expect(errorResponse.details?.validationErrors).toEqual(['Email is required']);
    });

    it('should handle 401 Unauthorized', () => {
      const testException = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

      filter.catch(testException, mockArgumentsHost as ArgumentsHost);

      const errorResponse = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;

      expect(errorResponse.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      expect(errorResponse.errorCode).toBe('UNAUTHORIZED');
    });

    it('should handle 403 Forbidden', () => {
      const testException = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(testException, mockArgumentsHost as ArgumentsHost);

      const errorResponse = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;

      expect(errorResponse.statusCode).toBe(HttpStatus.FORBIDDEN);
      expect(errorResponse.errorCode).toBe('FORBIDDEN');
    });

    it('should handle 404 Not Found', () => {
      const testException = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(testException, mockArgumentsHost as ArgumentsHost);

      const errorResponse = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;

      expect(errorResponse.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(errorResponse.errorCode).toBe('NOT_FOUND');
    });

    it('should handle 500 Internal Server Error', () => {
      const testException = new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      filter.catch(testException, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);

      const errorResponse = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;

      expect(errorResponse.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(errorResponse.errorCode).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('DomainError handling', () => {
    it('should translate DomainError to correct status and code', () => {
      const domainErr = new DomainError('Test message', ErrorCode.UNAUTHORIZED, { foo: 'bar' }, HttpStatus.UNAUTHORIZED);
      // override name to avoid abstract error
      domainErr.name = 'CustomDomainError';

      filter.catch(domainErr, mockArgumentsHost as ArgumentsHost);
      const errorResponse = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;

      expect(errorResponse.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      expect(errorResponse.errorCode).toBe(ErrorCode.UNAUTHORIZED);
      expect(errorResponse.details).toEqual({ foo: 'bar' });
    });

    it('should map specific DomainError subclasses correctly', () => {
      const notFound = new EntityNotFoundError('Thing', '123');
      filter.catch(notFound, mockArgumentsHost as ArgumentsHost);
      const resp = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;
      expect(resp.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(resp.errorCode).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('should handle ExternalServiceError specially', () => {
      const extErr = new ExternalServiceError('downstream down');
      filter.catch(extErr, mockArgumentsHost as ArgumentsHost);
      const resp = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;
      expect(resp.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(resp.errorCode).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
    });
  });

  describe('Unknown exception handling', () => {
    it('should handle unexpected errors with default 500 status', () => {
      const testException = new Error('Unexpected error');

      filter.catch(testException, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);

      const errorResponse = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(errorResponse.errorCode).toBe('INTERNAL_SERVER_ERROR');
      expect(errorResponse.message).toBe('Internal server error');
    });

    it('should log unexpected errors', () => {
      const testException = new Error('Test error');
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      filter.catch(testException, mockArgumentsHost as ArgumentsHost);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error'),
        testException.stack,
      );
    });
  });

  describe('Response structure validation', () => {
    it('should include required fields in error response', () => {
      const testException = new BadRequestException('Test error');

      filter.catch(testException, mockArgumentsHost as ArgumentsHost);

      const errorResponse = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;

      expect(errorResponse).toHaveProperty('success');
      expect(errorResponse).toHaveProperty('message');
      expect(errorResponse).toHaveProperty('statusCode');
      expect(errorResponse).toHaveProperty('errorCode');
      expect(errorResponse).toHaveProperty('timestamp');
      expect(errorResponse).toHaveProperty('path');
    });

    it('should have valid ISO timestamp format', () => {
      const testException = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(testException, mockArgumentsHost as ArgumentsHost);

      const errorResponse = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;
      const timestamp = new Date(errorResponse.timestamp);

      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(errorResponse.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
  describe('DomainError handling', () => {
    it('should map EntityNotFoundError to 404 with correct code', () => {
      const domainError = new EntityNotFoundError('User', '123');

      filter.catch(domainError, mockArgumentsHost as ArgumentsHost);
      const err = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(err.errorCode).toBe('RESOURCE_NOT_FOUND');
      expect(err.message).toContain('User');
    });

    it('should propagate details from RateLimitError', () => {
      const rateError = new DomainError('Rate limited', 'RATE_LIMIT_EXCEEDED', { retryAfter: 30 }, HttpStatus.TOO_MANY_REQUESTS);

      filter.catch(rateError, mockArgumentsHost as ArgumentsHost);
      const err = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;

      expect(err.details).toEqual({ retryAfter: 30 });
      expect(err.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('should handle ExternalServiceError as service unavailable', () => {
      const extError = new ExternalServiceError('Downstream api offline');

      filter.catch(extError, mockArgumentsHost as ArgumentsHost);
      const err = (mockResponse.json as jest.Mock).mock.calls[0][0] as ApiErrorResponse;

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(err.errorCode).toBe('EXTERNAL_SERVICE_ERROR');
      expect(err.message).toBe('Downstream api offline');
    });
  });});
