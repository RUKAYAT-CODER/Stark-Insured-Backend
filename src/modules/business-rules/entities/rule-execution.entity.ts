import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { BusinessRule } from './business-rule.entity';

export enum RuleExecutionStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  ERROR = 'ERROR',
  SKIPPED = 'SKIPPED',
}

@Entity('rule_executions')
export class RuleExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb')
  context: Record<string, any>;

  @Column('jsonb', { nullable: true })
  result: Record<string, any>;

  @Column({
    type: 'enum',
    enum: RuleExecutionStatus,
  })
  status: RuleExecutionStatus;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  executionTime: number;

  @Column({ nullable: true })
  triggeredBy: string;

  @Column({ nullable: true })
  entityType: string;

  @Column({ nullable: true })
  entityId: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  executedAt: Date;

  @ManyToOne(() => BusinessRule, (rule) => rule.executions)
  rule: BusinessRule;
}
