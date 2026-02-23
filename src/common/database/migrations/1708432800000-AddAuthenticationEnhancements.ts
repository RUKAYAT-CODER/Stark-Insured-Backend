import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddAuthenticationEnhancements1708432800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create refresh_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
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
            isNullable: false,
          },
          {
            name: 'token',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'tokenHash',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'isRevoked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'revokedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'revokedReason',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: false,
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
            name: 'lastUsedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        columnNames: ['userId'],
      }),
    );

    // Create token_blacklist table
    await queryRunner.createTable(
      new Table({
        name: 'token_blacklist',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'token',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'tokenHash',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'inet',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'token_blacklist',
      new TableIndex({
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'token_blacklist',
      new TableIndex({
        columnNames: ['expiresAt'],
      }),
    );

    // Create mfa_secrets table
    await queryRunner.createTable(
      new Table({
        name: 'mfa_secrets',
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
            isNullable: false,
          },
          {
            name: 'method',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'secret',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'isVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'verifiedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'backupCodes',
            type: 'text[]',
            default: "'{}'",
          },
          {
            name: 'usedBackupCodes',
            type: 'integer[]',
            default: "'{}'",
          },
          {
            name: 'phoneNumber',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'lastVerifiedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'mfa_secrets',
      new TableIndex({
        columnNames: ['userId'],
      }),
    );

    // Create sessions table
    await queryRunner.createTable(
      new Table({
        name: 'sessions',
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
            isNullable: false,
          },
          {
            name: 'sessionToken',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'sessionTokenHash',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'ACTIVE'",
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
            name: 'deviceName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'browser',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'operatingSystem',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'revokedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'revokedReason',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'lastActivityAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isMfaVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sessions',
      new TableIndex({
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'sessions',
      new TableIndex({
        columnNames: ['sessionTokenHash'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order of creation
    await queryRunner.dropTable('sessions', true);
    await queryRunner.dropTable('mfa_secrets', true);
    await queryRunner.dropTable('token_blacklist', true);
    await queryRunner.dropTable('refresh_tokens', true);
  }
}
