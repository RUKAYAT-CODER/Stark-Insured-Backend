import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm'
import { StakeEntity } from './stake.entity'

export type CallOutcome = 'YES' | 'NO' | 'PENDING'

@Entity({ name: 'calls' })
export class CallEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  description: string

  @Column({
    type: 'enum',
    enum: ['YES', 'NO', 'PENDING'],
    default: 'PENDING',
  })
  outcome: CallOutcome

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date | null

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date | null

  @CreateDateColumn()
  createdAt: Date

  @OneToMany(() => StakeEntity, (stake) => stake.call)
  stakes: StakeEntity[]
}