import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskFactor, RiskCategory, RiskSeverity, ImpactDirection, FactorSource } from '../../entities/risk-factor.entity';
import { Case, ComplexityTier } from '../../entities/case.entity';
import { Document } from '../../entities/document.entity';
import { TestResult } from '../../entities/test-result.entity';
import { TestRecommendation, TestStatus } from '../../entities/test-recommendation.entity';
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

export interface CoverageGap {
  riskArea: string;
  riskFactorId: string;
  riskFactorName: string;
  missingEvidence: string;
  importance: string;
  evidenceType: 'lab_result' | 'document';
}

@Injectable()
export class RiskService {
  private coverageRules: CoverageRule[] = [];

  constructor(
    @InjectRepository(RiskFactor)
    private riskFactorRepository: Repository<RiskFactor>,
    @InjectRepository(Case)
    private caseRepository: Repository<Case>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(TestResult)
    private testResultRepository: Repository<TestResult>,
    @InjectRepository(TestRecommendation)
    private testRecommendationRepository: Repository<TestRecommendation>,
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

  async getRiskAssessment(caseId: string) {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
      relations: ['riskFactors', 'applicant', 'medicalDisclosures'],
    });

    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    const riskFactors = caseEntity.riskFactors || [];

    // Group factors by category
    const factorsByCategory = riskFactors.reduce((acc, factor) => {
      if (!acc[factor.category]) {
        acc[factor.category] = [];
      }
      acc[factor.category].push(factor);
      return acc;
    }, {} as Record<string, RiskFactor[]>);

    // Calculate summary
    const summary = {
      totalFactors: riskFactors.length,
      criticalCount: riskFactors.filter(f => f.severity === RiskSeverity.CRITICAL).length,
      highCount: riskFactors.filter(f => f.severity === RiskSeverity.HIGH).length,
      moderateCount: riskFactors.filter(f => f.severity === RiskSeverity.MODERATE).length,
      lowCount: riskFactors.filter(f => f.severity === RiskSeverity.LOW).length,
      unverifiedCount: riskFactors.filter(f => !f.verified).length,
    };

    return {
      caseId,
      complexity: {
        complexityTier: caseEntity.complexityTier,
        complexityConfidence: caseEntity.complexityConfidence,
        complexityFactors: caseEntity.complexityFactors,
      },
      riskFactors,
      factorsByCategory,
      summary,
    };
  }

  async assessRisk(caseId: string, userId: string, userName: string) {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
      relations: ['applicant', 'medicalDisclosures', 'testResults'],
    });

    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    // Clear existing auto-identified risk factors (keep manual ones)
    await this.riskFactorRepository
      .createQueryBuilder()
      .delete()
      .where('caseId = :caseId', { caseId })
      .andWhere('source != :manualSource', {
        manualSource: FactorSource.MANUAL_ENTRY,
      })
      .execute();

    // Run rules-based risk identification
    const identifiedFactors = await this.rulesService.identifyRiskFactors(caseEntity);

    // Save identified factors
    for (const factorData of identifiedFactors) {
      const factor = this.riskFactorRepository.create({
        ...factorData,
        case: { id: caseId } as any,
      });
      await this.riskFactorRepository.save(factor);
    }

    // Get ML complexity classification
    const complexityResult = await this.mlClientService.classifyComplexity(caseEntity);

    // Update case with complexity
    caseEntity.complexityTier = complexityResult.tier;
    caseEntity.complexityConfidence = complexityResult.confidence;
    caseEntity.complexityFactors = complexityResult.factors;
    await this.caseRepository.save(caseEntity);

    // Audit log
    await this.auditService.log({
      caseId,
      action: AuditAction.RISK_ASSESSED,
      category: AuditCategory.RISK_ASSESSMENT,
      description: `Risk assessment completed. Complexity: ${complexityResult.tier} (${(complexityResult.confidence * 100).toFixed(1)}% confidence)`,
      userId,
      userName,
      newState: {
        factorsIdentified: identifiedFactors.length,
        complexityTier: complexityResult.tier,
        complexityConfidence: complexityResult.confidence,
      },
    });

    return this.getRiskAssessment(caseId);
  }

  async addManualRiskFactor(caseId: string, data: {
    factorName: string;
    description: string;
    category: string;
    severity: RiskSeverity;
    userId: string;
    userName: string;
  }) {
    const factor = this.riskFactorRepository.create({
      factorName: data.factorName,
      factorDescription: data.description,
      category: data.category as RiskCategory,
      severity: data.severity,
      impactDirection: ImpactDirection.INCREASES_RISK,
      source: FactorSource.MANUAL_ENTRY,
      confidence: 1.0,
      case: { id: caseId } as any,
    });

    await this.riskFactorRepository.save(factor);

    await this.auditService.log({
      caseId,
      action: AuditAction.RISK_FACTOR_ADDED,
      category: AuditCategory.RISK_ASSESSMENT,
      description: `Manual risk factor added: ${data.factorName}`,
      userId: data.userId,
      userName: data.userName,
      newState: { factor: data.factorName, severity: data.severity },
    });

    return factor;
  }

  async overrideSeverity(caseId: string, factorId: string, data: {
    newSeverity: RiskSeverity;
    reason: string;
    reasoningTags?: string[];
    userId: string;
    userName: string;
    userRole?: string;
    userExperienceYears?: number;
  }) {
    const factor = await this.riskFactorRepository.findOne({
      where: { id: factorId },
    });

    if (!factor) {
      throw new NotFoundException(`Risk factor with ID ${factorId} not found`);
    }

    const originalSeverity = factor.severity;
    factor.originalSeverity = originalSeverity;
    factor.severity = data.newSeverity;
    factor.severityOverridden = true;
    factor.overrideReason = data.reason;

    await this.riskFactorRepository.save(factor);

    // Determine override direction
    const severityOrder = ['low', 'moderate', 'high', 'critical'];
    const oldIndex = severityOrder.indexOf(originalSeverity);
    const newIndex = severityOrder.indexOf(data.newSeverity);
    const direction = newIndex > oldIndex ? OverrideDirection.UPGRADE : OverrideDirection.DOWNGRADE;

    // Record override for learning
    await this.overridesService.createOverride({
      caseId,
      overrideType: OverrideType.RISK_SEVERITY,
      direction,
      systemRecommendation: `${factor.factorName}: ${originalSeverity}`,
      systemRecommendationDetails: {
        factorId,
        factorName: factor.factorName,
        originalSeverity,
        confidence: factor.confidence,
      },
      systemConfidence: factor.confidence,
      underwriterChoice: `${factor.factorName}: ${data.newSeverity}`,
      underwriterChoiceDetails: { newSeverity: data.newSeverity },
      reasoning: data.reason,
      reasoningTags: data.reasoningTags,
      underwriterId: data.userId,
      underwriterName: data.userName,
      underwriterRole: data.userRole || 'Underwriter',
      underwriterExperienceYears: data.userExperienceYears || 0,
    });

    await this.auditService.log({
      caseId,
      action: AuditAction.RISK_FACTOR_MODIFIED,
      category: AuditCategory.RISK_ASSESSMENT,
      description: `Risk factor severity overridden: ${factor.factorName} from ${originalSeverity} to ${data.newSeverity}`,
      userId: data.userId,
      userName: data.userName,
      previousState: { severity: originalSeverity },
      newState: { severity: data.newSeverity, reason: data.reason },
    });

    return factor;
  }

  async verifyFactor(caseId: string, factorId: string, userId: string, userName: string) {
    const factor = await this.riskFactorRepository.findOne({
      where: { id: factorId },
    });

    if (!factor) {
      throw new NotFoundException(`Risk factor with ID ${factorId} not found`);
    }

    factor.verified = true;
    factor.verifiedBy = userId;
    factor.verifiedAt = new Date();

    await this.riskFactorRepository.save(factor);

    await this.auditService.log({
      caseId,
      action: AuditAction.EXTRACTION_VERIFIED,
      category: AuditCategory.RISK_ASSESSMENT,
      description: `Risk factor verified: ${factor.factorName}`,
      userId,
      userName,
      relatedEntityType: 'RiskFactor',
      relatedEntityId: factorId,
    });

    return factor;
  }

  async overrideComplexity(caseId: string, data: {
    newTier: string;
    reason: string;
    reasoningTags?: string[];
    userId: string;
    userName: string;
    userRole?: string;
    userExperienceYears?: number;
  }) {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
    });

    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    const originalTier = caseEntity.complexityTier;
    const originalConfidence = caseEntity.complexityConfidence;
    caseEntity.complexityTier = data.newTier as ComplexityTier;

    await this.caseRepository.save(caseEntity);

    // Determine override direction
    const tierOrder = ['routine', 'moderate', 'complex', 'specialist'];
    const oldIndex = tierOrder.indexOf(originalTier || 'routine');
    const newIndex = tierOrder.indexOf(data.newTier);
    const direction = newIndex > oldIndex ? OverrideDirection.UPGRADE : OverrideDirection.DOWNGRADE;

    // Record override for learning
    await this.overridesService.createOverride({
      caseId,
      overrideType: OverrideType.COMPLEXITY_TIER,
      direction,
      systemRecommendation: originalTier || 'Not assessed',
      systemRecommendationDetails: {
        originalTier,
        confidence: originalConfidence,
        factors: caseEntity.complexityFactors,
      },
      systemConfidence: originalConfidence,
      underwriterChoice: data.newTier,
      underwriterChoiceDetails: { newTier: data.newTier },
      reasoning: data.reason,
      reasoningTags: data.reasoningTags,
      underwriterId: data.userId,
      underwriterName: data.userName,
      underwriterRole: data.userRole || 'Underwriter',
      underwriterExperienceYears: data.userExperienceYears || 0,
    });

    await this.auditService.log({
      caseId,
      action: AuditAction.COMPLEXITY_OVERRIDDEN,
      category: AuditCategory.RISK_ASSESSMENT,
      description: `Complexity tier overridden from ${originalTier} to ${data.newTier}. Reason: ${data.reason}`,
      userId: data.userId,
      userName: data.userName,
      previousState: { complexityTier: originalTier },
      newState: { complexityTier: data.newTier, reason: data.reason },
    });

    return caseEntity;
  }

  async getCoverageGaps(caseId: string): Promise<{
    gaps: CoverageGap[];
    summary: {
      totalGaps: number;
      labGaps: number;
      documentGaps: number;
      riskAreasAffected: number;
    };
  }> {
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
    const testRecommendations = caseEntity.testRecommendations || [];

    const gaps: CoverageGap[] = [];
    const affectedAreas = new Set<string>();

    for (const factor of riskFactors) {
      const matchingRules = this.findMatchingCoverageRules(factor);

      for (const rule of matchingRules) {
        for (const evidenceReq of rule.expectedEvidence) {
          const isCovered = this.isEvidenceCovered(
            evidenceReq,
            documents,
            testResults,
            testRecommendations,
          );

          if (!isCovered) {
            gaps.push({
              riskArea: factor.factorName,
              riskFactorId: factor.id,
              riskFactorName: factor.factorName,
              missingEvidence: evidenceReq.description,
              importance: evidenceReq.importance,
              evidenceType: evidenceReq.evidenceType,
            });
            affectedAreas.add(factor.factorName);
          }
        }
      }
    }

    return {
      gaps,
      summary: {
        totalGaps: gaps.length,
        labGaps: gaps.filter(g => g.evidenceType === 'lab_result').length,
        documentGaps: gaps.filter(g => g.evidenceType === 'document').length,
        riskAreasAffected: affectedAreas.size,
      },
    };
  }

  private findMatchingCoverageRules(factor: RiskFactor): CoverageRule[] {
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

  private isEvidenceCovered(
    evidenceReq: EvidenceRequirement,
    documents: Document[],
    testResults: TestResult[],
    testRecommendations: TestRecommendation[],
  ): boolean {
    if (evidenceReq.evidenceType === 'lab_result') {
      // Check if any test result matches
      const hasResult = testResults.some(result => {
        const codeMatch = evidenceReq.testCodes?.some(
          code => result.testCode?.toUpperCase().includes(code.toUpperCase())
        );
        const nameMatch = evidenceReq.testNames?.some(
          name => result.testName?.toLowerCase().includes(name.toLowerCase())
        );
        return codeMatch || nameMatch;
      });

      if (hasResult) return true;

      // Check if test is ordered/in-progress
      const hasOrderedTest = testRecommendations.some(rec => {
        if (rec.status !== TestStatus.ORDERED && rec.status !== TestStatus.RESULTS_RECEIVED) {
          return false;
        }
        const codeMatch = evidenceReq.testCodes?.some(
          code => rec.testCode?.toUpperCase().includes(code.toUpperCase())
        );
        const nameMatch = evidenceReq.testNames?.some(
          name => rec.testName?.toLowerCase().includes(name.toLowerCase())
        );
        return codeMatch || nameMatch;
      });

      return hasOrderedTest;
    }

    if (evidenceReq.evidenceType === 'document') {
      // Check if any document of the required type has relevant extractions
      return documents.some(doc => {
        const typeMatch = evidenceReq.documentTypes?.some(
          docType => doc.documentType === docType
        );

        if (!typeMatch) return false;

        // Check if document has relevant extracted fields with content
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
}
