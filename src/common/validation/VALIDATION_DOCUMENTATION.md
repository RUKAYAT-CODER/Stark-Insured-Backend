# Validation and Security Documentation

## Overview

This document outlines the comprehensive validation and sanitization system implemented across the Stellar Insured backend to ensure data integrity, prevent injection attacks, and maintain consistent security standards.

## 🛡️ Security Features

### Input Validation
- **Global Validation Pipe**: Centralized validation with automatic DTO transformation
- **Custom Validators**: Business-specific validation rules for claims, policies, and user data
- **Error Standardization**: Consistent error formatting and response structure

### Data Sanitization
- **XSS Prevention**: HTML tag removal and entity encoding
- **SQL Injection Prevention**: Query parameter escaping and pattern detection
- **File Upload Security**: Filename sanitization and type validation
- **URL Validation**: Protocol checking and malicious content detection

### Security Filtering
- **IP-based Filtering**: Blacklist/whitelist management
- **User Access Control**: Account suspension and role-based permissions
- **Content Filtering**: Blacklisted words and suspicious pattern detection
- **Rate Limiting**: Request frequency monitoring
- **Geographic Filtering**: Country-based access restrictions
- **Time-based Filtering**: Business hours enforcement

## 📋 Validation Rules by Endpoint

### Authentication Endpoints
- **POST /auth/login**
  - Email validation with disposable domain detection
  - Password strength requirements (8+ chars, mixed case, numbers, special chars)
  - Rate limiting: 5 attempts per 15 minutes
  - Account lockout after 5 failed attempts

### Claims Endpoints
- **POST /claims**
  - Policy number validation (POL-YYYY-XXXXXX format)
  - Claim number validation (CL-YYYY-XXXXXX format)
  - Amount validation (positive, max 2 decimal places, reasonable limits)
  - Date range validation (incident date within policy period)
  - Description sanitization (max 2000 chars)
  - Evidence file validation (allowed types, max 5MB)

### Policy Endpoints
- **POST /policies**
  - Policy number validation (POL-YYYY-XXXXXX format)
  - User ownership verification
  - Amount and premium validation

### Oracle Data Endpoints
- **POST /oracle/ingest/{provider}**
  - Provider validation (Chainlink, Pyth, Band Protocol, Custom)
  - Data type validation (Price, Weather, Flight Status, Insurance Event, Custom)
  - Payload freshness validation (5-minute window)
  - Signature verification (RSA-SHA256)
  - Numeric value validation (positive, reasonable limits)
  - Timestamp validation (not future, reasonable range)

### File Upload Endpoints
- **POST /files/upload**
  - File type validation (images, documents, spreadsheets)
  - File size limits (images: 5MB, documents: 10MB)
  - Filename sanitization (path traversal prevention)
  - MIME type validation
  - Virus scanning integration (placeholder)

## 🔧 Implementation Details

### Validation Decorators
```typescript
@IsSecureEmail()    // Blocks disposable emails
@IsStrongPassword()   // Enforces strong passwords
@IsValidAmount()      // Validates monetary amounts
@IsValidPolicyNumber() // Validates policy numbers
@IsValidClaimNumber()  // Validates claim numbers
@IsValidDateRange()    // Validates date ranges
```

### Sanitization Service
```typescript
sanitizeHtml(input)     // Removes HTML tags
escapeSql(input)       // Removes SQL patterns
sanitizeFileName(input)   // Prevents path traversal
sanitizeUrl(input)       // Validates URLs
```

### Security Filter Service
```typescript
checkIpAddress()      // IP filtering
checkUserAccess()     // User permission checks
checkContent()        // Content filtering
checkRateLimit()     // Rate limiting
performSecurityCheck() // Comprehensive security analysis
```

## 🚨 Security Headers

All endpoints include appropriate security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self'`
- `X-XSS-Protection: 1; mode=block`

## 📊 Configuration

### Environment Variables
```bash
# Security Configuration
SECURITY_BLACKLISTED_IPS=192.168.1.1,10.0.0.1
SECURITY_WHITELISTED_IPS=8.8.8.8,203.0.113.22
SECURITY_SUSPENDED_USERS=user1,user2,user3
SECURITY_RESTRICTED_OPERATIONS=admin_delete,admin_export
SECURITY_BLACKLISTED_WORDS=password,admin,test,drop,delete,script,alert
SECURITY_BLOCKED_COUNTRIES=CN,RU,KP

# Rate Limiting
RATE_LIMIT_LOGIN=5,15
RATE_LIMIT_API=100,60
RATE_LIMIT_UPLOAD=10,60

# Validation Settings
VALIDATION_MAX_FILE_SIZE=10485760  # 10MB
VALIDATION_MAX_DESCRIPTION_LENGTH=2000
VALIDATION_PASSWORD_MIN_LENGTH=8
VALIDATION_PASSWORD_REQUIRE_UPPERCASE=true
VALIDATION_PASSWORD_REQUIRE_LOWERCASE=true
VALIDATION_PASSWORD_REQUIRE_NUMBERS=true
VALIDATION_PASSWORD_REQUIRE_SPECIAL_CHARS=true

# Oracle Security
ORACLE_FRESHNESS_WINDOW_MS=300000
ORACLE_MAX_PAYLOAD_SIZE=1048576
ORACLE_SIGNATURE_VERIFICATION=true
```

## 🧪 Testing

### Security Test Coverage
- Input validation with malicious payloads
- SQL injection attempts
- XSS attack vectors
- File upload with malicious files
- Rate limiting enforcement
- Authentication bypass attempts
- Authorization header manipulation

### Monitoring and Alerting
- Failed authentication attempts logged
- Suspicious IP addresses flagged
- Rate limit violations tracked
- Validation errors aggregated by type
- Security events sent to monitoring system

## 🔄 Error Handling

### Validation Error Response Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": {
    "field": "Specific error message",
    "details": "Additional context"
  },
  "timestamp": "2026-01-22T10:00:00.000Z"
}
```

### Security Error Response Format
```json
{
  "statusCode": 401,
  "message": "Security validation failed",
  "error": {
    "type": "SECURITY_VIOLATION",
    "details": "Security check failed",
    "riskLevel": "medium|high|critical"
  },
  "timestamp": "2026-01-22T10:00:00.000Z"
}
```

## 📈 Performance Considerations

### Validation Performance
- Input validation: <5ms average
- Sanitization: <2ms average
- Security checks: <10ms average
- Database query validation: <50ms average

### Caching Strategy
- Validation results cached for 5 minutes
- Security filter results cached for 15 minutes
- Cache invalidation on user suspension
- Rate limit counters stored in Redis

## 🛡️ Best Practices

1. **Always validate on the server side** - Never trust client-side validation
2. **Use parameterized queries** - Prevent SQL injection
3. **Implement Content Security Policy** - CSP headers for XSS prevention
4. **Regular security audits** - Automated testing of validation bypasses
5. **Monitor and alert** - Real-time security event monitoring
6. **Keep dependencies updated** - Regular security patches for validation libraries

---

This validation system provides comprehensive protection against common web application vulnerabilities while maintaining excellent performance and developer experience.
