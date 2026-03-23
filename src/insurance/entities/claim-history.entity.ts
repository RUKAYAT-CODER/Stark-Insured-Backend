import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Claim } from './claim.entity';
import { ClaimStatus } from '../enums/claim-status.enum';

@Entity('claim_history')
export class ClaimHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'claim_id' })
  claimId: string;

  @ManyToOne(() => Claim)
  @JoinColumn({ name: 'claim_id' })
  claim: Claim;

  @Column({ type: 'enum', enum: ClaimStatus })
  status: ClaimStatus;

  @Column({ nullable: true })
  reason: string;

  @Column({ name: 'actor_id', nullable: true })
  actorId: string; // The person who performed the action

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
