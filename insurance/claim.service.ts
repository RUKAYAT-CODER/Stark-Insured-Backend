import { Injectable } from '@nestjs/common';
import { Claim } from './entities/claim.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ClaimStatus } from './enums/claim-status.enum';
import { EncryptionService } from '../src/encryption/encryption.service';

@Injectable()
export class ClaimService {
  constructor(
    @InjectRepository(Claim) private readonly repo: Repository<Claim>,
    private readonly encryption: EncryptionService,
  ) {}

  async assessClaim(claimId: string): Promise<Claim> {
    const claim = await this.repo.findOne({ where: { id: claimId } });
    if (!claim) {
      throw new Error(`Claim with ID ${claimId} not found`);
    }
    // Simplified automated assessment
    claim.status = ClaimStatus.APPROVED;
    claim.payoutAmount = claim.claimAmount;
    return this.repo.save(claim);
  }

  async payClaim(claimId: string): Promise<Claim> {
    const claim = await this.repo.findOne({ where: { id: claimId } });
    if (!claim) {
      throw new Error(`Claim with ID ${claimId} not found`);
    }
    claim.status = ClaimStatus.PAID;
    return this.repo.save(claim);
  }

  async createClaim(policyId: string, claimAmount: number): Promise<Claim> {
    // Encrypt sensitive financial data
    const claim = this.repo.create({
      policyId,
      claimAmount: parseFloat(this.encryption.encrypt(claimAmount.toString())),
      status: ClaimStatus.PENDING,
    });
    return this.repo.save(claim);
  }
}
