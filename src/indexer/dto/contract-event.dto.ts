import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
  IsDate,
  IsEnum,
  IsInt,
  IsIn,
  IsNotEmpty,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContractEventType } from '../types/event-types';

/**
 * DTO for contract event data
 */
export class ContractEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  eventId: string;

  @IsInt()
  @Min(1)
  ledgerSeq: number;

  @IsDate()
  @Type(() => Date)
  ledgerClosedAt: Date;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contractId: string;

  @IsEnum(ContractEventType)
  eventType: ContractEventType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  transactionHash: string;

  @IsObject()
  data: Record<string, unknown>;

  @IsBoolean()
  inSuccessfulContractCall: boolean;
}

/**
 * DTO for event query parameters
 */
export class EventQueryDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  startLedger?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  endLedger?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  contractId?: string;

  @IsEnum(ContractEventType)
  @IsOptional()
  eventType?: ContractEventType;

  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  cursor?: string;
}

/**
 * DTO for ledger cursor update
 */
export class UpdateLedgerCursorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  network: string;

  @IsInt()
  @Min(1)
  lastLedgerSeq: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastLedgerHash?: string;
}

/**
 * DTO for processed event tracking
 */
export class ProcessedEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  eventId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  network: string;

  @IsInt()
  @Min(1)
  ledgerSeq: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contractId: string;

  @IsEnum(ContractEventType)
  eventType: ContractEventType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  transactionHash: string;
}

// ---------------------------------------------------------------------------
// Per-event payload DTOs — used inside handler validate() methods
// ---------------------------------------------------------------------------

/** Regex matching a non-negative integer string (no leading zeros except "0") */
const NON_NEG_INT_STRING = /^(0|[1-9]\d*)$/;

export class ProjectCreatedDataDto {
  @IsInt()
  @Min(0)
  projectId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  creator: string;

  @IsString()
  @Matches(NON_NEG_INT_STRING, { message: 'fundingGoal must be a non-negative integer string' })
  fundingGoal: string;

  @IsInt()
  @Min(1)
  deadline: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  token: string;
}

export class ContributionMadeDataDto {
  @IsInt()
  @Min(0)
  projectId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contributor: string;

  @IsString()
  @Matches(NON_NEG_INT_STRING, { message: 'amount must be a non-negative integer string' })
  amount: string;

  @IsString()
  @Matches(NON_NEG_INT_STRING, { message: 'totalRaised must be a non-negative integer string' })
  totalRaised: string;
}

export class MilestoneApprovedDataDto {
  @IsInt()
  @Min(0)
  projectId: number;

  @IsInt()
  @Min(0)
  milestoneId: number;

  @IsInt()
  @Min(0)
  approvalCount: number;
}

export class MilestoneRejectedDataDto {
  @IsInt()
  @Min(0)
  projectId: number;

  @IsInt()
  @Min(0)
  milestoneId: number;
}

export class FundsReleasedDataDto {
  @IsInt()
  @Min(0)
  projectId: number;

  @IsInt()
  @Min(0)
  milestoneId: number;

  @IsString()
  @Matches(NON_NEG_INT_STRING, { message: 'amount must be a non-negative integer string' })
  amount: string;
}

export class ProjectStatusDataDto {
  @IsInt()
  @Min(0)
  projectId: number;
}

export class PolicyCreatedDataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  poolId: string;

  @IsString()
  @Matches(NON_NEG_INT_STRING, { message: 'coverageAmount must be a non-negative integer string' })
  coverageAmount: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  riskType?: string;
}

export class ClaimSubmittedDataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  claimId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  policyId: string;

  @IsString()
  @Matches(NON_NEG_INT_STRING, { message: 'amount must be a non-negative integer string' })
  amount: string;
}
