# CSRF Protection Implementation

## Overview

This implementation adds comprehensive CSRF (Cross-Site Request Forgery) protection to the Stellar Insured Backend API, addressing security vulnerability #228.

## Security Impact

- **SEVERITY**: High
- **Attack Vector**: Cross-site request forgery
- **Affected Users**: Logged-in web users

## Implementation Details

### 1. CSRF Module (`src/csrf/`)

#### Components:
- **`csrf.module.ts`**: NestJS module for CSRF functionality
- **`csrf.service.ts`**: Service for CSRF configuration and options
- **`csrf.guard.ts`**: Guard to enforce CSRF protection on sensitive endpoints
- **`csrf.controller.ts`**: Controller providing CSRF token endpoint

### 2. Middleware Configuration (`src/main.ts`)

- Added `cookie-parser` middleware for CSRF cookie support
- Configured `csurf` middleware with:
  - HTTP-only cookies
  - Secure flag in production
  - Strict SameSite policy
  - Ignoring GET, HEAD, OPTIONS methods

### 3. Protected Endpoints

The following state-changing endpoints now require CSRF protection:

#### Authentication (`src/auth/auth.controller.ts`)
- `POST /api/auth/logout` - User logout
- `POST /api/auth/revoke` - Token revocation

#### User Management (`src/user/user.controller.ts`)
- `POST /api/user` - Create user
- `PUT /api/user/:id` - Update user

#### Insurance (`src/insurance/insurance.controller.ts`)
- `POST /api/insurance/purchase` - Purchase insurance policy
- `POST /api/insurance/claims/:claimId/assess` - Assess claim
- `POST /api/insurance/claims/:claimId/pay` - Pay claim
- `POST /api/insurance/reinsurance` - Create reinsurance contract

#### Governance (`src/governance/governance.controller.ts`)
- `POST /governance/proposals` - Create proposal
- `POST /governance/proposals/:id/vote` - Vote on proposal

### 4. CSRF Token Endpoint

- **GET** `/api/csrf/token` - Retrieve CSRF token for frontend applications

## Frontend Integration

Frontend applications must:

1. **Fetch CSRF token** before making state-changing requests:
   ```javascript
   const response = await fetch('/api/csrf/token');
   const { csrfToken } = await response.json();
   ```

2. **Include CSRF token** in requests:
   - As a header: `X-CSRF-Token: <token>`
   - Or in request body as `_csrf: <token>`

3. **Handle cookie-based CSRF**:
   - The CSRF token is automatically set as a cookie
   - The middleware validates token from cookie against request

## Security Configuration

### Environment Variables
- `NODE_ENV` - Controls secure cookie flag (production enables secure flag)

### Cookie Settings
- **HTTP-Only**: Prevents JavaScript access
- **Secure**: HTTPS only in production
- **SameSite**: Strict policy prevents cross-site requests

## Testing

### CSRF Protection Test
```bash
# Test without CSRF token (should fail)
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <token>" \
  # Missing CSRF token - should return 403

# Test with CSRF token (should succeed)
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <token>" \
  -H "X-CSRF-Token: <csrf-token>"
```

## Migration Notes

1. **Breaking Change**: All state-changing endpoints now require CSRF tokens
2. **Frontend Updates**: Frontend applications must be updated to handle CSRF tokens
3. **API Documentation**: Updated with CSRF requirements

## Compliance

This implementation addresses OWASP CSRF protection recommendations:
- Synchronizer Token Pattern
- Double Submit Cookie Pattern
- SameSite Cookie Attributes

## Monitoring

- CSRF failures result in HTTP 403 Forbidden responses
- Failed attempts should be monitored for potential attack patterns
- Consider implementing rate limiting on CSRF failures

## Future Enhancements

1. **Rotating CSRF Tokens**: Implement token rotation for enhanced security
2. **CSRF Exemptions**: Add configurable exemptions for specific use cases
3. **Custom CSRF Validation**: Implement domain-specific validation rules
