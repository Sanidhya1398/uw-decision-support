import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Communication, CommunicationType, CommunicationStatus, RecipientType } from '../../entities/communication.entity';
import { Case, CaseStatus } from '../../entities/case.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditCategory } from '../../entities/audit-log.entity';
import { NlgAssemblyService, UnderwritingReason } from './nlg-assembly.service';
import { EnhancedNlgService, CaseContext, MedicalCondition, ModificationDetail, TestRequirementDetail, EnhancedAssemblyInput } from './enhanced-nlg.service';

/**
 * Communications Service
 *
 * Handles the generation, editing, approval, and dispatch of underwriter communications.
 * Uses deterministic NLG to assemble natural-sounding narrative text from structured
 * underwriting reasons and approved phrase libraries.
 *
 * Key Principles:
 * - Reason-driven: Every sentence traces to a specific underwriting reason
 * - Deterministic: Same input always produces same output
 * - Auditable: All phrases from approved libraries, fully traceable
 * - Editable: Underwriter can modify non-locked sections
 * - No GenAI: Pure rule-based assembly from approved components
 */
@Injectable()
export class CommunicationsService {
  constructor(
    @InjectRepository(Communication)
    private communicationRepository: Repository<Communication>,
    @InjectRepository(Case)
    private caseRepository: Repository<Case>,
    private auditService: AuditService,
    private nlgAssemblyService: NlgAssemblyService,
    private enhancedNlgService: EnhancedNlgService,
  ) {}

  async getCommunications(caseId: string) {
    return this.communicationRepository.find({
      where: { case: { id: caseId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getCommunication(caseId: string, commId: string) {
    const communication = await this.communicationRepository.findOne({
      where: { id: commId, case: { id: caseId } },
    });

    if (!communication) {
      throw new NotFoundException(`Communication with ID ${commId} not found`);
    }

    return communication;
  }

  /**
   * Generate a communication draft using enhanced deterministic NLG.
   * Assembles natural, case-specific narrative that reads like an actual
   * underwriter wrote it - with actual lab values, specific conditions,
   * and personalized rationale.
   */
  async generateCommunication(caseId: string, data: {
    communicationType: CommunicationType;
    userId: string;
    userName: string;
  }) {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
      relations: ['applicant', 'decisions', 'medicalDisclosures', 'riskFactors', 'testRecommendations', 'testResults'],
    });

    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    // Build detailed case context for personalized communication
    const caseContext = this.buildCaseContext(caseEntity);

    // Extract detailed medical conditions with lab values
    const conditions = this.extractDetailedConditions(caseEntity);

    // Extract risk factors
    const riskFactors = this.extractRiskFactors(caseEntity);

    // Get latest decision
    const latestDecision = caseEntity.decisions?.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    // Extract modifications for modified acceptance
    const modifications = data.communicationType === 'modified_acceptance'
      ? this.extractModifications(latestDecision)
      : undefined;

    // Extract test requirements for requirements letter
    const testRequirements = data.communicationType === 'requirements_letter'
      ? this.extractTestRequirements(caseEntity, conditions)
      : undefined;

    // Extract positive factors
    const positiveFactors = this.extractPositiveFactors(caseEntity, conditions);

    // Build decision rationale
    const decisionRationale = this.buildDecisionRationale(caseEntity, data.communicationType, latestDecision);

    // Assemble using enhanced NLG
    const enhancedInput: EnhancedAssemblyInput = {
      communicationType: data.communicationType as any,
      caseContext,
      conditions,
      riskFactors,
      modifications,
      testRequirements,
      positiveFactors,
      decisionRationale,
      postponementPeriod: latestDecision?.postponementDuration,
      declineReasons: latestDecision?.rationale ? [latestDecision.rationale] : undefined,
    };

    const assembled = this.enhancedNlgService.assembleEnhancedCommunication(enhancedInput);

    // Build full body content from sections
    const bodyContent = assembled.sections
      .map(s => s.content)
      .join('\n\n');

    const communication = this.communicationRepository.create({
      communicationType: data.communicationType,
      status: CommunicationStatus.DRAFT,
      recipientType: RecipientType.APPLICANT,
      recipientName: caseContext.applicantName,
      recipientEmail: caseEntity.applicant?.email,
      subject: assembled.subject,
      bodyContent,
      contentSections: assembled.sections,
      reasonCodes: assembled.metadata.conditionsProcessed,
      phraseBlockSetId: `ENHANCED_NLG_${data.communicationType.toUpperCase()}`,
      phraseBlockSetVersion: assembled.metadata.assemblyVersion,
      substitutedVariables: [
        { variable: 'applicant_name', value: caseContext.applicantName },
        { variable: 'applicant_age', value: String(caseContext.applicantAge) },
        { variable: 'case_reference', value: caseContext.caseReference },
        { variable: 'product_name', value: caseContext.productName },
        { variable: 'sum_assured', value: this.formatCurrency(caseContext.sumAssured) },
        { variable: 'conditions_count', value: String(conditions.length) },
        { variable: 'personalized_elements', value: String(assembled.metadata.personalizedElements) },
      ],
      requiredDisclosures: this.getRequiredDisclosures(data.communicationType),
      complianceValidated: false,
      generatedBy: data.userId,
      generatedAt: new Date(),
      case: { id: caseId } as any,
    });

    await this.communicationRepository.save(communication);

    await this.auditService.log({
      caseId,
      action: AuditAction.COMMUNICATION_GENERATED,
      category: AuditCategory.COMMUNICATION,
      description: `Enhanced personalized communication drafted: ${data.communicationType}`,
      userId: data.userId,
      userName: data.userName,
      newState: {
        communicationType: data.communicationType,
        conditionsProcessed: assembled.metadata.conditionsProcessed,
        personalizedElements: assembled.metadata.personalizedElements,
        assemblyVersion: assembled.metadata.assemblyVersion,
        useEnhancedNlg: true,
      },
    });

    return communication;
  }

  /**
   * Build detailed case context for personalized communication
   */
  private buildCaseContext(caseEntity: Case): CaseContext {
    const applicant = caseEntity.applicant;
    const applicantName = applicant?.fullName ||
      `${applicant?.firstName || ''} ${applicant?.lastName || ''}`.trim() ||
      'Valued Applicant';

    // Calculate age from DOB
    let applicantAge = 40; // default
    if (applicant?.dateOfBirth) {
      const dob = new Date(applicant.dateOfBirth);
      const today = new Date();
      applicantAge = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        applicantAge--;
      }
    }

    // Determine product type from product code
    let productType: 'term_life' | 'whole_life' | 'health' | 'critical_illness' = 'term_life';
    const productCode = caseEntity.productCode?.toLowerCase() || '';
    if (productCode.includes('health')) productType = 'health';
    else if (productCode.includes('critical')) productType = 'critical_illness';
    else if (productCode.includes('whole')) productType = 'whole_life';

    return {
      applicantName,
      applicantAge,
      applicantGender: (applicant?.gender?.toLowerCase() as any) || 'other',
      caseReference: caseEntity.caseReference,
      productName: caseEntity.productName,
      productType,
      sumAssured: Number(caseEntity.sumAssured) || 0,
      occupation: applicant?.occupation,
      isSmoker: applicant?.smokingStatus === 'current' || applicant?.smokingStatus === 'former',
      bmi: applicant?.bmi ? Number(applicant.bmi) : undefined,
    };
  }

  /**
   * Extract detailed medical conditions with lab values and treatment info
   */
  private extractDetailedConditions(caseEntity: Case): MedicalCondition[] {
    const conditions: MedicalCondition[] = [];

    for (const disclosure of caseEntity.medicalDisclosures || []) {
      if (disclosure.disclosureType === 'condition' && disclosure.conditionName) {
        // Calculate years with condition
        let yearsWithCondition: number | undefined;
        if (disclosure.diagnosisDate) {
          const diagDate = new Date(disclosure.diagnosisDate);
          const today = new Date();
          yearsWithCondition = Math.floor((today.getTime() - diagDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        }

        // Extract medications from medication disclosures for this condition
        let currentMedications: string[] = [];
        const relatedMedications = (caseEntity.medicalDisclosures || []).filter(d =>
          d.disclosureType === 'medication' &&
          d.indication?.toLowerCase().includes(disclosure.conditionName?.toLowerCase() || '')
        );
        if (relatedMedications.length > 0) {
          currentMedications = relatedMedications
            .map(m => m.drugName ? `${m.drugName}${m.dosage ? ' ' + m.dosage : ''}` : '')
            .filter(m => m.length > 0);
        }

        // Map control status
        let controlStatus: MedicalCondition['controlStatus'] = 'unknown';
        const status = disclosure.conditionStatus?.toLowerCase();
        if (status === 'controlled' || status === 'well_controlled' || status === 'stable') {
          controlStatus = 'well_controlled';
        } else if (status === 'chronic' || status === 'managed') {
          controlStatus = 'moderately_controlled';
        } else if (status === 'acute' || status === 'uncontrolled' || status === 'poorly_controlled') {
          controlStatus = 'poorly_controlled';
        }

        // Map severity from condition status (no direct severity field)
        let severity: MedicalCondition['severity'] = 'moderate';
        if (controlStatus === 'well_controlled') {
          severity = 'mild';
        } else if (controlStatus === 'poorly_controlled') {
          severity = 'severe';
        }

        // Extract latest values from test results
        const latestValues = this.extractLatestLabValues(caseEntity, disclosure.conditionName);

        conditions.push({
          name: disclosure.conditionName,
          icdCode: disclosure.icdCode,
          diagnosisDate: disclosure.diagnosisDate?.toISOString?.() || String(disclosure.diagnosisDate),
          yearsWithCondition,
          currentMedications,
          controlStatus,
          severity,
          latestValues,
        });
      }
    }

    return conditions;
  }

  /**
   * Extract latest lab values relevant to a condition
   */
  private extractLatestLabValues(caseEntity: Case, conditionName: string): Record<string, { value: number | string; unit: string; status: 'normal' | 'elevated' | 'low' }> {
    const values: Record<string, { value: number | string; unit: string; status: 'normal' | 'elevated' | 'low' }> = {};
    const conditionLower = conditionName.toLowerCase();

    // Get test results
    const testResults = caseEntity.testResults || [];

    // Map condition to relevant tests
    if (conditionLower.includes('diabetes')) {
      const hba1c = testResults.find(t => t.testCode?.toUpperCase() === 'HBA1C');
      if (hba1c && hba1c.resultValue) {
        const val = parseFloat(hba1c.resultValue);
        values['HbA1c'] = {
          value: val,
          unit: '%',
          status: val > 7 ? 'elevated' : val > 6.5 ? 'elevated' : 'normal',
        };
      }

      const fbs = testResults.find(t => t.testCode?.toUpperCase() === 'FBS' || t.testCode?.toUpperCase() === 'GLUCOSE');
      if (fbs && fbs.resultValue) {
        const val = parseFloat(fbs.resultValue);
        values['FBS'] = {
          value: val,
          unit: 'mg/dL',
          status: val > 126 ? 'elevated' : val > 100 ? 'elevated' : 'normal',
        };
      }
    }

    if (conditionLower.includes('hypertension') || conditionLower.includes('blood pressure')) {
      // Extract from risk factors or test results if available
      const bpFactor = caseEntity.riskFactors?.find(f =>
        f.factorName?.toLowerCase().includes('blood pressure') ||
        f.factorDescription?.toLowerCase().includes('mmhg')
      );
      if (bpFactor && bpFactor.factorDescription) {
        const bpMatch = bpFactor.factorDescription.match(/(\d+)\/(\d+)/);
        if (bpMatch) {
          values['systolic'] = {
            value: parseInt(bpMatch[1]),
            unit: 'mmHg',
            status: parseInt(bpMatch[1]) > 140 ? 'elevated' : parseInt(bpMatch[1]) > 130 ? 'elevated' : 'normal',
          };
          values['diastolic'] = {
            value: parseInt(bpMatch[2]),
            unit: 'mmHg',
            status: parseInt(bpMatch[2]) > 90 ? 'elevated' : parseInt(bpMatch[2]) > 85 ? 'elevated' : 'normal',
          };
        }
      }
    }

    if (conditionLower.includes('cholesterol') || conditionLower.includes('lipid') || conditionLower.includes('dyslipidemia')) {
      const lipid = testResults.find(t => t.testCode?.toUpperCase() === 'LIPID');
      if (lipid && lipid.resultValue) {
        // Try to parse structured lipid values
        try {
          const lipidData = JSON.parse(lipid.resultValue);
          if (lipidData.totalCholesterol) {
            values['totalCholesterol'] = {
              value: lipidData.totalCholesterol,
              unit: 'mg/dL',
              status: lipidData.totalCholesterol > 240 ? 'elevated' : lipidData.totalCholesterol > 200 ? 'elevated' : 'normal',
            };
          }
          if (lipidData.ldl) {
            values['LDL'] = {
              value: lipidData.ldl,
              unit: 'mg/dL',
              status: lipidData.ldl > 160 ? 'elevated' : lipidData.ldl > 130 ? 'elevated' : 'normal',
            };
          }
          if (lipidData.hdl) {
            values['HDL'] = {
              value: lipidData.hdl,
              unit: 'mg/dL',
              status: lipidData.hdl < 40 ? 'low' : 'normal',
            };
          }
        } catch {
          // If not JSON, just store raw value
        }
      }
    }

    if (conditionLower.includes('thyroid')) {
      const tsh = testResults.find(t => t.testCode?.toUpperCase() === 'TSH');
      if (tsh && tsh.resultValue) {
        const val = parseFloat(tsh.resultValue);
        values['TSH'] = {
          value: val,
          unit: 'mIU/L',
          status: val > 5.5 ? 'elevated' : val < 0.4 ? 'low' : 'normal',
        };
      }
    }

    if (conditionLower.includes('cardiac') || conditionLower.includes('heart') || conditionLower.includes('coronary')) {
      const echo = testResults.find(t => t.testCode?.toUpperCase() === 'ECHO');
      if (echo && echo.resultValue) {
        // Try to extract EF from echo results
        const efMatch = echo.resultValue.match(/ef[:\s]*(\d+)/i);
        if (efMatch) {
          const ef = parseInt(efMatch[1]);
          values['ejectionFraction'] = {
            value: ef,
            unit: '%',
            status: ef < 40 ? 'low' : 'normal',
          };
        }
      }
    }

    if (conditionLower.includes('kidney') || conditionLower.includes('renal')) {
      const creat = testResults.find(t => t.testCode?.toUpperCase() === 'CREATININE');
      if (creat && creat.resultValue) {
        const val = parseFloat(creat.resultValue);
        values['creatinine'] = {
          value: val,
          unit: 'mg/dL',
          status: val > 1.3 ? 'elevated' : 'normal',
        };
      }
    }

    if (conditionLower.includes('liver')) {
      const sgpt = testResults.find(t => t.testCode?.toUpperCase() === 'SGPT' || t.testCode?.toUpperCase() === 'ALT');
      if (sgpt && sgpt.resultValue) {
        const val = parseFloat(sgpt.resultValue);
        values['SGPT'] = {
          value: val,
          unit: 'U/L',
          status: val > 56 ? 'elevated' : 'normal',
        };
      }
      const sgot = testResults.find(t => t.testCode?.toUpperCase() === 'SGOT' || t.testCode?.toUpperCase() === 'AST');
      if (sgot && sgot.resultValue) {
        const val = parseFloat(sgot.resultValue);
        values['SGOT'] = {
          value: val,
          unit: 'U/L',
          status: val > 40 ? 'elevated' : 'normal',
        };
      }
    }

    return values;
  }

  /**
   * Extract risk factors with detailed severity and direction
   */
  private extractRiskFactors(caseEntity: Case): any[] {
    return (caseEntity.riskFactors || []).map(rf => ({
      factor: rf.factorName,
      severity: (rf.severity?.toLowerCase() as any) || 'moderate',
      direction: rf.impactDirection === 'decreases_risk' ? 'decreases_risk' : 'increases_risk',
      rationale: rf.factorDescription || rf.factorName,
      mitigatingFactors: rf.mitigatingFactors,
    }));
  }

  /**
   * Extract modifications from decision with detailed rationale
   */
  private extractModifications(decision: any): ModificationDetail[] | undefined {
    if (!decision?.modifications) return undefined;

    return decision.modifications.map((mod: any) => ({
      type: mod.type || 'exclusion',
      subType: mod.subType || mod.relatedCondition,
      value: mod.value || mod.percentage || mod.amount,
      duration: mod.duration,
      reviewable: mod.reviewable !== false,
      appliesTo: mod.appliesTo || (mod.relatedCondition ? [mod.relatedCondition] : []),
      rationale: mod.rationale || mod.description || 'Based on our assessment of the identified risk factors.',
    }));
  }

  /**
   * Extract test requirements with personalized rationale
   */
  private extractTestRequirements(caseEntity: Case, conditions: MedicalCondition[]): TestRequirementDetail[] {
    const requirements: TestRequirementDetail[] = [];
    const conditionNames = conditions.map(c => c.name.toLowerCase());

    for (const test of caseEntity.testRecommendations || []) {
      if (test.status === 'recommended' || test.status === 'ordered') {
        // Find related conditions for personalized rationale
        const relatedConditions: string[] = [];
        if (test.testCode === 'HBA1C' && conditionNames.some(c => c.includes('diabetes'))) {
          relatedConditions.push('Type 2 Diabetes');
        }
        if (test.testCode === 'LIPID' && conditionNames.some(c => c.includes('cholesterol') || c.includes('lipid'))) {
          relatedConditions.push('Dyslipidemia');
        }
        if ((test.testCode === 'ECG' || test.testCode === 'ECHO' || test.testCode === 'TMT') &&
            conditionNames.some(c => c.includes('cardiac') || c.includes('heart'))) {
          relatedConditions.push('Cardiac history');
        }

        // Build personalized rationale
        let rationale = test.clinicalRationale || `This test is required for comprehensive assessment.`;
        if (relatedConditions.length > 0) {
          rationale = `Given your ${relatedConditions.join(' and ')}, ${rationale.toLowerCase()}`;
        }

        requirements.push({
          testCode: test.testCode,
          testName: test.testName,
          rationale,
          urgency: (test.requirementType === 'mandatory' ? 'urgent' : test.requirementType === 'conditional' ? 'priority' : 'routine') as any,
          relatedConditions,
        });
      }
    }

    return requirements;
  }

  /**
   * Extract positive factors for a constructive tone
   */
  private extractPositiveFactors(caseEntity: Case, conditions: MedicalCondition[]): string[] {
    const positives: string[] = [];

    // Look for positive risk factors
    for (const rf of caseEntity.riskFactors || []) {
      if (rf.impactDirection === 'decreases_risk' || rf.severity?.toLowerCase() === 'low') {
        if (rf.factorDescription) {
          positives.push(rf.factorDescription);
        }
      }
    }

    // Add positives from conditions
    for (const condition of conditions) {
      if (condition.controlStatus === 'well_controlled') {
        positives.push(`Your ${condition.name} is well-controlled`);
      }
      if (condition.treatmentCompliance === 'good') {
        positives.push(`Good treatment compliance for ${condition.name}`);
      }
    }

    // Check applicant lifestyle factors
    const applicant = caseEntity.applicant;
    if (applicant?.smokingStatus === 'never') {
      positives.push('Non-smoker status');
    }
    if (applicant?.smokingStatus === 'former') {
      positives.push('Former smoker - quit smoking');
    }
    if (applicant?.bmi && Number(applicant.bmi) >= 18.5 && Number(applicant.bmi) < 25) {
      positives.push('Healthy BMI');
    }

    return positives.slice(0, 5); // Limit to top 5 positives
  }

  /**
   * Build personalized decision rationale
   */
  private buildDecisionRationale(caseEntity: Case, communicationType: string, decision: any): string {
    const conditions = caseEntity.medicalDisclosures?.filter(d => d.disclosureType === 'condition') || [];
    const conditionCount = conditions.length;

    if (communicationType === 'standard_acceptance') {
      if (conditionCount === 0) {
        return 'Your clean health profile and the information provided support this favourable decision.';
      } else {
        return `Despite your disclosed health conditions, the overall risk profile falls within our standard acceptance guidelines.`;
      }
    }

    if (communicationType === 'modified_acceptance') {
      return `The modifications reflect a careful balance between providing meaningful coverage and appropriately managing the risk factors identified in your profile.`;
    }

    if (communicationType === 'requirements_letter') {
      return `Once we receive the requested information, we will be able to complete your assessment and provide you with a final decision.`;
    }

    if (communicationType === 'decline_notice') {
      return decision?.decisionRationale || `Our current underwriting guidelines do not permit coverage for the risk profile presented.`;
    }

    if (communicationType === 'postponement_notice') {
      return decision?.postponementRationale || `This recommendation allows time for your health to stabilize before we make a final assessment.`;
    }

    return '';
  }

  private formatCurrency(amount: number): string {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Crore`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} Lakh`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  /**
   * Extract structured underwriting reasons from case data.
   * These reasons drive the NLG narrative generation.
   */
  private extractUnderwritingReasons(caseEntity: Case, communicationType: string): UnderwritingReason[] {
    const reasons: UnderwritingReason[] = [];

    // Extract condition-related reasons from medical disclosures
    for (const disclosure of caseEntity.medicalDisclosures || []) {
      if (disclosure.disclosureType === 'condition') {
        reasons.push({
          type: 'condition',
          code: disclosure.icdCode || disclosure.conditionName?.toUpperCase().replace(/\s+/g, '_') || 'CONDITION',
          description: disclosure.conditionName || 'Medical condition',
          severity: this.mapConditionSeverity(disclosure.conditionStatus),
          details: {
            status: disclosure.conditionStatus,
            treatment: disclosure.treatmentStatus,
            diagnosisDate: disclosure.diagnosisDate,
            control: disclosure.conditionStatus === 'chronic' ? 'well_controlled' : undefined,
          },
        });
      }
    }

    // Extract positive factors from risk factors
    for (const factor of caseEntity.riskFactors || []) {
      if (factor.impactDirection === 'decreases_risk' || factor.severity === 'low') {
        reasons.push({
          type: 'positive_factor',
          code: factor.identifyingRuleId || 'POS_FACTOR',
          description: factor.factorDescription || factor.factorName,
          details: {
            factor: factor.factorName,
          },
        });
      }
    }

    // Extract test requirements for requirements letter
    if (communicationType === 'requirements_letter') {
      for (const test of caseEntity.testRecommendations || []) {
        if (test.status === 'recommended' || test.status === 'ordered') {
          reasons.push({
            type: 'test_requirement',
            code: test.testCode,
            description: test.testName,
            details: {
              reason: test.clinicalRationale,
              category: test.testCategory,
            },
          });
        }
      }
    }

    // Extract modification reasons for modified acceptance
    if (communicationType === 'modified_acceptance') {
      const latestDecision = caseEntity.decisions?.[0];
      if (latestDecision?.modifications) {
        for (const mod of latestDecision.modifications) {
          reasons.push({
            type: 'modification',
            code: `exclusion_${mod.type?.toLowerCase() || 'general'}`,
            description: mod.description,
            details: {
              type: mod.type,
              duration: mod.duration,
              details: mod.details,
            },
          });
        }
      }
    }

    return reasons;
  }

  private mapConditionSeverity(status: string | undefined): 'low' | 'moderate' | 'high' {
    if (!status) return 'moderate';
    if (status === 'resolved') return 'low';
    if (status === 'chronic') return 'moderate';
    if (status === 'acute') return 'high';
    return 'moderate';
  }

  private getRequiredDisclosures(communicationType: string): { code: string; description: string; present: boolean }[] {
    const disclosureMap: Record<string, { code: string; description: string; present: boolean }[]> = {
      standard_acceptance: [
        { code: 'DISC_MATERIAL', description: 'Material non-disclosure warning', present: true },
      ],
      modified_acceptance: [
        { code: 'DISC_MATERIAL', description: 'Material non-disclosure warning', present: true },
        { code: 'DISC_REVIEW', description: 'Right to request review', present: true },
        { code: 'DISC_ACCEPT', description: 'Right to accept or decline', present: true },
      ],
      requirements_letter: [
        { code: 'DISC_TIMEFRAME', description: 'Response timeframe', present: true },
        { code: 'DISC_CLOSURE', description: 'Application closure warning', present: true },
      ],
      decline_notice: [
        { code: 'DISC_REASONS', description: 'Right to request reasons', present: true },
        { code: 'DISC_REVIEW', description: 'Right to request review', present: true },
        { code: 'DISC_REFUND', description: 'Premium refund', present: true },
      ],
      postponement_notice: [
        { code: 'DISC_REAPPLY', description: 'Right to reapply', present: true },
      ],
    };
    return disclosureMap[communicationType] || [];
  }

  async editCommunication(caseId: string, commId: string, data: {
    sectionId: string;
    newContent: string;
    userId: string;
    userName: string;
  }) {
    const communication = await this.getCommunication(caseId, commId);

    // Find section
    const sectionIndex = communication.contentSections.findIndex(s => s.id === data.sectionId);
    if (sectionIndex === -1) {
      throw new NotFoundException(`Section ${data.sectionId} not found`);
    }

    const section = communication.contentSections[sectionIndex];
    if (section.isLocked) {
      throw new BadRequestException('Cannot edit locked compliance section - regulatory text must remain unchanged');
    }

    // Record edit history for audit trail
    const editHistory = communication.editHistory || [];
    editHistory.push({
      editedBy: data.userId,
      editedAt: new Date().toISOString(),
      sectionId: data.sectionId,
      previousContent: section.content,
      newContent: data.newContent,
    });

    // Update section
    communication.contentSections[sectionIndex].content = data.newContent;
    communication.editHistory = editHistory;

    // Rebuild body content from sections
    communication.bodyContent = communication.contentSections
      .map(s => s.content)
      .join('\n\n');

    await this.communicationRepository.save(communication);

    await this.auditService.log({
      caseId,
      action: AuditAction.COMMUNICATION_EDITED,
      category: AuditCategory.COMMUNICATION,
      description: `Communication section edited by underwriter: ${data.sectionId}`,
      userId: data.userId,
      userName: data.userName,
      previousState: { content: section.content },
      newState: { content: data.newContent },
    });

    return communication;
  }

  async approveCommunication(caseId: string, commId: string, userId: string, userName: string) {
    const communication = await this.getCommunication(caseId, commId);

    // Validate compliance sections are intact
    const complianceValid = this.validateCompliance(communication);
    if (!complianceValid.valid) {
      throw new BadRequestException(`Compliance validation failed: ${complianceValid.errors.join(', ')}`);
    }

    communication.status = CommunicationStatus.APPROVED;
    communication.approvedBy = userId;
    communication.approvedAt = new Date();
    communication.complianceValidated = true;
    communication.complianceValidationDate = new Date();

    await this.communicationRepository.save(communication);

    // Update case status
    const caseEntity = await this.caseRepository.findOne({ where: { id: caseId } });
    if (caseEntity) {
      caseEntity.status = CaseStatus.COMMUNICATION_PENDING;
      await this.caseRepository.save(caseEntity);
    }

    await this.auditService.log({
      caseId,
      action: AuditAction.COMMUNICATION_APPROVED,
      category: AuditCategory.COMMUNICATION,
      description: 'Communication approved for dispatch by underwriter',
      userId,
      userName,
      newState: {
        approvedAt: communication.approvedAt,
        complianceValidated: true,
      },
    });

    return communication;
  }

  private validateCompliance(communication: Communication) {
    const errors: string[] = [];

    // Check all required disclosures are present
    for (const disclosure of communication.requiredDisclosures || []) {
      if (!disclosure.present) {
        errors.push(`Missing required disclosure: ${disclosure.description}`);
      }
    }

    // Verify locked compliance sections exist and are intact
    const complianceSection = communication.contentSections.find(
      s => s.type === 'compliance' && s.isLocked
    );

    if (!complianceSection) {
      errors.push('Missing locked compliance section');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async sendCommunication(caseId: string, commId: string, data: {
    method: string;
    userId: string;
    userName: string;
  }) {
    const communication = await this.getCommunication(caseId, commId);

    if (communication.status !== CommunicationStatus.APPROVED) {
      throw new BadRequestException('Communication must be approved by underwriter before dispatch');
    }

    // Note: Actual sending is handled by external systems
    // This marks the communication as ready for dispatch
    communication.status = CommunicationStatus.SENT;
    communication.sentAt = new Date();
    communication.sentMethod = data.method;

    await this.communicationRepository.save(communication);

    // Update case status
    const caseEntity = await this.caseRepository.findOne({ where: { id: caseId } });
    if (caseEntity) {
      caseEntity.status = CaseStatus.COMPLETED;
      await this.caseRepository.save(caseEntity);
    }

    await this.auditService.log({
      caseId,
      action: AuditAction.COMMUNICATION_SENT,
      category: AuditCategory.COMMUNICATION,
      description: `Communication dispatched via ${data.method}`,
      userId: data.userId,
      userName: data.userName,
      newState: {
        sentAt: communication.sentAt,
        sentMethod: data.method,
      },
    });

    return communication;
  }
}
