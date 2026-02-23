import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('feature_usage')
export class FeatureUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  featureKey: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  variant: string;

  @CreateDateColumn()
  usedAt: Date;
}