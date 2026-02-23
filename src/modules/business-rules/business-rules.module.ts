import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessRule } from './entities/business-rule.entity';
import { RuleVersion } from './entities/rule-version.entity';
import { RuleExecution } from './entities/rule-execution.entity';
import { BusinessRulesEngine } from './services/business-rules-engine.service';
import { BusinessRulesService } from './services/business-rules.service';
import { PolicyValidationService } from './services/policy-validation.service';
import { RuleSeederService } from './services/rule-seeder.service';
import { RuleTestingService } from './services/rule-testing.service';
import { RuleAuditService } from './services/rule-audit.service';
import { BusinessRulesController } from './controllers/business-rules.controller';
import { PolicyValidationController } from './controllers/policy-validation.controller';
import { BusinessRulesAdminController } from './controllers/business-rules-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BusinessRule,
      RuleVersion,
      RuleExecution,
    ]),
  ],
  controllers: [
    BusinessRulesController,
    PolicyValidationController,
    BusinessRulesAdminController,
  ],
  providers: [
    BusinessRulesEngine,
    BusinessRulesService,
    PolicyValidationService,
    RuleSeederService,
    RuleTestingService,
    RuleAuditService,
  ],
  exports: [
    BusinessRulesEngine,
    BusinessRulesService,
    PolicyValidationService,
    RuleAuditService,
  ],
})
export class BusinessRulesModule {}
