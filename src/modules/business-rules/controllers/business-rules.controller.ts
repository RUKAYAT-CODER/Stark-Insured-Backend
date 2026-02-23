import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BusinessRulesService, CreateRuleDto, UpdateRuleDto, CreateRuleVersionDto } from '../services/business-rules.service';
import { RuleType, RuleStatus } from '../entities/business-rule.entity';

@ApiTags('business-rules')
@Controller('business-rules')
export class BusinessRulesController {
  constructor(private readonly businessRulesService: BusinessRulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new business rule' })
  @ApiResponse({ status: 201, description: 'Rule created successfully' })
  async createRule(@Body() createRuleDto: CreateRuleDto) {
    return this.businessRulesService.createRule(createRuleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all business rules' })
  async getRules(@Query() filters: {
    type?: RuleType;
    status?: RuleStatus;
    category?: string;
    tags?: string[];
    isEnabled?: boolean;
  }) {
    return this.businessRulesService.getRules(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rule by ID' })
  async getRule(@Param('id') id: string) {
    return this.businessRulesService.getRule(id);
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

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get rule execution statistics' })
  async getRuleStatistics(@Param('id') id: string, @Query() timeRange: { from: string; to: string }) {
    const from = timeRange?.from ? new Date(timeRange.from) : undefined;
    const to = timeRange?.to ? new Date(timeRange.to) : undefined;
    return this.businessRulesService.getRuleStatistics(id, from && to ? { from, to } : undefined);
  }
}
