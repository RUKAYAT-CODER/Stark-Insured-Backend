import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CreateFraudDetectionDto } from './dto/create-fraud-detection.dto';
import { UpdateFraudDetectionDto } from './dto/update-fraud-detection.dto';
import { FraudDetectionService } from './providers/fraud-detection.service';

@Controller('fraud-detection')
export class FraudDetectionController {
  constructor(private readonly fraudDetectionService: FraudDetectionService) {}

}
