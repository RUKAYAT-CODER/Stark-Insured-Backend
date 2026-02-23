import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog } from '../entities/audit.entity';
import { AuditService } from '../services/audit.service';
import { ComplianceReportService } from '../services/compliance-report.service';
import { AuditRetentionService } from '../services/audit-retention.service';
import { AuditActionType } from '../enums/audit-action-type.enum';
import { DataClassification } from '../enums/data-classification.enum';

describe('Audit Compliance System', () => {
  let auditService: AuditService;
  let complianceReportService: ComplianceReportService;
  let auditRetentionService: AuditRetentionService;
  let auditLogRepository: Repository<AuditLog>;

  const mockAuditLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        ComplianceReportService,
        AuditRetentionService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    auditService = module.get<AuditService>(AuditService);
    complianceReportService = module.get<ComplianceReportService>(ComplianceReportService);
    auditRetentionService = module.get<AuditRetentionService>(AuditRetentionService);
    auditLogRepository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));

    jest.clearAllMocks();
  });

  describe('AuditService', () => {
    describe('logAction', () => {
      it('should create an audit log entry', async () => {
        const auditLogData = {
          actionType: AuditActionType.CLAIM_SUBMITTED,
          actor: 'user-123',
          entityReference: 'claim-456',
          metadata: { test: 'data' },
        };

        mockAuditLogRepository.create.mockReturnValue(auditLogData);
        mockAuditLogRepository.save.mockResolvedValue({ id: 'audit-123', ...auditLogData });

        await auditService.logAction(
          AuditActionType.CLAIM_SUBMITTED,
          'user-123',
          'claim-456',
          { test: 'data' }
        );

        expect(mockAuditLogRepository.create).toHaveBeenCalled();
        expect(mockAuditLogRepository.save).toHaveBeenCalled();
      });

      it('should handle errors gracefully without throwing', async () => {
        mockAuditLogRepository.save.mockRejectedValue(new Error('DB Error'));

        await expect(
          auditService.logAction(AuditActionType.CLAIM_SUBMITTED, 'user-123')
        ).resolves.not.toThrow();
      });

      it('should validate actionType', async () => {
        await expect(
          auditService.logAction('' as AuditActionType, 'user-123')
        ).resolves.not.toThrow(); // Should not throw, just log error
      });

      it('should validate actor', async () => {
        await expect(
          auditService.logAction(AuditActionType.CLAIM_SUBMITTED, '')
        ).resolves.not.toThrow(); // Should not throw, just log error
      });
    });

    describe('getAuditLogs', () => {
      it('should retrieve audit logs with filters', async () => {
        const mockLogs = [
          { id: '1', actionType: AuditActionType.CLAIM_SUBMITTED, actor: 'user-1' },
          { id: '2', actionType: AuditActionType.CLAIM_APPROVED, actor: 'user-2' },
        ];

        mockAuditLogRepository.createQueryBuilder.mockReturnValue({
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([mockLogs, 2]),
        });

        const result = await auditService.getAuditLogs({
          actionType: AuditActionType.CLAIM_SUBMITTED,
          page: 1,
          limit: 10,
        });

        expect(result.data).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
      });
    });
  });

  describe('ComplianceReportService', () => {
    describe('generateGDPRDataAccessReport', () => {
      it('should generate GDPR data access report', async () => {
        const mockLogs = [
          {
            id: '1',
            actionType: AuditActionType.CLAIM_VIEWED,
            actor: 'user-123',
            entityReference: 'claim-1',
            dataAccessed: ['name', 'email', 'claimAmount'],
            dataClassification: DataClassification.CONFIDENTIAL,
            timestamp: new Date('2024-01-01'),
            metadata: { purpose: 'Claim review' },
            verifyIntegrity: jest.fn().mockReturnValue(true),
          },
        ];

        mockAuditLogRepository.find.mockResolvedValue(mockLogs);

        const report = await complianceReportService.generateGDPRDataAccessReport(
          'user-123',
          new Date('2024-01-01'),
          new Date('2024-12-31')
        );

        expect(report.userId).toBe('user-123');
        expect(report.dataAccessSummary.totalAccesses).toBe(1);
        expect(report.accessDetails).toHaveLength(1);
      });

      it('should include consent history in GDPR report', async () => {
        const mockLogs = [
          {
            id: '1',
            actionType: AuditActionType.CONSENT_GIVEN,
            actor: 'user-123',
            consentId: 'consent-1',
            timestamp: new Date('2024-01-01'),
            metadata: { purpose: 'Marketing' },
            verifyIntegrity: jest.fn().mockReturnValue(true),
          },
          {
            id: '2',
            actionType: AuditActionType.CONSENT_REVOKED,
            actor: 'user-123',
            consentId: 'consent-1',
            timestamp: new Date('2024-06-01'),
            metadata: { purpose: 'Marketing' },
            verifyIntegrity: jest.fn().mockReturnValue(true),
          },
        ];

        mockAuditLogRepository.find.mockResolvedValue(mockLogs);

        const report = await complianceReportService.generateGDPRDataAccessReport(
          'user-123',
          new Date('2024-01-01'),
          new Date('2024-12-31')
        );

        expect(report.consentHistory).toHaveLength(2);
        expect(report.consentHistory[0].action).toBe('GIVEN');
        expect(report.consentHistory[1].action).toBe('REVOKED');
      });
    });

    describe('generateComplianceSummaryReport', () => {
      it('should generate compliance summary with risk indicators', async () => {
        const mockLogs = [
          {
            id: '1',
            actionType: AuditActionType.LOGIN_FAILED,
            actor: 'user-1',
            dataClassification: DataClassification.INTERNAL,
            timestamp: new Date(),
            isSensitive: false,
            metadata: { success: false },
            verifyIntegrity: jest.fn().mockReturnValue(true),
          },
          {
            id: '2',
            actionType: AuditActionType.RESTRICTED_DATA_ACCESS,
            actor: 'user-2',
            dataClassification: DataClassification.RESTRICTED,
            timestamp: new Date(),
            isSensitive: true,
            dataAccessed: ['ssn', 'dob'],
            verifyIntegrity: jest.fn().mockReturnValue(true),
          },
        ];

        mockAuditLogRepository.find.mockResolvedValue(mockLogs);
        mockAuditLogRepository.count.mockResolvedValue(2);

        const report = await complianceReportService.generateComplianceSummaryReport(
          new Date('2024-01-01'),
          new Date('2024-12-31')
        );

        expect(report.summary.totalAuditLogs).toBe(2);
        expect(report.summary.sensitiveOperations).toBe(1);
        expect(report.riskIndicators).toBeDefined();
      });
    });

    describe('generateAuditTrailReport', () => {
      it('should generate audit trail with integrity verification', async () => {
        const mockLogs = [
          {
            id: '1',
            actionType: AuditActionType.POLICY_CREATED,
            actor: 'user-1',
            entityType: 'POLICY',
            entityReference: 'policy-1',
            hash: 'hash-1',
            timestamp: new Date('2024-01-01'),
            verifyIntegrity: jest.fn().mockReturnValue(true),
          },
          {
            id: '2',
            actionType: AuditActionType.POLICY_UPDATED,
            actor: 'user-2',
            entityType: 'POLICY',
            entityReference: 'policy-1',
            hash: 'hash-2',
            timestamp: new Date('2024-02-01'),
            dataModified: { status: { old: 'draft', new: 'active' } },
            verifyIntegrity: jest.fn().mockReturnValue(true),
          },
        ];

        mockAuditLogRepository.find.mockResolvedValue(mockLogs);

        const report = await complianceReportService.generateAuditTrailReport(
          'POLICY',
          'policy-1'
        );

        expect(report.entityType).toBe('POLICY');
        expect(report.entityReference).toBe('policy-1');
        expect(report.trail).toHaveLength(2);
        expect(report.integrityStatus).toBe('valid');
        expect(report.trail[0].integrityValid).toBe(true);
      });

      it('should detect compromised integrity', async () => {
        const mockLogs = [
          {
            id: '1',
            actionType: AuditActionType.POLICY_CREATED,
            actor: 'user-1',
            entityType: 'POLICY',
            entityReference: 'policy-1',
            hash: 'invalid-hash',
            verifyIntegrity: jest.fn().mockReturnValue(false),
          },
        ];

        mockAuditLogRepository.find.mockResolvedValue(mockLogs);

        const report = await complianceReportService.generateAuditTrailReport(
          'POLICY',
          'policy-1'
        );

        expect(report.integrityStatus).toBe('compromised');
      });
    });
  });

  describe('AuditRetentionService', () => {
    describe('getRetentionPolicies', () => {
      it('should return all retention policies', () => {
        const policies = auditRetentionService.getRetentionPolicies();
        
        expect(policies).toHaveLength(4);
        expect(policies.map(p => p.dataClassification)).toContain(DataClassification.PUBLIC);
        expect(policies.map(p => p.dataClassification)).toContain(DataClassification.RESTRICTED);
      });
    });

    describe('getRetentionStatistics', () => {
      it('should return retention statistics', async () => {
        mockAuditLogRepository.count.mockResolvedValue(100);

        const stats = await auditRetentionService.getRetentionStatistics();

        expect(stats.totalLogs).toBe(100);
        expect(stats.byClassification).toBeDefined();
        expect(stats.byPolicy).toBeDefined();
      });
    });
  });

  describe('AuditLog Entity', () => {
    describe('calculateHash', () => {
      it('should calculate consistent hash for same data', () => {
        const auditLog = new AuditLog();
        auditLog.id = 'test-id';
        auditLog.actionType = AuditActionType.CLAIM_SUBMITTED;
        auditLog.entityType = 'CLAIM';
        auditLog.actor = 'user-123';
        auditLog.timestamp = new Date('2024-01-01');
        auditLog.dataClassification = DataClassification.INTERNAL;
        auditLog.previousHash = 'prev-hash';

        const hash1 = auditLog.calculateHash();
        const hash2 = auditLog.calculateHash();

        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64); // SHA-256 hex length
      });

      it('should calculate different hash for different data', () => {
        const auditLog1 = new AuditLog();
        auditLog1.id = 'test-id-1';
        auditLog1.actionType = AuditActionType.CLAIM_SUBMITTED;
        auditLog1.entityType = 'CLAIM';
        auditLog1.actor = 'user-123';
        auditLog1.timestamp = new Date('2024-01-01');
        auditLog1.dataClassification = DataClassification.INTERNAL;

        const auditLog2 = new AuditLog();
        auditLog2.id = 'test-id-2';
        auditLog2.actionType = AuditActionType.CLAIM_SUBMITTED;
        auditLog2.entityType = 'CLAIM';
        auditLog2.actor = 'user-123';
        auditLog2.timestamp = new Date('2024-01-01');
        auditLog2.dataClassification = DataClassification.INTERNAL;

        const hash1 = auditLog1.calculateHash();
        const hash2 = auditLog2.calculateHash();

        expect(hash1).not.toBe(hash2);
      });
    });

    describe('verifyIntegrity', () => {
      it('should return true for valid hash', () => {
        const auditLog = new AuditLog();
        auditLog.id = 'test-id';
        auditLog.actionType = AuditActionType.CLAIM_SUBMITTED;
        auditLog.entityType = 'CLAIM';
        auditLog.actor = 'user-123';
        auditLog.timestamp = new Date('2024-01-01');
        auditLog.dataClassification = DataClassification.INTERNAL;
        auditLog.hash = auditLog.calculateHash();

        expect(auditLog.verifyIntegrity()).toBe(true);
      });

      it('should return false for invalid hash', () => {
        const auditLog = new AuditLog();
        auditLog.id = 'test-id';
        auditLog.actionType = AuditActionType.CLAIM_SUBMITTED;
        auditLog.entityType = 'CLAIM';
        auditLog.actor = 'user-123';
        auditLog.timestamp = new Date('2024-01-01');
        auditLog.dataClassification = DataClassification.INTERNAL;
        auditLog.hash = 'invalid-hash';

        expect(auditLog.verifyIntegrity()).toBe(false);
      });
    });

    describe('preventModification', () => {
      it('should throw error when trying to modify immutable log', () => {
        const auditLog = new AuditLog();
        auditLog.isImmutable = true;

        expect(() => auditLog.preventModification()).toThrow('Audit logs are immutable and cannot be modified');
      });

      it('should not throw error for mutable log', () => {
        const auditLog = new AuditLog();
        auditLog.isImmutable = false;

        expect(() => auditLog.preventModification()).not.toThrow();
      });
    });
  });

  describe('DataClassification', () => {
    it('should have all required classification levels', () => {
      expect(DataClassification.PUBLIC).toBe('public');
      expect(DataClassification.INTERNAL).toBe('internal');
      expect(DataClassification.CONFIDENTIAL).toBe('confidential');
      expect(DataClassification.RESTRICTED).toBe('restricted');
    });
  });

  describe('AuditActionType', () => {
    it('should include GDPR-related action types', () => {
      expect(AuditActionType.DATA_EXPORT_REQUESTED).toBeDefined();
      expect(AuditActionType.DATA_EXPORT_COMPLETED).toBeDefined();
      expect(AuditActionType.DATA_DELETION_REQUESTED).toBeDefined();
      expect(AuditActionType.DATA_DELETION_COMPLETED).toBeDefined();
      expect(AuditActionType.DATA_ACCESS_REQUESTED).toBeDefined();
      expect(AuditActionType.CONSENT_GIVEN).toBeDefined();
      expect(AuditActionType.CONSENT_REVOKED).toBeDefined();
    });

    it('should include authentication action types', () => {
      expect(AuditActionType.LOGIN_SUCCESS).toBeDefined();
      expect(AuditActionType.LOGIN_FAILED).toBeDefined();
      expect(AuditActionType.MFA_ENABLED).toBeDefined();
      expect(AuditActionType.MFA_DISABLED).toBeDefined();
    });

    it('should include data access tracking action types', () => {
      expect(AuditActionType.CLAIM_VIEWED).toBeDefined();
      expect(AuditActionType.POLICY_VIEWED).toBeDefined();
      expect(AuditActionType.USER_VIEWED).toBeDefined();
    });
  });
});
