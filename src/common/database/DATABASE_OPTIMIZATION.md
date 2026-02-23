# Database Optimization and Configuration Guide

## Overview

This guide covers the database optimization features implemented to improve connection pooling, query performance, monitoring, and overall database health.

## 🎯 Features Implemented

### Connection Pool Optimization
- Configurable pool limits with automatic scaling
- Connection timeout and retry mechanisms
- Pool health monitoring and metrics
- Environment-specific configurations

### Query Performance Monitoring
- Real-time query execution tracking
- Slow query identification and logging
- Performance metrics aggregation
- Query pattern analysis

### Database Indexing Strategy
- Optimized indexes for foreign keys
- Composite indexes for common query patterns
- Partial indexes for active data filtering
- Automatic index maintenance

### Health Check System
- Real-time database connectivity monitoring
- Connection pool status tracking
- Performance metrics endpoints
- Degraded service detection

## 🔧 Configuration

### Environment Variables

#### Connection Pool Settings
```bash
# Basic pool configuration
DATABASE_POOL_MIN=2                    # Minimum connections
DATABASE_POOL_MAX=20                   # Maximum connections
DATABASE_POOL_IDLE_TIMEOUT=30000        # Idle timeout (ms)
DATABASE_POOL_CONNECTION_TIMEOUT=2000    # Connection timeout (ms)

# Advanced pool settings
DATABASE_POOL_ACQUIRE_TIMEOUT=60000      # Acquire timeout (ms)
DATABASE_POOL_CREATE_TIMEOUT=30000       # Create timeout (ms)
DATABASE_POOL_DESTROY_TIMEOUT=5000        # Destroy timeout (ms)
DATABASE_POOL_REAP_INTERVAL=1000          # Reap interval (ms)
DATABASE_POOL_CREATE_RETRY_INTERVAL=200    # Create retry interval (ms)
```

#### Database Performance Settings
```bash
# Query monitoring
DATABASE_LOGGING=query,error,warn          # Enable query logging
DATABASE_MAX_QUERY_EXECUTION_TIME=1000    # Slow query threshold (ms)
DATABASE_QUERY_LOGGING_ENABLED=true       # Enable external monitoring

# Retry configuration
DATABASE_RETRY_ATTEMPTS=3                # Max retry attempts
DATABASE_RETRY_DELAY=1000                 # Initial retry delay (ms)
DATABASE_MAX_RETRY_DELAY=30000            # Maximum retry delay (ms)
```

#### SSL Configuration
```bash
DATABASE_SSL_ENABLED=true                  # Enable SSL/TLS
DATABASE_SSL_REJECT_UNAUTHORIZED=true     # Certificate validation
DATABASE_SSL_CA=/path/to/ca.pem          # CA certificate path
DATABASE_SSL_CERT=/path/to/cert.pem       # Client certificate
DATABASE_SSL_KEY=/path/to/key.pem         # Private key
```

## 📊 Performance Monitoring

### Database Health Endpoints

#### General Health Check
```bash
GET /health
```
Returns overall application health status.

#### Database-Specific Health
```bash
GET /health/database
```
Returns detailed database health metrics:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-22T00:00:00.000Z",
  "connectionPool": {
    "total": 10,
    "active": 3,
    "idle": 7,
    "waiting": 0
  },
  "responseTime": {
    "average": 45,
    "p95": 120,
    "p99": 200
  },
  "errorRate": 0.1
}
```

#### Readiness Check
```bash
GET /health/ready
```
Returns application readiness with detailed component status.

### Query Performance Metrics

#### Slow Query Analysis
The system automatically identifies and logs slow queries exceeding the configured threshold.

#### Performance Statistics
Access query performance metrics through the monitoring service:
- Total queries executed
- Average execution time
- P95 and P99 response times
- Most frequent query patterns

## 🗃️ Database Indexes

### Implemented Indexes

#### Users Table
```sql
-- Email lookup optimization
CREATE INDEX "IDX_USERS_EMAIL" ON "users" ("email");

-- Status and time-based queries
CREATE INDEX "IDX_USERS_STATUS_CREATED_AT" ON "users" ("status", "created_at");
```

#### Claims Table
```sql
-- Foreign key optimization
CREATE INDEX "IDX_CLAIMS_USER_ID" ON "claims" ("user_id");
CREATE INDEX "IDX_CLAIMS_POLICY_ID" ON "claims" ("policy_id");

-- Status and filtering optimization
CREATE INDEX "IDX_CLAIMS_STATUS" ON "claims" ("status");
CREATE INDEX "IDX_CLAIMS_CLAIM_NUMBER" ON "claims" ("claim_number");

-- Time-based queries
CREATE INDEX "IDX_CLAIMS_CREATED_AT" ON "claims" ("created_at");
CREATE INDEX "IDX_CLAIMS_STATUS_CREATED_AT" ON "claims" ("status", "created_at");

-- Partial index for active claims
CREATE INDEX "IDX_CLAIMS_ACTIVE" ON "claims" ("created_at") 
WHERE "status" IN ('submitted', 'under_review', 'additional_info_needed');
```

#### Oracle Data Table
```sql
-- Provider and data type optimization
CREATE INDEX "IDX_ORACLE_DATA_PROVIDER" ON "oracle_data" ("provider");
CREATE INDEX "IDX_ORACLE_DATA_DATA_TYPE" ON "oracle_data" ("data_type");

-- Composite indexes for common queries
CREATE INDEX "IDX_ORACLE_DATA_PROVIDER_EXTERNAL_ID" ON "oracle_data" ("provider", "external_id");
CREATE INDEX "IDX_ORACLE_DATA_PROVIDER_DATA_TYPE" ON "oracle_data" ("provider", "data_type");

-- Time-based queries
CREATE INDEX "IDX_ORACLE_DATA_ORACLE_TIMESTAMP" ON "oracle_data" ("oracle_timestamp");
CREATE INDEX "IDX_ORACLE_DATA_RECEIVED_AT" ON "oracle_data" ("received_at");

-- Partial index for active data
CREATE INDEX "IDX_ORACLE_DATA_ACTIVE" ON "oracle_data" ("oracle_timestamp") 
WHERE "status" = 'active';
```

### Index Maintenance

#### Migration Script
Run the provided migration to create all performance indexes:
```bash
npm run typeorm migration:run
```

#### Monitoring Index Usage
Monitor index effectiveness through query performance metrics and slow query analysis.

## 🚀 Environment-Specific Configurations

### Development Environment
```bash
# Relaxed settings for development
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=5
DATABASE_LOGGING=all
DATABASE_MAX_QUERY_EXECUTION_TIME=500
synchronize=true  # Only in development
```

### Staging Environment
```bash
# Moderate settings for staging
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=15
DATABASE_LOGGING=query,error,warn
DATABASE_MAX_QUERY_EXECUTION_TIME=800
synchronize=false
```

### Production Environment
```bash
# Optimized settings for production
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50
DATABASE_LOGGING=error,warn
DATABASE_MAX_QUERY_EXECUTION_TIME=1000
synchronize=false
DATABASE_SSL_ENABLED=true
```

## 📈 Performance Optimization Guidelines

### Connection Pool Tuning

#### Pool Size Calculation
```bash
# Formula: (cores * 2) + effective_spindle_count
# For 8-core server: (8 * 2) + 1 = 17 connections
DATABASE_POOL_MAX=17
```

#### Timeout Configuration
- **Connection Timeout**: 2-5 seconds
- **Query Timeout**: 30-60 seconds
- **Idle Timeout**: 5-30 minutes

### Query Optimization

#### Slow Query Thresholds
- **Development**: 500ms
- **Staging**: 800ms
- **Production**: 1000ms

#### Index Strategy
1. **Foreign Keys**: Always indexed
2. **Filter Columns**: Frequently filtered columns
3. **Composite Indexes**: Multi-column queries
4. **Partial Indexes**: Active data subsets
5. **Covering Indexes**: Include commonly selected columns

### Monitoring Best Practices

#### Health Check Frequency
- **Load Balancer**: Every 10 seconds
- **Monitoring System**: Every 30 seconds
- **Manual Checks**: As needed

#### Alert Thresholds
- **Response Time**: Alert if P95 > 500ms
- **Error Rate**: Alert if > 1%
- **Pool Usage**: Alert if > 80% capacity

## 🔍 Troubleshooting

### Common Issues

#### Connection Pool Exhaustion
```bash
# Symptoms: "Connection timeout" errors
# Solution: Increase DATABASE_POOL_MAX
DATABASE_POOL_MAX=30

# Or decrease pool timeout
DATABASE_POOL_ACQUIRE_TIMEOUT=30000
```

#### Slow Queries
```bash
# Check slow query logs
grep "Slow query detected" logs/app.log

# Analyze query patterns
curl http://localhost:4000/health/database | jq '.responseTime'
```

#### High Memory Usage
```bash
# Reduce idle timeout
DATABASE_POOL_IDLE_TIMEOUT=10000

# Reduce pool size
DATABASE_POOL_MAX=10
```

### Performance Debugging

#### Enable Detailed Logging
```bash
DATABASE_LOGGING=all
DATABASE_QUERY_LOGGING_ENABLED=true
```

#### Monitor Real-time Metrics
```bash
# Watch database health
watch -n 5 'curl -s http://localhost:4000/health/database | jq'

# Check connection pool status
curl -s http://localhost:4000/health/database | jq '.connectionPool'
```

## 📚 Additional Resources

### PostgreSQL Optimization
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tuning.html)
- [Connection Pooling Best Practices](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNECT-CONNECTION-POOLING)

### TypeORM Configuration
- [TypeORM Connection Options](https://typeorm.io/data-source-options#common-connection-options)
- [TypeORM Performance](https://typeorm.io/performance)

### Monitoring Tools
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [pg_stat_activity](https://www.postgresql.org/docs/current/monitoring-stats.html)

## 🔄 Maintenance

### Regular Tasks

#### Weekly
- Review slow query logs
- Analyze index usage
- Check error rates

#### Monthly
- Update statistics: `ANALYZE`
- Rebuild fragmented indexes
- Review pool configuration

#### Quarterly
- Performance benchmarking
- Configuration optimization review
- Capacity planning

---

This configuration ensures optimal database performance, reliability, and monitoring capabilities for the Stellar Insured backend.
