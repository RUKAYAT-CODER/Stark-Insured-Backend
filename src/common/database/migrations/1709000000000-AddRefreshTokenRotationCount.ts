import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRefreshTokenRotationCount1709000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'refresh_tokens',
      new TableColumn({
        name: 'rotationCount',
        type: 'integer',
        isNullable: false,
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('refresh_tokens', 'rotationCount');
  }
}
