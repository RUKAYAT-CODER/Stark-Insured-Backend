import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RuleVersion } from './rule-version.entity';
import { RuleExecution } from './rule-execution.entity';

export enum RuleType {
  POLICY_VALIDATION = 'POLICY_VALIDATION',
  ELIGIBILITY = 'ELIGIBILITY',
  COVERAGE = 'COVERAGE',
  PRICING = 'PRICING',
  UNDERWRITING = 'UNDERWRITING',
}

export enum RuleStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEPRECATED = 'DEPRECATED',
}

export enum RulePriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

@Entity('business_rules')
export class BusinessRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: RuleType,
  })
  type: RuleType;

  @Column({
    type: 'enum',
    enum: RuleStatus,
    default: RuleStatus.DRAFT,
  })
  status: RuleStatus;

  @Column({
    type: 'enum',
    enum: RulePriority,
    default: RulePriority.MEDIUM,
  })
  priority: RulePriority;

  @Column('jsonb')
  conditions: Record<string, any>;

  @Column('jsonb')
  actions: Record<string, any>;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  tags: string[];

  @Column({ default: 1 })
  currentVersion: number;

  @OneToMany(() => RuleVersion, 'rule')
  versions: RuleVersion[];

  @OneToMany(() => RuleExecution, 'rule')
  executions: RuleExecution[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;
}
