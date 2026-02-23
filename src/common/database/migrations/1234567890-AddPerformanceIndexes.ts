import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1234567890 implements MigrationInterface {
  name = 'AddPerformanceIndexes1234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_USERS_EMAIL" ON "users" ("email");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_USERS_STATUS_CREATED_AT" ON "users" ("status", "created_at");
    `);

    // Claims table indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_CLAIMS_USER_ID" ON "claims" ("user_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_CLAIMS_POLICY_ID" ON "claims" ("policy_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_CLAIMS_STATUS" ON "claims" ("status");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_CLAIMS_CLAIM_NUMBER" ON "claims" ("claim_number");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_CLAIMS_CREATED_AT" ON "claims" ("created_at");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_CLAIMS_STATUS_CREATED_AT" ON "claims" ("status", "created_at");
    `);

    // Policies table indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_POLICIES_USER_ID" ON "policies" ("user_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_POLICIES_STATUS" ON "policies" ("status");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_POLICIES_POLICY_NUMBER" ON "policies" ("policy_number");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_POLICIES_CREATED_AT" ON "policies" ("created_at");
    `);

    // Oracle data table indexes (for the new OracleModule)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ORACLE_DATA_PROVIDER" ON "oracle_data" ("provider");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ORACLE_DATA_DATA_TYPE" ON "oracle_data" ("data_type");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ORACLE_DATA_STATUS" ON "oracle_data" ("status");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ORACLE_DATA_ORACLE_TIMESTAMP" ON "oracle_data" ("oracle_timestamp");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ORACLE_DATA_RECEIVED_AT" ON "oracle_data" ("received_at");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ORACLE_DATA_PROVIDER_EXTERNAL_ID" ON "oracle_data" ("provider", "external_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ORACLE_DATA_PROVIDER_DATA_TYPE" ON "oracle_data" ("provider", "data_type");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ORACLE_DATA_STATUS_ORACLE_TIMESTAMP" ON "oracle_data" ("status", "oracle_timestamp");
    `);

    // Payments table indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_PAYMENTS_CLAIM_ID" ON "payments" ("claim_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_PAYMENTS_STATUS" ON "payments" ("status");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_PAYMENTS_CREATED_AT" ON "payments" ("created_at");
    `);

    // Audit log table indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_AUDIT_LOG_ENTITY_TYPE" ON "audit_logs" ("entity_type");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_AUDIT_LOG_ENTITY_ID" ON "audit_logs" ("entity_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_AUDIT_LOG_ACTION" ON "audit_logs" ("action");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_AUDIT_LOG_USER_ID" ON "audit_logs" ("user_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_AUDIT_LOG_CREATED_AT" ON "audit_logs" ("created_at");
    `);

    // Notifications table indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATIONS_USER_ID" ON "notifications" ("user_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATIONS_TYPE" ON "notifications" ("type");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATIONS_STATUS" ON "notifications" ("status");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATIONS_CREATED_AT" ON "notifications" ("created_at");
    `);

    // Create partial indexes for better performance on active records
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_CLAIMS_ACTIVE" ON "claims" ("created_at") WHERE "status" IN ('submitted', 'under_review', 'additional_info_needed');
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_POLICIES_ACTIVE" ON "policies" ("created_at") WHERE "status" = 'active';
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ORACLE_DATA_ACTIVE" ON "oracle_data" ("oracle_timestamp") WHERE "status" = 'active';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ORACLE_DATA_ACTIVE";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_POLICIES_ACTIVE";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_CLAIMS_ACTIVE";`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATIONS_CREATED_AT";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATIONS_STATUS";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATIONS_TYPE";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATIONS_USER_ID";`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_AUDIT_LOG_CREATED_AT";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_AUDIT_LOG_USER_ID";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_AUDIT_LOG_ACTION";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_AUDIT_LOG_ENTITY_ID";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_AUDIT_LOG_ENTITY_TYPE";`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYMENTS_CREATED_AT";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYMENTS_STATUS";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYMENTS_CLAIM_ID";`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ORACLE_DATA_STATUS_ORACLE_TIMESTAMP";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ORACLE_DATA_PROVIDER_DATA_TYPE";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ORACLE_DATA_PROVIDER_EXTERNAL_ID";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ORACLE_DATA_RECEIVED_AT";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ORACLE_DATA_ORACLE_TIMESTAMP";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ORACLE_DATA_STATUS";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ORACLE_DATA_DATA_TYPE";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ORACLE_DATA_PROVIDER";`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_POLICIES_CREATED_AT";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_POLICIES_POLICY_NUMBER";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_POLICIES_STATUS";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_POLICIES_USER_ID";`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_CLAIMS_STATUS_CREATED_AT";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_CLAIMS_CREATED_AT";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_CLAIMS_CLAIM_NUMBER";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_CLAIMS_STATUS";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_CLAIMS_POLICY_ID";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_CLAIMS_USER_ID";`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USERS_STATUS_CREATED_AT";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USERS_EMAIL";`);
  }
}
