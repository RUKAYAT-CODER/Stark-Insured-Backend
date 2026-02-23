# Database Migration System Documentation

## 📋 Overview

This document describes the comprehensive database migration system implemented for the Stellar Insured Backend. The system provides automated, version-controlled, and zero-downtime migration capabilities for PostgreSQL databases.

## 🏗️ Architecture

### Core Components

1. **Migration Service** (`migration.service.ts`)
   - Centralized migration management
   - Pre-flight validation
   - Transaction-safe migration execution
   - Rollback capabilities

2. **Migration Controller** (`migration.controller.ts`)
   - REST API endpoints for migration operations
   - Health check and status monitoring
   - Error handling and reporting

3. **TypeORM Configuration** (`ormconfig.ts`)
   - CLI configuration for migration commands
   - Environment-based configuration
   - SSL and security settings

## 🚀 Getting Started

### Prerequisites

- PostgreSQL database
- Environment variables configured
- TypeORM entities defined

### Environment Configuration

Add the following to your `.env` file:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=stellar_insured
DATABASE_SSL_ENABLED=false

# Migration Configuration
DATABASE_LOGGING=true
```

## 📦 Installation

The migration system is already integrated. Ensure dependencies are installed:

```bash
npm install
```

## 🎯 Usage

### CLI Commands

```bash
# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show

# Generate migration from entity changes
npm run migration:generate --name=MigrationName

# Create empty migration file
npm run migration:create --name=MigrationName

# Show migration execution log
npm run migration:log
```

### API Endpoints

#### Get Migration Status
```http
GET /migrations/status
```

Response:
```json
[
  {
    "name": "AddPerformanceIndexes1234567890",
    "timestamp": 1234567890,
    "executedAt": "2024-01-15T10:30:00.000Z",
    "status": "executed"
  }
]
```

#### Run Migrations
```http
POST /migrations/run
```

Response:
```json
{
  "success": true,
  "message": "Successfully executed 2 migrations",
  "executedMigrations": ["Migration1", "Migration2"],
  "failedMigrations": [],
  "duration": 1250
}
```

#### Revert Last Migration
```http
POST /migrations/revert
```

#### Pre-flight Check
```http
GET /migrations/preflight
```

## 🛡️ Safety Features

### Pre-flight Checks

Before any migration execution, the system performs:

1. **Database Connection Test**
   - Validates database connectivity
   - Checks credentials and permissions

2. **Schema Validation**
   - Verifies migrations table exists
   - Checks for conflicting changes

3. **Backup Verification**
   - Confirms backup procedures are in place
   - Validates rollback capabilities

### Transaction Safety

- All migrations run within database transactions
- Automatic rollback on failure
- Consistent state guarantee

### Zero-Downtime Operations

- Supports online schema changes
- Minimal locking strategies
- Background data migration patterns

## 📝 Migration Best Practices

### 1. Creating Migrations

```bash
# Generate from entity changes
npm run migration:generate --name=AddUserPreferences

# Create empty migration for custom logic
npm run migration:create --name=CustomDataMigration
```

### 2. Migration Structure

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPreferences1708432800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Forward migration - add changes
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse migration - rollback changes
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN preferences
    `);
  }
}
```

### 3. Zero-Downtime Patterns

#### Adding Columns
```typescript
// ✅ Safe approach
public async up(queryRunner: QueryRunner): Promise<void> {
  // 1. Add column with default
  await queryRunner.query(`
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false
  `);
  
  // 2. Backfill data in batches
  await queryRunner.query(`
    UPDATE users SET email_verified = true 
    WHERE email IS NOT NULL 
    LIMIT 1000
  `);
  
  // 3. Make column NOT NULL if needed
  await queryRunner.query(`
    ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL
  `);
}
```

#### Renaming Columns
```typescript
// ✅ Safe approach
public async up(queryRunner: QueryRunner): Promise<void> {
  // 1. Add new column
  await queryRunner.query(`
    ALTER TABLE users ADD COLUMN user_email VARCHAR(255)
  `);
  
  // 2. Copy data
  await queryRunner.query(`
    UPDATE users SET user_email = email
  `);
  
  // 3. Add NOT NULL constraint
  await queryRunner.query(`
    ALTER TABLE users ALTER COLUMN user_email SET NOT NULL
  `);
  
  // 4. Drop old column (in separate migration)
  // await queryRunner.query(`ALTER TABLE users DROP COLUMN email`);
}
```

## 🔄 Rollback Strategies

### Automatic Rollback
- Database transactions automatically rollback failed migrations
- TypeORM handles transaction management

### Manual Rollback
```bash
# Revert last migration
npm run migration:revert

# Revert multiple migrations
npm run migration:revert && npm run migration:revert
```

### Emergency Procedures
```bash
# Drop and recreate schema (⚠️ Data loss)
npm run migration:drop

# Sync schema from entities (⚠️ Development only)
npm run migration:sync
```

## 📊 Monitoring and Observability

### Migration Status Monitoring
- Real-time migration execution status
- Performance metrics and timing
- Success/failure tracking

### Health Checks
```bash
# API health check
curl http://localhost:4000/migrations/preflight

# Migration status
curl http://localhost:4000/migrations/status
```

### Logging
- Detailed migration execution logs
- Performance timing information
- Error tracking and debugging

## 🚨 Troubleshooting

### Common Issues

#### 1. Migration Already Applied
```bash
# Check status
npm run migration:show

# If migration exists in database but not in code
# Remove from migrations table (use with caution)
```

#### 2. Migration Failed Mid-way
```bash
# Check current status
npm run migration:show

# Revert last successful migration
npm run migration:revert

# Fix the failing migration
# Then re-run
npm run migration:run
```

#### 3. Database Connection Issues
```bash
# Verify connection
npm run migration:show

# Check environment variables
echo $DATABASE_URL
```

### Recovery Procedures

#### Emergency Recovery
1. Identify the failed migration
2. Check database state
3. Apply appropriate rollback
4. Verify data integrity
5. Retry with fixes

## 📈 Performance Optimization

### Batch Processing
For large data migrations:
```typescript
const batchSize = 1000;
let offset = 0;

while (true) {
  const result = await queryRunner.query(`
    UPDATE users 
    SET status = 'active' 
    WHERE status IS NULL 
    LIMIT ${batchSize} 
    OFFSET ${offset}
  `);
  
  if (result.rowCount === 0) break;
  offset += batchSize;
  
  // Progress tracking
  console.log(`Processed ${offset} records`);
}
```

### Index Management
- Create indexes after data migration
- Use concurrent index creation for production
- Drop indexes before large data operations

## 🔒 Security Considerations

### Environment Security
- Never commit database credentials
- Use environment variables
- Rotate credentials regularly

### Migration Security
- Review all migration SQL before execution
- Test in staging environment first
- Implement proper access controls

### Audit Trail
- All migrations are version controlled
- Execution timestamps are recorded
- Changes are tracked in migration history

## 🎯 Testing Strategy

### Local Testing
```bash
# Run migrations in test environment
NODE_ENV=test npm run migration:run

# Verify schema matches entities
npm run migration:show
```

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
- name: Run Database Migrations
  run: npm run migration:run
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## 📚 Additional Resources

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Migration Best Practices](https://github.com/forwardemail/database-migration-best-practices)

## 🆘 Support

For issues or questions:
- Check the troubleshooting section above
- Review migration logs for error details
- Contact the development team