import { Injectable } from '@nestjs/common';
import { RuleEngineService } from './rule-engine.service';
import { RulesConfigService, RiskRule, TestProtocol, DecisionRule } from './rules-config.service';
import { RiskCategory, RiskSeverity, ImpactDirection, FactorSource } from '../../entities/risk-factor.entity';
import { TestRequirementType, TestCategory } from '../../entities/test-recommendation.entity';
import { DecisionType } from '../../entities/decision.entity';

interface RiskFactorData {
  factorName: string;
  factorDescription: string;
  category: RiskCategory;
  severity: RiskSeverity;
  impactDirection: ImpactDirection;
  source: FactorSource;
  identifyingRuleId: string;
  identifyingRuleName: string;
  complexityWeight: number;
  supportingEvidence: { description: string; value?: string }[];
}

interface TestRecommendationData {
  testCode: string;
  testName: string;
  testCategory: TestCategory;
  requirementType: TestRequirementType;
  clinicalRationale: string;
  protocolReference: string;
  triggeringRules: string[];
  estimatedCost: number;
  estimatedTurnaroundDays: number;
}

export interface DecisionOption {
  type: DecisionType;
  name: string;
  description: string;
  supportingFactors: { factor: string; description: string }[];
  weighingFactors: { factor: string; description: string }[];
  guidelineReference: string;
  recommended: boolean;
  authorityRequired: string;
}

@Injectable()
export class RulesService {
  constructor(
    private ruleEngine: RuleEngineService,
    private rulesConfig: RulesConfigService,
  ) {}

  /**
   * Identify risk factors from case data using JSON-configured rules
   */
  async identifyRiskFactors(caseEntity: any): Promise<RiskFactorData[]> {
    const factors: RiskFactorData[] = [];
    const addedFactorKeys = new Set<string>();

    // Load risk rules from config
    const { rules } = await this.rulesConfig.getAllRules<RiskRule>('risk');

    // Build evaluation context
    const context = this.buildEvaluationContext(caseEntity);

    // Evaluate each rule
    const results = this.ruleEngine.evaluateRules(rules, context);

    for (const result of results) {
      if (!result.matched) continue;

      const rule = result.rule;
      const actions = rule.actions;

      if (!actions?.createRiskFactor) continue;

      // For array-matched rules, create a factor for each matched item
      const matchedItems = result.matchedItems || [{}];

      for (const matchedItem of matchedItems) {
        // Build template context with matched item
        const templateContext = {
          ...context,
          matchedDisclosure: matchedItem,
        };

        // Determine severity based on severity rules
        let severity: RiskSeverity;
        let complexityWeight: number;

        if (actions.severityRules) {
          const severityResult = this.evaluateSeverityRules(actions.severityRules, templateContext);
          severity = severityResult.severity as RiskSeverity;
          complexityWeight = severityResult.complexityWeight;
        } else {
          severity = (actions.createRiskFactor.severity as RiskSeverity) || RiskSeverity.MODERATE;
          complexityWeight = actions.createRiskFactor.complexityWeight || 0.2;
        }

        // Build supporting evidence from templates
        const supportingEvidence = (actions.createRiskFactor.supportingEvidenceTemplate || []).map(
          (template: any) => ({
            description: template.description,
            value: this.ruleEngine.substituteTemplate(template.valueTemplate, templateContext),
          })
        );

        const factorDescription = this.ruleEngine.substituteTemplate(
          actions.createRiskFactor.factorDescriptionTemplate,
          templateContext
        );

        if (addedFactorKeys.has(actions.createRiskFactor.factorName)) continue;
        addedFactorKeys.add(actions.createRiskFactor.factorName);

        factors.push({
          factorName: actions.createRiskFactor.factorName,
          factorDescription,
          category: actions.createRiskFactor.category as RiskCategory,
          severity,
          impactDirection: actions.createRiskFactor.impactDirection as ImpactDirection,
          source: actions.createRiskFactor.source as FactorSource,
          identifyingRuleId: rule.id,
          identifyingRuleName: rule.name,
          complexityWeight,
          supportingEvidence,
        });
      }
    }

    return factors;
  }

  /**
   * Get test recommendations based on case factors using JSON-configured protocols
   */
  async getTestRecommendations(caseEntity: any): Promise<TestRecommendationData[]> {
    const recommendations: TestRecommendationData[] = [];
    const addedTestCodes = new Set<string>();

    // Load test protocols from config
    const { rules: protocols } = await this.rulesConfig.getAllRules<TestProtocol>('test-protocols');

    // Build evaluation context
    const context = this.buildEvaluationContext(caseEntity);

    // Evaluate each protocol
    const results = this.ruleEngine.evaluateRules(protocols, context);

    for (const result of results) {
      if (!result.matched) continue;

      const protocol = result.rule as TestProtocol;

      for (const test of protocol.tests || []) {
        // Skip if test already added and skipIfExists is true
        if (test.skipIfExists && addedTestCodes.has(test.testCode)) {
          continue;
        }

        // Skip duplicates with same requirement type
        if (addedTestCodes.has(test.testCode)) {
          // Check if this is a higher priority requirement type
          const existing = recommendations.find(r => r.testCode === test.testCode);
          if (existing) {
            const priorityMap: Record<string, number> = {
              'MANDATORY': 4,
              'CONDITIONAL': 3,
              'SUGGESTED': 2,
              'ADDITIONAL': 1,
            };
            if (priorityMap[test.requirementType] <= priorityMap[existing.requirementType]) {
              continue;
            }
            // Remove existing to add higher priority one
            const idx = recommendations.findIndex(r => r.testCode === test.testCode);
            recommendations.splice(idx, 1);
          }
        }

        addedTestCodes.add(test.testCode);

        recommendations.push({
          testCode: test.testCode,
          testName: test.testName,
          testCategory: test.testCategory as TestCategory,
          requirementType: test.requirementType as TestRequirementType,
          clinicalRationale: test.clinicalRationale,
          protocolReference: test.protocolReference,
          triggeringRules: [protocol.id],
          estimatedCost: test.estimatedCost,
          estimatedTurnaroundDays: test.estimatedTurnaroundDays,
        });
      }
    }

    return recommendations;
  }

  /**
   * Get decision options based on case assessment using JSON-configured rules
   */
  async getDecisionOptions(caseEntity: any): Promise<DecisionOption[]> {
    const options: DecisionOption[] = [];

    // Load decision rules from config
    const { rules } = await this.rulesConfig.getAllRules<DecisionRule>('decision');

    // Build evaluation context including risk factors
    const context = this.buildEvaluationContext(caseEntity);

    // Evaluate each rule
    const results = this.ruleEngine.evaluateRules(rules, context);

    for (const result of results) {
      if (!result.matched && !result.rule.alwaysInclude) continue;

      const rule = result.rule as DecisionRule;
      const output = rule.output;

      // Determine weighing factors
      let weighingFactors: { factor: string; description: string }[] = [];

      if (output.weighingFactors) {
        weighingFactors = output.weighingFactors;
      } else if (output.weighingFactorsTemplate) {
        weighingFactors = output.weighingFactorsTemplate.map((wf: any) => ({
          factor: wf.factor,
          description: this.ruleEngine.substituteTemplate(wf.descriptionTemplate, context),
        }));
      } else if (output.weighingFactorsCondition) {
        const conditionResult = this.ruleEngine.evaluateCondition(
          output.weighingFactorsCondition.condition,
          context
        );
        if (conditionResult.matched) {
          weighingFactors = output.weighingFactorsCondition.factors;
        }
      }

      // Determine recommended status
      let recommended = output.recommended ?? false;
      if (output.recommendedCondition) {
        const conditionResult = this.ruleEngine.evaluateCondition(
          output.recommendedCondition.condition,
          context
        );
        if (conditionResult.matched) {
          recommended = output.recommendedCondition.recommended;
        }
      }

      options.push({
        type: rule.decisionType as DecisionType,
        name: output.name,
        description: output.description,
        supportingFactors: output.supportingFactors || [],
        weighingFactors,
        guidelineReference: output.guidelineReference,
        recommended,
        authorityRequired: output.authorityRequired,
      });
    }

    return options;
  }

  /**
   * Build evaluation context from case entity
   */
  private buildEvaluationContext(caseEntity: any): Record<string, any> {
    const applicant = caseEntity.applicant || {};
    const disclosures = caseEntity.medicalDisclosures || [];
    const riskFactors = caseEntity.riskFactors || [];
    const testResults = caseEntity.testResults || [];

    // Calculate derived fields
    const age = applicant.age || this.calculateAge(applicant.dateOfBirth);
    const bmi = applicant.bmi || this.calculateBMI(applicant.heightCm, applicant.weightKg);

    // Build context
    const context = {
      case: {
        id: caseEntity.id,
        sumAssured: Number(caseEntity.sumAssured) || 0,
        status: caseEntity.status,
        productType: caseEntity.productType,
      },
      applicant: {
        ...applicant,
        age,
        bmi,
      },
      medicalDisclosures: disclosures,
      riskFactors,
      testResults,
    };

    // Use rule engine's context enrichment for computed fields
    return this.ruleEngine.enrichContextWithComputedFields(context);
  }

  /**
   * Evaluate severity rules and return the appropriate severity and weight
   */
  private evaluateSeverityRules(
    severityRules: any[],
    context: Record<string, any>
  ): { severity: string; complexityWeight: number } {
    // Sort rules by specificity (ones with conditions first)
    const sortedRules = [...severityRules].sort((a, b) => {
      if (a.condition && !b.condition) return -1;
      if (!a.condition && b.condition) return 1;
      return 0;
    });

    for (const rule of sortedRules) {
      if (rule.condition) {
        const result = this.ruleEngine.evaluateCondition(rule.condition, context);
        if (result.matched) {
          return {
            severity: rule.severity,
            complexityWeight: rule.complexityWeight,
          };
        }
      } else if (rule.defaultSeverity) {
        // Default rule (no condition)
        return {
          severity: rule.defaultSeverity,
          complexityWeight: rule.defaultComplexityWeight || 0.2,
        };
      }
    }

    // Fallback
    return { severity: 'MODERATE', complexityWeight: 0.2 };
  }

  private calculateAge(dateOfBirth: Date | string | null): number {
    if (!dateOfBirth) return 35;
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private calculateBMI(heightCm: number | null, weightKg: number | null): number {
    if (!heightCm || !weightKg) return 24;
    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  }
}
