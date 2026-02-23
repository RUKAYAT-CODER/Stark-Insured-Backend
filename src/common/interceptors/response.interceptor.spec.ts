import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';
import { ApiResponse } from '../interfaces/api-response.interface';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;

  beforeEach(async () => {
    interceptor = new ResponseInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    let mockExecutionContext: ExecutionContext;
    let mockCallHandler: CallHandler;

    beforeEach(() => {
      mockExecutionContext = {} as ExecutionContext;
    });

    it('should wrap plain data in standard response format', (done) => {
      const testData = { id: 1, name: 'Test' };
      mockCallHandler = {
        handle: () => of(testData),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(
        (result: ApiResponse) => {
          expect(result.success).toBe(true);
          expect(result.message).toBe('Request successful');
          expect(result.data).toEqual(testData);
          expect(result.meta).toBeUndefined();
          done();
        },
      );
    });

    it('should return already formatted response as-is', (done) => {
      const formattedResponse: ApiResponse = {
        success: true,
        message: 'Custom message',
        data: { id: 1 },
      };
      mockCallHandler = {
        handle: () => of(formattedResponse),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(
        (result: ApiResponse) => {
          expect(result).toEqual(formattedResponse);
          done();
        },
      );
    });

    it('should extract pagination metadata from items structure', (done) => {
      const testData = {
        items: [{ id: 1 }, { id: 2 }],
        meta: {
          pagination: {
            page: 1,
            pageSize: 10,
            totalItems: 20,
            totalPages: 2,
            hasNextPage: true,
            hasPreviousPage: false,
          },
        },
      };
      mockCallHandler = {
        handle: () => of(testData),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(
        (result: ApiResponse) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
          expect(result.meta).toEqual(testData.meta);
          done();
        },
      );
    });

    it('should wrap array data in standard response format', (done) => {
      const testData = [{ id: 1 }, { id: 2 }];
      mockCallHandler = {
        handle: () => of(testData),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(
        (result: ApiResponse) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual(testData);
          done();
        },
      );
    });

    it('should handle null data', (done) => {
      mockCallHandler = {
        handle: () => of(null),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(
        (result: ApiResponse) => {
          expect(result.success).toBe(true);
          expect(result.data).toBeNull();
          done();
        },
      );
    });

    it('should handle string data', (done) => {
      const testData = 'test string';
      mockCallHandler = {
        handle: () => of(testData),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(
        (result: ApiResponse) => {
          expect(result.success).toBe(true);
          expect(result.data).toBe(testData);
          done();
        },
      );
    });
  });
});
