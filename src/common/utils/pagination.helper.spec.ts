import { PaginationHelper } from './pagination.helper';

describe('PaginationHelper', () => {
  describe('createPaginationMeta', () => {
    it('should create correct pagination metadata for first page', () => {
      const meta = PaginationHelper.createPaginationMeta(1, 10, 100);

      expect(meta).toEqual({
        page: 1,
        pageSize: 10,
        totalItems: 100,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('should create correct metadata for middle page', () => {
      const meta = PaginationHelper.createPaginationMeta(5, 10, 100);

      expect(meta).toEqual({
        page: 5,
        pageSize: 10,
        totalItems: 100,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('should create correct metadata for last page', () => {
      const meta = PaginationHelper.createPaginationMeta(10, 10, 100);

      expect(meta).toEqual({
        page: 10,
        pageSize: 10,
        totalItems: 100,
        totalPages: 10,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('should handle when items do not divide evenly', () => {
      const meta = PaginationHelper.createPaginationMeta(1, 10, 25);

      expect(meta.totalPages).toBe(3);
      expect(meta.hasNextPage).toBe(true);
    });

    it('should handle single item', () => {
      const meta = PaginationHelper.createPaginationMeta(1, 10, 1);

      expect(meta.totalPages).toBe(1);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPreviousPage).toBe(false);
    });

    it('should handle zero items', () => {
      const meta = PaginationHelper.createPaginationMeta(1, 10, 0);

      expect(meta.totalPages).toBe(0);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPreviousPage).toBe(false);
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create correct paginated response structure', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const response = PaginationHelper.createPaginatedResponse(items, 1, 10, 100);

      expect(response.items).toEqual(items);
      expect(response.meta.pagination.page).toBe(1);
      expect(response.meta.pagination.pageSize).toBe(10);
      expect(response.meta.pagination.totalItems).toBe(100);
    });

    it('should return empty items array', () => {
      const response = PaginationHelper.createPaginatedResponse([], 1, 10, 0);

      expect(response.items).toEqual([]);
      expect(response.meta.pagination.totalItems).toBe(0);
    });
  });

  describe('calculateOffset', () => {
    it('should calculate offset for first page', () => {
      const offset = PaginationHelper.calculateOffset(1, 10);
      expect(offset).toBe(0);
    });

    it('should calculate offset for second page', () => {
      const offset = PaginationHelper.calculateOffset(2, 10);
      expect(offset).toBe(10);
    });

    it('should calculate offset for fifth page with custom page size', () => {
      const offset = PaginationHelper.calculateOffset(5, 20);
      expect(offset).toBe(80);
    });
  });

  describe('validatePaginationParams', () => {
    it('should not throw for valid parameters', () => {
      expect(() => {
        PaginationHelper.validatePaginationParams(1, 10);
      }).not.toThrow();
    });

    it('should throw for page less than 1', () => {
      expect(() => {
        PaginationHelper.validatePaginationParams(0, 10);
      }).toThrow('Page must be greater than 0');
    });

    it('should throw for negative page', () => {
      expect(() => {
        PaginationHelper.validatePaginationParams(-1, 10);
      }).toThrow('Page must be greater than 0');
    });

    it('should throw for page size less than 1', () => {
      expect(() => {
        PaginationHelper.validatePaginationParams(1, 0);
      }).toThrow('Page size must be greater than 0');
    });

    it('should throw for page size greater than 100', () => {
      expect(() => {
        PaginationHelper.validatePaginationParams(1, 101);
      }).toThrow('Page size cannot exceed 100 items');
    });

    it('should allow page size of exactly 100', () => {
      expect(() => {
        PaginationHelper.validatePaginationParams(1, 100);
      }).not.toThrow();
    });
  });
});
