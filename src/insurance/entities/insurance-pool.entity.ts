import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, VersionColumn } from 'typeorm';

@Entity('insurance_pools')
export class InsurancePool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('decimal')
  capital: number;

  @Column('decimal')
  lockedCapital: number;

  @VersionColumn()
  version: number;

  @CreateDateColumn()
  createdAt: Date;
}
