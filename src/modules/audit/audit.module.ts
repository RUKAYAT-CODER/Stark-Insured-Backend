import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit.entity';
import { AuditService } from './services/audit.service';
import { ComplianceReportService } from './services/compliance-report.service';
import { AuditRetentionService } from './services/audit-retention.service';
import { AuditController } from './controllers/audit.controller';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [
    AuditService,
    ComplianceReportService,
    AuditRetentionService,
    AuditInterceptor,
  ],
  exports: [
    AuditService,
    ComplianceReportService,
    AuditRetentionService,
    AuditInterceptor,
  ],
})
export class AuditModule {}