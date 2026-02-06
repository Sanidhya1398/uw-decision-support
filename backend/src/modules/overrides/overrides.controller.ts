import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OverridesService, SimilarCaseResult, OverridePattern } from './overrides.service';
import { OverrideType, OverrideDirection } from '../../entities/override.entity';

@ApiTags('overrides')
@Controller()
export class OverridesController {
  constructor(private readonly overridesService: OverridesService) {}

  // Case-specific override endpoints
  @Get('cases/:caseId/overrides')
  @ApiOperation({ summary: 'Get all overrides for a case' })
  async getOverridesForCase(@Param('caseId') caseId: string) {
    return this.overridesService.getOverridesForCase(caseId);
  }

  @Post('cases/:caseId/overrides')
  @ApiOperation({ summary: 'Record a new override for a case' })
  async createOverride(
    @Param('caseId') caseId: string,
    @Body() body: {
      overrideType: OverrideType;
      direction: OverrideDirection;
      systemRecommendation: string;
      systemRecommendationDetails?: Record<string, unknown>;
      systemConfidence?: number;
      underwriterChoice: string;
      underwriterChoiceDetails?: Record<string, unknown>;
      reasoning: string;
      reasoningTags?: string[];
      underwriterId: string;
      underwriterName: string;
      underwriterRole: string;
      underwriterExperienceYears: number;
    },
  ) {
    return this.overridesService.createOverride({
      caseId,
      ...body,
    });
  }

  @Get('cases/:caseId/similar')
  @ApiOperation({ summary: 'Find similar cases for comparison' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findSimilarCases(
    @Param('caseId') caseId: string,
    @Query('limit') limit?: number,
  ): Promise<SimilarCaseResult[]> {
    return this.overridesService.findSimilarCases(caseId, limit || 10);
  }

  @Get('cases/:caseId/learning-insights')
  @ApiOperation({ summary: 'Get learning insights for a case based on similar cases' })
  async getLearningInsights(@Param('caseId') caseId: string) {
    return this.overridesService.getLearningInsights(caseId);
  }

  // Global override analytics endpoints
  @Get('overrides/stats')
  @ApiOperation({ summary: 'Get override statistics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getOverrideStats(@Query('days') days?: number) {
    return this.overridesService.getOverrideStats(days || 30);
  }

  @Get('overrides/patterns')
  @ApiOperation({ summary: 'Analyze override patterns for learning' })
  @ApiQuery({ name: 'type', required: false, enum: OverrideType })
  async analyzePatterns(@Query('type') type?: OverrideType): Promise<OverridePattern[]> {
    return this.overridesService.analyzeOverridePatterns(type);
  }

  @Get('overrides/pending-validation')
  @ApiOperation({ summary: 'Get overrides pending validation' })
  async getPendingValidation() {
    return this.overridesService.getPendingValidation();
  }

  @Post('overrides/:overrideId/validate')
  @ApiOperation({ summary: 'Validate an override' })
  async validateOverride(
    @Param('overrideId') overrideId: string,
    @Body() body: {
      validated: boolean;
      validatedBy: string;
      notes?: string;
    },
  ) {
    return this.overridesService.validateOverride(
      overrideId,
      body.validated,
      body.validatedBy,
      body.notes,
    );
  }

  @Post('overrides/:overrideId/flag')
  @ApiOperation({ summary: 'Flag an override for review' })
  async flagForReview(
    @Param('overrideId') overrideId: string,
    @Body() body: { reason: string },
  ) {
    return this.overridesService.flagForReview(overrideId, body.reason);
  }
}
