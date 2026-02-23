import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export enum CircuitState {
  CLOSED = 'CLOSED',    // Normal operation
  OPEN = 'OPEN',        // Tripped, requests blocked
  HALF_OPEN = 'HALF_OPEN', // Testing if failure condition resolved
}

export interface CircuitBreakerOptions {
  failureThreshold: number;    // Number of failures before opening circuit
  timeoutMs: number;           // How long to stay open before half-open (ms)
  successThreshold: number;    // Success count needed to close circuit in half-open state
  name?: string;               // Name for identification
}

export interface CircuitStatus {
  state: CircuitState;
  failureCount: number;
  lastFailureTime?: number;
  openedAt?: number;
  closedAt?: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Check if a request should be allowed based on circuit breaker state
   */
  async canExecute(identifier: string, options: CircuitBreakerOptions): Promise<boolean> {
    const status = await this.getCircuitStatus(identifier);
    
    switch (status.state) {
      case CircuitState.CLOSED:
        return true;
        
      case CircuitState.OPEN:
        // Check if timeout has passed to move to half-open
        if (Date.now() - (status.openedAt || 0) > options.timeoutMs) {
          await this.setCircuitState(identifier, CircuitState.HALF_OPEN, options);
          this.logger.log(`Circuit breaker for ${identifier} moved to HALF_OPEN after timeout`);
          return true; // Allow one request to test
        }
        return false; // Still in open state, reject request
        
      case CircuitState.HALF_OPEN:
        // In half-open, allow limited requests to test
        return true;
        
      default:
        return true;
    }
  }

  /**
   * Record a successful operation
   */
  async onSuccess(identifier: string, options: CircuitBreakerOptions): Promise<void> {
    const status = await this.getCircuitStatus(identifier);
    
    if (status.state === CircuitState.HALF_OPEN) {
      // Check if we've had enough successes to close the circuit
      const successCount = (await this.getSuccessCount(identifier)) + 1;
      await this.setSuccessCount(identifier, successCount);
      
      if (successCount >= options.successThreshold) {
        await this.closeCircuit(identifier);
        this.logger.log(`Circuit breaker for ${identifier} closed after ${successCount} successes`);
      }
    } else if (status.state === CircuitState.CLOSED) {
      // Reset failure count on success
      await this.setFailureCount(identifier, 0);
    }
  }

  /**
   * Record a failed operation
   */
  async onFailure(identifier: string, options: CircuitBreakerOptions): Promise<void> {
    const failureCount = (await this.getFailureCount(identifier)) + 1;
    await this.setFailureCount(identifier, failureCount);
    
    if (failureCount >= options.failureThreshold) {
      await this.openCircuit(identifier, options);
      this.logger.warn(`Circuit breaker for ${identifier} opened after ${failureCount} failures`);
    }
  }

  /**
   * Open the circuit breaker
   */
  async openCircuit(identifier: string, options: CircuitBreakerOptions): Promise<void> {
    await this.setCircuitState(identifier, CircuitState.OPEN, options);
    await this.cacheManager.set(`${identifier}:openedAt`, Date.now(), Math.ceil(options.timeoutMs / 1000));
  }

  /**
   * Close the circuit breaker
   */
  async closeCircuit(identifier: string): Promise<void> {
    await this.setCircuitState(identifier, CircuitState.CLOSED, {
      failureThreshold: 5, // default
      timeoutMs: 60000,    // default 1 minute
      successThreshold: 1, // default
    });
    await this.cacheManager.del(`${identifier}:openedAt`);
    await this.cacheManager.del(`${identifier}:successCount`);
    await this.cacheManager.del(`${identifier}:failureCount`);
  }

  /**
   * Get current circuit breaker status
   */
  async getCircuitStatus(identifier: string): Promise<CircuitStatus> {
    const state = await this.getCircuitState(identifier);
    const failureCount = await this.getFailureCount(identifier);
    const lastFailureTime = await this.getLastFailureTime(identifier);
    const openedAt = await this.cacheManager.get<number>(`${identifier}:openedAt`);
    const closedAt = await this.cacheManager.get<number>(`${identifier}:closedAt`);

    return {
      state,
      failureCount,
      lastFailureTime,
      openedAt,
      closedAt,
    };
  }

  /**
   * Force reset a circuit breaker
   */
  async resetCircuit(identifier: string): Promise<void> {
    await this.closeCircuit(identifier);
    this.logger.log(`Circuit breaker for ${identifier} manually reset`);
  }

  /**
   * Get the current state of the circuit
   */
  private async getCircuitState(identifier: string): Promise<CircuitState> {
    const state = await this.cacheManager.get<CircuitState>(`${identifier}:state`);
    return state || CircuitState.CLOSED;
  }

  /**
   * Set the circuit state
   */
  private async setCircuitState(identifier: string, state: CircuitState, options: CircuitBreakerOptions): Promise<void> {
    const cacheKey = `${identifier}:state`;
    
    if (state === CircuitState.CLOSED) {
      await this.cacheManager.set(cacheKey, state, Math.ceil(options.timeoutMs / 1000));
      await this.cacheManager.set(`${identifier}:closedAt`, Date.now(), Math.ceil(options.timeoutMs / 1000));
    } else {
      // Keep OPEN and HALF_OPEN states for the timeout duration
      await this.cacheManager.set(cacheKey, state, Math.ceil(options.timeoutMs / 1000));
    }
  }

  /**
   * Get failure count
   */
  private async getFailureCount(identifier: string): Promise<number> {
    return (await this.cacheManager.get<number>(`${identifier}:failureCount`)) || 0;
  }

  /**
   * Set failure count
   */
  private async setFailureCount(identifier: string, count: number): Promise<void> {
    await this.cacheManager.set(`${identifier}:failureCount`, count, 3600); // 1 hour
  }

  /**
   * Get success count
   */
  private async getSuccessCount(identifier: string): Promise<number> {
    return (await this.cacheManager.get<number>(`${identifier}:successCount`)) || 0;
  }

  /**
   * Set success count
   */
  private async setSuccessCount(identifier: string, count: number): Promise<void> {
    await this.cacheManager.set(`${identifier}:successCount`, count, 300); // 5 minutes
  }

  /**
   * Get last failure time
   */
  private async getLastFailureTime(identifier: string): Promise<number | undefined> {
    return await this.cacheManager.get<number>(`${identifier}:lastFailureTime`);
  }

  /**
   * Set last failure time
   */
  private async setLastFailureTime(identifier: string): Promise<void> {
    const time = Date.now();
    await this.cacheManager.set(`${identifier}:lastFailureTime`, time, 3600); // 1 hour
  }
}