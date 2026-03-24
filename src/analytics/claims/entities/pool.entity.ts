import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity({ name: 'pools' })
export class PoolEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'numeric', default: 0 })
  totalCapacity: number

  @Column({ type: 'numeric', default: 0 })
  lockedAmount: number

  @Column({ type: 'numeric', default: 0 })
  availableLiquidity: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}