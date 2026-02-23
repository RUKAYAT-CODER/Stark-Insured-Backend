# Error Tracking - Developer Quick Reference

## Quick Integration Examples

### Basic Error Reporting

```typescript
import { ErrorTrackingService } from '@stellar/common/error-tracking';

@Controller('claims')
export class ClaimsController {
  constructor(private errorTracking: ErrorTrackingService) {}

  @Post()
  createClaim(@Body() dto: CreateClaimDto) {
    try {
      // ... create claim logic
    } catch (error) {
      this.errorTracking.reportError(error, {
        userId: req.user.id,
        tags: {
          claimType: dto.type,
          amount: dto.amount,
        },
      });
      throw error; // Re-throw to trigger global exception filter
    }
  }
}
```

### With Custom Context

```typescript
this.errorTracking.reportError(error, {
  userId: user.id,
  requestId: request.id,
  severity: 'critical',
  category: 'payment',
  tags: {
    paymentId: payment.id,
    amount: payment.amount,
  },
  extra: {
    paymentDetails: {
      processor: 'stripe',
      status: payment.status,
    },
  },
});
```

### Add Breadcrumbs

```typescript
// Track event before error happens
this.errorTracking.addBreadcrumb(
  'User initiated payment',
  'payment',
  { paymentId: 'pay-123', amount: 1000 },
  'info'
);

// ... processing code that might fail ...

this.errorTracking.addBreadcrumb(
  'Payment validation started',
  'payment',
  { step: 'validation' },
  'debug'
);

// Now if error occurs, Sentry shows full context
```

### Capture Request Context

```typescript
// In middleware or guard
this.errorTracking.captureRequestContext({
  userId: request.user?.id,
  requestId: request.id,
  method: request.method,
  url: request.originalUrl,
  tags: {
    endpoint: '/claims',
    version: 'v1',
  },
});
```

### Get Error Metrics

```typescript
// In dashboard controller
const metrics = this.errorTracking.getErrorMetrics(3600000); // Last hour

return {
  totalErrors: metrics.errorCount,
  errorRate: metrics.errorRate,
  topErrors: metrics.topErrors,
  byCategory: metrics.errorsByCategory,
  bySeverity: metrics.errorsBySeverity,
};
```

## Available Methods

### `reportError(error, context?)`

Report an error to Sentry with optional context.

```typescript
this.errorTracking.reportError(error, {
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  tags?: Record<string, string | number>;
  extra?: Record<string, any>;
});
```

### `addBreadcrumb(message, category?, data?, level?)`

Track events leading up to error.

```typescript
this.errorTracking.addBreadcrumb(
  'Payment processed',
  'payment',
  { amount: 1000, currency: 'USD' },
  'info'
);
```

### `captureRequestContext(context)`

Set request context for error tracking.

```typescript
this.errorTracking.captureRequestContext({
  userId: 'user-123',
  requestId: 'req-456',
  tags: { endpoint: '/api/claims' },
});
```

### `getErrorMetrics(timeWindowMs?)`

Get error statistics.

```typescript
const metrics = this.errorTracking.getErrorMetrics(3600000);
// Returns: { errorCount, errorRate, topErrors, etc. }
```

### `getAllErrorLogs()`

Get all stored error logs.

```typescript
const logs = this.errorTracking.getAllErrorLogs();
```

### `clearErrorLogs()`

Clear stored error logs (testing only).

```typescript
this.errorTracking.clearErrorLogs();
```

### `flush(timeoutMs?)`

Flush pending error reports.

```typescript
await this.errorTracking.flush(5000);
```

## Error Severity Levels

| Level    | When to Use | Example |
|----------|-------------|---------|
| INFO     | Client input errors | Invalid email format |
| WARNING  | Recoverable errors | Rate limit hit |
| ERROR    | Serious issues | Database connection failed |
| CRITICAL | System failures | Payment processor down |
| FATAL    | Complete failure | Unable to start application |

```typescript
// Severity is auto-detected from HTTP status:
// - 4xx (except 409, 422) → INFO
// - 429 (rate limit) → WARNING
// - 5xx → ERROR or CRITICAL
// - Critical flag → CRITICAL or FATAL

// Or specify manually:
this.errorTracking.reportError(error, {
  severity: ErrorSeverity.CRITICAL,
});
```

## Error Categories

```typescript
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  CACHE = 'cache',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  CONFIGURATION = 'configuration',
  PAYMENT = 'payment',
  TRANSACTION = 'transaction',
  CLAIM_PROCESSING = 'claim_processing',
  POLICY = 'policy',
  RATE_LIMITING = 'rate_limiting',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}
```

## Common Patterns

### Payment Processing Error

```typescript
@Service()
export class PaymentService {
  constructor(private errorTracking: ErrorTrackingService) {}

  async processPayment(paymentId: string, amount: number) {
    this.errorTracking.addBreadcrumb('Payment started', 'payment', 
      { paymentId, amount }, 'info');

    try {
      // Validate payment
      this.errorTracking.addBreadcrumb('Validating payment', 'payment', 
        { step: 'validation' }, 'debug');

      // Process with provider
      this.errorTracking.addBreadcrumb('Calling payment provider', 'payment', 
        { provider: 'stripe' }, 'debug');

      const result = await stripe.charge(amount);

      this.errorTracking.addBreadcrumb('Payment successful', 'payment', 
        { transactionId: result.id }, 'info');

      return result;
    } catch (error) {
      this.errorTracking.reportError(error, {
        category: 'payment',
        severity: 'critical',
        tags: { paymentId, amount },
        extra: { step: 'payment_processing' },
      });
      throw error;
    }
  }
}
```

### Claim Processing Error

```typescript
@Service()
export class ClaimService {
  constructor(private errorTracking: ErrorTrackingService) {}

  async processClaim(claimId: string) {
    this.errorTracking.addBreadcrumb('Claim processing started', 'claim', 
      { claimId }, 'info');

    try {
      // Validation
      const claim = await this.validateClaim(claimId);

      // Processing
      this.errorTracking.addBreadcrumb('Processing claim', 'claim', 
        { claimId, status: claim.status }, 'info');

      const result = await this.processClaimLogic(claim);

      // Approval
      this.errorTracking.addBreadcrumb('Claim approved', 'claim', 
        { claimId, amount: result.amount }, 'info');

      return result;
    } catch (error) {
      this.errorTracking.reportError(error, {
        category: 'claim_processing',
        tags: { claimId },
        extra: {
          step: 'processing',
          claimData: { claimId },
        },
      });
      throw error;
    }
  }
}
```

### Database Error Handling

```typescript
@Service()
export class UserService {
  constructor(private errorTracking: ErrorTrackingService) {}

  async updateUser(userId: string, data: UpdateUserDto) {
    try {
      return await this.userRepository.update(userId, data);
    } catch (error) {
      this.errorTracking.reportError(error, {
        category: 'database',
        tags: { userId, operation: 'update' },
        extra: { table: 'users', updateData: data },
      });
      throw new InternalServerErrorException('Database update failed');
    }
  }
}
```

## API Endpoints for Dashboards

### Get Metrics

```bash
curl http://localhost:4000/api/v1/error-tracking/metrics?timewindow=3600000
```

Response:
```json
{
  "errorCount": 42,
  "errorRate": 0.0117,
  "topErrors": [
    {
      "errorType": "ValidationError",
      "count": 15,
      "lastOccurrence": "2025-01-15T10:30:00Z",
      "severity": "info",
      "category": "validation"
    }
  ],
  "errorsByCategory": { ... },
  "errorsBySeverity": { ... },
  "recentErrors": [ ... ]
}
```

### Get All Logs

```bash
curl http://localhost:4000/api/v1/error-tracking/logs
```

### Filter by Category

```bash
curl http://localhost:4000/api/v1/error-tracking/logs/category/payment
```

### Filter by Severity

```bash
curl http://localhost:4000/api/v1/error-tracking/logs/severity/critical
```

## Environment Setup

### Development

```bash
SENTRY_DSN=https://your-dev-key@sentry.io/your-dev-project
NODE_ENV=development
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_FILTER_404S=false
```

### Production

```bash
SENTRY_DSN=https://your-prod-key@sentry.io/your-prod-project
NODE_ENV=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_FILTER_404S=true
```

## Testing

### In Unit Tests

```typescript
it('should report error to tracking service', async () => {
  const spy = jest.spyOn(errorTracking, 'reportError');
  
  try {
    await controller.processClaim({}); // This will error
  } catch (error) {
    // Expected
  }

  expect(spy).toHaveBeenCalledWith(
    expect.any(Error),
    expect.objectContaining({
      category: 'claim_processing',
    })
  );
});
```

### Manual Testing

```bash
# Trigger an error
curl http://localhost:4000/api/v1/invalid

# Check error was logged
curl http://localhost:4000/api/v1/error-tracking/logs

# Check metrics
curl http://localhost:4000/api/v1/error-tracking/metrics
```

## Sentry Dashboard Features

1. **Issues** - See all errors grouped
2. **Performance** - Monitor transaction performance
3. **Releases** - Track errors by release
4. **Replays** - Session replay (if enabled)
5. **Alerts** - Configure notification rules
6. **Integrations** - Connect Slack, PagerDuty, etc.

## Tips & Tricks

### Ignore Certain Errors

Use Sentry dashboard rules to ignore specific error patterns:
- Settings → Inbound Filters
- Create rules for errors to ignore

### Tag All Errors with Request ID

Request ID is automatically captured if available in request context.

### Use Custom Fingerprints

Group similar errors in Sentry:
```typescript
Sentry.captureException(error, {
  fingerprint: ['{{ default }}', userId, claimId],
});
```

### Environment-Specific Handling

```typescript
const isDev = process.env.NODE_ENV === 'development';

this.errorTracking.reportError(error, {
  tags: {
    environment: process.env.NODE_ENV,
    isDevelopment: isDev,
  },
});
```

## Need Help?

- Full docs: `/docs/ERROR_TRACKING.md`
- Setup guide: `/docs/ERROR_TRACKING_SETUP.md`
- Sentry docs: https://docs.sentry.io
- Ask the team! 🤝
