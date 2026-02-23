import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { CircuitBreakerState, ResilienceOptions } from '../interfaces/resilience.interface';

interface CircuitBreakerStateData {
  state: CircuitBreakerState;
  failures: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

interface BulkheadStateData {
  activeCalls: number;
}

@Injectable()
export class ResilienceService {
  private readonly logger = new Logger(ResilienceService.name);
  private breakers = new Map<string, CircuitBreakerStateData>();
  private bulkheads = new Map<string, BulkheadStateData>();

  /**
   * Execute an operation with resilience patterns applied
   */
  async execute<T>(
    key: string,
    operation: () => Promise<T>,
    options: ResilienceOptions,
    context?: any,
  ): Promise<T> {
    const { circuitBreaker, retry, bulkhead, fallbackMethod, fallbackValue } = options;

    // 1. Bulkhead Check
    if (bulkhead) {
      this.checkBulkhead(key, bulkhead.maxConcurrent);
    }

    try {
      // 2. Circuit Breaker Check
      if (circuitBreaker) {
        this.checkCircuitBreaker(key, circuitBreaker.resetTimeout);
      }

      // 3. Execute with Retry
      let result: T;
      if (retry) {
        result = await this.executeWithRetry(operation, retry.attempts, retry.backoff, retry.maxDelay);
      } else {
        this.incrementBulkhead(key);
        try {
          result = await operation();
        } finally {
          this.decrementBulkhead(key);
        }
      }

      // Success - Reset Circuit Breaker if needed
      if (circuitBreaker) {
        this.recordSuccess(key);
      }

      return result;
    } catch (error) {
      // Failure - Record in Circuit Breaker
      if (circuitBreaker) {
        this.recordFailure(key, circuitBreaker.failureThreshold, circuitBreaker.resetTimeout);
      }

      this.logger.error(`Operation ${key} failed: ${error.message}`);

      // 4. Fallback
      if (fallbackMethod && context && typeof context[fallbackMethod] === 'function') {
        this.logger.warn(`Executing fallback method ${fallbackMethod} for ${key}`);
        return contextfallbackMethod; // Pass args if needed, but simplified here
      }

      if (fallbackValue !== undefined) {
        this.logger.warn(`Returning fallback value for ${key}`);
        return fallbackValue;
      }

      throw error;
    }
  }

  private checkBulkhead(key: string, maxConcurrent: number) {
    let state = this.bulkheads.get(key);
    if (!state) {
      state = { activeCalls: 0 };
      this.bulkheads.set(key, state);
    }

    if (state.activeCalls >= maxConcurrent) {
      this.logger.warn(`Bulkhead limit reached for ${key} (${state.activeCalls}/${maxConcurrent})`);
      throw new ServiceUnavailableException('Service overloaded, please try again later');
    }
  }

  private incrementBulkhead(key: string) {
    const state = this.bulkheads.get(key);
    if (state) state.activeCalls++;
  }

  private decrementBulkhead(key: string) {
    const state = this.bulkheads.get(key);
    if (state && state.activeCalls > 0) state.activeCalls--;
  }

  private checkCircuitBreaker(key: string, resetTimeout: number) {
    let state = this.breakers.get(key);
    if (!state) {
      state = {
        state: CircuitBreakerState.CLOSED,
        failures: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
      };
      this.breakers.set(key, state);
    }

    if (state.state === CircuitBreakerState.OPEN) {
      if (Date.now() >= state.nextAttemptTime) {
        state.state = CircuitBreakerState.HALF_OPEN;
        this.logger.log(`Circuit Breaker ${key} entering HALF_OPEN state`);
      } else {
        throw new ServiceUnavailableException(`Circuit Breaker is OPEN for ${key}`);
      }
    }
  }

  private recordSuccess(key: string) {
    const state = this.breakers.get(key);
    if (state && (state.state === CircuitBreakerState.HALF_OPEN || state.state === CircuitBreakerState.OPEN)) {
      state.state = CircuitBreakerState.CLOSED;
      state.failures = 0;
      this.logger.log(`Circuit Breaker ${key} closed (recovered)`);
    } else if (state) {
      state.failures = 0; // Reset failures on success in CLOSED state
    }
  }

  private recordFailure(key: string, threshold: number, timeout: number) {
    const state = this.breakers.get(key);
    if (!state) return;

    state.failures++;
    state.lastFailureTime = Date.now();

    if (state.state === CircuitBreakerState.HALF_OPEN) {
      state.state = CircuitBreakerState.OPEN;
      state.nextAttemptTime = Date.now() + timeout;
      this.logger.warn(`Circuit Breaker ${key} reopened after failed probe`);
    } else if (state.state === CircuitBreakerState.CLOSED && state.failures >= threshold) {
      state.state = CircuitBreakerState.OPEN;
      state.nextAttemptTime = Date.now() + timeout;
      this.logger.warn(`Circuit Breaker ${key} opened after ${state.failures} failures`);
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempts: number,
    backoff: number,
    maxDelay: number = 30000
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 1; i <= attempts; i++) {
      try {
        // We need to manage bulkhead here for retries to ensure each attempt counts
        // Note: In a real implementation, we might pass the key to executeWithRetry
        return await operation();
      } catch (error) {
        lastError = error;
        if (i === attempts) break;

        const delay = Math.min(backoff * Math.pow(2, i - 1), maxDelay);
        this.logger.debug(`Retry attempt ${i} failed, waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics() {
    const breakerMetrics = {};
    this.breakers.forEach((value, key) => {
      breakerMetrics[key] = {
        state: value.state,
        failures: value.failures,
      };
    });

    const bulkheadMetrics = {};
    this.bulkheads.forEach((value, key) => {
      bulkheadMetrics[key] = {
        activeCalls: value.activeCalls,
      };
    });

    return {
      circuitBreakers: breakerMetrics,
      bulkheads: bulkheadMetrics,
    };
  }
}