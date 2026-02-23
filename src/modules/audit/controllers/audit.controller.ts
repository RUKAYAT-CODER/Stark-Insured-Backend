import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
  Param,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AuditService } from '../services/audit.service';
import { ComplianceReportService } from '../services/compliance-report.service';
import { AuditRetentionService } from '../services/audit-retention.service';
import { AuditQueryDto } from '../dtos/audit-query.dto';
import { AuditLogsResponseDto } from '../dtos/audit-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { AuditLog } from '../entities/audit.entity';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly complianceReportService: ComplianceReportService,
    private readonly auditRetentionService: AuditRetentionService,
  ) {}

  @Get('logs')
  @ApiOperation({
    summary: 'Get audit logs',
    description: 'Retrieve audit logs with filtering, pagination, and sorting. Admin access required.',
  })
  @ApiQuery({
    name: 'actionType',
    required: false,
    description: 'Filter by action type',
  })
  @ApiQuery({
    name: 'actor',
    required: false,
    description: 'Filter by actor (user ID or wallet)',
  })
  @ApiQuery({
    name: 'entityReference',
    required: false,
    description: 'Filter by entity reference (policy ID, claim ID, etc.)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date filter (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date filter (ISO 8601)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 50, max: 100)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field (default: timestamp)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (ASC or DESC, default: DESC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    type: AuditLogsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAuditLogs(
    @Query(new ValidationPipe({ transform: true })) query: AuditQueryDto,
  ): Promise<AuditLogsResponseDto> {
    // Convert date strings to Date objects
    const processedQuery = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    return this.auditService.getAuditLogs(processedQuery);
  }

  // ==================== COMPLIANCE REPORTS ====================

  @Get('reports/gdpr/data-access/:userId')
  @ApiOperation({
    summary: 'Generate GDPR data access report',
    description: 'Generate a comprehensive report of all data accessed for a specific user (GDPR Article 15 - Right of Access).',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to generate report for',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Report start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'Report end date (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'GDPR data access report generated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async generateGDPRDataAccessReport(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.complianceReportService.generateGDPRDataAccessReport(
      userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('reports/compliance/summary')
  @ApiOperation({
    summary: 'Generate compliance summary report',
    description: 'Generate a summary report of all audit activities for compliance monitoring and regulatory reporting.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Report start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'Report end date (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'Compliance summary report generated successfully',
  })
  async generateComplianceSummaryReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.complianceReportService.generateComplianceSummaryReport(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('reports/audit-trail/:entityType/:entityReference')
  @ApiOperation({
    summary: 'Generate audit trail report',
    description: 'Generate a complete audit trail for a specific entity with integrity verification.',
  })
  @ApiParam({
    name: 'entityType',
    description: 'Entity type (e.g., CLAIM, POLICY, USER)',
  })
  @ApiParam({
    name: 'entityReference',
    description: 'Entity reference ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit trail report generated successfully',
  })
  async generateAuditTrailReport(
    @Param('entityType') entityType: string,
    @Param('entityReference') entityReference: string,
  ) {
    return this.complianceReportService.generateAuditTrailReport(
      entityType,
      entityReference,
    );
  }

  @Get('reports/export')
  @ApiOperation({
    summary: 'Export audit logs for external auditor',
    description: 'Export audit logs in JSON or CSV format for external auditors.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Export start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'Export end date (ISO 8601)',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Export format (json or csv, default: json)',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs exported successfully',
  })
  async exportAuditLogs(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res() res: Response,
  ) {
    const exportData = await this.complianceReportService.exportAuditLogsForAuditor(
      new Date(startDate),
      new Date(endDate),
      format,
    );

    const filename = `audit-export-${startDate}-to-${endDate}.${format}`;
    
    res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  }

  // ==================== RETENTION MANAGEMENT ====================

  @Get('retention/statistics')
  @ApiOperation({
    summary: 'Get retention statistics',
    description: 'Get statistics about audit log retention and archiving.',
  })
  @ApiResponse({
    status: 200,
    description: 'Retention statistics retrieved successfully',
  })
  async getRetentionStatistics() {
    return this.auditRetentionService.getRetentionStatistics();
  }

  @Get('retention/policies')
  @ApiOperation({
    summary: 'Get retention policies',
    description: 'Get all configured retention policies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Retention policies retrieved successfully',
  })
  async getRetentionPolicies() {
    return this.auditRetentionService.getRetentionPolicies();
  }

  @Post('retention/apply')
  @ApiOperation({
    summary: 'Apply retention policies',
    description: 'Manually trigger retention policy application (archiving and deletion).',
  })
  @ApiResponse({
    status: 200,
    description: 'Retention policies applied successfully',
  })
  async applyRetentionPolicies() {
    return this.auditRetentionService.applyRetentionPolicies();
  }

  // ==================== INTEGRITY VERIFICATION ====================

  @Get('integrity/verify/:entityType/:entityReference')
  @ApiOperation({
    summary: 'Verify audit trail integrity',
    description: 'Verify the integrity of the audit trail for a specific entity.',
  })
  @ApiParam({
    name: 'entityType',
    description: 'Entity type (e.g., CLAIM, POLICY, USER)',
  })
  @ApiParam({
    name: 'entityReference',
    description: 'Entity reference ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Integrity verification completed',
  })
  async verifyIntegrity(
    @Param('entityType') entityType: string,
    @Param('entityReference') entityReference: string,
  ) {
    const report = await this.complianceReportService.generateAuditTrailReport(
      entityType,
      entityReference,
    );

    return {
      entityType,
      entityReference,
      integrityStatus: report.integrityStatus,
      totalRecords: report.trail.length,
      validRecords: report.trail.filter(t => t.integrityValid).length,
      compromisedRecords: report.trail.filter(t => !t.integrityValid).length,
    };
  }
}