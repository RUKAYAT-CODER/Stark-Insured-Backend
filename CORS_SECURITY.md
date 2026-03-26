# CORS Security Implementation

## Overview
This document describes the strict CORS policy implementation for the Stellar-Insured-Backend to address security vulnerabilities.

## Security Issue Resolved
- **Previous**: Wildcard CORS (`app.enableCors()`) allowed all origins
- **Impact**: High severity - CSRF attacks from untrusted sites
- **Solution**: Strict origin validation with environment-based configuration

## Implementation Details

### Configuration
The CORS policy is configured via environment variables:

```env
# Comma-separated list of allowed origins
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Enable credentials for authenticated requests
CORS_CREDENTIALS=true
```

### Behavior by Environment

#### Development Mode (`NODE_ENV=development`)
- Uses `CORS_ORIGIN` if provided
- Falls back to `['http://localhost:3000', 'http://localhost:3001']` if not set
- Allows multiple localhost origins for flexibility

#### Production Mode (`NODE_ENV=production`)
- **Requires** explicit `CORS_ORIGIN` configuration
- **No fallback origins** - empty array if not configured
- Prevents unauthorized access by default

### CORS Settings
- **Origin**: Whitelisted origins only (no wildcards)
- **Methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Allowed Headers**: Content-Type, Authorization, X-Requested-With, X-CSRF-Token
- **Exposed Headers**: X-Total-Count, X-CSRF-Token
- **Max Age**: 86400 seconds (24 hours)
- **Credentials**: Configurable via `CORS_CREDENTIALS`

## Production Deployment Requirements

### Required Environment Variables
```env
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
CORS_CREDENTIALS=true  # Set to false if not using cookies/auth
```

### Security Benefits
1. **CSRF Protection**: Only trusted origins can make requests
2. **No Wildcards**: Explicit origin whitelist prevents unauthorized access
3. **Environment Isolation**: Development defaults don't affect production
4. **Configurable**: Easy to add/remove origins without code changes

## Testing the Implementation

### Development Testing
```bash
# Test with allowed origin
curl -H "Origin: http://localhost:3000" http://localhost:4000/api/v1

# Test with blocked origin (should fail)
curl -H "Origin: http://malicious-site.com" http://localhost:4000/api/v1
```

### Production Testing
```bash
# Test with allowed production origin
curl -H "Origin: https://yourdomain.com" https://api.yourdomain.com/api/v1

# Test with blocked origin (should fail)
curl -H "Origin: http://localhost:3000" https://api.yourdomain.com/api/v1
```

## Migration Notes

### Before (Insecure)
```typescript
app.enableCors(); // Allows all origins
```

### After (Secure)
```typescript
const isProduction = configService.get<string>('NODE_ENV') === 'production';
const corsOrigin = configService.get<string>('CORS_ORIGIN');
const corsCredentials = configService.get<boolean>('CORS_CREDENTIALS', false);

const allowedOrigins = corsOrigin ? corsOrigin.split(',').map(origin => origin.trim()) : [];
const origins = isProduction 
  ? (allowedOrigins.length > 0 ? allowedOrigins : [])
  : (allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:3000', 'http://localhost:3001']);

app.enableCors({
  origin: origins,
  credentials: corsCredentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'X-CSRF-Token'],
  maxAge: 86400,
});
```

## Security Checklist
- [x] Removed wildcard CORS
- [x] Implemented origin whitelist
- [x] Environment-based configuration
- [x] Production requires explicit origins
- [x] Documentation provided
- [x] Backward compatibility for development
