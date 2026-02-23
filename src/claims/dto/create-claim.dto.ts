import {
  IsUUID,
  IsEnum,
  IsDate,
  IsDecimal,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClaimType } from '../entities/claim.entity';
import { 
  IsSecureEmail,
  IsValidAmount,
  IsStrongPassword,
  IsValidPolicyNumber,
  IsValidClaimNumber,
  IsValidDateRange,
} from '../../../common/validation/validators/business.validators';

export class CreateClaimDto {
  @IsUUID()
  policyId: string;

  @IsEnum(ClaimType)
  claimType: ClaimType;

  @Type(() => Date)
  @IsDate()
  @IsValidDateRange('incidentDate', {
    startDate: 'incidentDate',
    endDate: 'incidentDate',
    message: 'Incident date must be within reasonable range',
  })
  incidentDate: Date;

  @IsDecimal({ decimal_digits: '1,2' })
  @Min(0.01)
  @Max(999999.99)
  claimAmount: number;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  metadata?: Record<string, any>;

  @IsStrongPassword()
  @IsOptional()
  @MaxLength(100)
  evidence?: string;

  @IsSecureEmail()
  @IsOptional()
  @MaxLength(255)
  contactEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  contactPhone?: string;

  @IsOptional()
  @MaxLength(100)
  supportingDocuments?: string;

  @IsOptional()
  @MaxLength(50)
  location?: string;

  @IsOptional()
  @MaxLength(100)
  reportedBy?: string;

  @IsOptional()
  @MaxLength(500)
  policeReportNumber?: string;

  @IsOptional()
  @MaxLength(100)
  adjusterNotes?: string;
}