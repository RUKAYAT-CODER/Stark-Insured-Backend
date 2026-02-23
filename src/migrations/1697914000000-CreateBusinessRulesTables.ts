import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateBusinessRulesTables1697914000000 implements MigrationInterface {
  name = 'CreateBusinessRulesTables1697914000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create business_rules table
    await queryRunner.createTable(
      new Table({
        name: 'business_rules',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['POLICY_VALIDATION', 'ELIGIBILITY', 'COVERAGE', 'PRICING', 'UNDERWRITING'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'DEPRECATED'],
            default: "'DRAFT'",
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['1', '2', '3', '4'],
            default: "'2'",
          },
          {
            name: 'conditions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'actions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'is_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'current_version',
            type: 'int',
            default: 1,
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for business_rules
    await queryRunner.query(`CREATE INDEX IDX_business_rules_type ON business_rules(type)`);
    await queryRunner.query(`CREATE INDEX IDX_business_rules_status ON business_rules(status)`);
    await queryRunner.query(`CREATE INDEX IDX_business_rules_priority ON business_rules(priority)`);
    await queryRunner.query(`CREATE INDEX IDX_business_rules_category ON business_rules(category)`);

    // Create rule_versions table
    await queryRunner.createTable(
      new Table({
        name: 'rule_versions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'version',
            type: 'int',
          },
          {
            name: 'conditions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'actions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'change_description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ACTIVE', 'INACTIVE', 'DRAFT'],
            default: "'DRAFT'",
          },
          {
            name: 'test_cases',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'is_backward_compatible',
            type: 'boolean',
            default: false,
          },
          {
            name: 'effective_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiry_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'rule_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create foreign key for rule_versions
    await queryRunner.query(`CREATE INDEX IDX_rule_versions_rule_id ON rule_versions(rule_id)`);

    // Create rule_executions table
    await queryRunner.createTable(
      new Table({
        name: 'rule_executions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'context',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'result',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['SUCCESS', 'FAILURE', 'ERROR', 'SKIPPED'],
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'execution_time',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: true,
          },
          {
            name: 'triggered_by',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'entity_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'executed_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'rule_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for rule_executions
    await queryRunner.query(`CREATE INDEX IDX_rule_executions_rule_id ON rule_executions(rule_id)`);
    await queryRunner.query(`CREATE INDEX IDX_rule_executions_status ON rule_executions(status)`);
    await queryRunner.query(`CREATE INDEX IDX_rule_executions_executed_at ON rule_executions(executed_at)`);
    await queryRunner.query(`CREATE INDEX IDX_rule_executions_entity ON rule_executions(entity_type, entity_id)`);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE rule_versions 
      ADD CONSTRAINT FK_rule_versions_business_rules 
      FOREIGN KEY (rule_id) REFERENCES business_rules(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE rule_executions 
      ADD CONSTRAINT FK_rule_executions_business_rules 
      FOREIGN KEY (rule_id) REFERENCES business_rules(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(`ALTER TABLE rule_versions DROP CONSTRAINT IF EXISTS FK_rule_versions_business_rules`);
    await queryRunner.query(`ALTER TABLE rule_executions DROP CONSTRAINT IF EXISTS FK_rule_executions_business_rules`);

    // Drop tables
    await queryRunner.dropTable('rule_executions');
    await queryRunner.dropTable('rule_versions');
    await queryRunner.dropTable('business_rules');
  }
}
