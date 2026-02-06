import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DecisionsService } from './decisions.service';
import { DecisionType } from '../../entities/decision.entity';

@ApiTags('decisions')
@Controller('cases/:caseId/decisions')
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Get('options')
  @ApiOperation({ summary: 'Get available decision options for a case' })
  async getDecisionOptions(@Param('caseId') caseId: string) {
    return this.decisionsService.getDecisionOptions(caseId);
  }

  @Get()
  @ApiOperation({ summary: 'Get decision history for a case' })
  async getDecisions(@Param('caseId') caseId: string) {
    return this.decisionsService.getDecisions(caseId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current/latest decision for a case' })
  async getCurrentDecision(@Param('caseId') caseId: string) {
    return this.decisionsService.getCurrentDecision(caseId);
  }

  @Get('guidance')
  @ApiOperation({ summary: 'Get product-specific policy modification guidance for a case' })
  async getProductGuidance(
    @Param('caseId') caseId: string,
    @Query('userId') userId?: string,
    @Query('userName') userName?: string,
  ) {
    return this.decisionsService.getProductGuidance(caseId, userId, userName);
  }

  @Post()
  @ApiOperation({ summary: 'Make a decision on a case' })
  async makeDecision(
    @Param('caseId') caseId: string,
    @Body() body: {
      decisionType: DecisionType;
      rationale: string;
      reasoningTags?: string[];
      modifications?: any[];
      referralTarget?: string;
      referralReason?: string;
      requestedInformation?: string[];
      requestedTests?: string[];
      userId: string;
      userName: string;
      userRole: string;
      userExperienceYears?: number;
    },
  ) {
    return this.decisionsService.makeDecision(caseId, body);
  }

  @Post(':decisionId/review')
  @ApiOperation({ summary: 'Review a decision (for escalations)' })
  async reviewDecision(
    @Param('caseId') caseId: string,
    @Param('decisionId') decisionId: string,
    @Body() body: {
      approved: boolean;
      notes: string;
      userId: string;
      userName: string;
    },
  ) {
    return this.decisionsService.reviewDecision(caseId, decisionId, body);
  }
}
