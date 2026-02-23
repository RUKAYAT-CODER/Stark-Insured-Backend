import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BusinessRulesService, CreateRuleDto, UpdateRuleDto, CreateRuleVersionDto } from '../services/business-rules.service';
import { RuleTestingService, RuleTestSuite, RuleTestExecutionResult } from '../services/rule-testing.service';
import { RuleType, RuleStatus } from '../entities/business-rule.entity';
import { RuleVersion } from '../entities/rule-version.entity';

@ApiTags('admin/business-rules')
@Controller('admin/business-rules')
export class BusinessRulesAdminController {
  constructor(
    private readonly businessRulesService: BusinessRulesService,
    private readonly ruleTestingService: RuleTestingService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new business rule' })
  @ApiResponse({ status: 201, description: 'Rule created successfully' })
  async createRule(@Body() createRuleDto: CreateRuleDto) {
    return this.businessRulesService.createRule(createRuleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all business rules with admin details' })
  async getRulesWithAdminDetails(@Query() filters: {
    type?: RuleType;
    status?: RuleStatus;
    category?: string;
    tags?: string[];
    isEnabled?: boolean;
    includeVersions?: boolean;
    includeStatistics?: boolean;
  }) {
    const rules = await this.businessRulesService.getRules(filters);
    
    if (filters.includeVersions || filters.includeStatistics) {
      const rulesWithDetails = await Promise.all(
        rules.map(async (rule) => {
          const details: any = { ...rule };
          
          if (filters.includeVersions) {
            details.versions = await this.businessRulesService.getRuleVersions(rule.id);
          }
          
          if (filters.includeStatistics) {
            details.statistics = await this.businessRulesService.getRuleStatistics(rule.id);
          }
          
          return details;
        })
      );
      
      return rulesWithDetails;
    }
    
    return rules;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rule by ID with full details' })
  async getRuleWithDetails(@Param('id') id: string, @Query() options: {
    includeVersions?: boolean;
    includeStatistics?: boolean;
    includeExecutions?: boolean;
  }) {
    const rule = await this.businessRulesService.getRule(id);
    const details: any = { ...rule };
    
    if (options.includeVersions) {
      details.versions = await this.businessRulesService.getRuleVersions(id);
    }
    
    if (options.includeStatistics) {
      details.statistics = await this.businessRulesService.getRuleStatistics(id);
    }
    
    return details;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a business rule' })
  async updateRule(@Param('id') id: string, @Body() updateRuleDto: UpdateRuleDto) {
    return this.businessRulesService.updateRule(id, updateRuleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a business rule' })
  async deleteRule(@Param('id') id: string) {
    return this.businessRulesService.deleteRule(id);
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Create a new version of a rule' })
  async createRuleVersion(@Param('id') id: string, @Body() createVersionDto: CreateRuleVersionDto) {
    return this.businessRulesService.createRuleVersion({ ...createVersionDto, ruleId: id });
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get all versions of a rule' })
  async getRuleVersions(@Param('id') id: string) {
    return this.businessRulesService.getRuleVersions(id);
  }

  @Put(':id/versions/:version/activate')
  @ApiOperation({ summary: 'Activate a specific version of a rule' })
  async activateRuleVersion(@Param('id') id: string, @Param('version') version: number) {
    return this.businessRulesService.activateRuleVersion(id, version);
  }

  @Put(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a rule' })
  async deactivateRule(@Param('id') id: string) {
    return this.businessRulesService.deactivateRule(id);
  }

  @Post(':id/versions/:version/test')
  @ApiOperation({ summary: 'Test a rule version' })
  async testRuleVersion(@Param('id') id: string, @Param('version') version: number) {
    return this.businessRulesService.testRuleVersion(id, version);
  }

  @Post(':id/versions/:version/test-suite')
  @ApiOperation({ summary: 'Execute comprehensive test suite for a rule version' })
  async executeTestSuite(@Param('id') id: string, @Param('version') version: number, @Body() testSuite?: RuleTestSuite) {
    if (testSuite) {
      return this.ruleTestingService.executeTestSuite(testSuite);
    }
    
    // Generate test suite automatically
    const ruleVersions = await this.businessRulesService.getRuleVersions(id);
    const targetVersion = ruleVersions.find(v => v.version === version);
    
    if (!targetVersion) {
      throw new Error(`Version ${version} not found for rule ${id}`);
    }
    
    const generatedTestCases = this.ruleTestingService.generateTestCases(targetVersion);
    const autoTestSuite: RuleTestSuite = {
      ruleId: id,
      version,
      testCases: generatedTestCases,
    };
    
    return this.ruleTestingService.executeTestSuite(autoTestSuite);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get rule execution statistics' })
  async getRuleStatistics(@Param('id') id: string, @Query() timeRange: { from: string; to: string }) {
    const from = timeRange?.from ? new Date(timeRange.from) : undefined;
    const to = timeRange?.to ? new Date(timeRange.to) : undefined;
    return this.businessRulesService.getRuleStatistics(id, from && to ? { from, to } : undefined);
  }

  @Get('categories/list')
  @ApiOperation({ summary: 'Get all rule categories' })
  async getRuleCategories() {
    const rules = await this.businessRulesService.getRules({});
    const categories = [...new Set(rules.map(rule => rule.category).filter(Boolean))];
    return categories;
  }

  @Get('tags/list')
  @ApiOperation({ summary: 'Get all rule tags' })
  async getRuleTags() {
    const rules = await this.businessRulesService.getRules({});
    const allTags = rules.flatMap(rule => rule.tags || []);
    const uniqueTags = [...new Set(allTags)];
    return uniqueTags;
  }

  @Post('bulk-activate')
  @ApiOperation({ summary: 'Activate multiple rules at once' })
  async bulkActivateRules(@Body() ruleIds: string[]) {
    const results = await Promise.allSettled(
      ruleIds.map(id => this.businessRulesService.activateRuleVersion(id, 1))
    );
    
    return {
      total: ruleIds.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      details: results.map((r, i) => ({
        ruleId: ruleIds[i],
        status: r.status,
        error: r.status === 'rejected' ? r.reason.message : null,
      })),
    };
  }

  @Post('bulk-deactivate')
  @ApiOperation({ summary: 'Deactivate multiple rules at once' })
  async bulkDeactivateRules(@Body() ruleIds: string[]) {
    const results = await Promise.allSettled(
      ruleIds.map(id => this.businessRulesService.deactivateRule(id))
    );
    
    return {
      total: ruleIds.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      details: results.map((r, i) => ({
        ruleId: ruleIds[i],
        status: r.status,
        error: r.status === 'rejected' ? r.reason.message : null,
      })),
    };
  }

  @Get('health/check')
  @ApiOperation({ summary: 'Health check for business rules engine' })
  async healthCheck() {
    const rules = await this.businessRulesService.getRules({ status: RuleStatus.ACTIVE });
    
    return {
      status: 'healthy',
      timestamp: new Date(),
      activeRules: rules.length,
      ruleTypes: [...new Set(rules.map(r => r.type))],
      categories: [...new Set(rules.map(r => r.category).filter(Boolean))],
    };
  }
}
