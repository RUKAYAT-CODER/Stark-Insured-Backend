import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { VoteDto } from './dto/vote.dto';
import { ProposalStatus } from '@prisma/client';

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(private prisma: PrismaService) {}

  async createProposal(userId: string, createProposalDto: CreateProposalDto) {
    this.logger.log(`Creating new proposal by user ${userId}`);
    return this.prisma.proposal.create({
      data: {
        title: createProposalDto.title,
        description: createProposalDto.description,
        creatorId: userId,
        status: ProposalStatus.ACTIVE,
        expiresAt: new Date(createProposalDto.expiresAt),
      },
      include: {
        creator: {
          select: {
            id: true,
            walletAddress: true,
            reputationScore: true,
          },
        },
      },
    });
  }

  async findAllProposals() {
    return this.prisma.proposal.findMany({
      include: {
        _count: {
          select: { votes: true },
        },
        creator: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneProposal(id: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            walletAddress: true,
            reputationScore: true,
          },
        },
        votes: {
          include: {
            voter: {
              select: {
                id: true,
                walletAddress: true,
              },
            },
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${id} not found`);
    }

    return proposal;
  }

  async castVote(userId: string, proposalId: string, voteDto: VoteDto) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${proposalId} not found`);
    }

    if (proposal.status !== ProposalStatus.ACTIVE) {
      throw new BadRequestException('Voting is only allowed for active proposals');
    }

    if (new Date() > proposal.expiresAt) {
      // Auto-expire if needed (optional logic could also be in a task)
      throw new BadRequestException('Proposal voting period has expired');
    }

    this.logger.log(`User ${userId} casting vote on proposal ${proposalId}`);

    return this.prisma.vote.upsert({
      where: {
        proposalId_voterId: {
          proposalId,
          voterId: userId,
        },
      },
      update: {
        support: voteDto.support,
      },
      create: {
        proposalId,
        voterId: userId,
        support: voteDto.support,
      },
    });
  }

  async getProposalResults(id: string) {
    const votes = await this.prisma.vote.findMany({
      where: { proposalId: id },
    });

    const forVotes = votes.filter((v) => v.support).length;
    const againstVotes = votes.filter((v) => !v.support).length;

    return {
      proposalId: id,
      for: forVotes,
      against: againstVotes,
      total: votes.length,
      successRatio: votes.length > 0 ? (forVotes / votes.length) * 100 : 0,
    };
  }
}
