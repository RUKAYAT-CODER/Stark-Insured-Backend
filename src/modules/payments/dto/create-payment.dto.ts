import { IsString, IsNumber, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Amount to pay' })
  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  amount: number;

  @ApiProperty({ description: 'Currency code (e.g., USD, EUR)' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ description: 'Payment method ID' })
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @ApiProperty({ description: 'Policy or claim ID this payment relates to' })
  @IsString()
  @IsNotEmpty()
  referenceId: string;

  @ApiProperty({ description: 'Payment type (premium, claim, etc.)' })
  @IsString()
  @IsNotEmpty()
  paymentType: string;

  @ApiProperty({ description: 'Optional description or memo' })
  @IsString()
  description?: string;
}
