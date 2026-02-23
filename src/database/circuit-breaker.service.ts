// src/database/circuit-breaker.service.ts
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal: requests pass through
  OPEN = 'OPEN',         // Tripped: requests fail fast
  HALF_OPEN = 'HALF_OPEN', // Testing: limited requests allowed
}

interface CircuitBreakerOptions {
  failureThreshold: number;   // Failures before opening circuit
  successThreshold: number;   // Successes in HALF_OPEN before closing
  timeout: number;            // ms to wait in OPEN before going HALF_OPEN
  requestTimeout: number;     // ms before a DB request times out
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: Date | null = null;
  private nextAttemptTime: Date | null = null;

  private readonly options: CircuitBreakerOptions = {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30_000,       // 30s before retrying
    requestTimeout: 5_000, // 5s DB request timeout
  };

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  getState(): CircuitState {
    return this.state;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (new Date() >= this.nextAttemptTime!) {
        this.logger.log('Circuit transitioning to HALF_OPEN');
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new ServiceUnavailableException(
          'Database circuit breaker is OPEN. Service temporarily unavailable.',
        );
      }
    }

    try {
      const result = await this.withTimeout(operation, this.options.requestTimeout);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Database operation timed out after ${ms}ms`)),
        ms,
      );
      fn()
        .then((result) => { clearTimeout(timer); resolve(result); })
        .catch((err) => { clearTimeout(timer); reject(err); });
    });
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.logger.log('Circuit CLOSED — database healthy again');
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(error: Error) {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.logger.error(`Circuit failure #${this.failureCount}: ${error.message}`);

    if (
      this.state === CircuitState.HALF_OPEN ||
      this.failureCount >= this.options.failureThreshold
    ) {
      this.tripBreaker();
    }
  }

  private tripBreaker() {
    this.state = CircuitState.OPEN;
    this.successCount = 0;
    this.nextAttemptTime = new Date(Date.now() + this.options.timeout);
    this.logger.error(
      `Circuit OPEN — too many failures. ` +
        `Next attempt at ${this.nextAttemptTime.toISOString()}`,
    );
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }
}