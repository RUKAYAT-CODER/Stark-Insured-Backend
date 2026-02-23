# OracleModule Documentation

## Overview

The OracleModule provides a secure and extensible system for ingesting off-chain oracle data into the Stellar Insured backend. It ensures data integrity, freshness, and reliability while supporting multiple oracle providers.

## Features

- **Secure Data Ingestion**: Validates incoming oracle payloads using DTOs and schema validation
- **Freshness Validation**: Rejects stale data exceeding configurable time windows
- **Authentication**: Enforces signature verification for oracle submissions
- **Multi-Provider Support**: Extensible architecture supporting Chainlink, Pyth, Band Protocol, and custom providers
- **Data Persistence**: Proper indexing for fast retrieval and auditing
- **Rate Limiting**: Protection against abuse with configurable throttling
- **Comprehensive Testing**: Unit and integration tests with mocked providers

## Architecture

### Core Components

1. **OracleData Entity**: Database model with proper indexing and validation
2. **OracleService**: Business logic for validation, freshness checks, and authentication
3. **OracleController**: RESTful API endpoints with security guards
4. **OracleAuthGuard**: Authentication middleware for API access
5. **DTOs**: Request/response validation schemas

### Data Flow

1. Oracle providers submit data via POST `/oracle/ingest/{provider}`
2. Payload validation and freshness checks are performed
3. Optional signature verification if provided
4. Data is persisted with metadata and verification hash
5. Consumers can retrieve data via authenticated GET endpoints

## API Endpoints

### Ingest Oracle Data
```
POST /oracle/ingest/{provider}
Headers: x-oracle-signature (optional)
Body: OraclePayloadDto
Rate Limit: 10 requests/minute
```

### Query Oracle Data
```
GET /oracle
Headers: Authorization: Oracle <api-key> or Bearer <token>
Query: provider, dataType, status, externalId, fromDate, toDate
```

### Get Oracle Data by ID
```
GET /oracle/{id}
Headers: Authorization: Oracle <api-key> or Bearer <token>
```

### Get Latest Oracle Data
```
GET /oracle/latest/{provider}/{dataType}?externalId={id}
Headers: Authorization: Oracle <api-key> or Bearer <token>
```

### Check Data Freshness
```
GET /oracle/{id}/freshness
Headers: Authorization: Oracle <api-key> or Bearer <token>
```

## Configuration

### Environment Variables

```bash
# Oracle API Keys (comma-separated)
ORACLE_API_KEYS=key1,key2,key3

# Oracle Valid Tokens (comma-separated)
ORACLE_VALID_TOKENS=token1,token2,token3

# Provider Public Keys for Signature Verification
CHAINLINK_PUBLIC_KEY=your-chainlink-public-key
PYTH_PUBLIC_KEY=your-pyth-public-key
BAND_PROTOCOL_PUBLIC_KEY=your-band-protocol-public-key
CUSTOM_ORACLE_PUBLIC_KEY=your-custom-oracle-public-key
```

### Freshness Window

- Default: 5 minutes (300,000 milliseconds)
- Configurable via `ORACLE_FRESHNESS_WINDOW_MS` environment variable

## Security Features

### Payload Validation
- Schema validation using class-validator decorators
- Type checking and range validation
- Required field enforcement

### Freshness Protection
- Timestamp validation prevents stale data
- Future timestamp rejection
- Configurable freshness windows

### Authentication
- API key-based authentication for data retrieval
- JWT token support for internal services
- Signature verification for data ingestion

### Rate Limiting
- 10 requests per minute for ingestion endpoint
- Configurable per provider
- Protection against DoS attacks

## Data Types

### Supported Providers
- `chainlink` - Chainlink Network
- `pyth` - Pyth Network
- `band_protocol` - Band Protocol
- `custom` - Custom oracle providers

### Data Types
- `price` - Price feeds and market data
- `weather` - Weather data and conditions
- `flight_status` - Flight information
- `insurance_event` - Insurance-related events
- `custom` - Custom data types

## Error Handling

### Validation Errors
- 400 Bad Request for malformed payloads
- Detailed error messages without sensitive information

### Authentication Errors
- 401 Unauthorized for missing/invalid credentials
- 403 Forbidden for insufficient permissions

### Data Errors
- 404 Not Found for missing oracle data
- 409 Conflict for duplicate submissions

## Testing

### Unit Tests
```bash
npm test -- --testPathPatterns=oracle.service.spec.ts
npm test -- --testPathPatterns=oracle.controller.spec.ts
```

### Integration Tests
```bash
npm test -- --testPathPatterns=oracle.integration.spec.ts
```

### Test Coverage
- Payload validation scenarios
- Authentication and authorization
- Freshness validation
- Error handling
- Rate limiting
- Database operations

## Monitoring and Auditing

### Logging
- Structured logging with contextual information
- Security event logging for failed authentications
- Performance metrics for ingestion operations

### Audit Trail
- Complete data provenance tracking
- Verification hashes for integrity
- Timestamp tracking for freshness analysis

## Extensibility

### Adding New Providers
1. Add provider to `OracleProvider` enum
2. Configure public key in environment variables
3. Update provider-specific validation if needed

### Adding New Data Types
1. Add type to `OracleDataType` enum
2. Update validation schemas if needed
3. Add specific business logic in service layer

## Performance Considerations

### Database Indexing
- Composite indexes on provider + externalId + dataType
- Timestamp indexes for freshness queries
- Status indexes for active data filtering

### Caching Strategy
- In-memory caching for frequently accessed data
- Redis support for distributed deployments
- Cache invalidation on data updates

## Deployment Notes

### Database Migration
- Ensure OracleData table is created
- Apply proper indexes for performance
- Set up appropriate retention policies

### Environment Setup
- Configure all required environment variables
- Set up monitoring and alerting
- Configure rate limiting thresholds

## Troubleshooting

### Common Issues

1. **"Oracle data is too old"**
   - Check system time synchronization
   - Verify oracle provider timestamp accuracy
   - Adjust freshness window if needed

2. **"Invalid signature"**
   - Verify public key configuration
   - Check signature format and encoding
   - Ensure payload matches signed content

3. **"No public key configured"**
   - Set appropriate environment variables
   - Verify provider name spelling
   - Check configuration loading

### Debug Mode
Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

This will provide detailed information about validation steps and security checks.
