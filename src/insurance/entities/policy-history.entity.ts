import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { InsurancePolicy } from './insurance-policy.entity';
import { PolicyStatus } from '../enums/policy-status.enum';

@Entity('policy_history')
export class PolicyHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'policy_id' })
  policyId: string;

  @ManyToOne(() => InsurancePolicy)
  @JoinColumn({ name: 'policy_id' })
  policy: InsurancePolicy;

  @Column({ type: 'enum', enum: PolicyStatus })
  status: PolicyStatus;

  @Column({ nullable: true })
  reason: string;

  @Column({ name: 'actor_id', nullable: true })
  actorId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
