import { Injectable } from '@nestjs/common';
import { ComplexityTier } from '../../entities/case.entity';
import { YieldCategory } from '../../entities/test-recommendation.entity';

interface ComplexityResult {
  tier: ComplexityTier;
  confidence: number;
  factors: { factor: string; weight: number; direction: string }[];
}

interface YieldResult {
  probability: number;
  category: YieldCategory;
  factors: { factor: string; weight: number }[];
}

/**
 * ML Service providing REAL predictions for:
 * 1. Case Complexity Classification
 * 2. Test Yield Prediction
 *
 * Uses a deterministic, bounded, explainable model implementation.
 * Models are based on weighted feature scoring that simulates
 * gradient boosted tree behavior while remaining fully interpretable.
 */
@Injectable()
export class MlService {
  // Feature weights for complexity classification
  // Derived from underwriting domain knowledge
  private readonly complexityWeights = {
    // Age factors
    age_under_30: -0.15,
    age_30_45: 0.0,
    age_45_55: 0.20,
    age_55_65: 0.35,
    age_over_65: 0.50,

    // Sum assured factors
    sum_low: -0.10,       // < 25L
    sum_medium: 0.0,      // 25L - 75L
    sum_high: 0.25,       // 75L - 1Cr
    sum_very_high: 0.45,  // > 1Cr

    // Condition factors
    condition_diabetes: 0.35,
    condition_hypertension: 0.25,
    condition_cardiac: 0.50,
    condition_renal: 0.45,
    condition_cancer: 0.60,
    condition_respiratory: 0.30,
    condition_neurological: 0.40,
    condition_mental_health: 0.35,

    // Lifestyle factors
    smoker_current: 0.30,
    smoker_former: 0.10,
    alcohol_heavy: 0.25,
    alcohol_regular: 0.10,
    hazardous_activity: 0.20,

    // BMI factors
    bmi_underweight: 0.15,
    bmi_normal: 0.0,
    bmi_overweight: 0.10,
    bmi_obese: 0.25,
    bmi_severely_obese: 0.40,

    // Multiple conditions multiplier
    multiple_conditions_2: 0.20,
    multiple_conditions_3_plus: 0.35,

    // Family history
    family_cardiac: 0.15,
    family_diabetes: 0.10,
    family_cancer: 0.20,
  };

  // Thresholds for complexity tiers
  private readonly complexityThresholds = {
    routine: 0.30,    // Score < 0.30 = Routine
    moderate: 0.60,   // Score 0.30 - 0.60 = Moderate
    // Score > 0.60 = Complex
  };

  // Test yield weights (per test type)
  private readonly testYieldWeights: Record<string, Record<string, number>> = {
    // HbA1c yield factors
    'hba1c': {
      has_diabetes: 0.85,
      has_prediabetes: 0.70,
      family_diabetes: 0.45,
      bmi_obese: 0.55,
      age_over_45: 0.40,
      base: 0.20,
    },
    // Lipid panel yield factors
    'lipid': {
      has_cardiac: 0.80,
      has_hypertension: 0.65,
      has_diabetes: 0.60,
      smoker: 0.55,
      bmi_overweight: 0.50,
      family_cardiac: 0.45,
      age_over_40: 0.35,
      base: 0.25,
    },
    // Liver function test yield factors
    'lft': {
      has_hepatic: 0.85,
      alcohol_heavy: 0.75,
      on_hepatotoxic_meds: 0.70,
      has_diabetes: 0.45,
      bmi_obese: 0.50,
      base: 0.15,
    },
    // Renal function test yield factors
    'rft': {
      has_renal: 0.90,
      has_diabetes: 0.65,
      has_hypertension: 0.55,
      age_over_55: 0.45,
      on_nephrotoxic_meds: 0.60,
      base: 0.20,
    },
    // ECG yield factors
    'ecg': {
      has_cardiac: 0.90,
      has_hypertension: 0.60,
      chest_pain_history: 0.85,
      smoker: 0.45,
      age_over_50: 0.50,
      family_cardiac: 0.40,
      base: 0.25,
    },
    // Default for unknown tests
    'default': {
      base: 0.30,
    },
  };

  /**
   * Classify case complexity using weighted feature scoring.
   * This provides deterministic, explainable results.
   */
  async classifyComplexity(caseEntity: any): Promise<ComplexityResult> {
    const features = this.extractComplexityFeatures(caseEntity);
    const { score, contributingFactors } = this.calculateComplexityScore(features);

    // Determine tier based on score
    let tier: ComplexityTier;
    if (score < this.complexityThresholds.routine) {
      tier = ComplexityTier.ROUTINE;
    } else if (score < this.complexityThresholds.moderate) {
      tier = ComplexityTier.MODERATE;
    } else {
      tier = ComplexityTier.COMPLEX;
    }

    // Calculate confidence based on distance from thresholds
    const confidence = this.calculateConfidence(score, tier);

    // Sort factors by absolute weight
    const sortedFactors = contributingFactors
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
      .slice(0, 5); // Top 5 factors

    return {
      tier,
      confidence,
      factors: sortedFactors,
    };
  }

  private extractComplexityFeatures(caseEntity: any): Record<string, boolean> {
    const applicant = caseEntity.applicant;
    const disclosures = caseEntity.medicalDisclosures || [];
    const riskFactors = caseEntity.riskFactors || [];

    // Calculate age
    const age = applicant?.age || this.calculateAge(applicant?.dateOfBirth);

    // Calculate BMI
    const bmi = applicant?.bmi || this.calculateBMI(applicant?.heightCm, applicant?.weightKg);

    // Get sum assured in lakhs
    const sumAssuredLakhs = Number(caseEntity.sumAssured) / 100000;

    // Extract conditions from disclosures
    const conditions = disclosures
      .filter((d: any) => d.disclosureType === 'condition')
      .map((d: any) => d.conditionName?.toLowerCase() || '');

    const features: Record<string, boolean> = {
      // Age features
      age_under_30: age < 30,
      age_30_45: age >= 30 && age < 45,
      age_45_55: age >= 45 && age < 55,
      age_55_65: age >= 55 && age < 65,
      age_over_65: age >= 65,

      // Sum assured features
      sum_low: sumAssuredLakhs < 25,
      sum_medium: sumAssuredLakhs >= 25 && sumAssuredLakhs < 75,
      sum_high: sumAssuredLakhs >= 75 && sumAssuredLakhs < 100,
      sum_very_high: sumAssuredLakhs >= 100,

      // Condition features
      condition_diabetes: conditions.some((c: string) => c.includes('diabetes') || c.includes('dm')),
      condition_hypertension: conditions.some((c: string) => c.includes('hypertension') || c.includes('htn') || c.includes('blood pressure')),
      condition_cardiac: conditions.some((c: string) => c.includes('cardiac') || c.includes('heart') || c.includes('mi') || c.includes('angina') || c.includes('coronary')),
      condition_renal: conditions.some((c: string) => c.includes('kidney') || c.includes('renal') || c.includes('ckd')),
      condition_cancer: conditions.some((c: string) => c.includes('cancer') || c.includes('malignant') || c.includes('carcinoma')),
      condition_respiratory: conditions.some((c: string) => c.includes('asthma') || c.includes('copd') || c.includes('respiratory')),
      condition_neurological: conditions.some((c: string) => c.includes('stroke') || c.includes('epilepsy') || c.includes('neurological')),
      condition_mental_health: conditions.some((c: string) => c.includes('depression') || c.includes('anxiety') || c.includes('mental')),

      // Lifestyle features
      smoker_current: applicant?.smokingStatus === 'current',
      smoker_former: applicant?.smokingStatus === 'former',
      alcohol_heavy: applicant?.alcoholStatus === 'heavy',
      alcohol_regular: applicant?.alcoholStatus === 'regular',
      hazardous_activity: (applicant?.hazardousActivities || []).length > 0,

      // BMI features
      bmi_underweight: bmi < 18.5,
      bmi_normal: bmi >= 18.5 && bmi < 25,
      bmi_overweight: bmi >= 25 && bmi < 30,
      bmi_obese: bmi >= 30 && bmi < 35,
      bmi_severely_obese: bmi >= 35,

      // Multiple conditions
      multiple_conditions_2: conditions.length === 2,
      multiple_conditions_3_plus: conditions.length >= 3,

      // Family history
      family_cardiac: disclosures.some((d: any) => d.disclosureType === 'family_history' && (d.familyCondition?.toLowerCase().includes('cardiac') || d.familyCondition?.toLowerCase().includes('heart'))),
      family_diabetes: disclosures.some((d: any) => d.disclosureType === 'family_history' && d.familyCondition?.toLowerCase().includes('diabetes')),
      family_cancer: disclosures.some((d: any) => d.disclosureType === 'family_history' && d.familyCondition?.toLowerCase().includes('cancer')),
    };

    return features;
  }

  private calculateComplexityScore(features: Record<string, boolean>): {
    score: number;
    contributingFactors: { factor: string; weight: number; direction: string }[];
  } {
    let score = 0;
    const contributingFactors: { factor: string; weight: number; direction: string }[] = [];

    for (const [feature, present] of Object.entries(features)) {
      if (present && feature in this.complexityWeights) {
        const weight = this.complexityWeights[feature as keyof typeof this.complexityWeights];
        score += weight;

        if (weight !== 0) {
          contributingFactors.push({
            factor: this.formatFeatureName(feature),
            weight: Math.abs(weight),
            direction: weight > 0 ? 'increases_complexity' : 'decreases_complexity',
          });
        }
      }
    }

    // Normalize score to 0-1 range
    score = Math.max(0, Math.min(1, score));

    return { score, contributingFactors };
  }

  private calculateConfidence(score: number, tier: ComplexityTier): number {
    // Confidence is higher when score is further from thresholds
    let distanceFromThreshold: number;

    if (tier === ComplexityTier.ROUTINE) {
      distanceFromThreshold = this.complexityThresholds.routine - score;
    } else if (tier === ComplexityTier.MODERATE) {
      const distToLower = score - this.complexityThresholds.routine;
      const distToUpper = this.complexityThresholds.moderate - score;
      distanceFromThreshold = Math.min(distToLower, distToUpper);
    } else {
      distanceFromThreshold = score - this.complexityThresholds.moderate;
    }

    // Convert distance to confidence (0.5 to 0.95)
    const baseConfidence = 0.5;
    const maxBonus = 0.45;
    const confidence = baseConfidence + (distanceFromThreshold / 0.3) * maxBonus;

    return Math.min(0.95, Math.max(0.5, confidence));
  }

  /**
   * Predict test yield for a specific test on a case.
   */
  async predictTestYield(caseEntity: any, testCode: string): Promise<YieldResult> {
    const features = this.extractYieldFeatures(caseEntity);
    const testType = this.normalizeTestCode(testCode);
    const weights = this.testYieldWeights[testType] || this.testYieldWeights['default'];

    let probability = weights.base || 0.30;
    const contributingFactors: { factor: string; weight: number }[] = [];

    for (const [feature, weight] of Object.entries(weights)) {
      if (feature !== 'base' && features[feature]) {
        probability += weight * 0.5; // Scale contribution
        contributingFactors.push({
          factor: this.formatFeatureName(feature),
          weight,
        });
      }
    }

    // Normalize probability to 0-1
    probability = Math.min(0.95, Math.max(0.05, probability));

    // Determine category
    let category: YieldCategory;
    if (probability >= 0.65) {
      category = YieldCategory.HIGH;
    } else if (probability >= 0.40) {
      category = YieldCategory.MODERATE;
    } else {
      category = YieldCategory.LOW;
    }

    return {
      probability,
      category,
      factors: contributingFactors.sort((a, b) => b.weight - a.weight).slice(0, 3),
    };
  }

  private extractYieldFeatures(caseEntity: any): Record<string, boolean> {
    const applicant = caseEntity.applicant;
    const disclosures = caseEntity.medicalDisclosures || [];
    const medications = disclosures.filter((d: any) => d.disclosureType === 'medication');

    const age = applicant?.age || this.calculateAge(applicant?.dateOfBirth);
    const bmi = applicant?.bmi || this.calculateBMI(applicant?.heightCm, applicant?.weightKg);

    const conditions = disclosures
      .filter((d: any) => d.disclosureType === 'condition')
      .map((d: any) => d.conditionName?.toLowerCase() || '');

    const familyHistory = disclosures
      .filter((d: any) => d.disclosureType === 'family_history')
      .map((d: any) => d.familyCondition?.toLowerCase() || '');

    // Check for hepatotoxic medications
    const hepatotoxicMeds = ['methotrexate', 'amiodarone', 'acetaminophen', 'statins'];
    const nephrotoxicMeds = ['nsaids', 'ibuprofen', 'aminoglycosides', 'contrast'];

    return {
      // Conditions
      has_diabetes: conditions.some((c: string) => c.includes('diabetes')),
      has_prediabetes: conditions.some((c: string) => c.includes('prediabetes') || c.includes('impaired glucose')),
      has_cardiac: conditions.some((c: string) => c.includes('cardiac') || c.includes('heart') || c.includes('coronary')),
      has_hypertension: conditions.some((c: string) => c.includes('hypertension')),
      has_hepatic: conditions.some((c: string) => c.includes('liver') || c.includes('hepatic') || c.includes('hepatitis')),
      has_renal: conditions.some((c: string) => c.includes('kidney') || c.includes('renal')),
      chest_pain_history: conditions.some((c: string) => c.includes('chest pain') || c.includes('angina')),

      // Family history
      family_diabetes: familyHistory.some((f: string) => f.includes('diabetes')),
      family_cardiac: familyHistory.some((f: string) => f.includes('cardiac') || f.includes('heart')),

      // Age
      age_over_40: age >= 40,
      age_over_45: age >= 45,
      age_over_50: age >= 50,
      age_over_55: age >= 55,

      // BMI
      bmi_overweight: bmi >= 25,
      bmi_obese: bmi >= 30,

      // Lifestyle
      smoker: applicant?.smokingStatus === 'current' || applicant?.smokingStatus === 'former',
      alcohol_heavy: applicant?.alcoholStatus === 'heavy',

      // Medications
      on_hepatotoxic_meds: medications.some((m: any) =>
        hepatotoxicMeds.some(med => m.drugName?.toLowerCase().includes(med))
      ),
      on_nephrotoxic_meds: medications.some((m: any) =>
        nephrotoxicMeds.some(med => m.drugName?.toLowerCase().includes(med))
      ),
    };
  }

  private normalizeTestCode(testCode: string): string {
    const code = testCode.toLowerCase();
    if (code.includes('hba1c') || code.includes('glycated')) return 'hba1c';
    if (code.includes('lipid') || code.includes('cholesterol')) return 'lipid';
    if (code.includes('lft') || code.includes('liver')) return 'lft';
    if (code.includes('rft') || code.includes('renal') || code.includes('kidney')) return 'rft';
    if (code.includes('ecg') || code.includes('ekg')) return 'ecg';
    return 'default';
  }

  private formatFeatureName(feature: string): string {
    return feature
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  private calculateAge(dateOfBirth: Date | string | null): number {
    if (!dateOfBirth) return 35; // Default
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
    if (!heightCm || !weightKg) return 24; // Default normal BMI
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }
}
