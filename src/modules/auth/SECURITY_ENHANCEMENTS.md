# Security Enhancement Documentation

## Overview

This document outlines the comprehensive security enhancements implemented in the Stellar Insured Backend authentication system. These enhancements follow OWASP guidelines and industry best practices for secure authentication and authorization.

## 🔒 Features Implemented

### 1. JWT Refresh Token Mechanism

**Purpose**: Implement secure token rotation and minimal access token lifetime

**Implementation**:
- **Access Tokens**: Short-lived tokens (15 minutes by default) used for API requests
- **Refresh Tokens**: Long-lived tokens (7 days by default) stored in database with hashing
- **Token Rotation**: Automatic rotation on refresh to minimize token reuse attacks
- **Token Tracking**: Each token maintains metadata (IP, User Agent, last used time)

**Configuration** (in `.env`):
```
JWT_SECRET=<long-secure-string>
JWT_REFRESH_SECRET=<different-long-secure-string>
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=7d
TOKEN_ROTATION_ENABLED=true
```

**Database Tables**:
- `refresh_tokens`: Stores refresh token hashes with metadata
- Sessions linked to refresh tokens for device tracking

**API Endpoints**:
```
POST /auth/token/refresh
- Request: { refreshToken: string, sessionToken?: string }
- Response: { accessToken, expiresIn, expiresAt, tokenType }
```

### 2. Token Blacklist/Revocation System

**Purpose**: Prevent revoked tokens from being used (logout functionality)

**Implementation**:
- **Database Storage**: All revoked tokens stored in `token_blacklist` table
- **Redis Cache**: Fast in-memory lookup for recently revoked tokens
- **TTL Management**: Entries automatically expire when token reaches expiration
- **Atomic Operations**: Hash-based token storage prevents plain token exposure

**Security Features**:
- SHA-256 hashing of tokens before storage
- Efficient dual-layer caching (Redis + Database)
- Automatic cleanup of expired entries
- Audit trail with revocation reasons

**API Endpoints**:
```
POST /auth/logout
- Request: { refreshToken?: string, sessionToken?: string, logoutAll?: boolean }
- Behavior:
  - logoutAll=true: Revokes all user tokens and sessions
  - logoutAll=false: Revokes specific token/session only
```

### 3. Multi-Factor Authentication (MFA)

**Purpose**: Add additional authentication layer for sensitive operations

**Supported Methods**:
- **TOTP (Time-based One-Time Password)**: RFC 6238 compliant
- **Backup Codes**: 10 alphanumeric codes for account recovery
- **SMS (Future)**: SMS-based OTP delivery

**Implementation Details**:

**TOTP Setup Flow**:
1. User requests MFA setup
2. Server generates secret key
3. QR code generated for authenticator app
4. User scans QR code or enters secret manually
5. User provides 6-digit code from authenticator
6. Server verifies and enables MFA
7. Backup codes generated and provided

**Data Storage**:
- Secret stored encrypted in `mfa_secrets` table
- Backup codes stored as SHA-256 hashes
- Verification timestamp tracked for audit

**Backup Code Management**:
- 10 unique 8-character codes per user
- Each code can only be used once
- Remaining count tracked in user interface
- Regeneration available at any time

**API Endpoints**:
```
POST /auth/mfa/setup/totp
- Response: { qrCode, secret, manualEntry, backupCodes }

POST /auth/mfa/setup/verify
- Request: { secret, totpCode }
- Response: { success, backupCodesRemaining }

GET /auth/mfa/status
- Response: { totpEnabled, smsEnabled, backupCodesRemaining }

POST /auth/mfa/backup-codes/regenerate
- Response: { backupCodes }
```

**Verification During Login**:
- If MFA enabled: After successful signature verification
- Session is created but marked as MFA unverified
- User must provide TOTP code or backup code
- Upon successful verification, session is marked as verified
- Token uses session-based claim for verification tracking

### 4. Session Management System

**Purpose**: Track active user sessions and enable device management

**Features**:
- **Device Tracking**: Identifies device type, browser, OS
- **IP Tracking**: Monitors login locations
- **Session Revocation**: Ability to revoke specific devices
- **Multi-Session Support**: Users can have multiple active sessions
- **Automatic Expiration**: Sessions expire after 30 days

**Device Information Extraction**:
- Uses `ua-parser-js` library for User Agent parsing
- Captures: Device name, Browser type, Operating System
- IP address extracted from request headers

**MFA Verification Tracking**:
- Each session tracks MFA completion status
- Required for endpoints decorated with MFA guard
- Automatically verified on subsequent requests

**Database Table**: `sessions`
- `sessionToken`: Unique session identifier (hashed)
- `userId`: Owner of session
- `status`: ACTIVE | REVOKED | EXPIRED
- `isMfaVerified`: Boolean MFA verification flag
- `deviceName`, `browser`, `operatingSystem`: Device info
- `ipAddress`: Login IP (for security alerts)
- `lastActivityAt`: Last request timestamp
- `expiresAt`: Session expiration date

**API Endpoints**:
```
GET /auth/sessions
- Response: { sessions: [...], count: number }
- Fields: id, deviceName, browser, OS, ipAddress, createdAt, lastActivityAt, status

DELETE /auth/sessions/:sessionId
- Revokes a specific session
```

### 5. Enhanced Role-Based Access Control (RBAC)

**Purpose**: Implement granular permission system for all operations

**Permission Categories**:

**Claims**:
- `claim:view`: View claims
- `claim:create`: Create new claims
- `claim:edit`: Edit existing claims
- `claim:delete`: Delete claims
- `claim:approve`: Approve claims
- `claim:reject`: Reject claims

**Policies**:
- `policy:view`, `policy:create`, `policy:edit`, `policy:delete`, `policy:approve`

**DAO Governance**:
- `dao:view`: View DAO data
- `dao:proposal:view`: View proposals
- `dao:proposal:create`: Create proposals
- `dao:proposal:finalize`: Finalize proposals
- `dao:vote`: Cast votes
- `dao:manage`: Manage DAO settings

**Oracle**:
- `oracle:view`: View oracle data
- `oracle:manage`: Manage oracle configurations
- `oracle:report`: Submit oracle reports

**Risk Pool**:
- `risk_pool:view`: View risk pool data
- `risk_pool:manage`: Manage risk pools
- `risk_pool:liquidate`: Liquidate positions

**Payments**:
- `payment:view`: View payments
- `payment:process`: Process payments
- `payment:refund`: Process refunds

**Analytics**:
- `analytics:view`: View analytics
- `analytics:export`: Export analytics data

**Admin**:
- `user:view`, `user:manage`, `user:suspend`, `user:delete`
- `system:config`: System configuration
- `audit_log:view`: View audit logs
- `security:tokens:revoke`: Revoke user tokens

**Role Hierarchy**:
1. **USER**: Basic permissions for claims, policies, DAO participation
2. **MODERATOR**: User permissions + claim/policy approval/rejection
3. **GOVERNANCE**: DAO management and risk pool administration
4. **ADMIN**: Full administrative control except system config
5. **SUPER_ADMIN**: All permissions

**Permission Enforcement**:
- `@UseGuards(PermissionGuard)` decorator on routes
- `@Permissions(Permission.CLAIM_APPROVE)` specifies required permissions
- Automatically validated against user's role-based permissions
- Returns 403 Forbidden if insufficient permissions

### 6. Token Security Standards

**OWASP Compliance**:
- ✅ Short-lived access tokens (15 min)
- ✅ Secure refresh token rotation
- ✅ Token binding to user/session
- ✅ HTTPS-only token transmission
- ✅ HttpOnly cookies (optional: for stateless API)
- ✅ SameSite cookie protection
- ✅ Token hashing in database

**Token Payload** (Claims):
```javascript
{
  sub: "user-id",              // Subject (user ID)
  walletAddress: "...",         // Stellar wallet
  email: "user@example.com",   // Email
  roles: ["USER", "MODERATOR"], // User roles
  type: "access|refresh",       // Token type
  sessionId: "session-id",      // Linked session
  jti: "jwt-id",                // JWT ID for tracking
  iat: 1234567890,              // Issued at
  exp: 1234568890               // Expiration
}
```

**Token Rotation Flow**:
1. Client receives access token + refresh token on login
2. Access token used for API requests
3. When access token expires, client sends refresh token
4. Server validates refresh token
5. Old refresh token revoked (stored in blacklist)
6. New access token + refresh token issued
7. Process repeats (sliding window)

## 🔐 Security Best Practices

### 1. Token Transmission
```
Authorization: Bearer <access_token>
X-Session-Token: <session_token> (optional, for MFA and device tracking)
```

### 2. Secure Configuration
```
# .env variables
JWT_SECRET=<MUST_BE_STRONG_32+_CHARS>
JWT_REFRESH_SECRET=<DIFFERENT_STRONG_32+_CHARS>
NODE_ENV=production
HTTPS_ONLY=true
CORS_ORIGIN=http://localhost:3000,https://app.domain.com
```

### 3. Refresh Token Rotation
- Every token refresh rotates both tokens
- Old tokens revoked immediately
- Implements "sliding window" pattern
- Limits token lifetime even with continued use

### 4. Rate Limiting
- Login endpoint: 10 requests per hour
- Token refresh: 5 requests per 15 minutes
- Challenge generation: 5 requests per 15 minutes

### 5. Account Security
- Failed login attempts tracked
- Account lockout after 5 failures
- 15-minute lockout window
- MFA required for admin-level operations

## 🚀 Implementation Guide

### Database Migrations

```sql
-- Refresh tokens table
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR NOT NULL UNIQUE,
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,
  revoked_reason VARCHAR,
  expires_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token blacklist table
CREATE TABLE token_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash VARCHAR NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  reason VARCHAR,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MFA secrets table
CREATE TABLE mfa_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  method VARCHAR NOT NULL,
  secret TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  backup_codes TEXT[] NOT NULL,
  used_backup_codes INTEGER[] DEFAULT '{}',
  phone_number VARCHAR,
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  session_token_hash VARCHAR NOT NULL UNIQUE,
  status VARCHAR DEFAULT 'ACTIVE',
  ip_address INET,
  user_agent TEXT,
  device_name VARCHAR,
  browser VARCHAR,
  operating_system VARCHAR,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  revoked_reason VARCHAR,
  last_activity_at TIMESTAMP,
  is_mfa_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_token_blacklist_user_id ON token_blacklist(user_id);
CREATE INDEX idx_token_blacklist_expires_at ON token_blacklist(expires_at);
CREATE INDEX idx_mfa_secrets_user_id ON mfa_secrets(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

### Environment Configuration

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-key-min-32-characters-long
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-characters
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=7d

# MFA Configuration
MFA_REQUIRED=false  # Set to true to enforce MFA for all users

# Token Rotation
TOKEN_ROTATION_ENABLED=true

# Security
BCRYPT_SALT_ROUNDS=12
```

## 🧪 Testing Security Features

### Unit Tests
- Token generation and validation
- MFA code verification
- Session management
- Permission validation

### E2E Tests
- Complete login → MFA → Token refresh → Logout flow
- Session revocation
- Permission enforcement
- Rate limiting

### Security Testing
- Token expiration enforcement
- Blacklist effectiveness
- MFA bypass prevention
- Permission boundary testing

## 📊 Monitoring & Alerts

### Key Metrics
- Failed login attempts
- Account lockouts
- Token refresh failures
- MFA failures
- Session revocations

### Audit Logging
- All authentication events logged
- Token issuance/revocation tracked
- MFA setup/verification logged
- Session creation/revocation logged
- Permission denials recorded

## 🔄 Migration Path

For existing systems:

1. **Phase 1**: Implement token blacklist (backwards compatible)
2. **Phase 2**: Add refresh token support (optional for existing clients)
3. **Phase 3**: Implement MFA (optional for users)
4. **Phase 4**: Enforce new RBAC permissions
5. **Phase 5**: Deprecate old single-token auth

## 📚 Additional Resources

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [NestJS Security](https://docs.nestjs.com/security/authentication)

## ⚠️ Important Security Notes

1. **Never** store plain refresh tokens in client-side localStorage
2. **Always** use HTTPS in production
3. **Rotate** JWT secrets periodically
4. **Monitor** for unusual authentication patterns
5. **Backup** MFA recovery codes to secure location
6. **Validate** token expiration on every request
7. **Use** secure, random secret generation

---

**Last Updated**: February 2026
**Version**: 2.0
**Status**: Production Ready
