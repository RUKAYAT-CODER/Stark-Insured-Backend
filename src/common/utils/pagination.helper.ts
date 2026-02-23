import { PaginationMeta } from '../interfaces/api-response.interface';

/**
 * Helper class for creating paginated responses
 * Standardizes pagination metadata across list endpoints
 */
export class PaginationHelper {
  /**
   * Create pagination metadata
   * @param page - Current page (1-indexed)
   * @param pageSize - Items per page
   * @param totalItems - Total number of items
   * @returns Pagination metadata
   */
  static createPaginationMeta(
    page: number,
    pageSize: number,
    totalItems: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };
  }

  /**
   * Create paginated response structure
   * This format is automatically unwrapped by ResponseInterceptor
   * @param items - Array of items
   * @param page - Current page
   * @param pageSize - Items per page
   * @param totalItems - Total number of items
   * @returns Response object with items and pagination metadata
   */
  static createPaginatedResponse<T>(
    items: T[],
    page: number,
    pageSize: number,
    totalItems: number,
  ) {
    return {
      items,
      meta: {
        pagination: this.createPaginationMeta(page, pageSize, totalItems),
      },
    };
  }

  /**
   * Calculate offset for database queries
   * @param page - Current page (1-indexed)
   * @param pageSize - Items per page
   * @returns Offset value
   */
  static calculateOffset(page: number, pageSize: number): number {
    return (page - 1) * pageSize;
  }

  /**
   * Validate pagination parameters
   * @param page - Page number
   * @param pageSize - Page size
   * @throws Error if parameters are invalid
   */
  static validatePaginationParams(page: number, pageSize: number): void {
    if (page < 1) {
      throw new Error('Page must be greater than 0');
    }
    if (pageSize < 1) {
      throw new Error('Page size must be greater than 0');
    }
    if (pageSize > 100) {
      throw new Error('Page size cannot exceed 100 items');
    }
  }
}
