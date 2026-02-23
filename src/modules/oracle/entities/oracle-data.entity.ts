import { Entity, Column, ManyToOne, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';
import { OracleProvider, OracleDataType, OracleStatus } from '../enums/oracle-provider.enum';

@Entity('oracle_data')
@Unique(['provider', 'externalId', 'dataType'])
export class OracleData extends BaseEntity {
  @Column({ type: 'enum', enum: OracleProvider })
  @Index()
  provider: OracleProvider;

  @Column()
  @Index()
  externalId: string;

  @Column({ type: 'enum', enum: OracleDataType })
  @Index()
  dataType: OracleDataType;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  numericValue?: number;

  @Column({ type: 'text', nullable: true })
  stringValue?: string;

  @Column({ type: 'timestamp with time zone' })
  @Index()
  oracleTimestamp: Date;

  @Column({ type: 'timestamp with time zone' })
  @Index()
  receivedAt: Date;

  @Column({ type: 'enum', enum: OracleStatus, default: OracleStatus.ACTIVE })
  @Index()
  status: OracleStatus;

  @Column({ type: 'text', nullable: true })
  signature?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  sourceUrl?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  confidenceScore?: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'text', nullable: true })
  verificationHash?: string;
}
