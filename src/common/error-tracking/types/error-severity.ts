/**
 * Error severity levels for classification and alerting
 */
export enum ErrorSeverity {
  // User input errors - should not trigger alerts
  INFO = 'info',

  // Recoverable errors - may require attention
  WARNING = 'warning',

  // Serious errors - require immediate attention
  ERROR = 'error',

  // Critical system failures - require urgent response
  CRITICAL = 'critical',

  // Fatal errors - system cannot continue
  FATAL = 'fatal',
}

/**
 * Error categories for organization and analysis
 */
export enum ErrorCategory {
  // Validation and input errors
  VALIDATION = 'validation',

  // Authentication and authorization errors
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',

  // Data/resource errors
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',

  // External service errors
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  CACHE = 'cache',

  // Business logic errors
  BUSINESS_LOGIC = 'business_logic',

  // System errors
  SYSTEM = 'system',
  CONFIGURATION = 'configuration',

  // Payment/Transaction errors
  PAYMENT = 'payment',
  TRANSACTION = 'transaction',

  // Claim processing errors
  CLAIM_PROCESSING = 'claim_processing',

  // Policy errors
  POLICY = 'policy',

  // Rate limiting and throttling
  RATE_LIMITING = 'rate_limiting',

  // Timeout errors
  TIMEOUT = 'timeout',

  // Unknown/uncategorized
  UNKNOWN = 'unknown',
}

/**
 * Error context information to be captured
 */
export interface ErrorContext {
  // Request information
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  ip?: string;
  userAgent?: string;

  // Error classification
  severity?: ErrorSeverity;
  category?: ErrorCategory;

  // Additional context
  timestamp?: string;
  environment?: string;
  version?: string;

  // Custom tags and data
  tags?: Record<string, string | number>;
  extra?: Record<string, any>;
  breadcrumbs?: ErrorBreadcrumb[];

  // Performance metrics
  duration?: number;
  statusCode?: number;
}

/**
 * Breadcrumb for tracking events leading to an error
 */
export interface ErrorBreadcrumb {
  message: string;
  timestamp: Date;
  category?: string;
  data?: Record<string, any>;
  level?: 'debug' | 'info' | 'warning' | 'error';
}

/**
 * Error metrics for tracking and reporting
 */
export interface ErrorMetrics {
  errorCount: number;
  errorRate: number;
  topErrors: ErrorSummary[];
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: ErrorLog[];
}

/**
 * Error summary for reporting
 */
export interface ErrorSummary {
  errorType: string;
  count: number;
  lastOccurrence: Date;
  severity: ErrorSeverity;
  category: ErrorCategory;
}

/**
 * Error log entry
 */
export interface ErrorLog {
  id: string;
  timestamp: Date;
  errorType: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  stackTrace?: string;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Alert configuration for error tracking
 */
export interface AlertConfig {
  enabled: boolean;
  severity: ErrorSeverity;
  category?: ErrorCategory;
  threshold?: number;
  windowMs?: number;
  notificationChannels: AlertChannel[];
}

/**
 * Alert channel destination
 */
export interface AlertChannel {
  type: 'email' | 'slack' | 'pagerduty' | 'webhook';
  destination: string;
  enabled: boolean;
}
