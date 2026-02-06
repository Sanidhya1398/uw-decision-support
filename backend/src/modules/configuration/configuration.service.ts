import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ConfigurationService {
  private configDir = path.join(__dirname, '../../../config');

  async getMedicalDictionary(): Promise<any> {
    return this.loadConfig('medical-dictionary.json');
  }

  async getRiskRules(): Promise<any> {
    return this.loadConfig('risk-rules.json');
  }

  async getTestProtocols(): Promise<any> {
    return this.loadConfig('test-protocols.json');
  }

  /**
   * Get approved phrase blocks for reason-driven communication drafting.
   * Each phrase block set contains pre-approved, regulator-safe language units
   * that are assembled based on structured underwriting reasons.
   */
  async getCommunicationPhraseBlocks(type: string): Promise<any> {
    const phraseBlocks = await this.loadConfig('communication-phrase-blocks.json');
    return phraseBlocks[type] || phraseBlocks['default'];
  }

  async getProductConfig(productCode: string): Promise<any> {
    const products = await this.loadConfig('products.json');
    return products[productCode] || products['default'];
  }

  async getUnderwritingGuidelines(): Promise<any> {
    return this.loadConfig('underwriting-guidelines.json');
  }

  private async loadConfig(filename: string): Promise<any> {
    try {
      const filePath = path.join(this.configDir, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Config file ${filename} not found, using defaults`);
      return this.getDefaultConfig(filename);
    }
  }

  private getDefaultConfig(filename: string): any {
    const defaults: Record<string, any> = {
      'medical-dictionary.json': {
        conditions: [
          { canonicalName: 'Type 2 Diabetes Mellitus', synonyms: ['T2DM', 'Type 2 Diabetes', 'Diabetes Type 2', 'DM', 'NIDDM'], icdCodes: ['E11'], category: 'endocrine' },
          { canonicalName: 'Type 1 Diabetes Mellitus', synonyms: ['T1DM', 'Type 1 Diabetes', 'IDDM'], icdCodes: ['E10'], category: 'endocrine' },
          { canonicalName: 'Hypertension', synonyms: ['HTN', 'High Blood Pressure', 'High BP', 'Essential Hypertension'], icdCodes: ['I10'], category: 'cardiovascular' },
          { canonicalName: 'Coronary Artery Disease', synonyms: ['CAD', 'Coronary Heart Disease', 'CHD', 'Ischemic Heart Disease', 'IHD'], icdCodes: ['I25'], category: 'cardiovascular' },
          { canonicalName: 'Myocardial Infarction', synonyms: ['MI', 'Heart Attack', 'STEMI', 'NSTEMI', 'Acute MI'], icdCodes: ['I21'], category: 'cardiovascular' },
          { canonicalName: 'Chronic Kidney Disease', synonyms: ['CKD', 'Chronic Renal Failure', 'Kidney Disease', 'Renal Impairment'], icdCodes: ['N18'], category: 'renal' },
          { canonicalName: 'Asthma', synonyms: ['Bronchial Asthma'], icdCodes: ['J45'], category: 'respiratory' },
          { canonicalName: 'COPD', synonyms: ['Chronic Obstructive Pulmonary Disease', 'Emphysema', 'Chronic Bronchitis'], icdCodes: ['J44'], category: 'respiratory' },
          { canonicalName: 'Hyperlipidemia', synonyms: ['High Cholesterol', 'Dyslipidemia', 'Hypercholesterolemia'], icdCodes: ['E78'], category: 'metabolic' },
          { canonicalName: 'Hypothyroidism', synonyms: ['Underactive Thyroid', 'Low Thyroid'], icdCodes: ['E03'], category: 'endocrine' },
        ],
        medications: [
          { name: 'Metformin', genericNames: ['Glucophage'], category: 'antidiabetic' },
          { name: 'Amlodipine', genericNames: ['Norvasc'], category: 'antihypertensive' },
          { name: 'Atorvastatin', genericNames: ['Lipitor'], category: 'statin' },
          { name: 'Lisinopril', genericNames: ['Zestril', 'Prinivil'], category: 'ace_inhibitor' },
          { name: 'Aspirin', genericNames: ['Ecosprin', 'Dispirin'], category: 'antiplatelet' },
          { name: 'Metoprolol', genericNames: ['Lopressor', 'Toprol'], category: 'beta_blocker' },
          { name: 'Omeprazole', genericNames: ['Prilosec'], category: 'ppi' },
          { name: 'Levothyroxine', genericNames: ['Synthroid', 'Eltroxin'], category: 'thyroid' },
          { name: 'Insulin', genericNames: ['Lantus', 'Novolog', 'Humalog'], category: 'insulin' },
          { name: 'Glimepiride', genericNames: ['Amaryl'], category: 'antidiabetic' },
        ],
      },
      'communication-phrase-blocks.json': {
        'standard_acceptance': {
          id: 'PB_STD_ACC',
          version: '1.0',
          subject: 'Policy Approval - {{case_reference}}',
          sections: [
            { id: 'header', type: 'header', content: 'Life Insurance Application - Decision Notice', isLocked: true },
            { id: 'salutation', type: 'salutation', content: 'Dear {{applicant_name}},', isLocked: false },
            { id: 'body_1', type: 'body', content: 'We are pleased to inform you that your application for {{product_name}} with sum assured of {{sum_assured}} has been approved at standard rates.', isLocked: false },
            { id: 'body_2', type: 'body', content: 'Your policy will be issued upon receipt of the first premium payment. Please contact your agent or our customer service team for further assistance.', isLocked: false },
            { id: 'compliance', type: 'compliance', content: 'This decision is based on the information provided in your application and supporting documents. Any material non-disclosure may affect policy validity.', isLocked: true },
            { id: 'closing', type: 'closing', content: 'Thank you for choosing us for your insurance needs.', isLocked: false },
            { id: 'signature', type: 'signature', content: 'Sincerely,\nUnderwriting Department', isLocked: true },
          ],
          requiredDisclosures: [
            { code: 'DISC_001', description: 'Non-disclosure warning', present: true },
          ],
        },
        'modified_acceptance': {
          id: 'PB_MOD_ACC',
          version: '1.0',
          subject: 'Policy Approval with Modifications - {{case_reference}}',
          sections: [
            { id: 'header', type: 'header', content: 'Life Insurance Application - Decision Notice', isLocked: true },
            { id: 'salutation', type: 'salutation', content: 'Dear {{applicant_name}},', isLocked: false },
            { id: 'body_1', type: 'body', content: 'Your application for {{product_name}} with sum assured of {{sum_assured}} has been reviewed and approved with the following modifications:', isLocked: false },
            { id: 'body_2', type: 'body', content: '[MODIFICATIONS WILL BE INSERTED HERE]', isLocked: false },
            { id: 'body_3', type: 'body', content: 'These modifications are based on our underwriting assessment of the information provided. If you accept these terms, please sign and return the enclosed acceptance form.', isLocked: false },
            { id: 'compliance', type: 'compliance', content: 'This decision is based on the information provided in your application and supporting documents. Any material non-disclosure may affect policy validity. You have the right to request a review of this decision.', isLocked: true },
            { id: 'closing', type: 'closing', content: 'Thank you for your understanding.', isLocked: false },
            { id: 'signature', type: 'signature', content: 'Sincerely,\nUnderwriting Department', isLocked: true },
          ],
          requiredDisclosures: [
            { code: 'DISC_001', description: 'Non-disclosure warning', present: true },
            { code: 'DISC_002', description: 'Right to review', present: true },
          ],
        },
        'requirements_letter': {
          id: 'PB_REQ',
          version: '1.0',
          subject: 'Additional Requirements - {{case_reference}}',
          sections: [
            { id: 'header', type: 'header', content: 'Life Insurance Application - Information Request', isLocked: true },
            { id: 'salutation', type: 'salutation', content: 'Dear {{applicant_name}},', isLocked: false },
            { id: 'body_1', type: 'body', content: 'Thank you for your application for {{product_name}}. To complete our assessment, we require the following additional information:', isLocked: false },
            { id: 'body_2', type: 'body', content: '[REQUIREMENTS WILL BE INSERTED HERE]', isLocked: false },
            { id: 'body_3', type: 'body', content: 'Please provide these documents within 30 days. Your application will remain on hold until we receive this information.', isLocked: false },
            { id: 'compliance', type: 'compliance', content: 'Failure to provide the requested information within the specified timeframe may result in your application being closed.', isLocked: true },
            { id: 'closing', type: 'closing', content: 'If you have any questions, please contact your agent or our customer service team.', isLocked: false },
            { id: 'signature', type: 'signature', content: 'Sincerely,\nUnderwriting Department', isLocked: true },
          ],
          requiredDisclosures: [
            { code: 'DISC_003', description: 'Response timeframe', present: true },
          ],
        },
        'decline_notice': {
          id: 'PB_DEC',
          version: '1.0',
          subject: 'Application Decision - {{case_reference}}',
          sections: [
            { id: 'header', type: 'header', content: 'Life Insurance Application - Decision Notice', isLocked: true },
            { id: 'salutation', type: 'salutation', content: 'Dear {{applicant_name}},', isLocked: false },
            { id: 'body_1', type: 'body', content: 'After careful review of your application for {{product_name}}, we regret to inform you that we are unable to offer coverage at this time.', isLocked: false },
            { id: 'body_2', type: 'body', content: 'This decision is based on our underwriting guidelines and the information provided in your application.', isLocked: false },
            { id: 'compliance', type: 'compliance', content: 'Under applicable regulations, you have the right to request the specific reasons for this decision in writing. You may also request a review of this decision within 30 days. Any premium paid will be refunded in full.', isLocked: true },
            { id: 'closing', type: 'closing', content: 'We appreciate your interest in our products and wish you well.', isLocked: false },
            { id: 'signature', type: 'signature', content: 'Sincerely,\nUnderwriting Department', isLocked: true },
          ],
          requiredDisclosures: [
            { code: 'DISC_004', description: 'Right to reasons', present: true },
            { code: 'DISC_005', description: 'Right to review', present: true },
            { code: 'DISC_006', description: 'Premium refund', present: true },
          ],
        },
        'default': {
          id: 'PB_DEFAULT',
          version: '1.0',
          subject: 'Regarding Your Application - {{case_reference}}',
          sections: [
            { id: 'header', type: 'header', content: 'Life Insurance Application', isLocked: true },
            { id: 'salutation', type: 'salutation', content: 'Dear {{applicant_name}},', isLocked: false },
            { id: 'body', type: 'body', content: '[CONTENT]', isLocked: false },
            { id: 'signature', type: 'signature', content: 'Sincerely,\nUnderwriting Department', isLocked: true },
          ],
          requiredDisclosures: [],
        },
      },
      'risk-rules.json': {
        version: '1.0',
        rules: [],
      },
      'test-protocols.json': {
        version: '1.0',
        protocols: [],
      },
      'products.json': {
        default: {
          productCode: 'DEFAULT',
          productName: 'Standard Life Insurance',
          minEntryAge: 18,
          maxEntryAge: 65,
          minSumAssured: 500000,
          maxSumAssured: 50000000,
        },
      },
      'underwriting-guidelines.json': {
        version: '1.0',
        guidelines: [],
      },
    };

    return defaults[filename] || {};
  }
}
