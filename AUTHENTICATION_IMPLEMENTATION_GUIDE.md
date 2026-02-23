# Authentication Enhancement Implementation Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install speakeasy qrcode ua-parser-js
npm install --save-dev @types/speakeasy @types/ua-parser-js
```

### 2. Run Database Migrations

```bash
npm run typeorm:migration:run
# or
npm run migration:run
```

### 3. Update Environment Variables

Add to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secure-key-at-least-32-chars-long
JWT_REFRESH_SECRET=your-refresh-secret-at-least-32-chars-long
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=7d

# Token Management
TOKEN_ROTATION_ENABLED=true

# MFA Configuration
MFA_REQUIRED=false

# Security
BCRYPT_SALT_ROUNDS=12
```

### 4. Register New Auth Module

The auth module is already updated with all new services. Ensure it's imported in `app.module.ts`:

```typescript
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // ... other modules
    AuthModule,
  ],
})
export class AppModule {}
```

## Usage Guide

### Login Flow

#### 1. Get Login Challenge

```bash
curl -X POST http://localhost:4000/api/v1/auth/login/challenge \
  -H "Content-Type: application/json" \
  -d {
    "walletAddress": "GBRPYHIL2CI3FV4BMSXIGSXWXWAB7V2GOXZTkullwsli66EUTNJTUWXF"
  }
```

Response:
```json
{
  "challenge": "Sign this message to login to InsuranceDAO\nNonce: ...\nTimestamp: ...",
  "expiresAt": "2026-02-20T10:15:00.000Z"
}
```

#### 2. Sign Challenge and Login

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d {
    "walletAddress": "GBRPYHIL2CI3FV4BMSXIGSXWXWAB7V2GOXZTULLWSLI66EUTNJTUWXF",
    "signature": "<base64-encoded-signature>"
  }
```

Response (if MFA not enabled):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionToken": "3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "expiresAt": "2026-02-20T10:15:00.000Z",
  "user": {
    "id": "uuid",
    "walletAddress": "GBRPYHIL2CI3FV4BMSXIGSXWXWAB7V2GOXZTULLWSLI66EUTNJTUWXF",
    "email": "user@example.com",
    "roles": ["USER"]
  },
  "mfaRequired": false,
  "sessionId": "session-uuid"
}
```

#### 3. Use Access Token

```bash
curl -X GET http://localhost:4000/api/v1/claims \
  -H "Authorization: Bearer <accessToken>" \
  -H "X-Session-Token: <sessionToken>"
```

#### 4. Refresh Access Token (When Expired)

```bash
curl -X POST http://localhost:4000/api/v1/auth/token/refresh \
  -H "Content-Type: application/json" \
  -d {
    "refreshToken": "<refreshToken>",
    "sessionToken": "<sessionToken>"
  }
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "expiresAt": "2026-02-20T10:15:00.000Z",
  "tokenType": "Bearer"
}
```

### MFA Setup Flow

#### 1. Initiate TOTP Setup

```bash
curl -X POST http://localhost:4000/api/v1/auth/mfa/setup/totp \
  -H "Authorization: Bearer <accessToken>"
```

Response:
```json
{
  "qrCode": "data:image/png;base64,...",
  "secret": "JBSWY3DPEBLW64TMMQ======",
  "manualEntry": "JBSWY3DPEBLW64TMMQ======",
  "backupCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    ...
  ],
  "message": "Scan the QR code with your authenticator app..."
}
```

#### 2. Verify and Enable TOTP

```bash
curl -X POST http://localhost:4000/api/v1/auth/mfa/setup/verify \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d {
    "secret": "JBSWY3DPEBLW64TMMQ======",
    "totpCode": "123456"
  }
```

Response:
```json
{
  "message": "TOTP enabled successfully",
  "backupCodesRemaining": 10
}
```

#### 3. Get MFA Status

```bash
curl -X GET http://localhost:4000/api/v1/auth/mfa/status \
  -H "Authorization: Bearer <accessToken>"
```

Response:
```json
{
  "totpEnabled": true,
  "smsEnabled": false,
  "backupCodesRemaining": 10
}
```

### Session Management

#### 1. Get Active Sessions

```bash
curl -X GET http://localhost:4000/api/v1/auth/sessions \
  -H "Authorization: Bearer <accessToken>"
```

Response:
```json
{
  "sessions": [
    {
      "id": "session-id-1",
      "deviceName": "Chrome on macOS",
      "browser": "Chrome",
      "operatingSystem": "macOS",
      "ipAddress": "192.168.1.100",
      "createdAt": "2026-02-20T08:00:00.000Z",
      "lastActivityAt": "2026-02-20T10:00:00.000Z",
      "status": "ACTIVE"
    },
    {
      "id": "session-id-2",
      "deviceName": "Mobile Safari",
      "browser": "Mobile Safari",
      "operatingSystem": "iOS",
      "ipAddress": "192.168.1.101",
      "createdAt": "2026-02-20T09:00:00.000Z",
      "lastActivityAt": "2026-02-20T09:30:00.000Z",
      "status": "ACTIVE"
    }
  ],
  "count": 2
}
```

#### 2. Revoke Specific Session

```bash
curl -X DELETE http://localhost:4000/api/v1/auth/sessions/<sessionId> \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d {
    "reason": "Suspicious activity detected"
  }
```

### Logout

#### 1. Logout Current Session

```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d {
    "refreshToken": "<refreshToken>",
    "sessionToken": "<sessionToken>"
  }
```

#### 2. Logout All Devices

```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d {
    "logoutAll": true
  }
```

## Permission-Based Access Control

### Using Permission Decorator

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
  createClaim(@Body() dto: CreateClaimDto) {
    // Only users with CLAIM_CREATE permission can access
  }

  @Post(':id/approve')
  @Permissions(Permission.CLAIM_APPROVE)
  approveClaim(@Param('id') id: string) {
    // Only users with CLAIM_APPROVE permission can access
  }

  @Post(':id/reject')
  @Permissions(Permission.CLAIM_REJECT)
  rejectClaim(@Param('id') id: string) {
    // Only users with CLAIM_REJECT permission can access
  }
}
```

### Role Assignment

Roles are assigned when creating users. Update your user creation logic:

```typescript
const user = await this.usersService.create({
  walletAddress: dto.walletAddress,
  email: dto.email,
  roles: [UserRole.USER], // Can be multiple roles
});

// Later, promote user to moderator
user.roles = [UserRole.USER, UserRole.MODERATOR];
await this.usersService.save(user);
```

## Token Cleanup and Maintenance

### Scheduled cleanup (add to a scheduled task service)

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TokenCleanupService {
  constructor(
    private refreshTokenService: RefreshTokenService,
    private tokenBlacklistService: TokenBlacklistService,
    private sessionService: SessionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredTokens() {
    await this.refreshTokenService.cleanupExpiredTokens();
    await this.tokenBlacklistService.cleanupExpiredEntries();
    await this.sessionService.cleanupExpiredSessions();
  }
}
```

## Monitoring & Debugging

### View Token Details (for debugging)

```typescript
// In a debug endpoint (admin only)
const decoded = this.jwtTokenService.decodeToken(token);
console.log('Token Claims:', decoded);
console.log('Expires At:', new Date(decoded.exp * 1000));
```

### Check Token Validity

```typescript
try {
  const payload = this.jwtTokenService.verifyAccessToken(token);
  console.log('Token is valid:', payload);
} catch (error) {
  console.log('Token is invalid:', error.message);
}
```

### List User's Active Tokens

```typescript
const refreshTokens = await this.refreshTokenService.getUserActiveTokens(userId);
console.log('Active refresh tokens:', refreshTokens.length);
refreshTokens.forEach(token => {
  console.log(`- Created: ${token.createdAt}, Expires: ${token.expiresAt}`);
});
```

## Troubleshooting

### Common Issues

**Issue**: "Token has been revoked"
- **Cause**: Token was blacklisted (logged out)
- **Solution**: Use refresh token to get new access token

**Issue**: "Invalid refresh token"
- **Cause**: Refresh token expired or invalid signature
- **Solution**: Require user to login again

**Issue**: "MFA verification required"
- **Cause**: User has MFA enabled but hasn't verified
- **Solution**: User must provide TOTP code or backup code

**Issue**: "Session not found"
- **Cause**: Session doesn't exist or was revoked
- **Solution**: Create new session or require re-login

### Enable Debug Logging

```typescript
// In auth.service.ts
private readonly logger = new Logger(AuthService.name);

// Will log to console
this.logger.debug('Debug message');
this.logger.log('Info message');
this.logger.warn('Warning message');
this.logger.error('Error message');
```

## Performance Tips

1. **Token Redis Caching**: Blacklisted tokens cached in Redis for O(1) lookup
2. **Database Indexing**: All critical fields indexed for fast queries
3. **Connection Pooling**: Database connections pooled for reuse
4. **Cleanup Jobs**: Regular cleanup of expired entries

## Security Checklist

- [ ] JWT_SECRET and JWT_REFRESH_SECRET are strong (32+ chars)
- [ ] HTTPS enabled in production
- [ ] CORS configured for specific origins
- [ ] Rate limiting enabled on auth endpoints
- [ ] MFA enabled for admin users
- [ ] Token rotation enabled
- [ ] Regular backup of encryption keys
- [ ] Audit logging enabled
- [ ] Security headers configured (Helmet)
- [ ] Database SSL connections enabled

---

**For more details, see** [SECURITY_ENHANCEMENTS.md](./SECURITY_ENHANCEMENTS.md)
