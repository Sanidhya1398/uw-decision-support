import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RiskService } from './risk.service';
import { RiskSeverity } from '../../entities/risk-factor.entity';

@ApiTags('risk')
@Controller('cases/:caseId/risk')
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get()
  @ApiOperation({ summary: 'Get risk assessment for a case' })
  async getRiskAssessment(@Param('caseId') caseId: string) {
    return this.riskService.getRiskAssessment(caseId);
  }

  @Post('assess')
  @ApiOperation({ summary: 'Run risk assessment on a case' })
  async assessRisk(
    @Param('caseId') caseId: string,
    @Body() body: { userId: string; userName: string },
  ) {
    return this.riskService.assessRisk(caseId, body.userId, body.userName);
  }

  @Post('factors')
  @ApiOperation({ summary: 'Manually add a risk factor' })
  async addRiskFactor(
    @Param('caseId') caseId: string,
    @Body() body: {
      factorName: string;
      description: string;
      category: string;
      severity: RiskSeverity;
      userId: string;
      userName: string;
    },
  ) {
    return this.riskService.addManualRiskFactor(caseId, body);
  }

  @Patch('factors/:factorId/severity')
  @ApiOperation({ summary: 'Override risk factor severity' })
  async overrideSeverity(
    @Param('caseId') caseId: string,
    @Param('factorId') factorId: string,
    @Body() body: {
      newSeverity: RiskSeverity;
      reason: string;
      reasoningTags?: string[];
      userId: string;
      userName: string;
      userRole?: string;
      userExperienceYears?: number;
    },
  ) {
    return this.riskService.overrideSeverity(caseId, factorId, body);
  }

  @Post('factors/:factorId/verify')
  @ApiOperation({ summary: 'Verify a risk factor' })
  async verifyFactor(
    @Param('caseId') caseId: string,
    @Param('factorId') factorId: string,
    @Body() body: { userId: string; userName: string },
  ) {
    return this.riskService.verifyFactor(caseId, factorId, body.userId, body.userName);
  }

  @Post('complexity/override')
  @ApiOperation({ summary: 'Override complexity classification' })
  async overrideComplexity(
    @Param('caseId') caseId: string,
    @Body() body: {
      newTier: string;
      reason: string;
      reasoningTags?: string[];
      userId: string;
      userName: string;
      userRole?: string;
      userExperienceYears?: number;
    },
  ) {
    return this.riskService.overrideComplexity(caseId, body);
  }

  @Get('coverage-gaps')
  @ApiOperation({ summary: 'Get risk coverage gaps - identifies missing evidence for known risk factors' })
  async getCoverageGaps(@Param('caseId') caseId: string) {
    return this.riskService.getCoverageGaps(caseId);
  }
}
