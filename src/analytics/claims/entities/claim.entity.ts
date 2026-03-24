import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

@Entity({ name: 'claims' })
export class ClaimEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid', nullable: true })
  poolId?: string | null

  @Column({ type: 'text' })
  userAddress: string

  @Column({ type: 'numeric' })
  amount: number

  @Column({
    type: 'enum',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  })
  status: ClaimStatus

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}