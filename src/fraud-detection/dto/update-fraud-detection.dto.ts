import { PartialType } from '@nestjs/swagger';
import { CreateFraudDetectionDto } from './create-fraud-detection.dto';

export class UpdateFraudDetectionDto extends PartialType(CreateFraudDetectionDto) {}
