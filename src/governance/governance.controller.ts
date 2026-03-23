import { Controller, Get, Post, Body, Param, Request, HttpStatus, HttpCode } from '@nestjs/common';
import { GovernanceService } from './governance.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { VoteDto } from './dto/vote.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('governance')
@Controller('governance')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Post('proposals')
  @ApiOperation({ summary: 'Create a new proposal' })
  @ApiResponse({ status: 201, description: 'Proposal created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProposalDto: CreateProposalDto, @Request() req) {
    // In a real implementation with authentication, user ID would come from req.user
    // We'll use a placeholder for now as requested.
    const userId = req.user?.id || 'default-user-id';
    return this.governanceService.createProposal(userId, createProposalDto);
  }

  @Get('proposals')
  @ApiOperation({ summary: 'Get all proposals' })
  @ApiResponse({ status: 200, description: 'Return all proposals' })
  findAll() {
    return this.governanceService.findAllProposals();
  }

  @Get('proposals/:id')
  @ApiOperation({ summary: 'Get a single proposal by ID' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({ status: 200, description: 'Proposal found' })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  findOne(@Param('id') id: string) {
    return this.governanceService.findOneProposal(id);
  }

  @Post('proposals/:id/vote')
  @ApiOperation({ summary: 'Cast a vote on a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({ status: 200, description: 'Vote cast successfully' })
  @ApiResponse({ status: 400, description: 'Invalid vote or proposal expired' })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  vote(@Param('id') id: string, @Body() voteDto: VoteDto, @Request() req) {
    // In a real implementation with authentication, user ID would come from req.user
    const userId = req.user?.id || 'default-user-id';
    return this.governanceService.castVote(userId, id, voteDto);
  }

  @Get('proposals/:id/results')
  @ApiOperation({ summary: 'Get current voting results for a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({ status: 200, description: 'Results returned' })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  getResults(@Param('id') id: string) {
    return this.governanceService.getProposalResults(id);
  }
}
