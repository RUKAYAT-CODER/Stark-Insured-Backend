import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { RiskType } from '../enums/risk-type.enum';
import { PolicyStatus } from '../enums/policy-status.enum';

@Entity('insurance_policies')
export class InsurancePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: RiskType })
  riskType: RiskType;

  @Column({ type: 'enum', enum: PolicyStatus, default: PolicyStatus.PENDING })
  status: PolicyStatus;

  @Column('decimal')
  premium: number;

  @Column('decimal')
  coverageAmount: number;

  @Column()
  poolId: string;

  @CreateDateColumn()
  createdAt: Date;
}
