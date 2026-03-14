import { Injectable } from '@nestjs/common';
import { ErrorContext } from '../types/error-severity';

@Injectable()
export class ErrorTrackingService {
  reportError(error: unknown, context: Partial<ErrorContext> = {}): void {
    // Stubbed error tracking; this can be extended with Sentry, Datadog, etc.
    console.error('Tracked error', { error, context });
  }
}
