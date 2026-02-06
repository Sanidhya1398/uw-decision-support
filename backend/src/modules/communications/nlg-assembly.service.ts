import { Injectable } from '@nestjs/common';

/**
 * Deterministic NLG Assembly Service
 *
 * Generates natural language communications from structured underwriting reasons
 * using approved phrase libraries and sentence assembly logic.
 *
 * Design Principles:
 * - Deterministic: Same input always produces same output
 * - Auditable: Every phrase traces to an approved library entry
 * - Editable: Output sections marked as editable for underwriter refinement
 * - No GenAI: Pure rule-based assembly from approved components
 */

// ============================================
// PHRASE LIBRARIES
// ============================================

interface PhraseEntry {
  id: string;
  text: string;
  category: string;
  context?: string[];
}

interface ReasonPhrase {
  whatPhrase: string;
  whyPhrase: string;
  connectorBefore?: string;
  connectorAfter?: string;
}

// Opening phrases by communication type
const OPENING_PHRASES: Record<string, PhraseEntry[]> = {
  standard_acceptance: [
    { id: 'OPEN_STD_01', text: 'After careful review of your application and supporting medical information, we are pleased to inform you that your application has been approved.', category: 'opening' },
  ],
  modified_acceptance: [
    { id: 'OPEN_MOD_01', text: 'We have completed our assessment of your application for life insurance coverage. Based on our review of the medical information provided, we are able to offer coverage with certain modifications.', category: 'opening' },
  ],
  requirements_letter: [
    { id: 'OPEN_REQ_01', text: 'Thank you for your application for life insurance coverage. To complete our underwriting assessment, we require additional information as detailed below.', category: 'opening' },
  ],
  decline_notice: [
    { id: 'OPEN_DEC_01', text: 'We have carefully reviewed your application for life insurance coverage along with all supporting documentation. After thorough consideration, we regret that we are unable to offer coverage at this time.', category: 'opening' },
  ],
  postponement_notice: [
    { id: 'OPEN_POST_01', text: 'We have reviewed your application for life insurance coverage. Based on the current medical information, we recommend postponing the final decision on your application.', category: 'opening' },
  ],
};

// Condition-specific phrase libraries
const CONDITION_PHRASES: Record<string, { assessment: string; implications: string; management: string }> = {
  'Type 2 Diabetes Mellitus': {
    assessment: 'Your disclosed history of Type 2 Diabetes has been evaluated',
    implications: 'Diabetes is a metabolic condition that requires ongoing monitoring to assess long-term health outcomes',
    management: 'The current glycemic control as reflected in your HbA1c levels has been considered',
  },
  'Hypertension': {
    assessment: 'Your disclosed history of hypertension has been reviewed',
    implications: 'Blood pressure management is an important factor in cardiovascular health assessment',
    management: 'Your current blood pressure readings and medication regimen have been taken into account',
  },
  'Coronary Artery Disease': {
    assessment: 'Your cardiac history, including the disclosed coronary artery disease, has been thoroughly evaluated',
    implications: 'Cardiac conditions require careful assessment of current functional status and ongoing management',
    management: 'The time elapsed since your cardiac event and your current cardiac function have been considered',
  },
  'Asthma': {
    assessment: 'Your disclosed history of asthma has been reviewed',
    implications: 'Respiratory conditions are assessed based on frequency of symptoms and current control',
    management: 'Your current medication requirements and symptom frequency have been evaluated',
  },
  'Hyperlipidemia': {
    assessment: 'Your lipid profile and history of hyperlipidemia have been evaluated',
    implications: 'Cholesterol management is relevant to overall cardiovascular risk assessment',
    management: 'Your current lipid levels on treatment demonstrate the effectiveness of your management',
  },
};

// Modification explanation phrases
const MODIFICATION_PHRASES: Record<string, ReasonPhrase> = {
  'exclusion_cardiac': {
    whatPhrase: 'Coverage will exclude claims arising from cardiac or cardiovascular conditions',
    whyPhrase: 'This exclusion reflects the elevated risk associated with your cardiac history during the initial policy period',
    connectorAfter: 'This exclusion will be reviewed after the specified period based on continued stability.',
  },
  'exclusion_diabetes': {
    whatPhrase: 'Coverage will exclude claims directly arising from diabetic complications',
    whyPhrase: 'This reflects the need to assess long-term glycemic control before extending full coverage for diabetes-related conditions',
    connectorAfter: 'Maintaining good control as demonstrated by regular HbA1c monitoring may allow for future review.',
  },
  'premium_loading': {
    whatPhrase: 'An additional premium loading will apply to your policy',
    whyPhrase: 'This loading reflects the additional risk factors identified in your medical profile compared to standard rates',
    connectorAfter: 'The loading percentage has been calculated based on established actuarial guidelines.',
  },
  'waiting_period': {
    whatPhrase: 'A waiting period will apply before full coverage takes effect',
    whyPhrase: 'This period allows for demonstration of continued stability of your current health status',
    connectorAfter: 'After this period, full coverage will apply subject to policy terms.',
  },
  'benefit_limit': {
    whatPhrase: 'A benefit limit will apply to certain coverage components',
    whyPhrase: 'This limit reflects a balanced approach to providing coverage while managing the identified risk factors',
    connectorAfter: 'Standard benefit limits apply to all other coverage components.',
  },
};

// Test requirement explanation phrases
const TEST_REQUIREMENT_PHRASES: Record<string, ReasonPhrase> = {
  'HBA1C': {
    whatPhrase: 'A recent HbA1c test result is required',
    whyPhrase: 'This test provides an objective measure of glycemic control over the past 2-3 months, which is essential for assessing diabetes management',
  },
  'LIPID': {
    whatPhrase: 'A fasting lipid profile is required',
    whyPhrase: 'This helps assess cardiovascular risk factors and the effectiveness of any lipid-lowering treatment',
  },
  'ECG': {
    whatPhrase: 'A resting electrocardiogram (ECG) is required',
    whyPhrase: 'This provides baseline cardiac electrical activity assessment, which is standard for the sum assured requested',
  },
  'ECHO': {
    whatPhrase: 'An echocardiogram is required',
    whyPhrase: 'This assesses cardiac structure and function, providing important information about heart health given your medical history',
  },
  'TMT': {
    whatPhrase: 'A treadmill stress test (TMT) is required',
    whyPhrase: 'This evaluates cardiac response to exertion, which helps assess functional cardiac capacity',
  },
  'CREATININE': {
    whatPhrase: 'Serum creatinine and kidney function tests are required',
    whyPhrase: 'This assesses kidney function, which can be affected by certain medical conditions and medications',
  },
  'LFT': {
    whatPhrase: 'Liver function tests are required',
    whyPhrase: 'These tests provide information about liver health, which is relevant to your overall health assessment',
  },
  'MEDICAL_REPORT': {
    whatPhrase: 'A detailed medical report from your treating physician is required',
    whyPhrase: 'This provides comprehensive information about your current health status, treatment history, and prognosis from your healthcare provider',
  },
};

// Transition and connector phrases
const CONNECTORS = {
  addition: ['Additionally, ', 'Furthermore, ', 'In addition, '],
  contrast: ['However, ', 'Nevertheless, ', 'That said, '],
  result: ['As a result, ', 'Consequently, ', 'Therefore, '],
  explanation: ['Specifically, ', 'In particular, ', 'To clarify, '],
  sequence: ['First, ', 'Second, ', 'Finally, '],
};

// Closing phrases by communication type
const CLOSING_PHRASES: Record<string, PhraseEntry[]> = {
  standard_acceptance: [
    { id: 'CLOSE_STD_01', text: 'We are pleased to welcome you as a policyholder. Your policy documents will be issued upon receipt of the first premium payment. Should you have any questions, please do not hesitate to contact your agent or our customer service team.', category: 'closing' },
  ],
  modified_acceptance: [
    { id: 'CLOSE_MOD_01', text: 'We trust this explanation helps you understand the basis for these modifications. If you wish to proceed on these terms, please sign and return the enclosed acceptance form. Should you have any questions about these terms, please contact your agent or our underwriting team for clarification.', category: 'closing' },
  ],
  requirements_letter: [
    { id: 'CLOSE_REQ_01', text: 'Please arrange for the above requirements within 30 days. Your application will remain on hold until we receive this information. If you have any difficulty in arranging these requirements, please contact your agent for assistance.', category: 'closing' },
  ],
  decline_notice: [
    { id: 'CLOSE_DEC_01', text: 'We understand this may not be the outcome you hoped for. You may wish to explore other insurance options that may be available to you. Any premium paid will be refunded in full. You have the right to request a detailed explanation of this decision in writing.', category: 'closing' },
  ],
  postponement_notice: [
    { id: 'CLOSE_POST_01', text: 'We encourage you to reapply after the recommended period. At that time, updated medical information demonstrating continued stability will support a fresh assessment. Please contact your agent if you have questions about this recommendation.', category: 'closing' },
  ],
};

// ============================================
// ASSEMBLY ENGINE
// ============================================

export interface UnderwritingReason {
  type: 'condition' | 'modification' | 'test_requirement' | 'risk_factor' | 'positive_factor';
  code: string;
  description: string;
  severity?: 'low' | 'moderate' | 'high';
  details?: Record<string, any>;
}

export interface AssembledCommunication {
  subject: string;
  salutation: string;
  openingParagraph: string;
  bodyParagraphs: {
    id: string;
    content: string;
    isLocked: boolean;
    reasonCodes: string[];
    phraseIds: string[];
  }[];
  closingParagraph: string;
  complianceText: string;
  signature: string;
  metadata: {
    assemblyVersion: string;
    reasonsProcessed: string[];
    phrasesUsed: string[];
    assembledAt: string;
  };
}

@Injectable()
export class NlgAssemblyService {
  private readonly assemblyVersion = '1.0.0';

  /**
   * Assemble a complete communication from structured underwriting reasons.
   * Output is deterministic - same reasons always produce same text.
   */
  assembleFromReasons(
    communicationType: string,
    applicantName: string,
    caseReference: string,
    productName: string,
    sumAssured: number,
    reasons: UnderwritingReason[],
    decision?: { type: string; modifications?: any[] },
  ): AssembledCommunication {
    const phrasesUsed: string[] = [];
    const reasonsProcessed: string[] = [];

    // 1. Build subject line
    const subject = this.buildSubject(communicationType, caseReference);

    // 2. Build salutation
    const salutation = `Dear ${applicantName},`;

    // 3. Build opening paragraph
    const opening = this.buildOpeningParagraph(communicationType, productName, sumAssured);
    phrasesUsed.push(opening.phraseId);

    // 4. Build body paragraphs from reasons
    const bodyParagraphs = this.buildBodyParagraphs(
      communicationType,
      reasons,
      decision,
      phrasesUsed,
      reasonsProcessed,
    );

    // 5. Build closing paragraph
    const closing = this.buildClosingParagraph(communicationType);
    phrasesUsed.push(closing.phraseId);

    // 6. Get compliance text (always locked)
    const complianceText = this.getComplianceText(communicationType);

    // 7. Signature
    const signature = 'Yours sincerely,\n\nUnderwriting Department';

    return {
      subject,
      salutation,
      openingParagraph: opening.text,
      bodyParagraphs,
      closingParagraph: closing.text,
      complianceText,
      signature,
      metadata: {
        assemblyVersion: this.assemblyVersion,
        reasonsProcessed,
        phrasesUsed,
        assembledAt: new Date().toISOString(),
      },
    };
  }

  private buildSubject(communicationType: string, caseReference: string): string {
    const subjectMap: Record<string, string> = {
      standard_acceptance: `Your Life Insurance Application - Approved [${caseReference}]`,
      modified_acceptance: `Your Life Insurance Application - Approved with Modifications [${caseReference}]`,
      requirements_letter: `Your Life Insurance Application - Additional Information Required [${caseReference}]`,
      decline_notice: `Your Life Insurance Application - Decision [${caseReference}]`,
      postponement_notice: `Your Life Insurance Application - Postponement Recommendation [${caseReference}]`,
    };
    return subjectMap[communicationType] || `Regarding Your Application [${caseReference}]`;
  }

  private buildOpeningParagraph(
    communicationType: string,
    productName: string,
    sumAssured: number,
  ): { text: string; phraseId: string } {
    const phrases = OPENING_PHRASES[communicationType] || OPENING_PHRASES['standard_acceptance'];
    const phrase = phrases[0]; // Deterministic selection

    const sumAssuredFormatted = `₹${sumAssured.toLocaleString('en-IN')}`;
    const text = `${phrase.text}\n\nYour application for ${productName} with a sum assured of ${sumAssuredFormatted} has been processed as detailed below.`;

    return { text, phraseId: phrase.id };
  }

  private buildBodyParagraphs(
    communicationType: string,
    reasons: UnderwritingReason[],
    decision: { type: string; modifications?: any[] } | undefined,
    phrasesUsed: string[],
    reasonsProcessed: string[],
  ): AssembledCommunication['bodyParagraphs'] {
    const paragraphs: AssembledCommunication['bodyParagraphs'] = [];

    // Group reasons by type for coherent narrative flow
    const conditionReasons = reasons.filter(r => r.type === 'condition');
    const modificationReasons = reasons.filter(r => r.type === 'modification');
    const testReasons = reasons.filter(r => r.type === 'test_requirement');
    const positiveReasons = reasons.filter(r => r.type === 'positive_factor');

    // Paragraph 1: Positive factors (if any) - sets constructive tone
    if (positiveReasons.length > 0) {
      const positiveParagraph = this.buildPositiveFactorsParagraph(positiveReasons, reasonsProcessed);
      paragraphs.push({
        id: 'para_positive',
        content: positiveParagraph,
        isLocked: false,
        reasonCodes: positiveReasons.map(r => r.code),
        phraseIds: ['POS_FACTORS'],
      });
      phrasesUsed.push('POS_FACTORS');
    }

    // Paragraph 2: Condition assessment narrative
    if (conditionReasons.length > 0) {
      const conditionParagraph = this.buildConditionAssessmentParagraph(conditionReasons, reasonsProcessed);
      paragraphs.push({
        id: 'para_conditions',
        content: conditionParagraph,
        isLocked: false,
        reasonCodes: conditionReasons.map(r => r.code),
        phraseIds: conditionReasons.map(r => `COND_${r.code}`),
      });
      phrasesUsed.push(...conditionReasons.map(r => `COND_${r.code}`));
    }

    // Paragraph 3: Modifications explanation (for modified acceptance)
    if (communicationType === 'modified_acceptance' && (modificationReasons.length > 0 || decision?.modifications)) {
      const modParagraph = this.buildModificationsParagraph(
        modificationReasons,
        decision?.modifications || [],
        reasonsProcessed,
      );
      paragraphs.push({
        id: 'para_modifications',
        content: modParagraph,
        isLocked: false,
        reasonCodes: modificationReasons.map(r => r.code),
        phraseIds: ['MOD_EXPLAIN'],
      });
      phrasesUsed.push('MOD_EXPLAIN');
    }

    // Paragraph 4: Test requirements (for requirements letter)
    if (communicationType === 'requirements_letter' && testReasons.length > 0) {
      const testParagraph = this.buildTestRequirementsParagraph(testReasons, reasonsProcessed);
      paragraphs.push({
        id: 'para_tests',
        content: testParagraph,
        isLocked: false,
        reasonCodes: testReasons.map(r => r.code),
        phraseIds: testReasons.map(r => `TEST_${r.code}`),
      });
      phrasesUsed.push(...testReasons.map(r => `TEST_${r.code}`));
    }

    // Paragraph 5: Decision summary
    if (decision) {
      const summaryParagraph = this.buildDecisionSummaryParagraph(communicationType, decision);
      paragraphs.push({
        id: 'para_summary',
        content: summaryParagraph,
        isLocked: false,
        reasonCodes: ['DECISION_SUMMARY'],
        phraseIds: ['SUMMARY'],
      });
      phrasesUsed.push('SUMMARY');
    }

    return paragraphs;
  }

  private buildPositiveFactorsParagraph(
    reasons: UnderwritingReason[],
    reasonsProcessed: string[],
  ): string {
    const sentences: string[] = [];

    sentences.push('In reviewing your application, we noted several positive factors.');

    for (const reason of reasons) {
      reasonsProcessed.push(reason.code);

      if (reason.description) {
        sentences.push(reason.description);
      } else {
        // Generate from details
        const details = reason.details || {};
        if (details.factor === 'well_controlled') {
          sentences.push('Your condition appears to be well-controlled based on the medical information provided.');
        } else if (details.factor === 'healthy_lifestyle') {
          sentences.push('Your healthy lifestyle choices have been noted favourably.');
        } else if (details.factor === 'regular_monitoring') {
          sentences.push('Your commitment to regular medical monitoring demonstrates proactive health management.');
        }
      }
    }

    sentences.push('These factors have been considered favourably in our assessment.');

    return sentences.join(' ');
  }

  private buildConditionAssessmentParagraph(
    reasons: UnderwritingReason[],
    reasonsProcessed: string[],
  ): string {
    const sentences: string[] = [];

    if (reasons.length === 1) {
      sentences.push('We have assessed your disclosed medical history as part of our evaluation.');
    } else {
      sentences.push('We have assessed your disclosed medical history, including multiple conditions, as part of our comprehensive evaluation.');
    }

    for (let i = 0; i < reasons.length; i++) {
      const reason = reasons[i];
      reasonsProcessed.push(reason.code);

      const conditionPhrases = CONDITION_PHRASES[reason.description] || CONDITION_PHRASES[reason.code];

      if (conditionPhrases) {
        // Use approved phrase library
        if (i === 0) {
          sentences.push(conditionPhrases.assessment + '.');
        } else {
          sentences.push('Additionally, ' + conditionPhrases.assessment.toLowerCase() + '.');
        }
        sentences.push(conditionPhrases.management + '.');
      } else {
        // Fallback to generic but still deterministic phrasing
        const connector = i === 0 ? '' : 'Additionally, ';
        sentences.push(`${connector}Your disclosed history of ${reason.description} has been evaluated as part of this assessment.`);

        if (reason.details?.control === 'well_controlled') {
          sentences.push('The current management of this condition appears satisfactory based on the information provided.');
        } else if (reason.details?.control === 'poorly_controlled') {
          sentences.push('The current control of this condition has been noted and factored into our assessment.');
        }
      }
    }

    return sentences.join(' ');
  }

  private buildModificationsParagraph(
    reasons: UnderwritingReason[],
    modifications: any[],
    reasonsProcessed: string[],
  ): string {
    const sentences: string[] = [];

    sentences.push('Based on our assessment, we are able to offer coverage with the following modifications. Each modification is explained below so you understand both what applies and why.');
    sentences.push('');

    const allModifications = [
      ...reasons.map(r => ({ type: r.code, details: r.details, description: r.description })),
      ...modifications,
    ];

    for (let i = 0; i < allModifications.length; i++) {
      const mod = allModifications[i];
      reasonsProcessed.push(mod.type || `MOD_${i}`);

      const modPhrase = MODIFICATION_PHRASES[mod.type] || this.generateModificationPhrase(mod);

      sentences.push(`**Modification ${i + 1}: ${this.formatModificationType(mod.type)}**`);
      sentences.push(`What: ${modPhrase.whatPhrase}`);
      sentences.push(`Why: ${modPhrase.whyPhrase}`);

      if (modPhrase.connectorAfter) {
        sentences.push(modPhrase.connectorAfter);
      }

      if (mod.details?.duration) {
        sentences.push(`Duration: This modification applies for ${mod.details.duration}.`);
      }

      sentences.push('');
    }

    return sentences.join('\n');
  }

  private buildTestRequirementsParagraph(
    reasons: UnderwritingReason[],
    reasonsProcessed: string[],
  ): string {
    const sentences: string[] = [];

    sentences.push('To complete our assessment, the following medical tests and information are required. We have explained the reason for each requirement so you understand why it is needed.');
    sentences.push('');

    for (let i = 0; i < reasons.length; i++) {
      const reason = reasons[i];
      reasonsProcessed.push(reason.code);

      const testPhrase = TEST_REQUIREMENT_PHRASES[reason.code] || {
        whatPhrase: reason.description || `${reason.code} test is required`,
        whyPhrase: 'This test provides information relevant to completing your underwriting assessment',
      };

      sentences.push(`**Requirement ${i + 1}:**`);
      sentences.push(`What: ${testPhrase.whatPhrase}`);
      sentences.push(`Why: ${testPhrase.whyPhrase}`);
      sentences.push('');
    }

    sentences.push('Please ensure all tests are conducted at an approved diagnostic centre. Your agent can provide you with a list of approved centres in your area.');

    return sentences.join('\n');
  }

  private buildDecisionSummaryParagraph(
    communicationType: string,
    decision: { type: string; modifications?: any[] },
  ): string {
    const summaryMap: Record<string, string> = {
      standard_acceptance: 'In summary, based on our comprehensive review of your application and medical information, we are pleased to offer you coverage at our standard terms. This decision reflects our assessment that your health profile aligns with our standard underwriting criteria.',

      modified_acceptance: 'In summary, while your medical history requires certain modifications to standard terms, we are pleased to be able to offer you coverage. The modifications outlined above represent a balanced approach that allows us to provide meaningful coverage while appropriately managing the identified risk factors. We believe this offer provides you with valuable protection.',

      decline_notice: 'In summary, after careful consideration of all available information, our current underwriting guidelines do not permit us to offer coverage at this time. This decision is based on the overall risk assessment and does not reflect on you personally. We encourage you to explore other options that may be available.',

      postponement_notice: 'In summary, we recommend postponing the final decision on your application to allow for a period of demonstrated stability. This is not a decline but rather a recommendation to defer the decision until additional information becomes available. We encourage you to reapply after the recommended period.',
    };

    return summaryMap[communicationType] || 'Your application has been processed as detailed above.';
  }

  private buildClosingParagraph(communicationType: string): { text: string; phraseId: string } {
    const phrases = CLOSING_PHRASES[communicationType] || CLOSING_PHRASES['standard_acceptance'];
    const phrase = phrases[0];
    return { text: phrase.text, phraseId: phrase.id };
  }

  private getComplianceText(communicationType: string): string {
    const baseCompliance = 'IMPORTANT NOTICE: This communication is based on the information provided in your application and supporting documents. Any material misrepresentation or non-disclosure of relevant information may affect the validity of your policy and any claims made thereunder. ';

    const typeSpecificCompliance: Record<string, string> = {
      standard_acceptance: 'Please review all policy documents carefully upon receipt. The policy is subject to all terms, conditions, and exclusions as stated in the policy document.',

      modified_acceptance: 'You have the right to accept or decline this offer. If you choose not to accept these modified terms, any premium paid will be refunded in full. You also have the right to request a review of this decision.',

      requirements_letter: 'Failure to provide the requested information within 30 days may result in your application being closed. You may request an extension if required.',

      decline_notice: 'Under applicable regulations, you have the right to request specific reasons for this decision in writing. You may also request a review of this decision within 30 days of this notice.',

      postponement_notice: 'This postponement recommendation does not affect your right to apply again after the recommended period. A fresh application will be assessed based on the information available at that time.',
    };

    return baseCompliance + (typeSpecificCompliance[communicationType] || '');
  }

  private generateModificationPhrase(mod: any): ReasonPhrase {
    // Deterministic fallback phrase generation
    const type = mod.type || 'general_modification';
    return {
      whatPhrase: mod.description || `A modification of type "${type}" will apply to your policy`,
      whyPhrase: 'This modification reflects our assessment of the risk factors identified in your application',
    };
  }

  private formatModificationType(type: string): string {
    const typeLabels: Record<string, string> = {
      exclusion_cardiac: 'Cardiac Exclusion',
      exclusion_diabetes: 'Diabetes-Related Exclusion',
      premium_loading: 'Premium Loading',
      waiting_period: 'Waiting Period',
      benefit_limit: 'Benefit Limit',
    };
    return typeLabels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Convert assembled communication to content sections for storage and display.
   */
  toContentSections(assembled: AssembledCommunication): {
    id: string;
    type: 'header' | 'salutation' | 'body' | 'compliance' | 'closing' | 'signature';
    content: string;
    isLocked: boolean;
    isEditable: boolean;
  }[] {
    const sections: {
      id: string;
      type: 'header' | 'salutation' | 'body' | 'compliance' | 'closing' | 'signature';
      content: string;
      isLocked: boolean;
      isEditable: boolean;
    }[] = [];

    // Salutation
    sections.push({
      id: 'section_salutation',
      type: 'salutation' as const,
      content: assembled.salutation,
      isLocked: false,
      isEditable: true,
    });

    // Opening
    sections.push({
      id: 'section_opening',
      type: 'body' as const,
      content: assembled.openingParagraph,
      isLocked: false,
      isEditable: true,
    });

    // Body paragraphs
    for (const para of assembled.bodyParagraphs) {
      sections.push({
        id: para.id,
        type: 'body' as const,
        content: para.content,
        isLocked: para.isLocked,
        isEditable: !para.isLocked,
      });
    }

    // Closing
    sections.push({
      id: 'section_closing',
      type: 'closing' as const,
      content: assembled.closingParagraph,
      isLocked: false,
      isEditable: true,
    });

    // Compliance - LOCKED
    sections.push({
      id: 'section_compliance',
      type: 'compliance' as const,
      content: assembled.complianceText,
      isLocked: true,
      isEditable: false,
    });

    // Signature
    sections.push({
      id: 'section_signature',
      type: 'signature' as const,
      content: assembled.signature,
      isLocked: true,
      isEditable: false,
    });

    return sections;
  }
}
