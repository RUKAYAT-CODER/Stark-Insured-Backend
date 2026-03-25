import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { CallEntity } from './call.entity'

export type StakePosition = 'YES' | 'NO'
export type ResolutionStatus = 'PENDING' | 'RESOLVED'

@Entity({ name: 'stake_ledger' })
export class StakeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  callId: string

  @Column({ type: 'text' })
  userAddress: string

  @Column({ type: 'numeric' })
  amount: number

  @Column({
    type: 'enum',
    enum: ['YES', 'NO'],
  })
  position: StakePosition

  @Column({ type: 'numeric', nullable: true })
  profitLoss?: number | null

  @Column({ type: 'text', nullable: true })
  transactionHash?: string | null

  @Column({
    type: 'enum',
    enum: ['PENDING', 'RESOLVED'],
    default: 'PENDING',
  })
  resolutionStatus: ResolutionStatus

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => CallEntity, (call) => call.stakes, { nullable: true })
  @JoinColumn({ name: 'callId' })
  call?: CallEntity
}