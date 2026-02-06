import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Decision, DecisionType, DecisionStatus } from '../../entities/decision.entity';
import { OverrideType, OverrideDirection } from '../../entities/override.entity';
import { Case, CaseStatus } from '../../entities/case.entity';
import { RiskFactor } from '../../entities/risk-factor.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditCategory } from '../../entities/audit-log.entity';
import { RulesService } from '../rules/rules.service';
import { OverridesService } from '../overrides/overrides.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DecisionsService {
  constructor(
    @InjectRepository(Decision)
    private decisionRepository: Repository<Decision>,
    @InjectRepository(Case)
    private caseRepository: Repository<Case>,
    private auditService: AuditService,
    private rulesService: RulesService,
    private overridesService: OverridesService,
  ) {}

  async getDecisionOptions(caseId: string) {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
      relations: ['applicant', 'medicalDisclosures', 'riskFactors', 'testResults'],
    });

    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    // Get decision options from rules
    const options = await this.rulesService.getDecisionOptions(caseEntity);

    return {
      caseId,
      options,
      contextSummary: {
        complexityTier: caseEntity.complexityTier,
        riskFactorCount: caseEntity.riskFactors?.length || 0,
        testResultCount: caseEntity.testResults?.length || 0,
      },
    };
  }

  async getDecisions(caseId: string) {
    return this.decisionRepository.find({
      where: { case: { id: caseId } },
      order: { madeAt: 'DESC' },
    });
  }

  async getCurrentDecision(caseId: string) {
    return this.decisionRepository.findOne({
      where: { case: { id: caseId } },
      order: { madeAt: 'DESC' },
    });
  }

  async makeDecision(caseId: string, data: {
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
  }) {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
      relations: ['applicant', 'riskFactors'],
    });

    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    // Get system recommendation to check for override
    const options = await this.rulesService.getDecisionOptions(caseEntity);
    const recommendedOption = options.find(o => o.recommended);
    const systemRecommended = recommendedOption?.type;
    const isOverride = systemRecommended && systemRecommended !== data.decisionType;

    // Create decision
    const decision = this.decisionRepository.create({
      decisionType: data.decisionType,
      status: data.decisionType === DecisionType.REFERRAL
        ? DecisionStatus.PENDING_REVIEW
        : DecisionStatus.APPROVED,
      rationale: data.rationale,
      modifications: data.modifications,
      referralTarget: data.referralTarget,
      referralReason: data.referralReason,
      requestedInformation: data.requestedInformation,
      requestedTests: data.requestedTests,
      madeBy: data.userId,
      madeByName: data.userName,
      madeByRole: data.userRole,
      madeAt: new Date(),
      systemRecommendedType: systemRecommended,
      isOverride,
      overrideReason: isOverride ? data.rationale : undefined,
      case: { id: caseId } as Case,
    });

    await this.decisionRepository.save(decision);

    // If override, record it for learning using centralized OverridesService
    if (isOverride) {
      // Determine override direction
      const decisionOrder = ['standard_acceptance', 'modified_acceptance', 'deferral', 'referral', 'postponement', 'decline'];
      const systemIndex = decisionOrder.indexOf(systemRecommended);
      const chosenIndex = decisionOrder.indexOf(data.decisionType);
      const direction = chosenIndex > systemIndex ? OverrideDirection.UPGRADE : OverrideDirection.DOWNGRADE;

      await this.overridesService.createOverride({
        caseId,
        overrideType: OverrideType.DECISION_OPTION,
        direction,
        systemRecommendation: systemRecommended,
        systemRecommendationDetails: {
          recommendedType: systemRecommended,
          allOptions: options.map(o => ({ type: o.type, recommended: o.recommended })),
        },
        underwriterChoice: data.decisionType,
        underwriterChoiceDetails: {
          decisionType: data.decisionType,
          modifications: data.modifications,
          referralTarget: data.referralTarget,
        },
        reasoning: data.rationale,
        reasoningTags: data.reasoningTags,
        underwriterId: data.userId,
        underwriterName: data.userName,
        underwriterRole: data.userRole,
        underwriterExperienceYears: data.userExperienceYears || 0,
      });
    }

    // Update case status
    const statusMap: Record<DecisionType, CaseStatus> = {
      [DecisionType.STANDARD_ACCEPTANCE]: CaseStatus.DECISION_MADE,
      [DecisionType.MODIFIED_ACCEPTANCE]: CaseStatus.DECISION_MADE,
      [DecisionType.DEFERRAL]: CaseStatus.AWAITING_INFORMATION,
      [DecisionType.REFERRAL]: CaseStatus.AWAITING_DECISION,
      [DecisionType.POSTPONEMENT]: CaseStatus.DECISION_MADE,
      [DecisionType.DECLINE]: CaseStatus.DECISION_MADE,
    };

    caseEntity.status = statusMap[data.decisionType] || CaseStatus.DECISION_MADE;
    await this.caseRepository.save(caseEntity);

    await this.auditService.log({
      caseId,
      action: AuditAction.DECISION_MADE,
      category: AuditCategory.DECISION_MAKING,
      description: `Decision made: ${data.decisionType}${isOverride ? ' (Override)' : ''}`,
      userId: data.userId,
      userName: data.userName,
      userRole: data.userRole,
      newState: {
        decisionType: data.decisionType,
        isOverride,
        systemRecommended,
      },
    });

    return decision;
  }

  async getProductGuidance(caseId: string, userId?: string, userName?: string) {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
      relations: ['riskFactors'],
    });

    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    const productCode = caseEntity.productCode;
    const productName = caseEntity.productName;
    const riskFactors: RiskFactor[] = caseEntity.riskFactors || [];

    // Load product modification guidelines config
    const configPath = path.join(process.cwd(), 'config', 'product-modification-guidelines.json');
    let guidelinesConfig: any;
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      guidelinesConfig = JSON.parse(configContent);
    } catch {
      return {
        caseId,
        productCode,
        productName,
        guidanceItems: [],
        configVersion: null,
        message: 'Product modification guidelines configuration not available',
      };
    }

    const conditionMappings: { keywords: string[]; conditionKey: string }[] =
      guidelinesConfig.conditionMapping?.mappings || [];
    const defaultGuidance = guidelinesConfig.defaultGuidance || {};

    // Find matching product config
    const productConfig = guidelinesConfig.products?.[productCode];

    // Map each risk factor to product-specific guidance
    const guidanceItems = riskFactors
      .filter((rf) => rf.impactDirection.toLowerCase() === 'increases_risk')
      .map((rf) => {
        const factorNameLower = rf.factorName.toLowerCase();
        const factorDescLower = rf.factorDescription.toLowerCase();

        // Match risk factor to condition key using keyword mapping
        let matchedConditionKey: string | null = null;
        for (const mapping of conditionMappings) {
          const matched = mapping.keywords.some(
            (kw) => factorNameLower.includes(kw) || factorDescLower.includes(kw),
          );
          if (matched) {
            matchedConditionKey = mapping.conditionKey;
            break;
          }
        }

        const severity = rf.severity.toLowerCase(); // normalize to 'low' | 'moderate' | 'high' | 'critical'

        // Look up guidance: product-specific first, then default
        let guidance: { loading_range: string; waiting_period: string; exclusion_hint: string } | null = null;

        if (matchedConditionKey && productConfig?.conditions?.[matchedConditionKey]?.[severity]) {
          guidance = productConfig.conditions[matchedConditionKey][severity];
        } else if (matchedConditionKey && defaultGuidance[severity]) {
          guidance = defaultGuidance[severity];
        } else if (defaultGuidance[severity]) {
          guidance = defaultGuidance[severity];
        }

        if (!guidance) {
          return null;
        }

        return {
          riskFactorId: rf.id,
          riskFactorName: rf.factorName,
          riskFactorDescription: rf.factorDescription,
          severity: severity,
          category: rf.category,
          matchedCondition: matchedConditionKey,
          suggestedLoadingRange: guidance.loading_range,
          waitingPeriod: guidance.waiting_period,
          exclusionConsideration: guidance.exclusion_hint,
          isProductSpecific: !!(matchedConditionKey && productConfig?.conditions?.[matchedConditionKey]?.[severity]),
          advisoryNote: 'Guideline-based suggestion for underwriter consideration only. Does not constitute a decision.',
        };
      })
      .filter(Boolean);

    // Log that guidance was displayed (audit only, not a decision)
    if (userId) {
      await this.auditService.log({
        caseId,
        action: AuditAction.PRODUCT_GUIDANCE_DISPLAYED,
        category: AuditCategory.DECISION_MAKING,
        description: `Product-specific modification guidance displayed for ${productName} (${productCode})`,
        userId,
        userName: userName || undefined,
        metadata: {
          productCode,
          productName,
          riskFactorCount: riskFactors.length,
          guidanceItemCount: guidanceItems.length,
          matchedConditions: guidanceItems.map((g: any) => g.matchedCondition).filter(Boolean),
        },
      });
    }

    return {
      caseId,
      productCode,
      productName,
      guidanceItems,
      configVersion: guidelinesConfig.version,
      disclaimer: 'These are guideline-based suggestions for underwriter reference only. They do not constitute pricing, decisions, or authority overrides.',
    };
  }

  async reviewDecision(caseId: string, decisionId: string, data: {
    approved: boolean;
    notes: string;
    userId: string;
    userName: string;
  }) {
    const decision = await this.decisionRepository.findOne({
      where: { id: decisionId },
    });

    if (!decision) {
      throw new NotFoundException(`Decision with ID ${decisionId} not found`);
    }

    decision.status = data.approved ? DecisionStatus.APPROVED : DecisionStatus.REJECTED;
    decision.reviewedBy = data.userId;
    decision.reviewedByName = data.userName;
    decision.reviewedAt = new Date();
    decision.reviewNotes = data.notes;

    await this.decisionRepository.save(decision);

    // Update case status
    const caseEntity = await this.caseRepository.findOne({ where: { id: caseId } });
    if (caseEntity) {
      caseEntity.status = data.approved ? CaseStatus.DECISION_MADE : CaseStatus.IN_PROGRESS;
      await this.caseRepository.save(caseEntity);
    }

    await this.auditService.log({
      caseId,
      action: data.approved ? AuditAction.DECISION_APPROVED : AuditAction.DECISION_REJECTED,
      category: AuditCategory.DECISION_MAKING,
      description: `Decision ${data.approved ? 'approved' : 'rejected'}: ${data.notes}`,
      userId: data.userId,
      userName: data.userName,
    });

    return decision;
  }
}
