import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('feature_flags')
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ type: 'int', default: 100 })
  rolloutPercentage: number; // 0-100

  @Column({ type: 'jsonb', nullable: true })
  targetingRules: {
    userIds?: string[];
    roles?: string[];
    groups?: string[];
  };

  @Column({ default: false })
  isAbTest: boolean;

  @Column({ type: 'jsonb', nullable: true })
  variants?: {
    name: string;
    weight: number;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}