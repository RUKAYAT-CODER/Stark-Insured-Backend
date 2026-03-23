import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { InsuranceService } from '../../insurance/insurance.service';
import { ClaimService } from '../../insurance/claim.service';
import { ClaimStatus } from '../../insurance/enums/claim-status.enum';
import {
  ParsedContractEvent,
  ContractEventType,
  ProjectCreatedEvent,
  ContributionMadeEvent,
  MilestoneApprovedEvent,
  FundsReleasedEvent,
  ProjectStatusEvent,
} from '../types/event-types';
import { IEventHandler, IEventHandlerRegistry } from '../interfaces/event-handler.interface';
import { NotificationService } from '../../notification/services/notification.service';
import { ReputationService } from '../../reputation/reputation.service';

/**
 * Handler for PROJECT_CREATED events
 */
class ProjectCreatedHandler implements IEventHandler {
  readonly eventType = ContractEventType.PROJECT_CREATED;
  private readonly logger = new Logger(ProjectCreatedHandler.name);

  constructor(private readonly prisma: PrismaService) { }

  validate(event: ParsedContractEvent): boolean {
    const data = event.data as unknown as ProjectCreatedEvent;
    return !!(
      data.projectId !== undefined &&
      data.creator &&
      data.fundingGoal &&
      data.deadline &&
      data.token
    );
  }

  async handle(event: ParsedContractEvent): Promise<void> {
    const data = event.data as unknown as ProjectCreatedEvent;
    this.logger.log(`Processing PROJECT_CREATED: Project ${data.projectId} by ${data.creator}`);

    const user = await this.prisma.user.upsert({
      where: { walletAddress: data.creator },
      update: {},
      create: {
        walletAddress: data.creator,
        reputationScore: 0,
      },
    });

    await this.prisma.project.upsert({
      where: { contractId: data.projectId.toString() },
      update: {
        title: `Project ${data.projectId}`,
        goal: BigInt(data.fundingGoal),
        deadline: new Date(data.deadline * 1000),
        status: 'ACTIVE',
      },
      create: {
        contractId: data.projectId.toString(),
        creatorId: user.id,
        title: `Project ${data.projectId}`,
        category: 'uncategorized',
        goal: BigInt(data.fundingGoal),
        deadline: new Date(data.deadline * 1000),
        status: 'ACTIVE',
      },
    });
  }
}

/**
 * Handler for CONTRIBUTION_MADE events
 */
class ContributionMadeHandler implements IEventHandler {
  readonly eventType = ContractEventType.CONTRIBUTION_MADE;
  private readonly logger = new Logger(ContributionMadeHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) { }

  validate(event: ParsedContractEvent): boolean {
    const data = event.data as unknown as ContributionMadeEvent;
    return !!(data.projectId !== undefined && data.contributor && data.amount);
  }

  async handle(event: ParsedContractEvent): Promise<void> {
    const data = event.data as unknown as ContributionMadeEvent;
    this.logger.log(`Processing CONTRIBUTION_MADE: ${data.amount} to project ${data.projectId}`);

    const user = await this.prisma.user.upsert({
      where: { walletAddress: data.contributor },
      update: {},
      create: {
        walletAddress: data.contributor,
        reputationScore: 0,
      },
    });

    const project = await this.prisma.project.findUnique({
      where: { contractId: data.projectId.toString() },
    });

    if (!project) return;

    await this.prisma.contribution.upsert({
      where: { transactionHash: event.transactionHash },
      update: {},
      create: {
        transactionHash: event.transactionHash,
        investorId: user.id,
        projectId: project.id,
        amount: BigInt(data.amount),
        timestamp: event.ledgerClosedAt,
      },
    });

    await this.prisma.project.update({
      where: { id: project.id },
      data: { currentFunds: BigInt(data.totalRaised) },
    });

    try {
      await this.notificationService.notify(
        user.id,
        'CONTRIBUTION',
        'Contribution Successful!',
        `Your contribution of ${data.amount} to project ${project.title} was successful.`,
        { projectId: project.id, amount: data.amount }
      );
    } catch (e) {
      this.logger.error(`Failed to notify user ${user.id}: ${e.message}`);
    }
  }
}

/**
 * Handler for MILESTONE_APPROVED events
 */
class MilestoneApprovedHandler implements IEventHandler {
  readonly eventType = ContractEventType.MILESTONE_APPROVED;
  private readonly logger = new Logger(MilestoneApprovedHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly reputationService: ReputationService,
  ) { }

  validate(event: ParsedContractEvent): boolean {
    const data = event.data as unknown as MilestoneApprovedEvent;
    return !!(data.projectId !== undefined && data.milestoneId !== undefined);
  }

  async handle(event: ParsedContractEvent): Promise<void> {
    const data = event.data as unknown as MilestoneApprovedEvent;
    const project = await this.prisma.project.findUnique({
      where: { contractId: data.projectId.toString() },
    });

    if (!project) return;

    await this.prisma.milestone.updateMany({
      where: { projectId: project.id },
      data: { status: 'APPROVED' },
    });

    const contributors = await this.prisma.contribution.findMany({
      where: { projectId: project.id },
      select: { investorId: true },
      distinct: ['investorId'],
    });

    for (const contribution of contributors) {
      try {
        await this.notificationService.notify(
          contribution.investorId,
          'MILESTONE',
          'Project Milestone Reached!',
          `A project you back (${project.title}) has reached a new milestone!`,
          { projectId: project.id, milestoneId: data.milestoneId }
        );
      } catch (e) {}
    }

    if (project.creatorId) {
      await this.reputationService.updateTrustScore(project.creatorId);
    }
  }
}

class MilestoneRejectedHandler implements IEventHandler {
  readonly eventType = ContractEventType.MILESTONE_REJECTED;
  private readonly logger = new Logger(MilestoneRejectedHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly reputationService: ReputationService,
  ) {}

  validate(event: ParsedContractEvent): boolean {
    const data = event.data as any;
    return !!(data.projectId !== undefined && data.milestoneId !== undefined);
  }

  async handle(event: ParsedContractEvent): Promise<void> {
    const data = event.data as any;
    const project = await this.prisma.project.findUnique({
      where: { contractId: data.projectId.toString() },
    });

    if (!project) return;

    await this.prisma.milestone.updateMany({
      where: { projectId: project.id },
      data: { status: 'REJECTED' },
    });

    if (project.creatorId) {
      await this.reputationService.updateTrustScore(project.creatorId);
    }
  }
}

class FundsReleasedHandler implements IEventHandler {
  readonly eventType = ContractEventType.FUNDS_RELEASED;
  private readonly logger = new Logger(FundsReleasedHandler.name);

  constructor(private readonly prisma: PrismaService) { }

  validate(event: ParsedContractEvent): boolean {
    const data = event.data as unknown as FundsReleasedEvent;
    return !!(data.projectId !== undefined && data.amount);
  }

  async handle(event: ParsedContractEvent): Promise<void> {
    const data = event.data as unknown as FundsReleasedEvent;
    const project = await this.prisma.project.findUnique({
      where: { contractId: data.projectId.toString() },
    });

    if (!project) return;

    await this.prisma.milestone.updateMany({
      where: { projectId: project.id },
      data: { status: 'FUNDED', completionDate: event.ledgerClosedAt },
    });
  }
}

class ProjectCompletedHandler implements IEventHandler {
  readonly eventType = ContractEventType.PROJECT_COMPLETED;
  private readonly logger = new Logger(ProjectCompletedHandler.name);

  constructor(private readonly prisma: PrismaService) { }

  validate(event: ParsedContractEvent): boolean {
    const data = event.data as unknown as ProjectStatusEvent;
    return data.projectId !== undefined;
  }

  async handle(event: ParsedContractEvent): Promise<void> {
    const data = event.data as unknown as ProjectStatusEvent;
    await this.prisma.project.updateMany({
      where: { contractId: data.projectId.toString() },
      data: { status: 'COMPLETED' },
    });
  }
}

class ProjectFailedHandler implements IEventHandler {
  readonly eventType = ContractEventType.PROJECT_FAILED;
  private readonly logger = new Logger(ProjectFailedHandler.name);

  constructor(private readonly prisma: PrismaService) { }

  validate(event: ParsedContractEvent): boolean {
    const data = event.data as unknown as ProjectStatusEvent;
    return data.projectId !== undefined;
  }

  async handle(event: ParsedContractEvent): Promise<void> {
    const data = event.data as unknown as ProjectStatusEvent;
    await this.prisma.project.updateMany({
      where: { contractId: data.projectId.toString() },
      data: { status: 'CANCELLED' },
    });
  }
}

/**
 * Insurance Handlers
 */
class PolicyCreatedHandler implements IEventHandler {
  readonly eventType = ContractEventType.POLICY_CREATED;
  private readonly logger = new Logger(PolicyCreatedHandler.name);

  constructor(private readonly insuranceService: InsuranceService) {}

  validate(event: ParsedContractEvent): boolean {
    const data = event.data as any;
    return !!(data.userId && data.poolId && data.coverageAmount);
  }

  async handle(event: ParsedContractEvent): Promise<void> {
    const data = event.data as any;
    this.logger.log(`Processing POLICY_CREATED for user ${data.userId}`);
    await this.insuranceService.purchasePolicy(
      data.userId,
      data.poolId,
      data.riskType || 'general',
      Number(data.coverageAmount)
    );
  }
}

class ClaimSubmittedHandler implements IEventHandler {
  readonly eventType = ContractEventType.CLAIM_SUBMITTED;
  private readonly logger = new Logger(ClaimSubmittedHandler.name);

  constructor(private readonly claimService: ClaimService) {}

  validate(event: ParsedContractEvent): boolean {
    const data = event.data as any;
    return !!(data.claimId && data.policyId && data.amount);
  }

  async handle(event: ParsedContractEvent): Promise<void> {
    const data = event.data as any;
    this.logger.log(`Processing CLAIM_SUBMITTED for policy ${data.policyId}`);
    await this.claimService.createHistory(
      data.claimId,
      ClaimStatus.PENDING,
      'Claim submitted on-chain',
      'blockchain'
    );
  }
}

@Injectable()
export class EventHandlerService implements IEventHandlerRegistry {
  private readonly logger = new Logger(EventHandlerService.name);
  private readonly handlers = new Map<string, IEventHandler>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly reputationService: ReputationService,
    private readonly insuranceService: InsuranceService,
    private readonly claimService: ClaimService,
  ) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.register(new ProjectCreatedHandler(this.prisma));
    this.register(new ContributionMadeHandler(this.prisma, this.notificationService));
    this.register(new MilestoneApprovedHandler(this.prisma, this.notificationService, this.reputationService));
    this.register(new MilestoneRejectedHandler(this.prisma, this.notificationService, this.reputationService));
    this.register(new FundsReleasedHandler(this.prisma));
    this.register(new ProjectCompletedHandler(this.prisma));
    this.register(new ProjectFailedHandler(this.prisma));
    
    // Insurance handlers
    this.register(new PolicyCreatedHandler(this.insuranceService));
    this.register(new ClaimSubmittedHandler(this.claimService));
  }

  register(handler: IEventHandler): void {
    this.handlers.set(handler.eventType, handler);
  }

  getHandler(eventType: string): IEventHandler | undefined {
    return this.handlers.get(eventType);
  }

  getAllHandlers(): IEventHandler[] {
    return Array.from(this.handlers.values());
  }

  async processEvent(event: ParsedContractEvent): Promise<boolean> {
    const handler = this.getHandler(event.eventType);
    if (!handler) return false;

    try {
      if (!handler.validate(event)) return false;
      await handler.handle(event);
      return true;
    } catch (error) {
      this.logger.error(`Error processing event ${event.eventType}: ${error.message}`);
      throw error;
    }
  }

  isSupported(eventType: string): boolean {
    return this.handlers.has(eventType);
  }
}
