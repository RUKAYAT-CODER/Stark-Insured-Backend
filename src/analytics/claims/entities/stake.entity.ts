import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity({ name: 'stake_ledger' })
export class StakeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'numeric' })
  amount: number

  @Column({ type: 'text' })
  userAddress: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}