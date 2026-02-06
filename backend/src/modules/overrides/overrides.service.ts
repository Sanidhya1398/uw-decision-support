import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Override, OverrideType, OverrideDirection } from '../../entities/override.entity';
import { Case, CaseStatus } from '../../entities/case.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditCategory } from '../../entities/audit-log.entity';

interface CreateOverrideDto {
  caseId: string;
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
}

export interface OverridePattern {
  pattern: string;
  count: number;
  percentage: number;
  examples: {
    caseId: string;
    reasoning: string;
    underwriterName: string;
  }[];
  suggestedAction?: string;
}

export interface SimilarCaseResult {
  caseId: string;
  caseReference: string;
  similarity: number;
  outcome?: string;
  decision?: string;
  overridesApplied: {
    type: string;
    description: string;
  }[];
}

@Injectable()
export class OverridesService {
  private readonly logger = new Logger(OverridesService.name);

  constructor(
    @InjectRepository(Override)
    private overrideRepository: Repository<Override>,
    @InjectRepository(Case)
    private caseRepository: Repository<Case>,
    private auditService: AuditService,
  ) {}

  /**
   * Record a new override
   */
  async createOverride(data: CreateOverrideDto): Promise<Override> {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: data.caseId },
      relations: ['applicant', 'medicalDisclosures', 'riskFactors', 'testResults'],
    });

    if (!caseEntity) {
      throw new Error(`Case ${data.caseId} not found`);
    }

    // Build context snapshot
    const caseContextSnapshot = {
      applicantAge: caseEntity.applicant?.age || 0,
      sumAssured: Number(caseEntity.sumAssured),
      conditions: caseEntity.medicalDisclosures
        ?.filter(d => d.disclosureType === 'condition')
        .map(d => d.conditionName) || [],
      medications: caseEntity.medicalDisclosures
        ?.filter(d => d.disclosureType === 'medication')
        .map(d => d.drugName) || [],
      riskFactors: caseEntity.riskFactors?.map(r => r.factorName) || [],
      testResults: caseEntity.testResults?.map(t => `${t.testName}: ${t.resultValue}`) || [],
    };

    const override = this.overrideRepository.create({
      overrideType: data.overrideType,
      direction: data.direction,
      systemRecommendation: data.systemRecommendation,
      systemRecommendationDetails: data.systemRecommendationDetails,
      systemConfidence: data.systemConfidence,
      underwriterChoice: data.underwriterChoice,
      underwriterChoiceDetails: data.underwriterChoiceDetails,
      reasoning: data.reasoning,
      reasoningTags: data.reasoningTags || [],
      caseContextSnapshot,
      underwriterId: data.underwriterId,
      underwriterName: data.underwriterName,
      underwriterRole: data.underwriterRole,
      underwriterExperienceYears: data.underwriterExperienceYears,
      case: { id: data.caseId } as Case,
    });

    await this.overrideRepository.save(override);

    await this.auditService.log({
      caseId: data.caseId,
      action: AuditAction.DECISION_OVERRIDDEN,
      category: AuditCategory.DECISION_MAKING,
      description: `Override recorded: ${data.overrideType} - ${data.systemRecommendation} → ${data.underwriterChoice}`,
      userId: data.underwriterId,
      userName: data.underwriterName,
      relatedEntityType: 'Override',
      relatedEntityId: override.id,
      metadata: {
        overrideType: data.overrideType,
        direction: data.direction,
        reasoning: data.reasoning,
      },
    });

    this.logger.log(`Override recorded: ${override.id} for case ${data.caseId}`);

    return override;
  }

  /**
   * Get all overrides for a case
   */
  async getOverridesForCase(caseId: string): Promise<Override[]> {
    return this.overrideRepository.find({
      where: { case: { id: caseId } },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get override statistics
   */
  async getOverrideStats(days: number = 30): Promise<{
    total: number;
    byType: Record<string, number>;
    byDirection: Record<string, number>;
    topReasons: { reason: string; count: number }[];
    overrideRate: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const overrides = await this.overrideRepository.find({
      where: { createdAt: MoreThan(since) },
    });

    const byType: Record<string, number> = {};
    const byDirection: Record<string, number> = {};
    const reasonCounts: Record<string, number> = {};

    for (const override of overrides) {
      byType[override.overrideType] = (byType[override.overrideType] || 0) + 1;
      byDirection[override.direction] = (byDirection[override.direction] || 0) + 1;

      for (const tag of override.reasoningTags || []) {
        reasonCounts[tag] = (reasonCounts[tag] || 0) + 1;
      }
    }

    const topReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate override rate (overrides / total recommendations)
    const totalCases = await this.caseRepository.count({
      where: { createdAt: MoreThan(since) },
    });
    const overrideRate = totalCases > 0 ? (overrides.length / totalCases) * 100 : 0;

    return {
      total: overrides.length,
      byType,
      byDirection,
      topReasons,
      overrideRate,
    };
  }

  /**
   * Find patterns in overrides that might suggest rule improvements
   */
  async analyzeOverridePatterns(type?: OverrideType): Promise<OverridePattern[]> {
    const query = this.overrideRepository.createQueryBuilder('override')
      .leftJoinAndSelect('override.case', 'case');

    if (type) {
      query.where('override.overrideType = :type', { type });
    }

    const overrides = await query.getMany();

    // Group by similar patterns (using reasoning tags + context)
    const patternGroups: Map<string, Override[]> = new Map();

    for (const override of overrides) {
      // Create pattern key from type + direction + primary reason tag
      const primaryTag = override.reasoningTags?.[0] || 'untagged';
      const patternKey = `${override.overrideType}:${override.direction}:${primaryTag}`;

      if (!patternGroups.has(patternKey)) {
        patternGroups.set(patternKey, []);
      }
      patternGroups.get(patternKey)!.push(override);
    }

    const patterns: OverridePattern[] = [];

    for (const [patternKey, group] of patternGroups) {
      if (group.length < 2) continue; // Only consider patterns with multiple instances

      const [type, direction, reason] = patternKey.split(':');
      const percentage = (group.length / overrides.length) * 100;

      let suggestedAction: string | undefined;
      if (group.length >= 5 && percentage >= 10) {
        suggestedAction = `Consider updating ${type} rules to account for "${reason}" scenarios`;
      }

      patterns.push({
        pattern: `${direction} ${type} due to ${reason}`,
        count: group.length,
        percentage,
        examples: group.slice(0, 3).map(o => ({
          caseId: o.case?.id || 'unknown',
          reasoning: o.reasoning,
          underwriterName: o.underwriterName,
        })),
        suggestedAction,
      });
    }

    return patterns.sort((a, b) => b.count - a.count);
  }

  /**
   * Find similar cases based on profile matching
   */
  async findSimilarCases(caseId: string, limit: number = 10): Promise<SimilarCaseResult[]> {
    const currentCase = await this.caseRepository.findOne({
      where: { id: caseId },
      relations: ['applicant', 'medicalDisclosures', 'riskFactors', 'decisions', 'overrides'],
    });

    if (!currentCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    // Extract key features for matching
    const currentAge = currentCase.applicant?.age || 35;
    const currentSum = Number(currentCase.sumAssured);
    const currentConditions = currentCase.medicalDisclosures
      ?.filter(d => d.disclosureType === 'condition')
      .map(d => d.conditionName?.toLowerCase()) || [];

    // Find cases with similar characteristics
    const allCases = await this.caseRepository.find({
      where: { status: CaseStatus.COMPLETED },
      relations: ['applicant', 'medicalDisclosures', 'decisions', 'overrides'],
      take: 500, // Limit for performance
    });

    const scoredCases: { case: Case; similarity: number }[] = [];

    for (const compareCase of allCases) {
      if (compareCase.id === caseId) continue;

      let similarity = 0;

      // Age similarity (within 10 years = high score)
      const compareAge = compareCase.applicant?.age || 35;
      const ageDiff = Math.abs(currentAge - compareAge);
      if (ageDiff <= 5) similarity += 25;
      else if (ageDiff <= 10) similarity += 15;
      else if (ageDiff <= 15) similarity += 5;

      // Sum assured similarity (within 50% = high score)
      const compareSum = Number(compareCase.sumAssured);
      const sumRatio = Math.min(currentSum, compareSum) / Math.max(currentSum, compareSum);
      if (sumRatio >= 0.8) similarity += 25;
      else if (sumRatio >= 0.5) similarity += 15;
      else if (sumRatio >= 0.3) similarity += 5;

      // Condition overlap (each matching condition adds score)
      const compareConditions = compareCase.medicalDisclosures
        ?.filter(d => d.disclosureType === 'condition')
        .map(d => d.conditionName?.toLowerCase()) || [];

      const matchingConditions = currentConditions.filter(c =>
        compareConditions.some(cc => cc?.includes(c) || c?.includes(cc))
      );
      similarity += matchingConditions.length * 15;

      // Bonus for completed cases with decisions
      if (compareCase.decisions?.length > 0) {
        similarity += 10;
      }

      // Bonus for cases with overrides (learning opportunities)
      if (compareCase.overrides?.length > 0) {
        similarity += 5;
      }

      if (similarity > 20) {
        scoredCases.push({ case: compareCase, similarity });
      }
    }

    // Sort by similarity and take top N
    scoredCases.sort((a, b) => b.similarity - a.similarity);
    const topCases = scoredCases.slice(0, limit);

    return topCases.map(({ case: c, similarity }) => ({
      caseId: c.id,
      caseReference: c.caseReference,
      similarity: Math.min(100, similarity),
      outcome: c.status,
      decision: c.decisions?.[0]?.decisionType,
      overridesApplied: (c.overrides || []).map(o => ({
        type: o.overrideType,
        description: `${o.systemRecommendation} → ${o.underwriterChoice}`,
      })),
    }));
  }

  /**
   * Get learning insights for a specific case context
   */
  async getLearningInsights(caseId: string): Promise<{
    similarCasesCount: number;
    commonOverrides: { type: string; frequency: number; reasoning: string }[];
    suggestedActions: string[];
    confidenceAdjustment: number;
  }> {
    const similarCases = await this.findSimilarCases(caseId, 50);

    // Count override patterns in similar cases
    const overridePatterns: Map<string, { count: number; reasons: string[] }> = new Map();

    for (const similar of similarCases) {
      for (const override of similar.overridesApplied) {
        const key = override.type;
        if (!overridePatterns.has(key)) {
          overridePatterns.set(key, { count: 0, reasons: [] });
        }
        const pattern = overridePatterns.get(key)!;
        pattern.count++;
      }
    }

    const commonOverrides = Array.from(overridePatterns.entries())
      .map(([type, data]) => ({
        type,
        frequency: data.count / similarCases.length,
        reasoning: data.reasons[0] || 'Various reasons',
      }))
      .filter(o => o.frequency >= 0.2) // At least 20% of similar cases
      .sort((a, b) => b.frequency - a.frequency);

    const suggestedActions: string[] = [];
    for (const override of commonOverrides) {
      if (override.frequency >= 0.5) {
        suggestedActions.push(
          `Consider ${override.type} adjustment - applied in ${(override.frequency * 100).toFixed(0)}% of similar cases`
        );
      }
    }

    // Calculate confidence adjustment based on override frequency
    const overrideRate = commonOverrides.reduce((sum, o) => sum + o.frequency, 0) / (commonOverrides.length || 1);
    const confidenceAdjustment = -overrideRate * 0.2; // Reduce confidence by up to 20%

    return {
      similarCasesCount: similarCases.length,
      commonOverrides,
      suggestedActions,
      confidenceAdjustment,
    };
  }

  /**
   * Validate an override (by senior underwriter or medical director)
   */
  async validateOverride(
    overrideId: string,
    validated: boolean,
    validatedBy: string,
    notes?: string,
  ): Promise<Override> {
    const override = await this.overrideRepository.findOne({
      where: { id: overrideId },
      relations: ['case'],
    });

    if (!override) {
      throw new Error(`Override ${overrideId} not found`);
    }

    override.validated = validated;
    override.validatedBy = validatedBy;
    override.validatedAt = new Date();
    if (notes) {
      override.validationNotes = notes;
    }

    // If validated, mark as ready for training
    if (validated) {
      override.includedInTraining = true;
    }

    await this.overrideRepository.save(override);

    return override;
  }

  /**
   * Get overrides pending validation
   */
  async getPendingValidation(): Promise<Override[]> {
    return this.overrideRepository.find({
      where: { validated: false, flaggedForReview: false },
      relations: ['case'],
      order: { createdAt: 'ASC' },
      take: 50,
    });
  }

  /**
   * Flag an override for review (unusual pattern detected)
   */
  async flagForReview(overrideId: string, reason: string): Promise<Override> {
    const override = await this.overrideRepository.findOne({
      where: { id: overrideId },
    });

    if (!override) {
      throw new Error(`Override ${overrideId} not found`);
    }

    override.flaggedForReview = true;
    override.reviewNotes = reason;

    await this.overrideRepository.save(override);

    return override;
  }
}
