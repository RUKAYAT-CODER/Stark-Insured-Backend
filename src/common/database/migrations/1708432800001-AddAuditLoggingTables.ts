import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

export class AddAuditLoggingTables1708432800001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create audit logs table
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'action',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'entity',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'entityId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'changes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'inet',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'correlationId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_AUDIT_LOGS_USER_ID',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_AUDIT_LOGS_ACTION',
        columnNames: ['action'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_AUDIT_LOGS_ENTITY',
        columnNames: ['entity', 'entityId'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_AUDIT_LOGS_CREATED_AT',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_AUDIT_LOGS_CORRELATION_ID',
        columnNames: ['correlationId'],
      }),
    );

    // Add migration metadata
    console.log('Audit logging tables created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex('audit_logs', 'IDX_AUDIT_LOGS_CORRELATION_ID');
    await queryRunner.dropIndex('audit_logs', 'IDX_AUDIT_LOGS_CREATED_AT');
    await queryRunner.dropIndex('audit_logs', 'IDX_AUDIT_LOGS_ENTITY');
    await queryRunner.dropIndex('audit_logs', 'IDX_AUDIT_LOGS_ACTION');
    await queryRunner.dropIndex('audit_logs', 'IDX_AUDIT_LOGS_USER_ID');

    // Drop table
    await queryRunner.dropTable('audit_logs');

    console.log('Audit logging tables dropped successfully');
  }
}