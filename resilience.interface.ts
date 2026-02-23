export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number; // milliseconds
}

export interface RetryConfig {
  attempts: number;
  backoff: number; // milliseconds
  maxDelay?: number; // milliseconds
  retriableErrors?: Array<string | Function>; // Error names or classes
}

export interface BulkheadConfig {
  maxConcurrent: number;
}

export interface ResilienceOptions {
  /**
   * Unique key for the circuit breaker/bulkhead state.
   * Defaults to ClassName.MethodName if used via decorator.
   */
  key?: string;

  circuitBreaker?: CircuitBreakerConfig;
  retry?: RetryConfig;
  bulkhead?: BulkheadConfig;

  /**
   * Name of the method to call as fallback in case of failure.
   * The fallback method must have the same signature as the original method.
   */
  fallbackMethod?: string;
  
  /**
   * Static value to return as fallback.
   * Ignored if fallbackMethod is provided.
   */
  fallbackValue?: any;
}

export const RESILIENCE_OPTIONS_KEY = 'RESILIENCE_OPTIONS';