import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { BusinessRule } from './business-rule.entity';

@Entity('rule_versions')
export class RuleVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  version: number;

  @Column('jsonb')
  conditions: Record<string, any>;

  @Column('jsonb')
  actions: Record<string, any>;

  @Column({ nullable: true })
  changeDescription: string;

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'INACTIVE', 'DRAFT'],
    default: 'DRAFT',
  })
  status: string;

  @Column('jsonb', { nullable: true })
  testCases: Array<{
    name: string;
    input: Record<string, any>;
    expected: Record<string, any>;
    description?: string;
  }>;

  @Column({ default: false })
  isBackwardCompatible: boolean;

  @Column({ type: 'timestamp', nullable: true })
  effectiveDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiryDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  createdBy: string;

  @ManyToOne(() => BusinessRule, (rule) => rule.versions)
  rule: BusinessRule;
}
