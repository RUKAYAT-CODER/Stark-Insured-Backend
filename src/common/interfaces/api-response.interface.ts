/**
 * Standardized API Response Interface
 * All successful API responses must follow this structure
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponseMeta {
  pagination?: PaginationMeta;
  [key: string]: unknown;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  meta?: ApiResponseMeta;
}

/**
 * Standardized API Error Response Interface
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  errorCode: string;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}
