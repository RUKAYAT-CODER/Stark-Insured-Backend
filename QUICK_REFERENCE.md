# Quick Reference - Authentication API

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=<32+ char random string>
JWT_REFRESH_SECRET=<32+ char different random string>
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=7d
TOKEN_ROTATION_ENABLED=true
MFA_REQUIRED=false
```

## Login Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER LOGIN FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. POST /auth/login/challenge                              │
│     ↓                                                         │
│  2. Server returns: { challenge, expiresAt }                │
│     ↓                                                         │
│  3. Client signs challenge with wallet                      │
│     ↓                                                         │
│  4. POST /auth/login { walletAddress, signature }           │
│     ↓                                                         │
│  5. Server validates signature                              │
│     ├─ If MFA not required:                                 │
│     │  └─ Return: { accessToken, refreshToken, sessionToken}│
│     ├─ If MFA required:                                     │
│     │  └─ Return: { mfaRequired: true, sessionToken }       │
│     │     ↓                                                  │
│     │  6. User verifies MFA code via session               │
│     │     ↓                                                  │
│     │  7. Session marked MFA verified                       │
│     │     ↓                                                  │
│     │  8. Full tokens returned                              │
│     │                                                        │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints Quick Ref

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/login/challenge` | No | Get login challenge |
| POST | `/auth/login` | No | Submit signature |
| POST | `/auth/token/refresh` | No | Refresh access token |
| POST | `/auth/logout` | JWT | Logout user |
| POST | `/auth/mfa/setup/totp` | JWT | Start MFA setup |
| POST | `/auth/mfa/setup/verify` | JWT | Enable MFA |
| GET | `/auth/mfa/status` | JWT | Check MFA status |
| POST | `/auth/mfa/backup-codes/regenerate` | JWT | New backup codes |
| GET | `/auth/sessions` | JWT | List sessions |
| DELETE | `/auth/sessions/:id` | JWT | Revoke session |

## Token Refresh Flow

```
Client has: accessToken (expired), refreshToken (valid)

1. POST /auth/token/refresh
   {
     "refreshToken": "eyJ...",
     "sessionToken": "abc123..."  // optional
   }

2. Server validates refreshToken
   ├─ Checks signature
   ├─ Checks expiration
   ├─ Checks blacklist
   └─ Checks in database

3. Server revokes old refreshToken

4. Server generates:
   ├─ New accessToken (15 min)
   ├─ New refreshToken (7 days)
   └─ Stores both in DB

5. Response:
   {
     "accessToken": "eyJ...",
     "expiresIn": 900,
     "expiresAt": "2026-02-20T10:15:00Z",
     "tokenType": "Bearer"
   }
```

## MFA Setup Flow

```
1. GET /auth/mfa/status
   Response: { totpEnabled, smsEnabled, backupCodesRemaining }

2. If not enabled, POST /auth/mfa/setup/totp
   Response:
   {
     "qrCode": "data:image/png;base64,...",
     "secret": "JBSWY3DPEBLW64TMMQ======",
     "manualEntry": "JBSWY3DPEBLW64TMMQ======",
     "backupCodes": ["A1B2C3D4", ...]
   }

3. User scans QR code in authenticator app

4. User provides 6-digit code
   POST /auth/mfa/setup/verify
   {
     "secret": "JBSWY3DPEBLW64TMMQ======",
     "totpCode": "123456"
   }

5. TOTP enabled
   Response: { success: true, backupCodesRemaining: 10 }
```

## Header Requirements

### Access Token Authorization
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Session Tracking (Optional but Recommended)
```
X-Session-Token: 3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p
```

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "reason": "Token has been revoked" | 
             "Invalid signature" | 
             "Token expired"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden",
  "reason": "Insufficient permissions" |
             "MFA verification required" |
             "User not found"
}
```

### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "retryAfter": 60
}
```

## Permission Checks

### Controller Example
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionGuard } from './permissions/permission.guard';
import { Permissions } from './permissions/permission.decorator';
import { Permission } from './permissions/permission.enum';

@Controller('claims')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClaimsController {
  
  @Post()
  @Permissions(Permission.CLAIM_CREATE)
  async createClaim(@Body() dto: CreateClaimDto) {
    // Only accessible to users with CLAIM_CREATE permission
  }

  @Patch(':id/approve')
  @Permissions(Permission.CLAIM_APPROVE)
  async approveClaim(@Param('id') id: string) {
    // Only accessible to users with CLAIM_APPROVE permission
  }
}
```

## Session Management

### Get All Sessions
```bash
curl http://localhost:4000/api/v1/auth/sessions \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "sessions": [
    {
      "id": "session-uuid",
      "deviceName": "Chrome on macOS",
      "browser": "Chrome",
      "operatingSystem": "macOS",
      "ipAddress": "192.168.1.100",
      "createdAt": "2026-02-20T08:00:00Z",
      "lastActivityAt": "2026-02-20T10:00:00Z",
      "status": "ACTIVE"
    }
  ]
}
```

### Revoke Session
```bash
curl -X DELETE http://localhost:4000/api/v1/auth/sessions/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN"
```

## Logout Options

### Logout Current Device
```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'$REFRESH_TOKEN'",
    "sessionToken": "'$SESSION_TOKEN'"
  }'
```

### Logout All Devices
```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logoutAll": true
  }'
```

## Common Response Examples

### Successful Login
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionToken": "3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "expiresAt": "2026-02-20T10:15:00.000Z",
  "user": {
    "id": "user-uuid",
    "walletAddress": "GBRPYHIL2CI3FV4BMSXIGSXWXWAB7V2GOXZTkullwsli66EUTNJTUWXF",
    "email": "user@example.com",
    "roles": ["USER", "MODERATOR"]
  },
  "mfaRequired": false,
  "sessionId": "session-uuid"
}
```

### Token Refresh Success
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "expiresAt": "2026-02-20T10:15:00.000Z",
  "tokenType": "Bearer"
}
```

### MFA Setup
```json
{
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "secret": "JBSWY3DPEBLW64TMMQ======",
  "manualEntry": "JBSWY3DPEBLW64TMMQ======",
  "backupCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    "I9J0K1L2",
    "M3N4O5P6",
    "Q7R8S9T0",
    "U1V2W3X4",
    "Y5Z6A7B8",
    "C9D0E1F2",
    "G3H4I5J6",
    "K7L8M9N0"
  ],
  "message": "Scan the QR code with your authenticator app or enter the secret manually"
}
```

## Database Cleanup

### Automatic via Scheduled Task
```typescript
@Cron(CronExpression.EVERY_DAY_AT_2AM)
async cleanupExpiredTokens() {
  await this.refreshTokenService.cleanupExpiredTokens();
  await this.tokenBlacklistService.cleanupExpiredEntries();
  await this.sessionService.cleanupExpiredSessions();
}
```

### Manual Triggers
```bash
# In admin endpoint or scheduler
POST /admin/cleanup/tokens
POST /admin/cleanup/sessions
POST /admin/cleanup/blacklist
```

## Debugging Tips

### Check Token Claims
```bash
# Decode JWT (use https://jwt.io or locally)
echo $TOKEN | jq .

# Result example:
{
  "sub": "user-id",
  "walletAddress": "G...",
  "email": "user@example.com",
  "roles": ["USER"],
  "type": "access",
  "sessionId": "session-id",
  "jti": "token-id",
  "iat": 1708443900,
  "exp": 1708444800
}
```

### Check Session Status
```bash
curl http://localhost:4000/api/v1/auth/sessions \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Verify Token is Blacklisted
```typescript
const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(token);
console.log('Token blacklisted:', isBlacklisted);
```

## Role & Permission Mapping

| Role | Key Permissions |
|------|-----------------|
| USER | claim:create, dao:vote, policy:view |
| MODERATOR | claim:approve, claim:reject, audit_log:view |
| GOVERNANCE | dao:manage, risk_pool:manage, analytics:export |
| ADMIN | user:manage, system:config, security:tokens:revoke |
| SUPER_ADMIN | ALL (34 permissions) |

---

**Last Updated**: February 2026
**Version**: 2.0
