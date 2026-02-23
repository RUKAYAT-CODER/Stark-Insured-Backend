import { SetMetadata } from '@nestjs/common';
import { ResilienceOptions, RESILIENCE_OPTIONS_KEY } from '../interfaces/resilience.interface';

/**
 * Applies resilience patterns (Circuit Breaker, Retry, Bulkhead) to the method.
 */
export const Resilient = (options: ResilienceOptions) => SetMetadata(RESILIENCE_OPTIONS_KEY, options);