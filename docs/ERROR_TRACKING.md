# Error Tracking & Monitoring System

## Overview

The Error Tracking System provides comprehensive error monitoring, classification, and reporting for the Stellar Insured backend. It integrates with **Sentry** for centralized error tracking and provides additional features for error classification, severity assessment, and alerting.

## Features

### ✨ Core Features

1. **Automatic Error Capture**
   - Captures all exceptions automatically
   - Tracks request context (user, URL, method, IP)
   - Collects stack traces and breadcrumbs
   - Integrates with HTTP error handling

2. **Error Classification**
   - Automatic categorization (validation, auth, database, etc.)
   - Severity levels (info, warning, error, critical, fatal)
   - Pattern recognition and aggregation
   - Custom classification rules

3. **Request Context**
   - User identification
   - Request IDs for tracing
   - Request/response headers
   - User Agent and IP tracking
   - Custom tags and metadata

4. **Performance & Profiling**
   - Request duration tracking
   - Performance metrics
   - Distributed tracing
   - Database query monitoring

5. **Error Analytics**
   - Error metrics dashboard
   - Top errors reporting
   - Error trends over time
   - Error rate monitoring

6. **Critical Alerts**
   - Configurable alert triggers
   - Multiple notification channels
   - Severity-based routing
   - Real-time notifications

## Architecture

```
┌─────────────────────────────────────────┐
│      Global Exception Filter             │
│  (EnhancedGlobalExceptionFilter)         │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│      Error Tracking Service              │
│   (ErrorTrackingService)                 │
└────────┬─────────────────┬───────────────┘
         │                 │
         ▼                 ▼
    Sentry SDK      Error Storage
   (Cloud/SelfHosted) (In-Memory)
         │                 │
         ▼                 ▼
    Error Reports  Error Analytics
         │                 │
         └────┬────────────┘
              ▼
   Error Tracking Dashboard API
   (/api/v1/error-tracking/*)
```

## Configuration

### Environment Variables

```bash
# Required
SENTRY_DSN=https://<key>@<organization>.ingest.sentry.io/<project>

# Recommended
NODE_ENV=production
APP_VERSION=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENTRY_FILTER_404S=false
```

### Sentry Setup

1. **Create Sentry Account**
   - Go to https://sentry.io
   - Sign up for free or enterprise plan
   - Create a new project for Node.js/NestJS

2. **Get DSN**
   - Copy the DSN from project settings
   - Format: `https://<publicKey>@<organization>.ingest.sentry.io/<projectId>`

3. **Configure Environment**
   - Add `SENTRY_DSN` to `.env` file
   - Set `NODE_ENV` to match your environment

## Usage

### Automatic Error Tracking

All errors are automatically tracked without any additional code:

```typescript
// This error will be automatically captured and tracked
throw new BadRequestException('Invalid input');
```

### Custom Error Context

Add custom context to error tracking:

```typescript
import { ErrorTrackingService, ErrorContext } from '@stellar/common/error-tracking';

@Controller('claims')
export class ClaimsController {
  constructor(private errorTracking: ErrorTrackingService) {}

  @Post()
  createClaim(@Body() dto: CreateClaimDto) {
    try {
      // ... business logic
    } catch (error) {
      // Report with custom context
      this.errorTracking.reportError(error, {
        userId: 'user-123',
        tags: {
          claimType: 'health',
          amount: 1000,
        },
        extra: {
          claimData: dto,
        },
      });
      throw error;
    }
  }
}
```

### Add Breadcrumbs

Track events leading up to an error:

```typescript
this.errorTracking.addBreadcrumb(
  'User initiated claim processing',
  'claim',
  { claimId: 'claim-123' },
  'info'
);
```

### Capture Request Context

Manually capture request context:

```typescript
this.errorTracking.captureRequestContext({
  userId: user.id,
  requestId: request.id,
  tags: {
    environment: 'production',
    version: '1.0.0',
  },
});
```

### Get Error Metrics

Retrieve error statistics for dashboards:

```typescript
const metrics = this.errorTracking.getErrorMetrics(3600000); // Last hour
console.log(metrics);
// {
//   errorCount: 42,
//   errorRate: 0.0117,
//   topErrors: [...],
//   errorsByCategory: {...},
//   errorsBySeverity: {...},
//   recentErrors: [...]
// }
```

## Error Severity Levels

| Level    | Use Case                           | Auto-Alert |
|----------|-------------------------------------|-----------|
| INFO     | Validation/input errors            | No        |
| WARNING  | Rate limiting, recoverable errors  | No        |
| ERROR    | Serious errors, retryable issues   | No        |
| CRITICAL | System failures, urgent attention | Yes       |
| FATAL    | Total system failure               | Yes       |

## Error Categories

| Category | Examples |
|----------|----------|
| VALIDATION | Invalid input, failed constraints |
| AUTHENTICATION | Login failures, JWT issues |
| AUTHORIZATION | Permission denied, role issues |
| NOT_FOUND | Resource not found, 404 errors |
| CONFLICT | Duplicate resources, state conflicts |
| DATABASE | Query failures, connection issues |
| CACHE | Cache miss, Redis failures |
| EXTERNAL_SERVICE | API timeouts, 3rd party failures |
| PAYMENT | Payment processing errors |
| CLAIM_PROCESSING | Claim workflow errors |
| POLICY | Policy validation errors |
| TIMEOUT | Request timeouts, slow queries |
| SYSTEM | Unexpected runtime errors |
| RATE_LIMITING | API rate limits exceeded |

## API Endpoints

### Get Error Metrics

```bash
GET /api/v1/error-tracking/metrics?timewindow=3600000
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
      "lastOccurrence": "2025-01-15T10:30:00.000Z",
      "severity": "info",
      "category": "validation"
    }
  ],
  "errorsByCategory": {
    "validation": 15,
    "authentication": 2,
    "database": 5
  },
  "errorsBySeverity": {
    "info": 20,
    "warning": 10,
    "error": 12
  },
  "recentErrors": [...]
}
```

### Get All Error Logs

```bash
GET /api/v1/error-tracking/logs
```

### Filter by Category

```bash
GET /api/v1/error-tracking/logs/category/database
```

### Filter by Severity

```bash
GET /api/v1/error-tracking/logs/severity/critical
```

### Health Check

```bash
GET /api/v1/error-tracking/health
```

### Clear Logs (Testing)

```bash
POST /api/v1/error-tracking/logs/clear
```

### Flush Pending Reports

```bash
POST /api/v1/error-tracking/flush
```

## Sentry Dashboard

Access your Sentry dashboard for advanced features:

- **Error Monitoring**: Real-time error tracking
- **Performance Monitoring**: Track request performance
- **Release Tracking**: Monitor releases and regressions
- **Team Alerts**: Configure notification rules
- **Integration**: Connect to Slack, PagerDuty, etc.

### Common Sentry Features

1. **Issues Page**
   - See all errors and issues
   - Group similar errors
   - Track error trends

2. **Performance Page**
   - Monitor slow transactions
   - Identify bottlenecks
   - Compare performance over time

3. **Releases Page**
   - Track errors by release
   - Monitor for regressions
   - Deploy tracking

4. **Alerts**
   - Set up alert rules
   - Configure notification channels
   - Team routing

## Best Practices

### 1. Sensitive Data Sanitization

The system automatically filters sensitive information:

```typescript
// These are automatically redacted in errors:
- passwords
- tokens
- API keys
- credit card numbers
- SSNs
```

### 2. Error Severity Classification

Let the system auto-classify errors based on HTTP status:

```typescript
// 4xx errors → INFO/WARNING
// 5xx errors → ERROR/CRITICAL
// ~500 errors with critical flag → CRITICAL
```

### 3. User Identification

Always include user context:

```typescript
// JWT claims are automatically extracted
// Or provide x-user-id header
// This helps in customer support
```

### 4. Breadcrumbs for Debugging

Use breadcrumbs to trace events:

```typescript
// Good: Tracks user journey to error
this.errorTracking.addBreadcrumb('User login', 'auth');
this.errorTracking.addBreadcrumb('Claim created', 'claim');
this.errorTracking.addBreadcrumb('Payment processed', 'payment');
// Then error happens - you see full context
```

### 5. Sample Rate Configuration

Configure sample rates based on traffic:

```bash
# Development: 100% sampling
SENTRY_TRACES_SAMPLE_RATE=1.0

# Staging: 50% sampling  
SENTRY_TRACES_SAMPLE_RATE=0.5

# Production: 10% sampling (adjust based on traffic)
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### 6. Environment Control

Tag errors by environment:

```bash
NODE_ENV=production  # Helps filter in Sentry
APP_VERSION=1.0.0    # Track errors by version
```

## Troubleshooting

### Error Tracking Not Working

1. **Check Sentry DSN**
   ```bash
   # Verify DSN is set
   echo $SENTRY_DSN
   ```

2. **Check Logs**
   ```bash
   # Look for initialization messages
   npm run start:dev | grep -i sentry
   ```

3. **Test Error**
   ```bash
   # Make a request that causes an error
   curl http://localhost:4000/api/v1/invalid
   ```

4. **Verify in Sentry Dashboard**
   - Go to your Sentry project
   - Check Issues section
   - Should see recent errors

### Too Much Noise

1. **Filter 404s**
   ```bash
   SENTRY_FILTER_404S=true
   ```

2. **Reduce Sample Rate**
   ```bash
   SENTRY_TRACES_SAMPLE_RATE=0.01  # 1% sampling
   ```

3. **Configure Server-side Rules**
   - Use Sentry dashboard
   - Create filtering rules
   - Ignore certain error patterns

### Performance Impact

1. **Monitor Performance**
   ```bash
   # Use health check endpoint
   GET /api/v1/error-tracking/health
   ```

2. **Optimize Sample Rates**
   - Lower sample rates for high-traffic
   - Use conditional sampling
   - Profile to identify bottlenecks

## Integration Examples

### With Payment Service

```typescript
@Injectable()
export class PaymentService {
  constructor(private errorTracking: ErrorTrackingService) {}

  async processPayment(paymentId: string) {
    try {
      this.errorTracking.addBreadcrumb(
        `Processing payment ${paymentId}`,
        'payment'
      );
      // ... process payment
    } catch (error) {
      this.errorTracking.reportError(error, {
        category: 'payment',
        extra: { paymentId },
        severity: 'critical',
      });
      throw error;
    }
  }
}
```

### With Claims Service

```typescript
@Injectable()
export class ClaimsService {
  constructor(private errorTracking: ErrorTrackingService) {}

  async processClaim(claimId: string) {
    try {
      this.errorTracking.addBreadcrumb(
        `Processing claim ${claimId}`,
        'claim'
      );
      // ... process claim
    } catch (error) {
      this.errorTracking.reportError(error, {
        category: 'claim_processing',
        tags: { claimId },
      });
      throw error;
    }
  }
}
```

### With Custom Guards

```typescript
@Injectable()
export class ErrorTrackingGuard implements CanActivate {
  constructor(private errorTracking: ErrorTrackingService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    this.errorTracking.captureRequestContext({
      userId: request.user?.id,
      requestId: request.id,
      tags: {
        route: request.route?.path,
        method: request.method,
      },
    });

    return true;
  }
}
```

## Monitoring & Dashboards

### Key Metrics to Monitor

1. **Error Rate**
   - Errors per minute
   - Errors per user
   - Errors by endpoint

2. **Error Types**
   - Most common errors
   - Error trends
   - Error grouping

3. **Impact Analysis**
   - Number of affected users
   - Error recovery time
   - Business impact

### Setting Up Alerts

1. **Critical Errors Alert**
   - Trigger: Any critical/fatal error
   - Action: Slack + Email + PagerDuty

2. **Error Rate Spike Alert**
   - Trigger: Error rate > 5% spike
   - Action: Email team lead

3. **Payment Error Alert**
   - Trigger: Payment errors > 3
   - Action: Immediate PagerDuty alert

## Support & Debugging

### Enable Debug Logging

```bash
# In development
DEBUG=stellar:* npm run start:dev
```

### Check Error Tracking Status

```bash
curl http://localhost:4000/api/v1/error-tracking/health
```

### Export Error Data

```bash
# Get all logs
curl http://localhost:4000/api/v1/error-tracking/logs > errors.json

# Get specific category
curl http://localhost:4000/api/v1/error-tracking/logs/category/database
```

## Further Resources

- [Sentry Documentation](https://docs.sentry.io)
- [NestJS Error Handling](https://docs.nestjs.com/exception-filters)
- [Error Tracking Best Practices](https://docs.sentry.io/product/best-practices/)
- [Sentry Performance Monitoring](https://docs.sentry.io/performance/)

## Support

For issues or questions:
1. Check Sentry dashboard for real errors
2. Review error logs via API
3. Check application logs
4. Contact the development team
