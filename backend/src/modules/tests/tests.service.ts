import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestRecommendation, TestRequirementType, TestStatus, TestCategory } from '../../entities/test-recommendation.entity';
import { TestResult } from '../../entities/test-result.entity';
import { Case } from '../../entities/case.entity';
import { RiskFactor } from '../../entities/risk-factor.entity';
import { Document } from '../../entities/document.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditCategory } from '../../entities/audit-log.entity';
import { RulesService } from '../rules/rules.service';
import { MlClientService } from '../ml/ml-client.service';
import { OverridesService } from '../overrides/overrides.service';
import { OverrideType, OverrideDirection } from '../../entities/override.entity';
import * as fs from 'fs';
import * as path from 'path';

interface EvidenceRequirement {
  evidenceType: 'lab_result' | 'document';
  testCodes?: string[];
  testNames?: string[];
  documentTypes?: string[];
  extractedFields?: string[];
  description: string;
  importance: string;
}

interface CoverageRule {
  id: string;
  riskFactorPattern: string;
  riskFactorPatternType: 'contains' | 'regex';
  expectedEvidence: EvidenceRequirement[];
}

export interface RemovalImpactResult {
  testId: string;
  testCode: string;
  testName: string;
  testCategory: string;
  requirementType: string;
  impactLevel: 'high' | 'moderate' | 'low' | 'none';
  affectedRiskAreas: {
    riskFactorId: string;
    riskFactorName: string;
    coverageRuleId: string;
    evidenceDescription: string;
    evidenceImportance: string;
    isSoleEvidence: boolean;
    remainingEvidenceCount: number;
    remainingEvidenceDescriptions: string[];
  }[];
  summary: {
    totalAffectedAreas: number;
    soleEvidenceCount: number;
    partialCoverageCount: number;
  };
  recommendation: string;
}

@Injectable()
export class TestsService {
  private coverageRules: CoverageRule[] = [];

  constructor(
    @InjectRepository(TestRecommendation)
    private testRecommendationRepository: Repository<TestRecommendation>,
    @InjectRepository(TestResult)
    private testResultRepository: Repository<TestResult>,
    @InjectRepository(Case)
    private caseRepository: Repository<Case>,
    @InjectRepository(RiskFactor)
    private riskFactorRepository: Repository<RiskFactor>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private auditService: AuditService,
    private rulesService: RulesService,
    private mlClientService: MlClientService,
    private overridesService: OverridesService,
  ) {
    this.loadCoverageRules();
  }

  private loadCoverageRules() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'evidence-coverage-rules.json');
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      this.coverageRules = configData.coverageRules || [];
    } catch (error) {
      console.warn('Could not load evidence coverage rules:', error);
      this.coverageRules = [];
    }
  }

  async getTestsForCase(caseId: string) {
    const recommendations = await this.testRecommendationRepository.find({
      where: { case: { id: caseId } },
      order: { requirementType: 'ASC', testName: 'ASC' },
    });

    const results = await this.testResultRepository.find({
      where: { case: { id: caseId } },
      order: { testDate: 'DESC' },
    });

    // Group recommendations by category
    const byCategory = recommendations.reduce((acc, rec) => {
      if (!acc[rec.testCategory]) {
        acc[rec.testCategory] = [];
      }
      acc[rec.testCategory].push(rec);
      return acc;
    }, {} as Record<string, TestRecommendation[]>);

    return {
      recommendations,
      results,
      byCategory,
      summary: {
        totalRecommended: recommendations.length,
        mandatory: recommendations.filter(r => r.requirementType === TestRequirementType.MANDATORY).length,
        conditional: recommendations.filter(r => r.requirementType === TestRequirementType.CONDITIONAL).length,
        suggested: recommendations.filter(r => r.requirementType === TestRequirementType.SUGGESTED).length,
        ordered: recommendations.filter(r => r.status === TestStatus.ORDERED).length,
        resultsReceived: results.length,
      },
    };
  }

  async generateRecommendations(caseId: string, userId: string, userName: string) {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
      relations: ['applicant', 'medicalDisclosures', 'riskFactors'],
    });

    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    // Clear existing auto-generated test recommendations (keep manually added and already acted upon)
    // Delete recommendations that are still in RECOMMENDED status and were auto-generated
    await this.testRecommendationRepository
      .createQueryBuilder()
      .delete()
      .where('caseId = :caseId', { caseId })
      .andWhere('status = :status', { status: TestStatus.RECOMMENDED })
      .andWhere('requirementType != :additionalType', { additionalType: TestRequirementType.ADDITIONAL })
      .execute();

    // Get rules-based test recommendations
    const testRecommendations = await this.rulesService.getTestRecommendations(caseEntity);

    // Save recommendations with ML yield predictions
    const savedRecommendations: TestRecommendation[] = [];
    for (const rec of testRecommendations) {
      // Get ML yield prediction for each test
      const yieldPrediction = await this.mlClientService.predictTestYield(caseEntity, rec.testCode);

      const recommendation = this.testRecommendationRepository.create({
        testCode: rec.testCode,
        testName: rec.testName,
        testCategory: rec.testCategory,
        requirementType: rec.requirementType,
        clinicalRationale: rec.clinicalRationale,
        protocolReference: rec.protocolReference,
        triggeringRules: rec.triggeringRules,
        predictedYield: yieldPrediction.probability,
        yieldCategory: yieldPrediction.category,
        yieldFactors: yieldPrediction.factors,
        estimatedCost: rec.estimatedCost,
        estimatedTurnaroundDays: rec.estimatedTurnaroundDays,
        status: TestStatus.RECOMMENDED,
        case: { id: caseId } as any,
      });

      const saved = await this.testRecommendationRepository.save(recommendation);
      savedRecommendations.push(saved);
    }

    await this.auditService.log({
      caseId,
      action: AuditAction.TESTS_RECOMMENDED,
      category: AuditCategory.TEST_MANAGEMENT,
      description: `Test recommendations generated: ${savedRecommendations.length} tests`,
      userId,
      userName,
      newState: {
        testsRecommended: savedRecommendations.map(r => r.testName),
      },
    });

    return this.getTestsForCase(caseId);
  }

  async orderTests(caseId: string, testIds: string[], userId: string, userName: string) {
    const recommendations = await this.testRecommendationRepository.find({
      where: { case: { id: caseId } },
    });

    const orderedTests: string[] = [];
    for (const rec of recommendations) {
      if (testIds.includes(rec.id)) {
        rec.status = TestStatus.ORDERED;
        rec.approvedBy = userId;
        rec.approvedAt = new Date();
        await this.testRecommendationRepository.save(rec);
        orderedTests.push(rec.testName);
      }
    }

    await this.auditService.log({
      caseId,
      action: AuditAction.TESTS_ORDERED,
      category: AuditCategory.TEST_MANAGEMENT,
      description: `Tests ordered: ${orderedTests.join(', ')}`,
      userId,
      userName,
      newState: { orderedTests },
    });

    return this.getTestsForCase(caseId);
  }

  async addTest(caseId: string, data: {
    testCode: string;
    testName: string;
    reason: string;
    reasoningTags?: string[];
    userId: string;
    userName: string;
    userRole?: string;
    userExperienceYears?: number;
  }) {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
      relations: ['applicant'],
    });

    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    // Get ML yield prediction
    const yieldPrediction = await this.mlClientService.predictTestYield(caseEntity, data.testCode);

    const recommendation = this.testRecommendationRepository.create({
      testCode: data.testCode,
      testName: data.testName,
      testCategory: TestCategory.OTHER,
      requirementType: TestRequirementType.ADDITIONAL,
      clinicalRationale: data.reason,
      predictedYield: yieldPrediction.probability,
      yieldCategory: yieldPrediction.category,
      yieldFactors: yieldPrediction.factors,
      status: TestStatus.RECOMMENDED,
      case: { id: caseId } as any,
    });

    await this.testRecommendationRepository.save(recommendation);

    // Record override for learning - underwriter adding a test not recommended by system
    await this.overridesService.createOverride({
      caseId,
      overrideType: OverrideType.TEST_RECOMMENDATION,
      direction: OverrideDirection.ADD,
      systemRecommendation: 'No recommendation for this test',
      systemRecommendationDetails: {
        predictedYield: yieldPrediction.probability,
        yieldCategory: yieldPrediction.category,
      },
      underwriterChoice: data.testName,
      underwriterChoiceDetails: {
        testCode: data.testCode,
        testName: data.testName,
      },
      reasoning: data.reason,
      reasoningTags: data.reasoningTags,
      underwriterId: data.userId,
      underwriterName: data.userName,
      underwriterRole: data.userRole || 'Underwriter',
      underwriterExperienceYears: data.userExperienceYears || 0,
    });

    await this.auditService.log({
      caseId,
      action: AuditAction.TEST_ADDED,
      category: AuditCategory.TEST_MANAGEMENT,
      description: `Test added: ${data.testName}. Reason: ${data.reason}`,
      userId: data.userId,
      userName: data.userName,
      newState: { testName: data.testName, reason: data.reason },
    });

    return recommendation;
  }

  async removeTest(caseId: string, testId: string, data: {
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
  }) {
    const recommendation = await this.testRecommendationRepository.findOne({
      where: { id: testId },
    });

    if (!recommendation) {
      throw new NotFoundException(`Test recommendation with ID ${testId} not found`);
    }

    // Don't allow removing mandatory tests
    if (recommendation.requirementType === TestRequirementType.MANDATORY) {
      throw new Error('Cannot remove mandatory tests');
    }

    recommendation.status = TestStatus.REMOVED;
    recommendation.removedBy = data.userId;
    recommendation.removedAt = new Date();
    recommendation.removalReason = data.reason;

    await this.testRecommendationRepository.save(recommendation);

    // Record override for learning - underwriter removing a recommended test
    await this.overridesService.createOverride({
      caseId,
      overrideType: OverrideType.TEST_RECOMMENDATION,
      direction: OverrideDirection.REMOVE,
      systemRecommendation: recommendation.testName,
      systemRecommendationDetails: {
        testCode: recommendation.testCode,
        testName: recommendation.testName,
        requirementType: recommendation.requirementType,
        predictedYield: recommendation.predictedYield,
        clinicalRationale: recommendation.clinicalRationale,
      },
      systemConfidence: recommendation.predictedYield,
      underwriterChoice: 'Remove test',
      underwriterChoiceDetails: { removed: true },
      reasoning: data.reason,
      reasoningTags: data.reasoningTags,
      underwriterId: data.userId,
      underwriterName: data.userName,
      underwriterRole: data.userRole || 'Underwriter',
      underwriterExperienceYears: data.userExperienceYears || 0,
    });

    await this.auditService.log({
      caseId,
      action: AuditAction.TEST_REMOVED,
      category: AuditCategory.TEST_MANAGEMENT,
      description: `Test removed: ${recommendation.testName}. Reason: ${data.reason}`,
      userId: data.userId,
      userName: data.userName,
      previousState: { testName: recommendation.testName },
      newState: { reason: data.reason },
    });

    if (data.impactAdvisoryDisplayed) {
      await this.auditService.log({
        caseId,
        action: AuditAction.IMPACT_ADVISORY_ACKNOWLEDGED,
        category: AuditCategory.TEST_MANAGEMENT,
        description: `Impact advisory acknowledged before removing ${recommendation.testName}. Impact: ${data.impactLevel || 'unknown'}, ${data.soleEvidenceCount || 0} sole-evidence area(s) affected.`,
        userId: data.userId,
        userName: data.userName,
        relatedEntityType: 'TestRecommendation',
        relatedEntityId: testId,
        metadata: {
          testCode: recommendation.testCode,
          testName: recommendation.testName,
          impactLevel: data.impactLevel,
          affectedRiskAreaCount: data.affectedRiskAreaCount,
          soleEvidenceCount: data.soleEvidenceCount,
        },
      });
    }

    return recommendation;
  }

  async substituteTest(caseId: string, testId: string, data: {
    newTestCode: string;
    newTestName: string;
    reason: string;
    reasoningTags?: string[];
    userId: string;
    userName: string;
    userRole?: string;
    userExperienceYears?: number;
  }) {
    const recommendation = await this.testRecommendationRepository.findOne({
      where: { id: testId },
    });

    if (!recommendation) {
      throw new NotFoundException(`Test recommendation with ID ${testId} not found`);
    }

    const originalTestName = recommendation.testName;
    const originalTestCode = recommendation.testCode;
    recommendation.status = TestStatus.SUBSTITUTED;
    recommendation.substitutedWith = data.newTestCode;
    recommendation.substitutionReason = data.reason;

    await this.testRecommendationRepository.save(recommendation);

    // Record override for learning - underwriter substituting a test
    await this.overridesService.createOverride({
      caseId,
      overrideType: OverrideType.TEST_RECOMMENDATION,
      direction: OverrideDirection.SUBSTITUTE,
      systemRecommendation: originalTestName,
      systemRecommendationDetails: {
        testCode: originalTestCode,
        testName: originalTestName,
        requirementType: recommendation.requirementType,
        predictedYield: recommendation.predictedYield,
        clinicalRationale: recommendation.clinicalRationale,
      },
      systemConfidence: recommendation.predictedYield,
      underwriterChoice: data.newTestName,
      underwriterChoiceDetails: {
        newTestCode: data.newTestCode,
        newTestName: data.newTestName,
      },
      reasoning: data.reason,
      reasoningTags: data.reasoningTags,
      underwriterId: data.userId,
      underwriterName: data.userName,
      underwriterRole: data.userRole || 'Underwriter',
      underwriterExperienceYears: data.userExperienceYears || 0,
    });

    // Add new test (skip override recording since we just recorded the substitution)
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
      relations: ['applicant'],
    });

    if (caseEntity) {
      const yieldPrediction = await this.mlClientService.predictTestYield(caseEntity, data.newTestCode);

      const newRecommendation = this.testRecommendationRepository.create({
        testCode: data.newTestCode,
        testName: data.newTestName,
        testCategory: TestCategory.OTHER,
        requirementType: TestRequirementType.ADDITIONAL,
        clinicalRationale: `Substituted for ${originalTestName}: ${data.reason}`,
        predictedYield: yieldPrediction.probability,
        yieldCategory: yieldPrediction.category,
        yieldFactors: yieldPrediction.factors,
        status: TestStatus.RECOMMENDED,
        case: { id: caseId } as Case,
      });

      await this.testRecommendationRepository.save(newRecommendation);
    }

    await this.auditService.log({
      caseId,
      action: AuditAction.TEST_SUBSTITUTED,
      category: AuditCategory.TEST_MANAGEMENT,
      description: `Test substituted: ${originalTestName} -> ${data.newTestName}. Reason: ${data.reason}`,
      userId: data.userId,
      userName: data.userName,
      previousState: { testName: originalTestName },
      newState: { testName: data.newTestName, reason: data.reason },
    });

    return this.getTestsForCase(caseId);
  }

  async getTestResults(caseId: string) {
    return this.testResultRepository.find({
      where: { case: { id: caseId } },
      order: { testDate: 'DESC' },
    });
  }

  async getRemovalImpact(caseId: string, testId: string): Promise<RemovalImpactResult> {
    const recommendation = await this.testRecommendationRepository.findOne({
      where: { id: testId },
    });

    if (!recommendation) {
      throw new NotFoundException(`Test recommendation with ID ${testId} not found`);
    }

    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
      relations: ['riskFactors', 'documents', 'testResults', 'testRecommendations'],
    });

    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    const riskFactors = caseEntity.riskFactors || [];
    const documents = caseEntity.documents || [];
    const testResults = caseEntity.testResults || [];
    const allRecommendations = caseEntity.testRecommendations || [];

    // Simulate removal: recommendations without this test
    const recommendationsWithoutThisTest = allRecommendations.filter(r => r.id !== testId);

    const affectedRiskAreas: RemovalImpactResult['affectedRiskAreas'] = [];

    for (const factor of riskFactors) {
      const matchingRules = this.findMatchingCoverageRulesForImpact(factor);

      for (const rule of matchingRules) {
        for (const evidenceReq of rule.expectedEvidence) {
          if (evidenceReq.evidenceType !== 'lab_result') continue;

          const testCodeMatch = evidenceReq.testCodes?.some(
            code => recommendation.testCode?.toUpperCase().includes(code.toUpperCase()),
          );
          const testNameMatch = evidenceReq.testNames?.some(
            name => recommendation.testName?.toLowerCase().includes(name.toLowerCase()),
          );

          if (!testCodeMatch && !testNameMatch) continue;

          // Check if evidence would still be covered without this test
          const stillCoveredWithout = this.isEvidenceCoveredSimulated(
            evidenceReq,
            documents,
            testResults,
            recommendationsWithoutThisTest,
          );

          const remainingEvidence = this.countRemainingEvidence(
            evidenceReq,
            documents,
            testResults,
            recommendationsWithoutThisTest,
          );

          affectedRiskAreas.push({
            riskFactorId: factor.id,
            riskFactorName: factor.factorName,
            coverageRuleId: rule.id,
            evidenceDescription: evidenceReq.description,
            evidenceImportance: evidenceReq.importance,
            isSoleEvidence: !stillCoveredWithout,
            remainingEvidenceCount: remainingEvidence.count,
            remainingEvidenceDescriptions: remainingEvidence.descriptions,
          });
        }
      }
    }

    const soleEvidenceCount = affectedRiskAreas.filter(a => a.isSoleEvidence).length;
    const partialCoverageCount = affectedRiskAreas.filter(a => !a.isSoleEvidence).length;

    let impactLevel: 'high' | 'moderate' | 'low' | 'none';
    if (soleEvidenceCount > 0) {
      impactLevel = 'high';
    } else if (partialCoverageCount > 0) {
      impactLevel = 'moderate';
    } else {
      impactLevel = 'none';
    }

    let recommendationText: string;
    if (impactLevel === 'high') {
      const soleAreas = affectedRiskAreas
        .filter(a => a.isSoleEvidence)
        .map(a => a.riskFactorName);
      const uniqueAreas = [...new Set(soleAreas)];
      recommendationText = `Removing ${recommendation.testName} will leave ${uniqueAreas.join(', ')} without laboratory evidence coverage. This test is the sole source of evidence for ${soleEvidenceCount} coverage requirement(s). Consider whether alternative evidence sources exist before proceeding.`;
    } else if (impactLevel === 'moderate') {
      recommendationText = `Removing ${recommendation.testName} reduces evidence coverage for ${partialCoverageCount} risk area(s), but alternative evidence sources remain available.`;
    } else {
      recommendationText = `Removing ${recommendation.testName} does not affect any identified risk area evidence coverage.`;
    }

    return {
      testId,
      testCode: recommendation.testCode,
      testName: recommendation.testName,
      testCategory: recommendation.testCategory,
      requirementType: recommendation.requirementType,
      impactLevel,
      affectedRiskAreas,
      summary: {
        totalAffectedAreas: affectedRiskAreas.length,
        soleEvidenceCount,
        partialCoverageCount,
      },
      recommendation: recommendationText,
    };
  }

  async logImpactAdvisoryDisplayed(
    caseId: string,
    testId: string,
    impact: RemovalImpactResult,
    userId: string,
    userName: string,
  ) {
    await this.auditService.log({
      caseId,
      action: AuditAction.IMPACT_ADVISORY_DISPLAYED,
      category: AuditCategory.TEST_MANAGEMENT,
      description: `Impact advisory displayed for removing ${impact.testName}. Impact level: ${impact.impactLevel}. Affected areas: ${impact.summary.totalAffectedAreas}, sole evidence: ${impact.summary.soleEvidenceCount}.`,
      userId,
      userName,
      relatedEntityType: 'TestRecommendation',
      relatedEntityId: testId,
      metadata: {
        testCode: impact.testCode,
        testName: impact.testName,
        impactLevel: impact.impactLevel,
        affectedRiskAreaCount: impact.summary.totalAffectedAreas,
        soleEvidenceCount: impact.summary.soleEvidenceCount,
      },
    });
  }

  private findMatchingCoverageRulesForImpact(factor: RiskFactor): CoverageRule[] {
    const factorNameLower = (factor.factorName || '').toLowerCase();
    const factorDescLower = (factor.factorDescription || '').toLowerCase();
    const searchText = `${factorNameLower} ${factorDescLower}`;

    return this.coverageRules.filter(rule => {
      if (rule.riskFactorPatternType === 'contains') {
        return searchText.includes(rule.riskFactorPattern.toLowerCase());
      } else if (rule.riskFactorPatternType === 'regex') {
        try {
          const regex = new RegExp(rule.riskFactorPattern, 'i');
          return regex.test(searchText);
        } catch {
          return false;
        }
      }
      return false;
    });
  }

  private isEvidenceCoveredSimulated(
    evidenceReq: EvidenceRequirement,
    documents: Document[],
    testResults: TestResult[],
    testRecommendations: TestRecommendation[],
  ): boolean {
    if (evidenceReq.evidenceType === 'lab_result') {
      const hasResult = testResults.some(result => {
        const codeMatch = evidenceReq.testCodes?.some(
          code => result.testCode?.toUpperCase().includes(code.toUpperCase()),
        );
        const nameMatch = evidenceReq.testNames?.some(
          name => result.testName?.toLowerCase().includes(name.toLowerCase()),
        );
        return codeMatch || nameMatch;
      });
      if (hasResult) return true;

      const hasOrderedTest = testRecommendations.some(rec => {
        if (rec.status !== TestStatus.ORDERED && rec.status !== TestStatus.RESULTS_RECEIVED) {
          return false;
        }
        const codeMatch = evidenceReq.testCodes?.some(
          code => rec.testCode?.toUpperCase().includes(code.toUpperCase()),
        );
        const nameMatch = evidenceReq.testNames?.some(
          name => rec.testName?.toLowerCase().includes(name.toLowerCase()),
        );
        return codeMatch || nameMatch;
      });
      return hasOrderedTest;
    }

    if (evidenceReq.evidenceType === 'document') {
      return documents.some(doc => {
        const typeMatch = evidenceReq.documentTypes?.some(
          docType => doc.documentType === docType,
        );
        if (!typeMatch) return false;
        if (evidenceReq.extractedFields) {
          return evidenceReq.extractedFields.some(field => {
            const extracted = doc[field as keyof Document];
            return Array.isArray(extracted) && extracted.length > 0;
          });
        }
        return true;
      });
    }

    return false;
  }

  private countRemainingEvidence(
    evidenceReq: EvidenceRequirement,
    documents: Document[],
    testResults: TestResult[],
    testRecommendations: TestRecommendation[],
  ): { count: number; descriptions: string[] } {
    const descriptions: string[] = [];

    if (evidenceReq.evidenceType === 'lab_result') {
      for (const result of testResults) {
        const codeMatch = evidenceReq.testCodes?.some(
          code => result.testCode?.toUpperCase().includes(code.toUpperCase()),
        );
        const nameMatch = evidenceReq.testNames?.some(
          name => result.testName?.toLowerCase().includes(name.toLowerCase()),
        );
        if (codeMatch || nameMatch) {
          descriptions.push(`Test result: ${result.testName}`);
        }
      }

      for (const rec of testRecommendations) {
        if (rec.status !== TestStatus.ORDERED && rec.status !== TestStatus.RESULTS_RECEIVED) continue;
        const codeMatch = evidenceReq.testCodes?.some(
          code => rec.testCode?.toUpperCase().includes(code.toUpperCase()),
        );
        const nameMatch = evidenceReq.testNames?.some(
          name => rec.testName?.toLowerCase().includes(name.toLowerCase()),
        );
        if (codeMatch || nameMatch) {
          descriptions.push(`Ordered test: ${rec.testName} (${rec.status})`);
        }
      }
    }

    return { count: descriptions.length, descriptions };
  }
}
