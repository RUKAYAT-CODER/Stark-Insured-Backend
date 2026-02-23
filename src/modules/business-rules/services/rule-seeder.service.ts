import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessRule, RuleType, RuleStatus, RulePriority } from '../entities/business-rule.entity';
import { RuleVersion } from '../entities/rule-version.entity';
import { POLICY_VALIDATION_RULES } from '../config/policy-validation-rules.config';

@Injectable()
export class RuleSeederService implements OnModuleInit {
  private readonly logger = new Logger(RuleSeederService.name);

  constructor(
    @InjectRepository(BusinessRule)
    private ruleRepository: Repository<BusinessRule>,
    @InjectRepository(RuleVersion)
    private versionRepository: Repository<RuleVersion>,
  ) {}

  async onModuleInit() {
    await this.seedRules();
  }

  private async seedRules(): Promise<void> {
    this.logger.log('Seeding business rules...');

    try {
      for (const [key, ruleConfig] of Object.entries(POLICY_VALIDATION_RULES)) {
        // Check if rule already exists
        const existingRule = await this.ruleRepository.findOne({
          where: { name: ruleConfig.name },
        });

        if (!existingRule) {
          // Create new rule
          const rule = this.ruleRepository.create({
            name: ruleConfig.name,
            description: ruleConfig.description,
            type: ruleConfig.type as RuleType,
            priority: ruleConfig.priority as RulePriority,
            conditions: ruleConfig.conditions,
            actions: ruleConfig.actions,
            category: ruleConfig.category,
            tags: ruleConfig.tags,
            status: RuleStatus.ACTIVE,
            isEnabled: true,
            currentVersion: 1,
            createdBy: 'system',
          });

          const savedRule = await this.ruleRepository.save(rule);

          // Create initial version
          const version = this.versionRepository.create({
            rule: { id: savedRule.id },
            version: 1,
            conditions: ruleConfig.conditions,
            actions: ruleConfig.actions,
            changeDescription: 'Initial seeded version',
            status: 'ACTIVE',
            isBackwardCompatible: true,
            createdBy: 'system',
          });

          await this.versionRepository.save(version);

          this.logger.log(`Seeded rule: ${ruleConfig.name}`);
        } else {
          this.logger.debug(`Rule already exists: ${ruleConfig.name}`);
        }
      }

      this.logger.log('Business rules seeding completed');
    } catch (error) {
      this.logger.error('Error seeding business rules:', error);
    }
  }

  /**
   * Manually trigger rule reseeding (for development/testing)
   */
  async reseedRules(): Promise<void> {
    this.logger.log('Reseeding business rules...');
    
    // Delete existing seeded rules
    await this.ruleRepository.delete({
      createdBy: 'system',
    });

    // Reseed
    await this.seedRules();
  }
}
