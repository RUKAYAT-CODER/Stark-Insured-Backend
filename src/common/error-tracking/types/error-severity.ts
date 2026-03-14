export interface ErrorContext {
  requestId?: string;
  userId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  extra?: Record<string, unknown>;
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}
