import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BusinessRule, RuleType, RuleStatus, RulePriority } from '../entities/business-rule.entity';
import { RuleVersion } from '../entities/rule-version.entity';
import { RuleDefinition } from '../interfaces/rule.interfaces';

export interface CreateRuleDto {
  name: string;
  description: string;
  type: RuleType;
  priority?: RulePriority;
  conditions: RuleDefinition['conditions'];
  actions: RuleDefinition['actions'];
  category?: string;
  tags?: string[];
  createdBy: string;
}

export interface UpdateRuleDto {
  name?: string;
  description?: string;
  status?: RuleStatus;
  priority?: RulePriority;
  isEnabled?: boolean;
  category?: string;
  tags?: string[];
  updatedBy: string;
}

export interface CreateRuleVersionDto {
  ruleId: string;
  conditions: RuleDefinition['conditions'];
  actions: RuleDefinition['actions'];
  changeDescription?: string;
  testCases?: Array<{
    name: string;
    input: Record<string, any>;
    expected: Record<string, any>;
    description?: string;
  }>;
  isBackwardCompatible?: boolean;
  effectiveDate?: Date;
  expiryDate?: Date;
  createdBy: string;
}

@Injectable()
export class BusinessRulesService {
  private readonly logger = new Logger(BusinessRulesService.name);

  constructor(
    @InjectRepository(BusinessRule)
    private ruleRepository: Repository<BusinessRule>,
    @InjectRepository(RuleVersion)
    private versionRepository: Repository<RuleVersion>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new business rule
   */
  async createRule(createRuleDto: CreateRuleDto): Promise<BusinessRule> {
    const { name, description, type, priority, conditions, actions, category, tags, createdBy } = createRuleDto;

    // Check if rule with same name already exists
    const existingRule = await this.ruleRepository.findOne({ where: { name } });
    if (existingRule) {
      throw new ConflictException(`Rule with name '${name}' already exists`);
    }

    const rule = this.ruleRepository.create({
      name,
      description,
      type,
      priority: priority || RulePriority.MEDIUM,
      conditions,
      actions,
      category,
      tags,
      status: RuleStatus.DRAFT,
      currentVersion: 1,
      createdBy,
    });

    const savedRule = await this.ruleRepository.save(rule);

    // Create initial version
    await this.createRuleVersion({
      ruleId: savedRule.id,
      conditions,
      actions,
      changeDescription: 'Initial version',
      createdBy,
    });

    this.logger.log(`Created new rule: ${name}`);
    return savedRule;
  }

  /**
   * Get all rules with optional filtering
   */
  async getRules(filters?: {
    type?: RuleType;
    status?: RuleStatus;
    category?: string;
    tags?: string[];
    isEnabled?: boolean;
  }): Promise<BusinessRule[]> {
    const queryBuilder = this.ruleRepository.createQueryBuilder('rule');

    if (filters?.type) {
      queryBuilder.andWhere('rule.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      queryBuilder.andWhere('rule.status = :status', { status: filters.status });
    }

    if (filters?.category) {
      queryBuilder.andWhere('rule.category = :category', { category: filters.category });
    }

    if (filters?.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('rule.tags && :tags', { tags: filters.tags });
    }

    if (filters?.isEnabled !== undefined) {
      queryBuilder.andWhere('rule.isEnabled = :isEnabled', { isEnabled: filters.isEnabled });
    }

    queryBuilder.orderBy('rule.priority', 'DESC').addOrderBy('rule.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Get rule by ID
   */
  async getRule(id: string): Promise<BusinessRule> {
    const rule = await this.ruleRepository.findOne({
      where: { id },
      relations: ['versions'],
    });

    if (!rule) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }

    return rule;
  }

  /**
   * Update a rule
   */
  async updateRule(id: string, updateRuleDto: UpdateRuleDto): Promise<BusinessRule> {
    const rule = await this.getRule(id);

    Object.assign(rule, updateRuleDto);

    const updatedRule = await this.ruleRepository.save(rule);
    this.logger.log(`Updated rule: ${rule.name}`);

    return updatedRule;
  }

  /**
   * Delete a rule
   */
  async deleteRule(id: string): Promise<void> {
    const rule = await this.getRule(id);

    // Check if rule is being used
    if (rule.status === RuleStatus.ACTIVE) {
      throw new ConflictException('Cannot delete an active rule. Deactivate it first.');
    }

    await this.ruleRepository.remove(rule);
    this.logger.log(`Deleted rule: ${rule.name}`);
  }

  /**
   * Create a new version of a rule
   */
  async createRuleVersion(createVersionDto: CreateRuleVersionDto): Promise<RuleVersion> {
    const { ruleId, conditions, actions, changeDescription, testCases, isBackwardCompatible, effectiveDate, expiryDate, createdBy } = createVersionDto;

    const rule = await this.getRule(ruleId);

    // Get the latest version number
    const latestVersion = await this.versionRepository.findOne({
      where: { rule: { id: ruleId } },
      order: { version: 'DESC' },
    });

    const newVersionNumber = (latestVersion?.version || 0) + 1;

    const version = this.versionRepository.create({
      rule,
      version: newVersionNumber,
      conditions,
      actions,
      changeDescription,
      testCases,
      isBackwardCompatible: isBackwardCompatible || false,
      effectiveDate,
      expiryDate,
      status: 'DRAFT',
      createdBy,
    });

    const savedVersion = await this.versionRepository.save(version);

    // Update rule's current version if this is the first version
    if (newVersionNumber === 1) {
      rule.currentVersion = newVersionNumber;
      await this.ruleRepository.save(rule);
    }

    this.logger.log(`Created version ${newVersionNumber} for rule: ${rule.name}`);
    return savedVersion;
  }

  /**
   * Get all versions of a rule
   */
  async getRuleVersions(ruleId: string): Promise<RuleVersion[]> {
    return this.versionRepository.find({
      where: { rule: { id: ruleId } },
      order: { version: 'DESC' },
    });
  }

  /**
   * Activate a rule version
   */
  async activateRuleVersion(ruleId: string, version: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Deactivate all previous versions
      await manager.update(RuleVersion, 
        { rule: { id: ruleId } },
        { status: 'INACTIVE' }
      );

      // Activate the specified version
      const updateResult = await manager.update(RuleVersion,
        { rule: { id: ruleId }, version },
        { status: 'ACTIVE' }
      );

      if (updateResult.affected === 0) {
        throw new NotFoundException(`Version ${version} not found for rule ${ruleId}`);
      }

      // Update rule's current version and status
      await manager.update(BusinessRule,
        { id: ruleId },
        { 
          currentVersion: version,
          status: RuleStatus.ACTIVE,
          updatedAt: new Date(),
        }
      );
    });

    this.logger.log(`Activated version ${version} for rule ${ruleId}`);
  }

  /**
   * Deactivate a rule
   */
  async deactivateRule(id: string): Promise<BusinessRule> {
    const rule = await this.getRule(id);

    rule.status = RuleStatus.INACTIVE;
    rule.isEnabled = false;

    const deactivatedRule = await this.ruleRepository.save(rule);

    // Deactivate all versions
    await this.versionRepository.update(
      { rule: { id } },
      { status: 'INACTIVE' }
    );

    this.logger.log(`Deactivated rule: ${rule.name}`);
    return deactivatedRule;
  }

  /**
   * Test a rule version with test cases
   */
  async testRuleVersion(ruleId: string, version: number): Promise<Array<{
    testName: string;
    passed: boolean;
    actual: any;
    expected: any;
    error?: string;
  }>> {
    const ruleVersion = await this.versionRepository.findOne({
      where: { rule: { id: ruleId }, version },
      relations: ['rule'],
    });

    if (!ruleVersion) {
      throw new NotFoundException(`Version ${version} not found for rule ${ruleId}`);
    }

    if (!ruleVersion.testCases || ruleVersion.testCases.length === 0) {
      return [];
    }

    // This would integrate with the BusinessRulesEngine to run actual tests
    // For now, return placeholder results
    return ruleVersion.testCases.map(testCase => ({
      testName: testCase.name,
      passed: true, // Placeholder
      actual: testCase.expected,
      expected: testCase.expected,
    }));
  }

  /**
   * Get rule execution statistics
   */
  async getRuleStatistics(ruleId: string, timeRange?: { from: Date; to: Date }): Promise<{
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    recentExecutions: Array<{
      executedAt: Date;
      status: string;
      executionTime: number;
    }>;
  }> {
    const rule = await this.getRule(ruleId);
    
    // This would query the RuleExecution table for statistics
    // For now, return placeholder data
    return {
      totalExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0,
      recentExecutions: [],
    };
  }
}
