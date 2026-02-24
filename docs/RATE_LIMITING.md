# API Rate Limiting Documentation

## Overview

This document describes the standardized rate limiting implementation across all Stellar Insured Backend API endpoints. Rate limiting is implemented using a tiered approach with environment-specific configurations.

## Rate Limiting Tiers

### 1. Public Endpoints
- **Limit**: 30 requests per minute
- **Use Case**: Endpoints accessible without authentication
- **Examples**: Health checks, public documentation
- **Headers**: `X-RateLimit-Tier: public`

### 2. Authenticated Endpoints  
- **Limit**: 200 requests per minute
- **Use Case**: Standard endpoints requiring valid JWT token
- **Examples**: User profile, basic data retrieval
- **Headers**: `X-RateLimit-Tier: authenticated`

### 3. Payment Endpoints
- **Limit**: 20 requests per minute
- **Use Case**: Financial operations and payment processing
- **Examples**: Payment processing, refunds, transaction history
- **Headers**: `X-RateLimit-Tier: payment`

### 4. Admin Endpoints
- **Limit**: 500 requests per minute
- **Use Case**: Administrative operations with elevated permissions
- **Examples**: User management, system configuration, analytics
- **Headers**: `X-RateLimit-Tier: admin`

### 5. Authentication Endpoints
- **Limit**: 10 requests per minute
- **Use Case**: Login, registration, token refresh
- **Examples**: `/auth/login`, `/auth/register`, `/auth/token/refresh`
- **Headers**: `X-RateLimit-Tier: auth`

### 6. Sensitive Operations
- **Limit**: 15 requests per minute
- **Use Case**: High-risk operations requiring additional protection
- **Examples**: Claims creation, policy changes, sensitive data updates
- **Headers**: `X-RateLimit-Tier: sensitive`

## Rate Limit Headers

All rate-limited responses include the following headers:

### Standard Headers
- `X-RateLimit-Limit`: The maximum number of requests allowed in the current window
- `X-RateLimit-Remaining`: The number of requests remaining in the current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit window resets
- `X-RateLimit-Policy`: Rate limit policy in format `{limit};w={window_seconds}`

### Extended Headers
- `X-RateLimit-Tier`: The rate limiting tier applied to the endpoint
- `Retry-After`: Seconds to wait before retrying (only on 429 responses)
- `X-Circuit-Breaker`: Indicates if circuit breaker is open (only on 503 responses)

## Endpoint-Specific Rate Limits

### Authentication Module (`/auth`)
| Endpoint | Method | Tier | Limit | Purpose |
|-----------|---------|-------|---------|
| `/auth/register` | POST | auth | 10/min | User registration |
| `/auth/login` | POST | auth | 10/min | User login |
| `/auth/login/challenge` | POST | auth | 10/min | Login challenge request |
| `/auth/login/password` | POST | auth | 10/min | Password login |
| `/auth/token/refresh` | POST | auth | 10/min | Token refresh |
| `/auth/logout` | POST | authenticated | 200/min | User logout |
| `/auth/mfa/*` | POST/GET | authenticated | 200/min | MFA operations |
| `/auth/sessions` | GET | authenticated | 200/min | Session management |

### Claims Module (`/claims`)
| Endpoint | Method | Tier | Limit | Purpose |
|-----------|---------|-------|---------|
| `/claims` | POST | sensitive | 15/min | Create new claim |
| `/claims/:id` | GET | authenticated | 200/min | Get claim by ID |
| `/claims/user/me` | GET | authenticated | 200/min | Get user claims |
| `/claims/policy/:id` | GET | admin | 500/min | Get claims by policy |
| `/claims/:id/status` | PATCH | admin | 500/min | Update claim status |
| `/claims/admin/*` | GET | admin | 500/min | Admin operations |

### Payments Module (`/payments`)
| Endpoint | Method | Tier | Limit | Purpose |
|-----------|---------|-------|---------|
| `/payments/process` | POST | payment | 20/min | Process payment |
| `/payments/:id/confirm` | POST | payment | 20/min | Confirm payment |
| `/payments/:id/cancel` | POST | payment | 20/min | Cancel payment |
| `/payments/:id` | GET | authenticated | 200/min | Get payment details |
| `/payments/user/me` | GET | authenticated | 200/min | Get user payments |
| `/payments/:id/refund` | POST | payment | 20/min | Process refund |
| `/payments/admin/*` | GET/POST | admin | 500/min | Admin operations |

### Policy Module (`/policies`)
| Endpoint | Method | Tier | Limit | Purpose |
|-----------|---------|-------|---------|
| `/policies` | POST | sensitive | 15/min | Create policy |
| `/policies/:id` | GET | authenticated | 200/min | Get policy details |
| `/policies/user/me` | GET | authenticated | 200/min | Get user policies |
| `/policies/admin/*` | GET/POST | admin | 500/min | Admin operations |

## Environment-Specific Overrides

### Development Environment
- All limits are **doubled** for easier testing
- More lenient circuit breaker thresholds
- Extended monitoring windows

### Production Environment
- Standard limits as documented above
- Stricter circuit breaker thresholds
- Enhanced monitoring and alerting

### Staging Environment
- Standard limits with moderate testing allowances
- Balanced monitoring configuration

## Rate Limit Responses

### HTTP 429 Too Many Requests
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded for [tier description]. Please try again in [X] seconds.",
  "retryAfter": 60,
  "path": "/api/endpoint",
  "timestamp": "2024-02-24T22:00:00.000Z",
  "tracker": "user:12345",
  "tier": "payment",
  "limit": 20,
  "window": 60
}
```

### HTTP 503 Service Unavailable (Circuit Breaker)
```json
{
  "statusCode": 503,
  "error": "Service Unavailable", 
  "message": "Service temporarily unavailable due to high load",
  "path": "/api/endpoint",
  "timestamp": "2024-02-24T22:00:00.000Z",
  "tracker": "user:12345",
  "retryAfter": 300
}
```

## Tracking Strategy

Rate limits are tracked using the following priority:

1. **User ID** (for authenticated requests)
   - Format: `user:{userId}`
   - Most precise tracking method

2. **Wallet Address** (for blockchain operations)
   - Format: `wallet:{address}`
   - Used for auth endpoints

3. **IP Address** (fallback for unauthenticated requests)
   - Format: `ip:{address}`
   - Includes X-Forwarded-For handling

## Circuit Breaker Integration

The rate limiting system includes circuit breaker functionality:

- **Failure Threshold**: 10 consecutive violations
- **Timeout**: 5 minutes
- **Success Threshold**: 2 successful requests to close circuit
- **Monitoring**: Real-time circuit status tracking

## Monitoring and Metrics

### Available Metrics
- Total requests per tier
- Violation rates and trends
- Top violators and problematic endpoints
- Real-time system status
- Circuit breaker events

### Metrics Endpoints (Admin Only)
- `GET /admin/rate-limit/stats` - Comprehensive statistics
- `GET /admin/rate-limit/trends` - Historical trends
- `GET /admin/rate-limit/export` - Export metrics (JSON/Prometheus)

## Best Practices

### For API Consumers
1. **Handle 429 responses gracefully** with exponential backoff
2. **Monitor rate limit headers** to avoid hitting limits
3. **Use appropriate authentication** to benefit from higher limits
4. **Implement client-side caching** for frequently accessed data
5. **Batch operations** where possible to reduce request count

### For Developers
1. **Choose appropriate rate limit tiers** for new endpoints
2. **Add comprehensive documentation** for rate-limited endpoints
3. **Test rate limiting behavior** in development
4. **Monitor violation patterns** for potential abuse detection
5. **Consider user experience** when setting limits

## Configuration

Rate limits can be configured via environment variables:

```bash
# Override default limits
RATE_LIMIT_PUBLIC_LIMIT=50
RATE_LIMIT_AUTHENTICATED_LIMIT=300
RATE_LIMIT_PAYMENT_LIMIT=25
RATE_LIMIT_ADMIN_LIMIT=600
RATE_LIMIT_AUTH_ENDPOINTS_LIMIT=15
RATE_LIMIT_SENSITIVE_LIMIT=20

# Override time windows (in milliseconds)
RATE_LIMIT_PUBLIC_TTL=120000
RATE_LIMIT_AUTHENTICATED_TTL=120000
RATE_LIMIT_PAYMENT_TTL=120000
```

## Security Considerations

1. **Rate limit evasion detection** monitors for tracker manipulation
2. **Automatic IP blocking** for excessive violations
3. **Geographic analysis** of violation patterns
4. **Integration with fraud detection** systems
5. **Audit logging** of all rate limit events

## Troubleshooting

### Common Issues
1. **Unexpected 429 errors**: Check if sharing IP addresses or using multiple accounts
2. **Rate limit not working**: Verify guard configuration and module imports
3. **Metrics not appearing**: Ensure monitoring service is properly injected
4. **Circuit breaker issues**: Check failure threshold configuration

### Debug Information
Enable debug logging to see rate limit decisions:
```bash
LOG_LEVEL=debug
```

This will log detailed information about rate limit calculations and decisions.
