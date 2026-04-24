import { Injectable } from '@nestjs/common';
import { Claim } from './entities/claim.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ClaimStatus } from './enums/claim-status.enum';
import { EncryptionService } from '../src/encryption/encryption.service';
import { AuditService } from './services/audit.service';

@Injectable()
export class ClaimService {
  constructor(
    @InjectRepository(Claim) private readonly repo: Repository<Claim>,
    private readonly encryption: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

  async assessClaim(claimId: string): Promise<Claim> {
    const claim = await this.repo.findOne({ where: { id: claimId } });
    if (!claim) {
      throw new Error(`Claim with ID ${claimId} not found`);
    }
    const beforeState = { ...claim };
    // Simplified automated assessment
    claim.status = ClaimStatus.APPROVED;
    claim.payoutAmount = claim.claimAmount;
    const updatedClaim = await this.repo.save(claim);
    await this.auditService.logApprove('Claim', claimId, beforeState, updatedClaim);
    return updatedClaim;
  }

  async payClaim(claimId: string): Promise<Claim> {
    const claim = await this.repo.findOne({ where: { id: claimId } });
    if (!claim) {
      throw new Error(`Claim with ID ${claimId} not found`);
    }
    const beforeState = { ...claim };
    claim.status = ClaimStatus.PAID;
    const updatedClaim = await this.repo.save(claim);
    await this.auditService.logPayout('Claim', claimId, beforeState, updatedClaim);
    return updatedClaim;
  }

  async createClaim(policyId: string, claimAmount: number): Promise<Claim> {
    // Encrypt sensitive financial data
    const claim = this.repo.create({
      policyId,
      claimAmount: parseFloat(this.encryption.encrypt(claimAmount.toString())),
      status: ClaimStatus.PENDING,
    });
    const savedClaim = await this.repo.save(claim);
    await this.auditService.logCreate('Claim', savedClaim.id, savedClaim);
    return savedClaim;
  }
}
