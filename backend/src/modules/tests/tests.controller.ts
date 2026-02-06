import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TestsService } from './tests.service';

@ApiTags('tests')
@Controller('cases/:caseId/tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Get()
  @ApiOperation({ summary: 'Get test recommendations and results for a case' })
  async getTests(@Param('caseId') caseId: string) {
    return this.testsService.getTestsForCase(caseId);
  }

  @Post('recommend')
  @ApiOperation({ summary: 'Generate test recommendations for a case' })
  async generateRecommendations(
    @Param('caseId') caseId: string,
    @Body() body: { userId: string; userName: string },
  ) {
    return this.testsService.generateRecommendations(caseId, body.userId, body.userName);
  }

  @Post('order')
  @ApiOperation({ summary: 'Order tests (finalize test panel)' })
  async orderTests(
    @Param('caseId') caseId: string,
    @Body() body: {
      testIds: string[];
      userId: string;
      userName: string;
    },
  ) {
    return this.testsService.orderTests(caseId, body.testIds, body.userId, body.userName);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add a test to recommendations' })
  async addTest(
    @Param('caseId') caseId: string,
    @Body() body: {
      testCode: string;
      testName: string;
      reason: string;
      reasoningTags?: string[];
      userId: string;
      userName: string;
      userRole?: string;
      userExperienceYears?: number;
    },
  ) {
    return this.testsService.addTest(caseId, body);
  }

  @Get(':testId/removal-impact')
  @ApiOperation({ summary: 'Preview impact of removing a test on evidence coverage' })
  async getRemovalImpact(
    @Param('caseId') caseId: string,
    @Param('testId') testId: string,
    @Query('userId') userId?: string,
    @Query('userName') userName?: string,
  ) {
    const impact = await this.testsService.getRemovalImpact(caseId, testId);

    if (userId) {
      await this.testsService.logImpactAdvisoryDisplayed(
        caseId,
        testId,
        impact,
        userId,
        userName || 'Unknown',
      );
    }

    return impact;
  }

  @Delete(':testId')
  @ApiOperation({ summary: 'Remove a test from recommendations' })
  async removeTest(
    @Param('caseId') caseId: string,
    @Param('testId') testId: string,
    @Body() body: {
      reason: string;
      reasoningTags?: string[];
      userId: string;
      userName: string;
      userRole?: string;
      userExperienceYears?: number;
      impactAdvisoryDisplayed?: boolean;
      impactLevel?: string;
      affectedRiskAreaCount?: number;
      soleEvidenceCount?: number;
    },
  ) {
    return this.testsService.removeTest(caseId, testId, body);
  }

  @Patch(':testId/substitute')
  @ApiOperation({ summary: 'Substitute one test for another' })
  async substituteTest(
    @Param('caseId') caseId: string,
    @Param('testId') testId: string,
    @Body() body: {
      newTestCode: string;
      newTestName: string;
      reason: string;
      reasoningTags?: string[];
      userId: string;
      userName: string;
      userRole?: string;
      userExperienceYears?: number;
    },
  ) {
    return this.testsService.substituteTest(caseId, testId, body);
  }

  @Get('results')
  @ApiOperation({ summary: 'Get test results for a case' })
  async getResults(@Param('caseId') caseId: string) {
    return this.testsService.getTestResults(caseId);
  }
}
