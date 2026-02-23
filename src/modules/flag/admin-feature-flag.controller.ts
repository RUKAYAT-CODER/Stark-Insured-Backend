import {
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Feature } from './decorator';
import { FeatureFlagGuard } from './feature-flag.guard';

@Controller('adminFeatureFlagController')
export class AdminFeatureFlagController {
  @Feature('new-claim-engine')
  @UseGuards(FeatureFlagGuard)
  @Post()
  CreateClaimDto() {}
}
