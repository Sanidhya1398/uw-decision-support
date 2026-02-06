import { Injectable } from '@nestjs/common';

/**
 * Enhanced NLG Assembly Service
 *
 * Generates natural, case-specific language that reads like an actual
 * underwriter wrote it. Uses actual case values, medical data, and
 * contextual reasoning.
 *
 * Key Improvements over basic NLG:
 * - Includes actual lab values (HbA1c, BP, cholesterol, etc.)
 * - References diagnosis duration and treatment history
 * - Explains specific rationale for each decision
 * - Uses natural transitions and professional tone
 * - Considers sum assured and age in risk context
 */

// ============================================
// TYPES
// ============================================

export interface CaseContext {
  applicantName: string;
  applicantAge: number;
  applicantGender: 'male' | 'female' | 'other';
  caseReference: string;
  productName: string;
  productType: 'term_life' | 'whole_life' | 'health' | 'critical_illness';
  sumAssured: number;
  occupation?: string;
  isSmoker?: boolean;
  bmi?: number;
}

export interface MedicalCondition {
  name: string;
  icdCode?: string;
  diagnosisDate?: string;
  yearsWithCondition?: number;
  currentMedications?: string[];
  controlStatus: 'well_controlled' | 'moderately_controlled' | 'poorly_controlled' | 'unknown';
  severity: 'mild' | 'moderate' | 'severe';
  latestValues?: Record<string, { value: number | string; unit: string; status: 'normal' | 'elevated' | 'low' }>;
  treatmentCompliance?: 'good' | 'fair' | 'poor';
  complications?: string[];
}

export interface RiskFactorDetail {
  factor: string;
  severity: 'low' | 'moderate' | 'high';
  direction: 'increases_risk' | 'decreases_risk';
  rationale: string;
  mitigatingFactors?: string[];
}

export interface ModificationDetail {
  type: 'exclusion' | 'premium_loading' | 'waiting_period' | 'benefit_limit' | 'sum_assured_limit';
  subType?: string; // e.g., 'cardiac', 'diabetes', 'respiratory'
  value?: string | number; // e.g., "25%" for loading, "24 months" for waiting period
  duration?: string;
  reviewable: boolean;
  appliesTo?: string[]; // which conditions this relates to
  rationale: string;
}

export interface TestRequirementDetail {
  testCode: string;
  testName: string;
  rationale: string;
  urgency: 'routine' | 'priority' | 'urgent';
  relatedConditions?: string[];
  expectedValues?: string; // what we're looking for
}

export interface EnhancedAssemblyInput {
  communicationType: 'standard_acceptance' | 'modified_acceptance' | 'requirements_letter' | 'decline_notice' | 'postponement_notice';
  caseContext: CaseContext;
  conditions: MedicalCondition[];
  riskFactors: RiskFactorDetail[];
  modifications?: ModificationDetail[];
  testRequirements?: TestRequirementDetail[];
  positiveFactors?: string[];
  decisionRationale: string;
  postponementPeriod?: string;
  declineReasons?: string[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Crore`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakh`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDuration(years: number): string {
  if (years < 1) return 'less than a year';
  if (years === 1) return 'one year';
  if (years < 2) return 'about a year';
  return `${years} years`;
}

function getGenderPronoun(gender: string): { subject: string; object: string; possessive: string } {
  if (gender === 'male') return { subject: 'he', object: 'him', possessive: 'his' };
  if (gender === 'female') return { subject: 'she', object: 'her', possessive: 'her' };
  return { subject: 'they', object: 'them', possessive: 'their' };
}

function formatConditionList(conditions: string[]): string {
  if (conditions.length === 0) return '';
  if (conditions.length === 1) return conditions[0];
  if (conditions.length === 2) return `${conditions[0]} and ${conditions[1]}`;
  return conditions.slice(0, -1).join(', ') + ', and ' + conditions[conditions.length - 1];
}

function getSumAssuredRiskContext(sumAssured: number, age: number): string {
  const isHighSumAssured = sumAssured >= 10000000; // 1 crore+
  const isOlderApplicant = age >= 50;

  if (isHighSumAssured && isOlderApplicant) {
    return 'Given the significant sum assured requested and your age, our assessment reflects a comprehensive evaluation of all risk factors.';
  } else if (isHighSumAssured) {
    return 'The substantial sum assured requested warrants a thorough evaluation of your health profile.';
  } else if (isOlderApplicant) {
    return 'As is standard for applicants in your age bracket, we have conducted a careful review of your health status.';
  }
  return '';
}

// ============================================
// CONDITION-SPECIFIC PHRASE GENERATORS
// ============================================

const CONDITION_GENERATORS: Record<string, (condition: MedicalCondition, context: CaseContext) => string> = {
  'diabetes': (condition, context) => {
    const parts: string[] = [];
    const yearsText = condition.yearsWithCondition ? formatDuration(condition.yearsWithCondition) : 'some time';

    parts.push(`You have been managing ${condition.name} for ${yearsText}.`);

    // Add medication context
    if (condition.currentMedications && condition.currentMedications.length > 0) {
      const meds = formatConditionList(condition.currentMedications);
      parts.push(`Your current treatment regimen includes ${meds}.`);
    }

    // Add lab value context
    if (condition.latestValues?.['HbA1c']) {
      const hba1c = condition.latestValues['HbA1c'];
      if (hba1c.status === 'elevated') {
        parts.push(`Your recent HbA1c of ${hba1c.value}${hba1c.unit} indicates there is room for improved glycemic control. An HbA1c below 7% is generally considered good control for insurance purposes.`);
      } else if (hba1c.status === 'normal') {
        parts.push(`Your HbA1c of ${hba1c.value}${hba1c.unit} demonstrates good glycemic control, which we view favourably.`);
      }
    }

    // Control status assessment
    if (condition.controlStatus === 'well_controlled') {
      parts.push('Overall, your diabetes appears well-managed, which has been considered positively in our assessment.');
    } else if (condition.controlStatus === 'poorly_controlled') {
      parts.push('The current level of diabetic control has been factored into our risk assessment and influences the terms we can offer.');
    }

    // Complications
    if (condition.complications && condition.complications.length > 0) {
      parts.push(`We have also noted the presence of ${formatConditionList(condition.complications)}, which has been considered in our evaluation.`);
    }

    return parts.join(' ');
  },

  'hypertension': (condition, context) => {
    const parts: string[] = [];

    parts.push(`Your disclosed history of hypertension has been reviewed.`);

    // Blood pressure values
    if (condition.latestValues?.['systolic'] && condition.latestValues?.['diastolic']) {
      const systolic = condition.latestValues['systolic'];
      const diastolic = condition.latestValues['diastolic'];
      const bp = `${systolic.value}/${diastolic.value} mmHg`;

      if (systolic.status === 'elevated' || diastolic.status === 'elevated') {
        parts.push(`Your recent blood pressure reading of ${bp} indicates that tighter control may be beneficial. Blood pressure below 130/80 mmHg is generally considered optimal.`);
      } else {
        parts.push(`Your blood pressure of ${bp} is within acceptable limits, which has been noted favourably.`);
      }
    }

    // Medication
    if (condition.currentMedications && condition.currentMedications.length > 0) {
      parts.push(`You are currently on ${formatConditionList(condition.currentMedications)} for blood pressure management.`);
    }

    // Duration and control
    if (condition.yearsWithCondition && condition.yearsWithCondition >= 5) {
      parts.push(`Given that you have been managing hypertension for ${formatDuration(condition.yearsWithCondition)}, we have looked at your track record of control and any end-organ effects.`);
    }

    return parts.join(' ');
  },

  'cardiac': (condition, context) => {
    const parts: string[] = [];

    parts.push(`Your cardiac history, including ${condition.name}, has been carefully evaluated.`);

    // Time since event
    if (condition.yearsWithCondition !== undefined) {
      if (condition.yearsWithCondition < 1) {
        parts.push('As this is a relatively recent cardiac event, we need to see a period of stability before we can offer standard terms.');
      } else if (condition.yearsWithCondition >= 2) {
        parts.push(`It has been ${formatDuration(condition.yearsWithCondition)} since your cardiac event, and this time interval has been considered in our assessment.`);
      }
    }

    // Ejection fraction
    if (condition.latestValues?.['ejectionFraction']) {
      const ef = condition.latestValues['ejectionFraction'];
      const efValue = Number(ef.value);
      if (efValue >= 50) {
        parts.push(`Your ejection fraction of ${ef.value}% indicates preserved cardiac function, which is encouraging.`);
      } else if (efValue >= 40) {
        parts.push(`Your ejection fraction of ${ef.value}% shows mildly reduced cardiac function, which has been factored into our terms.`);
      } else {
        parts.push(`Your ejection fraction of ${ef.value}% indicates significantly reduced cardiac function, which impacts the terms we can offer.`);
      }
    }

    // Current medications
    if (condition.currentMedications && condition.currentMedications.length > 0) {
      parts.push(`Your cardiac medications (${formatConditionList(condition.currentMedications)}) indicate appropriate ongoing management.`);
    }

    return parts.join(' ');
  },

  'respiratory': (condition, context) => {
    const parts: string[] = [];

    parts.push(`Your respiratory condition (${condition.name}) has been assessed.`);

    if (condition.severity === 'mild') {
      parts.push('The condition appears to be mild and well-controlled, which has been viewed favourably.');
    } else if (condition.severity === 'moderate') {
      parts.push('Given the moderate severity, we have considered your symptom frequency and medication requirements.');
    } else {
      parts.push('The severity of your respiratory condition has been a significant factor in our assessment.');
    }

    if (condition.currentMedications && condition.currentMedications.length > 0) {
      const hasController = condition.currentMedications.some(m =>
        m.toLowerCase().includes('inhaler') || m.toLowerCase().includes('steroid')
      );
      if (hasController) {
        parts.push('Your use of controller medications suggests the condition requires regular management.');
      }
    }

    return parts.join(' ');
  },

  'lipid': (condition, context) => {
    const parts: string[] = [];

    parts.push('Your lipid profile has been reviewed as part of our cardiovascular risk assessment.');

    if (condition.latestValues) {
      const values: string[] = [];

      if (condition.latestValues['totalCholesterol']?.status === 'elevated') {
        values.push(`total cholesterol of ${condition.latestValues['totalCholesterol'].value} mg/dL`);
      }
      if (condition.latestValues['LDL']?.status === 'elevated') {
        values.push(`LDL of ${condition.latestValues['LDL'].value} mg/dL`);
      }
      if (condition.latestValues['triglycerides']?.status === 'elevated') {
        values.push(`triglycerides of ${condition.latestValues['triglycerides'].value} mg/dL`);
      }

      if (values.length > 0) {
        parts.push(`Your elevated levels (${formatConditionList(values)}) indicate increased cardiovascular risk.`);
      }

      if (condition.latestValues['HDL']?.status === 'low') {
        parts.push(`Your HDL of ${condition.latestValues['HDL'].value} mg/dL is below optimal levels, which is a risk factor we've considered.`);
      }
    }

    if (condition.currentMedications?.some(m => m.toLowerCase().includes('statin'))) {
      parts.push('We note you are on statin therapy, and we have considered the response to treatment.');
    }

    return parts.join(' ');
  },

  'thyroid': (condition, context) => {
    const parts: string[] = [];

    const conditionType = condition.name.toLowerCase().includes('hypo') ? 'hypothyroidism' :
                         condition.name.toLowerCase().includes('hyper') ? 'hyperthyroidism' : 'thyroid condition';

    parts.push(`Your ${conditionType} has been noted.`);

    if (condition.latestValues?.['TSH']) {
      const tsh = condition.latestValues['TSH'];
      if (tsh.status === 'normal') {
        parts.push(`Your TSH of ${tsh.value} ${tsh.unit} indicates good control on current therapy. Well-controlled thyroid conditions are generally viewed favourably.`);
      } else {
        parts.push(`Your TSH of ${tsh.value} ${tsh.unit} suggests the condition may benefit from medication adjustment. We recommend discussing this with your physician.`);
      }
    }

    return parts.join(' ');
  },

  'liver': (condition, context) => {
    const parts: string[] = [];

    parts.push(`Your liver health has been assessed based on the disclosed information.`);

    if (condition.latestValues?.['SGPT'] || condition.latestValues?.['SGOT']) {
      const sgpt = condition.latestValues['SGPT'];
      const sgot = condition.latestValues['SGOT'];

      if (sgpt?.status === 'elevated' || sgot?.status === 'elevated') {
        parts.push(`Your liver enzymes show some elevation (SGPT: ${sgpt?.value || 'N/A'}, SGOT: ${sgot?.value || 'N/A'} U/L), which warrants consideration.`);
      }
    }

    if (condition.name.toLowerCase().includes('fatty liver')) {
      parts.push('Fatty liver disease has become increasingly common and, when mild, is generally manageable with lifestyle modifications.');
    }

    return parts.join(' ');
  },

  'renal': (condition, context) => {
    const parts: string[] = [];

    parts.push('Your kidney function has been evaluated.');

    if (condition.latestValues?.['creatinine']) {
      const creat = condition.latestValues['creatinine'];
      parts.push(`Your serum creatinine of ${creat.value} ${creat.unit} ${creat.status === 'elevated' ? 'is elevated, indicating some degree of kidney impairment' : 'is within acceptable limits'}.`);
    }

    if (condition.latestValues?.['eGFR']) {
      const egfr = condition.latestValues['eGFR'];
      if (Number(egfr.value) >= 90) {
        parts.push('Your kidney function is normal based on eGFR.');
      } else if (Number(egfr.value) >= 60) {
        parts.push(`Your eGFR of ${egfr.value} indicates mildly reduced kidney function.`);
      } else {
        parts.push(`Your eGFR of ${egfr.value} indicates moderately reduced kidney function, which is a significant factor in our assessment.`);
      }
    }

    return parts.join(' ');
  },
};

// Map common condition names to categories
function getConditionCategory(conditionName: string): string {
  const name = conditionName.toLowerCase();

  if (name.includes('diabetes') || name.includes('dm') || name.includes('glyc')) return 'diabetes';
  if (name.includes('hypertension') || name.includes('blood pressure') || name.includes('bp')) return 'hypertension';
  if (name.includes('cardiac') || name.includes('heart') || name.includes('coronary') || name.includes('mi') || name.includes('angina') || name.includes('stemi')) return 'cardiac';
  if (name.includes('asthma') || name.includes('copd') || name.includes('respiratory') || name.includes('lung')) return 'respiratory';
  if (name.includes('cholesterol') || name.includes('lipid') || name.includes('hyperlipid') || name.includes('dyslipid')) return 'lipid';
  if (name.includes('thyroid') || name.includes('tsh')) return 'thyroid';
  if (name.includes('liver') || name.includes('hepat') || name.includes('sgpt') || name.includes('sgot')) return 'liver';
  if (name.includes('kidney') || name.includes('renal') || name.includes('creatinine')) return 'renal';

  return 'generic';
}

// ============================================
// MAIN SERVICE
// ============================================

@Injectable()
export class EnhancedNlgService {
  private readonly assemblyVersion = '2.0.0';

  assembleEnhancedCommunication(input: EnhancedAssemblyInput): {
    subject: string;
    sections: {
      id: string;
      type: 'salutation' | 'body' | 'compliance' | 'closing' | 'signature';
      content: string;
      isLocked: boolean;
      isEditable: boolean;
    }[];
    metadata: {
      assemblyVersion: string;
      generatedAt: string;
      conditionsProcessed: string[];
      personalizedElements: number;
    };
  } {
    const { communicationType, caseContext, conditions, modifications, testRequirements, positiveFactors, decisionRationale, declineReasons, postponementPeriod } = input;

    const sections: any[] = [];
    let personalizedElements = 0;

    // 1. Salutation
    sections.push({
      id: 'section_salutation',
      type: 'salutation',
      content: `Dear ${caseContext.applicantName},`,
      isLocked: false,
      isEditable: true,
    });

    // 2. Opening paragraph - context-aware
    const opening = this.buildPersonalizedOpening(communicationType, caseContext, conditions);
    sections.push({
      id: 'section_opening',
      type: 'body',
      content: opening,
      isLocked: false,
      isEditable: true,
    });
    personalizedElements++;

    // 3. Positive factors (if any) - builds rapport
    if (positiveFactors && positiveFactors.length > 0) {
      const positivePara = this.buildPositiveFactorsParagraph(positiveFactors, caseContext);
      sections.push({
        id: 'section_positives',
        type: 'body',
        content: positivePara,
        isLocked: false,
        isEditable: true,
      });
    }

    // 4. Medical assessment - condition by condition with actual values
    if (conditions.length > 0) {
      const medicalPara = this.buildDetailedMedicalAssessment(conditions, caseContext);
      sections.push({
        id: 'section_medical',
        type: 'body',
        content: medicalPara,
        isLocked: false,
        isEditable: true,
      });
      personalizedElements += conditions.length;
    }

    // 5. Type-specific content
    switch (communicationType) {
      case 'modified_acceptance':
        if (modifications && modifications.length > 0) {
          const modPara = this.buildDetailedModificationsParagraph(modifications, conditions, caseContext);
          sections.push({
            id: 'section_modifications',
            type: 'body',
            content: modPara,
            isLocked: false,
            isEditable: true,
          });
          personalizedElements += modifications.length;
        }
        break;

      case 'requirements_letter':
        if (testRequirements && testRequirements.length > 0) {
          const testPara = this.buildDetailedTestRequirements(testRequirements, conditions, caseContext);
          sections.push({
            id: 'section_requirements',
            type: 'body',
            content: testPara,
            isLocked: false,
            isEditable: true,
          });
          personalizedElements += testRequirements.length;
        }
        break;

      case 'decline_notice':
        const declinePara = this.buildDeclineExplanation(declineReasons || [], conditions, caseContext);
        sections.push({
          id: 'section_decline',
          type: 'body',
          content: declinePara,
          isLocked: false,
          isEditable: true,
        });
        break;

      case 'postponement_notice':
        const postponePara = this.buildPostponementExplanation(postponementPeriod || '12 months', conditions, caseContext);
        sections.push({
          id: 'section_postponement',
          type: 'body',
          content: postponePara,
          isLocked: false,
          isEditable: true,
        });
        break;
    }

    // 6. Decision summary
    const summaryPara = this.buildPersonalizedSummary(communicationType, caseContext, decisionRationale);
    sections.push({
      id: 'section_summary',
      type: 'body',
      content: summaryPara,
      isLocked: false,
      isEditable: true,
    });

    // 7. Closing - friendly and professional
    const closing = this.buildContextualClosing(communicationType, caseContext);
    sections.push({
      id: 'section_closing',
      type: 'closing',
      content: closing,
      isLocked: false,
      isEditable: true,
    });

    // 8. Compliance text (LOCKED)
    sections.push({
      id: 'section_compliance',
      type: 'compliance',
      content: this.getComplianceText(communicationType),
      isLocked: true,
      isEditable: false,
    });

    // 9. Signature
    sections.push({
      id: 'section_signature',
      type: 'signature',
      content: 'Yours sincerely,\n\nUnderwriting Department\nLife Insurance Division',
      isLocked: true,
      isEditable: false,
    });

    return {
      subject: this.buildSubject(communicationType, caseContext),
      sections,
      metadata: {
        assemblyVersion: this.assemblyVersion,
        generatedAt: new Date().toISOString(),
        conditionsProcessed: conditions.map(c => c.name),
        personalizedElements,
      },
    };
  }

  private buildSubject(communicationType: string, context: CaseContext): string {
    const typeLabels: Record<string, string> = {
      'standard_acceptance': 'Approved',
      'modified_acceptance': 'Approved with Modified Terms',
      'requirements_letter': 'Additional Information Required',
      'decline_notice': 'Application Decision',
      'postponement_notice': 'Postponement Recommendation',
    };

    return `Your ${context.productName} Application - ${typeLabels[communicationType] || 'Update'} [${context.caseReference}]`;
  }

  private buildPersonalizedOpening(
    communicationType: string,
    context: CaseContext,
    conditions: MedicalCondition[]
  ): string {
    const sumFormatted = formatCurrency(context.sumAssured);
    const conditionCount = conditions.length;

    const openings: Record<string, string> = {
      'standard_acceptance': `Thank you for your application for ${context.productName} with a sum assured of ${sumFormatted}. We have completed our assessment of your application${conditionCount > 0 ? ', including the medical information you provided' : ''}, and we are pleased to inform you that your application has been approved at standard rates.`,

      'modified_acceptance': `Thank you for your application for ${context.productName} with a sum assured of ${sumFormatted}. We have carefully reviewed your application and the disclosed medical information. While we are able to offer you coverage, our assessment indicates that some modifications to the standard terms are appropriate. This letter explains our decision and the specific terms we can offer.`,

      'requirements_letter': `Thank you for your application for ${context.productName} with a sum assured of ${sumFormatted}. We have begun reviewing your application and appreciate the medical information you have provided so far. To complete our assessment and provide you with the best possible terms, we require some additional information as detailed below.`,

      'decline_notice': `Thank you for your application for ${context.productName} with a sum assured of ${sumFormatted}. We have completed a thorough review of your application and all supporting medical documentation. We understand this application is important to you, and we have given it careful consideration.`,

      'postponement_notice': `Thank you for your application for ${context.productName} with a sum assured of ${sumFormatted}. We have reviewed your application and the medical information provided. Rather than making a final decision at this time, we recommend postponing the assessment to allow for a period of demonstrated stability.`,
    };

    let opening = openings[communicationType] || openings['standard_acceptance'];

    // Add sum assured context if high value
    const sumContext = getSumAssuredRiskContext(context.sumAssured, context.applicantAge);
    if (sumContext && communicationType !== 'standard_acceptance') {
      opening += ' ' + sumContext;
    }

    return opening;
  }

  private buildPositiveFactorsParagraph(factors: string[], context: CaseContext): string {
    const parts: string[] = [];

    parts.push('Before discussing any areas requiring attention, we would like to highlight some positive aspects of your profile:');
    parts.push('');

    for (const factor of factors) {
      parts.push(`• ${factor}`);
    }

    parts.push('');
    parts.push('These positive factors have been weighed favourably in our overall assessment.');

    return parts.join('\n');
  }

  private buildDetailedMedicalAssessment(conditions: MedicalCondition[], context: CaseContext): string {
    const parts: string[] = [];

    if (conditions.length === 1) {
      parts.push('We have carefully assessed your medical history:');
    } else {
      parts.push(`We have carefully assessed your medical history, which includes ${conditions.length} conditions that are relevant to our underwriting decision:`);
    }
    parts.push('');

    for (const condition of conditions) {
      const category = getConditionCategory(condition.name);
      const generator = CONDITION_GENERATORS[category];

      if (generator) {
        const conditionText = generator(condition, context);
        parts.push(`**${condition.name}**`);
        parts.push(conditionText);
        parts.push('');
      } else {
        // Generic but still personalized
        parts.push(`**${condition.name}**`);
        let genericText = `Your disclosed ${condition.name} has been evaluated. `;

        if (condition.yearsWithCondition) {
          genericText += `You have been managing this condition for ${formatDuration(condition.yearsWithCondition)}. `;
        }

        if (condition.currentMedications && condition.currentMedications.length > 0) {
          genericText += `Your current treatment includes ${formatConditionList(condition.currentMedications)}. `;
        }

        if (condition.controlStatus === 'well_controlled') {
          genericText += 'The condition appears to be well-controlled, which has been noted favourably.';
        } else if (condition.controlStatus === 'poorly_controlled') {
          genericText += 'The current control of this condition has been considered in our risk assessment.';
        }

        parts.push(genericText);
        parts.push('');
      }
    }

    return parts.join('\n');
  }

  private buildDetailedModificationsParagraph(
    modifications: ModificationDetail[],
    conditions: MedicalCondition[],
    context: CaseContext
  ): string {
    const parts: string[] = [];

    parts.push('Based on our assessment, we are pleased to offer you coverage with the following terms. We have explained the reason for each modification so you understand how we arrived at these terms:');
    parts.push('');

    for (let i = 0; i < modifications.length; i++) {
      const mod = modifications[i];

      parts.push(`**${i + 1}. ${this.formatModificationType(mod)}**`);

      // What
      parts.push(`What this means: ${this.getModificationDescription(mod)}`);

      // Why - personalized based on related conditions
      parts.push(`Why this applies: ${mod.rationale}`);

      // Link to specific conditions if applicable
      if (mod.appliesTo && mod.appliesTo.length > 0) {
        const relatedConditions = conditions.filter(c =>
          mod.appliesTo!.some(a => c.name.toLowerCase().includes(a.toLowerCase()))
        );
        if (relatedConditions.length > 0) {
          const conditionNames = relatedConditions.map(c => c.name);
          parts.push(`This relates to: ${formatConditionList(conditionNames)}`);
        }
      }

      // Duration and review
      if (mod.duration) {
        parts.push(`Duration: ${mod.duration}`);
      }

      if (mod.reviewable) {
        parts.push('Review: This modification may be reviewed after the specified period, subject to evidence of continued stability.');
      }

      parts.push('');
    }

    parts.push('We believe these terms represent a fair balance between providing you with meaningful coverage and appropriately managing the identified risk factors.');

    return parts.join('\n');
  }

  private buildDetailedTestRequirements(
    requirements: TestRequirementDetail[],
    conditions: MedicalCondition[],
    context: CaseContext
  ): string {
    const parts: string[] = [];

    parts.push('To complete our assessment and potentially offer you better terms, we require the following:');
    parts.push('');

    // Group by urgency
    const urgent = requirements.filter(r => r.urgency === 'urgent');
    const priority = requirements.filter(r => r.urgency === 'priority');
    const routine = requirements.filter(r => r.urgency === 'routine');

    let index = 1;

    if (urgent.length > 0) {
      parts.push('**Priority Requirements (needed urgently):**');
      for (const req of urgent) {
        parts.push(`${index}. **${req.testName}**`);
        parts.push(`   ${req.rationale}`);
        if (req.relatedConditions && req.relatedConditions.length > 0) {
          parts.push(`   (Related to your ${formatConditionList(req.relatedConditions)})`);
        }
        index++;
      }
      parts.push('');
    }

    if (priority.length > 0) {
      parts.push('**Important Requirements:**');
      for (const req of priority) {
        parts.push(`${index}. **${req.testName}**`);
        parts.push(`   ${req.rationale}`);
        if (req.relatedConditions && req.relatedConditions.length > 0) {
          parts.push(`   (Related to your ${formatConditionList(req.relatedConditions)})`);
        }
        index++;
      }
      parts.push('');
    }

    if (routine.length > 0) {
      parts.push('**Standard Requirements:**');
      for (const req of routine) {
        parts.push(`${index}. **${req.testName}**`);
        parts.push(`   ${req.rationale}`);
        index++;
      }
      parts.push('');
    }

    parts.push('Please arrange for these tests at an NABL-accredited diagnostic centre. Your agent can provide you with a list of empaneled centres in your area. Test reports should be submitted within 30 days. If you face any difficulty, please contact your agent for assistance.');

    return parts.join('\n');
  }

  private buildDeclineExplanation(
    reasons: string[],
    conditions: MedicalCondition[],
    context: CaseContext
  ): string {
    const parts: string[] = [];

    parts.push('After careful consideration, we regret that we are unable to offer coverage at this time. We understand this is not the outcome you were hoping for, and we want to explain our decision clearly.');
    parts.push('');

    parts.push('Our decision is based on the following factors:');
    parts.push('');

    for (const reason of reasons) {
      parts.push(`• ${reason}`);
    }

    parts.push('');

    // Add specific condition context
    const severeConditions = conditions.filter(c => c.severity === 'severe');
    if (severeConditions.length > 0) {
      parts.push(`The severity of your ${formatConditionList(severeConditions.map(c => c.name))} is currently beyond our underwriting guidelines for this product.`);
      parts.push('');
    }

    parts.push('This decision does not reflect on you personally. Our underwriting guidelines are designed to ensure we can meet our commitments to all policyholders. We encourage you to:');
    parts.push('• Explore other insurance options that may be available');
    parts.push('• Consider reapplying in the future if your health circumstances change');
    parts.push('• Contact your agent to discuss alternative products that may suit your needs');

    return parts.join('\n');
  }

  private buildPostponementExplanation(
    period: string,
    conditions: MedicalCondition[],
    context: CaseContext
  ): string {
    const parts: string[] = [];

    parts.push('Rather than declining your application or offering terms that may not be optimal, we recommend postponing the decision for the following reasons:');
    parts.push('');

    // Explain based on conditions
    const recentConditions = conditions.filter(c => c.yearsWithCondition !== undefined && c.yearsWithCondition < 2);
    const unstableConditions = conditions.filter(c => c.controlStatus === 'poorly_controlled' || c.controlStatus === 'moderately_controlled');

    if (recentConditions.length > 0) {
      parts.push(`• Your ${formatConditionList(recentConditions.map(c => c.name))} was diagnosed relatively recently. A period of demonstrated stability will allow us to offer better terms.`);
    }

    if (unstableConditions.length > 0) {
      parts.push(`• Your ${formatConditionList(unstableConditions.map(c => c.name))} would benefit from improved control before we finalize terms.`);
    }

    parts.push('');
    parts.push(`**Recommended postponement period: ${period}**`);
    parts.push('');
    parts.push('This is not a decline. We encourage you to:');
    parts.push('1. Continue working with your healthcare providers to optimize your health');
    parts.push('2. Maintain regular monitoring and treatment compliance');
    parts.push('3. Reapply after the recommended period with updated medical reports');
    parts.push('');
    parts.push('When you reapply, please provide current medical reports showing your progress. Evidence of stable health will support a favourable assessment.');

    return parts.join('\n');
  }

  private buildPersonalizedSummary(
    communicationType: string,
    context: CaseContext,
    rationale: string
  ): string {
    const summaries: Record<string, string> = {
      'standard_acceptance': `In summary, ${context.applicantName}, we are pleased to welcome you. Your ${context.productName} policy with a sum assured of ${formatCurrency(context.sumAssured)} will be issued upon receipt of the first premium payment. ${rationale || ''}`,

      'modified_acceptance': `In summary, while some modifications are necessary based on your health profile, we are pleased to offer you coverage. The terms outlined above have been structured to provide you with meaningful protection while appropriately addressing the identified risk factors. ${rationale || 'We believe this represents a fair offer.'} If you wish to proceed, please sign and return the enclosed acceptance form.`,

      'requirements_letter': `In summary, we need the above information to complete your assessment. Once received, we will process your application promptly. Depending on the results, we may be able to offer you standard terms or terms with modifications. ${rationale || ''} Your application will remain active for 30 days pending receipt of this information.`,

      'decline_notice': `In summary, while we cannot offer coverage at this time, we genuinely appreciate your interest in our products. ${rationale || ''} Any premium you may have paid will be refunded in full within 15 working days.`,

      'postponement_notice': `In summary, we recommend waiting before finalizing your application. This approach gives you the best chance of obtaining favourable terms. ${rationale || ''} We look forward to reviewing your application again after the recommended period.`,
    };

    return summaries[communicationType] || rationale;
  }

  private buildContextualClosing(communicationType: string, context: CaseContext): string {
    const closings: Record<string, string> = {
      'standard_acceptance': `Thank you for choosing us for your insurance needs. Should you have any questions about your policy, please do not hesitate to contact your agent or our customer service team at 1800-XXX-XXXX. We look forward to serving you.`,

      'modified_acceptance': `We understand you may have questions about these terms. Your agent is available to discuss this offer in detail and help you make an informed decision. You may also contact our underwriting helpdesk at 1800-XXX-XXXX for clarification.`,

      'requirements_letter': `If you have any questions about these requirements or need assistance arranging the tests, please contact your agent. We are committed to processing your application as quickly as possible once we receive the requested information.`,

      'decline_notice': `We understand this decision may be disappointing. If you would like to discuss this decision or explore alternative options, please contact your agent or write to our underwriting department. You have the right to request a detailed written explanation of this decision.`,

      'postponement_notice': `We encourage you to stay in touch with your agent during the postponement period. When you are ready to reapply, your agent can guide you on the documentation needed to support your fresh application.`,
    };

    return closings[communicationType] || 'Thank you for your application. Please contact your agent if you have any questions.';
  }

  private getComplianceText(communicationType: string): string {
    const base = 'IMPORTANT NOTICE: This communication is based on the information provided in your application and supporting documents. Any material misrepresentation or non-disclosure of relevant information may affect the validity of your policy and any claims made thereunder. This decision is subject to IRDAI guidelines and our underwriting policy. ';

    const typeSpecific: Record<string, string> = {
      'standard_acceptance': 'Please review all policy documents carefully upon receipt. The policy is subject to all terms, conditions, and exclusions stated in the policy document. Free-look period of 15 days applies from the date of policy receipt.',

      'modified_acceptance': 'You have the right to accept or decline this offer within 30 days. If you choose not to accept these modified terms, any premium paid will be refunded in full. You also have the right to request a review of this decision by writing to our Grievance Redressal Officer.',

      'requirements_letter': 'Your application will remain on hold pending receipt of the requested information. Failure to provide this information within 30 days may result in your application being closed. You may request an extension in writing if needed.',

      'decline_notice': 'Under IRDAI regulations, you have the right to request specific reasons for this decision in writing. You may also request a review by our Grievance Redressal Officer within 30 days of this notice. Contact details are provided below.',

      'postponement_notice': 'This postponement does not constitute a decline and does not affect your right to apply again. A fresh application after the recommended period will be assessed independently based on the information available at that time.',
    };

    return base + (typeSpecific[communicationType] || '');
  }

  private formatModificationType(mod: ModificationDetail): string {
    const labels: Record<string, string> = {
      'exclusion': mod.subType ? `${mod.subType.charAt(0).toUpperCase() + mod.subType.slice(1)} Condition Exclusion` : 'Condition Exclusion',
      'premium_loading': `Premium Loading (${mod.value || 'applicable'})`,
      'waiting_period': `Waiting Period (${mod.value || 'applicable'})`,
      'benefit_limit': 'Benefit Limitation',
      'sum_assured_limit': 'Sum Assured Restriction',
    };

    return labels[mod.type] || mod.type;
  }

  private getModificationDescription(mod: ModificationDetail): string {
    const descriptions: Record<string, string> = {
      'exclusion': `Claims arising from or related to ${mod.subType || 'specified'} conditions will not be covered${mod.duration ? ` for ${mod.duration}` : ''}.`,
      'premium_loading': `An additional ${mod.value || ''} will be added to the standard premium to reflect the elevated risk profile.`,
      'waiting_period': `Full coverage will take effect after a waiting period of ${mod.value || mod.duration || 'the specified period'}.`,
      'benefit_limit': `Certain benefits will be subject to limits as specified in the policy schedule.`,
      'sum_assured_limit': `The maximum sum assured available is limited to ${mod.value ? formatCurrency(Number(mod.value)) : 'the specified amount'}.`,
    };

    return descriptions[mod.type] || mod.rationale;
  }
}
