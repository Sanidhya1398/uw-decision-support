import { DataSource } from 'typeorm';
import { Case, CaseStatus, ComplexityTier, Channel } from '../entities/case.entity';
import { Applicant, Gender, SmokingStatus, AlcoholStatus, MaritalStatus } from '../entities/applicant.entity';
import { MedicalDisclosure, DisclosureType, ConditionStatus, TreatmentStatus, FamilyRelationship } from '../entities/medical-disclosure.entity';
import { Document, DocumentType, ExtractionStatus, ExtractionMethod } from '../entities/document.entity';
import { TestResult, AbnormalFlag, FastingStatus, ResultSource } from '../entities/test-result.entity';
import { TestRecommendation } from '../entities/test-recommendation.entity';
import { Decision } from '../entities/decision.entity';
import { Communication } from '../entities/communication.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { Override } from '../entities/override.entity';
import { RiskFactor } from '../entities/risk-factor.entity';

const dataSource = new DataSource({
  type: 'sqlite',
  database: 'uw_decision_support.db',
  entities: [Case, Applicant, MedicalDisclosure, Document, TestResult, TestRecommendation, Decision, Communication, AuditLog, Override, RiskFactor],
  synchronize: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('Database connected');

  const caseRepo = dataSource.getRepository(Case);
  const applicantRepo = dataSource.getRepository(Applicant);
  const disclosureRepo = dataSource.getRepository(MedicalDisclosure);
  const documentRepo = dataSource.getRepository(Document);
  const testResultRepo = dataSource.getRepository(TestResult);
  const testRecommendationRepo = dataSource.getRepository(TestRecommendation);
  const decisionRepo = dataSource.getRepository(Decision);
  const communicationRepo = dataSource.getRepository(Communication);
  const auditLogRepo = dataSource.getRepository(AuditLog);
  const overrideRepo = dataSource.getRepository(Override);
  const riskFactorRepo = dataSource.getRepository(RiskFactor);

  // Clear existing data (dependent tables first due to FK constraints)
  await riskFactorRepo.clear();
  await overrideRepo.clear();
  await auditLogRepo.clear();
  await communicationRepo.clear();
  await decisionRepo.clear();
  await testRecommendationRepo.clear();
  await testResultRepo.clear();
  await documentRepo.clear();
  await disclosureRepo.clear();
  await caseRepo.clear();
  await applicantRepo.clear();

  console.log('Existing data cleared');

  // ============================================
  // CASE 1: Routine - Healthy young applicant
  // ============================================
  const case1 = await createCase({
    caseReference: 'UW-2024-001',
    proposalId: 'PROP-001',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 2500000, // 25 Lakhs
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.92,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-001',
      firstName: 'Rahul',
      lastName: 'Sharma',
      dateOfBirth: new Date('1992-05-15'),
      gender: Gender.MALE,
      occupation: 'Software Engineer',
      annualIncome: 1500000,
      heightCm: 175,
      weightKg: 72,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Bangalore',
      state: 'Karnataka',
    },
    disclosures: [], // No medical conditions
    documents: [
      {
        documentType: DocumentType.INSURANCE_FORM,
        fileName: 'proposal_form.pdf',
        extractedText: 'Proposal Form\nApplicant: Rahul Sharma\nAge: 32 years\nOccupation: Software Engineer\nNo significant medical history reported.\nNon-smoker. Social drinker (occasional).\nBMI: 23.5 (Normal)\nBlood Pressure: 118/76 mmHg\nNo family history of cardiac disease or diabetes.',
      },
    ],
    testResults: [],
  });
  console.log('Case 1 created: Routine healthy applicant');

  // ============================================
  // CASE 2: Routine with Lifestyle - Smoker
  // ============================================
  const case2 = await createCase({
    caseReference: 'UW-2024-002',
    proposalId: 'PROP-002',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 5000000, // 50 Lakhs
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.78,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-002',
      firstName: 'Vikram',
      lastName: 'Patel',
      dateOfBirth: new Date('1984-08-22'),
      gender: Gender.MALE,
      occupation: 'Business Owner',
      annualIncome: 3500000,
      heightCm: 170,
      weightKg: 78,
      smokingStatus: SmokingStatus.CURRENT,
      smokingQuantity: '10 cigarettes/day',
      smokingDurationYears: 15,
      alcoholStatus: AlcoholStatus.REGULAR,
      alcoholQuantity: '2-3 drinks/week',
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    disclosures: [], // No medical conditions, but lifestyle factors
    documents: [
      {
        documentType: DocumentType.INSURANCE_FORM,
        fileName: 'proposal_form.pdf',
        extractedText: 'Proposal Form\nApplicant: Vikram Patel\nAge: 40 years\nOccupation: Business Owner\nNo significant medical history.\nCurrent smoker: 10 cigarettes per day for 15 years.\nAlcohol: 2-3 drinks per week.\nBMI: 27.0 (Overweight)\nBlood Pressure: 128/82 mmHg',
      },
    ],
    testResults: [],
  });
  console.log('Case 2 created: Routine with lifestyle factors');

  // ============================================
  // CASE 3: Moderate - Controlled Type 2 Diabetes
  // ============================================
  const case3 = await createCase({
    caseReference: 'UW-2024-003',
    proposalId: 'PROP-003',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 7500000, // 75 Lakhs
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.85,
    channel: Channel.BANCASSURANCE,
    applicant: {
      applicantId: 'APP-003',
      firstName: 'Priya',
      lastName: 'Menon',
      dateOfBirth: new Date('1979-03-10'),
      gender: Gender.FEMALE,
      occupation: 'Bank Manager',
      annualIncome: 2800000,
      heightCm: 162,
      weightKg: 68,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Chennai',
      state: 'Tamil Nadu',
    },
    disclosures: [
      {
        disclosureType: DisclosureType.CONDITION,
        conditionName: 'Type 2 Diabetes Mellitus',
        icdCode: 'E11',
        diagnosisDate: new Date('2019-06-15'),
        conditionStatus: ConditionStatus.CHRONIC,
        treatmentStatus: TreatmentStatus.TREATED,
      },
      {
        disclosureType: DisclosureType.MEDICATION,
        drugName: 'Metformin',
        genericName: 'Metformin Hydrochloride',
        dosage: '500mg',
        frequency: 'twice daily',
        indication: 'Type 2 Diabetes',
      },
    ],
    documents: [
      {
        documentType: DocumentType.INSURANCE_FORM,
        fileName: 'proposal_form.pdf',
        extractedText: 'Proposal Form\nApplicant: Priya Menon\nAge: 45 years\nOccupation: Bank Manager\nMedical History: Type 2 Diabetes Mellitus diagnosed in 2019\nCurrently on Metformin 500mg twice daily\nWell controlled, no complications reported\nBMI: 25.9 (Overweight)\nBlood Pressure: 124/78 mmHg',
      },
      {
        documentType: DocumentType.MEDICAL_REPORT,
        fileName: 'medical_report.pdf',
        extractedText: 'Medical Examination Report\nPatient: Priya Menon\nDate: 15-Jan-2024\n\nDiagnosis: Type 2 Diabetes Mellitus\nStatus: Well controlled on oral medication\n\nCurrent Medications:\n- Metformin 500mg BD\n\nLab Results:\n- Fasting Blood Sugar: 126 mg/dL\n- HbA1c: 6.8%\n- Total Cholesterol: 195 mg/dL\n- LDL: 118 mg/dL\n- HDL: 52 mg/dL\n- Creatinine: 0.9 mg/dL\n- eGFR: 92 mL/min\n\nNo evidence of diabetic retinopathy, nephropathy, or neuropathy.\nCardiovascular examination: Normal',
      },
    ],
    testResults: [
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '6.8', resultUnit: '%', referenceRangeText: '< 6.5%', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-15') },
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '126', resultUnit: 'mg/dL', referenceRangeText: '70-100 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-15') },
      { testCode: 'CHOL', testName: 'Total Cholesterol', resultValue: '195', resultUnit: 'mg/dL', referenceRangeText: '< 200 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-15') },
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '0.9', resultUnit: 'mg/dL', referenceRangeText: '0.7-1.3 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-15') },
    ],
  });
  console.log('Case 3 created: Moderate - Controlled diabetes');

  // ============================================
  // CASE 4: Moderate - Hypertension + Family History
  // ============================================
  const case4 = await createCase({
    caseReference: 'UW-2024-004',
    proposalId: 'PROP-004',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 10000000, // 1 Crore
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.81,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-004',
      firstName: 'Suresh',
      lastName: 'Reddy',
      dateOfBirth: new Date('1974-11-28'),
      gender: Gender.MALE,
      occupation: 'Civil Engineer',
      annualIncome: 4200000,
      heightCm: 178,
      weightKg: 85,
      smokingStatus: SmokingStatus.FORMER,
      smokingQuitDate: new Date('2020-01-01'),
      smokingDurationYears: 10,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Hyderabad',
      state: 'Telangana',
    },
    disclosures: [
      {
        disclosureType: DisclosureType.CONDITION,
        conditionName: 'Hypertension',
        icdCode: 'I10',
        diagnosisDate: new Date('2018-04-20'),
        conditionStatus: ConditionStatus.CHRONIC,
        treatmentStatus: TreatmentStatus.TREATED,
      },
      {
        disclosureType: DisclosureType.MEDICATION,
        drugName: 'Amlodipine',
        dosage: '5mg',
        frequency: 'once daily',
        indication: 'Hypertension',
      },
      {
        disclosureType: DisclosureType.FAMILY_HISTORY,
        familyRelationship: FamilyRelationship.FATHER,
        familyCondition: 'Myocardial Infarction',
        ageAtDiagnosis: 58,
        ageAtDeath: 65,
        familyMemberAlive: false,
      },
    ],
    documents: [
      {
        documentType: DocumentType.INSURANCE_FORM,
        fileName: 'proposal_form.pdf',
        extractedText: 'Proposal Form\nApplicant: Suresh Reddy\nAge: 50 years\nOccupation: Civil Engineer\nMedical History: Hypertension since 2018\nCurrently on Amlodipine 5mg daily\nFormer smoker (quit 4 years ago)\nFamily History: Father had MI at age 58, deceased at 65\nBMI: 26.8 (Overweight)\nBlood Pressure: 134/86 mmHg (on medication)',
      },
      {
        documentType: DocumentType.LAB_RESULT,
        fileName: 'lab_results.pdf',
        extractedText: 'Laboratory Report\nPatient: Suresh Reddy\nDate: 20-Jan-2024\n\nLipid Profile:\n- Total Cholesterol: 228 mg/dL (High)\n- LDL: 148 mg/dL (High)\n- HDL: 42 mg/dL (Low)\n- Triglycerides: 190 mg/dL (Borderline High)\n\nRenal Function:\n- Creatinine: 1.1 mg/dL (Normal)\n- eGFR: 78 mL/min\n\nLiver Function: All parameters normal\n\nFasting Blood Sugar: 108 mg/dL (Impaired fasting glucose)',
      },
    ],
    testResults: [
      { testCode: 'CHOL', testName: 'Total Cholesterol', resultValue: '228', resultUnit: 'mg/dL', referenceRangeText: '< 200 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-20') },
      { testCode: 'LDL', testName: 'LDL Cholesterol', resultValue: '148', resultUnit: 'mg/dL', referenceRangeText: '< 100 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-20') },
      { testCode: 'HDL', testName: 'HDL Cholesterol', resultValue: '42', resultUnit: 'mg/dL', referenceRangeText: '> 40 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-20') },
      { testCode: 'TG', testName: 'Triglycerides', resultValue: '190', resultUnit: 'mg/dL', referenceRangeText: '< 150 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-20') },
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '108', resultUnit: 'mg/dL', referenceRangeText: '70-100 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-20') },
    ],
  });
  console.log('Case 4 created: Moderate - Hypertension with family history');

  // ============================================
  // CASE 5: Complex - Recent Cardiac Event
  // ============================================
  const case5 = await createCase({
    caseReference: 'UW-2024-005',
    proposalId: 'PROP-005',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 5000000, // 50 Lakhs
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.94,
    channel: Channel.DIRECT,
    applicant: {
      applicantId: 'APP-005',
      firstName: 'Arun',
      lastName: 'Kumar',
      dateOfBirth: new Date('1969-07-05'),
      gender: Gender.MALE,
      occupation: 'Retired Government Officer',
      annualIncome: 1200000,
      heightCm: 168,
      weightKg: 82,
      smokingStatus: SmokingStatus.FORMER,
      smokingQuitDate: new Date('2023-03-15'),
      smokingDurationYears: 25,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Delhi',
      state: 'Delhi',
    },
    disclosures: [
      {
        disclosureType: DisclosureType.CONDITION,
        conditionName: 'Acute Myocardial Infarction',
        icdCode: 'I21',
        diagnosisDate: new Date('2023-03-10'),
        conditionStatus: ConditionStatus.RESOLVED,
        treatmentStatus: TreatmentStatus.TREATED,
      },
      {
        disclosureType: DisclosureType.CONDITION,
        conditionName: 'Coronary Artery Disease',
        icdCode: 'I25',
        diagnosisDate: new Date('2023-03-10'),
        conditionStatus: ConditionStatus.CHRONIC,
        treatmentStatus: TreatmentStatus.TREATED,
      },
      {
        disclosureType: DisclosureType.CONDITION,
        conditionName: 'Type 2 Diabetes Mellitus',
        icdCode: 'E11',
        diagnosisDate: new Date('2015-08-20'),
        conditionStatus: ConditionStatus.CHRONIC,
        treatmentStatus: TreatmentStatus.TREATED,
      },
      {
        disclosureType: DisclosureType.SURGERY,
        procedureName: 'Percutaneous Coronary Intervention (PCI)',
        procedureDate: new Date('2023-03-12'),
        hospitalName: 'Apollo Hospital, Delhi',
        outcome: 'Successful, 2 stents placed',
      },
      {
        disclosureType: DisclosureType.MEDICATION,
        drugName: 'Aspirin',
        dosage: '75mg',
        frequency: 'once daily',
        indication: 'Post-MI',
      },
      {
        disclosureType: DisclosureType.MEDICATION,
        drugName: 'Atorvastatin',
        dosage: '40mg',
        frequency: 'once daily',
        indication: 'Dyslipidemia',
      },
      {
        disclosureType: DisclosureType.MEDICATION,
        drugName: 'Metoprolol',
        dosage: '25mg',
        frequency: 'twice daily',
        indication: 'Post-MI, Beta blocker',
      },
      {
        disclosureType: DisclosureType.MEDICATION,
        drugName: 'Metformin',
        dosage: '1000mg',
        frequency: 'twice daily',
        indication: 'Type 2 Diabetes',
      },
    ],
    documents: [
      {
        documentType: DocumentType.DISCHARGE_SUMMARY,
        fileName: 'discharge_summary.pdf',
        extractedText: 'DISCHARGE SUMMARY\nApollo Hospital, Delhi\n\nPatient: Arun Kumar\nAdmission Date: 10-Mar-2023\nDischarge Date: 18-Mar-2023\n\nDiagnosis: Acute Anterior Wall STEMI\n\nHistory: 55 year old male presented with severe chest pain radiating to left arm. Known diabetic for 8 years. History of smoking (quit on admission).\n\nTreatment: Emergency PCI performed on 12-Mar-2023. Two drug-eluting stents placed in LAD.\n\nPost-procedure: Uneventful recovery. Echocardiogram shows LVEF 45%.\n\nDischarge Medications:\n1. Aspirin 75mg OD\n2. Clopidogrel 75mg OD (for 12 months)\n3. Atorvastatin 40mg OD\n4. Metoprolol 25mg BD\n5. Metformin 1000mg BD\n6. Ramipril 2.5mg OD\n\nFollow-up: Cardiology OPD in 2 weeks',
      },
      {
        documentType: DocumentType.ECG_REPORT,
        fileName: 'ecg_report.pdf',
        extractedText: 'ECG Report\nDate: 15-Jan-2024\nPatient: Arun Kumar\n\nFindings:\n- Heart Rate: 68 bpm\n- Rhythm: Normal Sinus Rhythm\n- Axis: Normal\n- ST-T changes: Resolved anterior ST elevation\n- Q waves in V1-V3 consistent with old anterior MI\n- No acute ischemic changes\n\nConclusion: Old anterior wall MI, no acute changes',
      },
    ],
    testResults: [
      { testCode: 'LVEF', testName: 'Left Ventricular Ejection Fraction', resultValue: '45', resultUnit: '%', referenceRangeText: '> 55%', abnormalFlag: AbnormalFlag.LOW, testDate: new Date('2024-01-15') },
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '7.2', resultUnit: '%', referenceRangeText: '< 6.5%', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-15') },
      { testCode: 'LDL', testName: 'LDL Cholesterol', resultValue: '85', resultUnit: 'mg/dL', referenceRangeText: '< 70 mg/dL (post-MI)', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-15') },
    ],
  });
  console.log('Case 5 created: Complex - Recent MI with PCI');

  // ============================================
  // CASE 6: Complex - Diabetes with Renal Involvement
  // ============================================
  const case6 = await createCase({
    caseReference: 'UW-2024-006',
    proposalId: 'PROP-006',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 8000000, // 80 Lakhs
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.89,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-006',
      firstName: 'Lakshmi',
      lastName: 'Iyer',
      dateOfBirth: new Date('1976-12-03'),
      gender: Gender.FEMALE,
      occupation: 'College Professor',
      annualIncome: 2400000,
      heightCm: 158,
      weightKg: 72,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Pune',
      state: 'Maharashtra',
    },
    disclosures: [
      {
        disclosureType: DisclosureType.CONDITION,
        conditionName: 'Type 2 Diabetes Mellitus',
        icdCode: 'E11',
        diagnosisDate: new Date('2010-05-15'),
        conditionStatus: ConditionStatus.CHRONIC,
        treatmentStatus: TreatmentStatus.TREATED,
      },
      {
        disclosureType: DisclosureType.CONDITION,
        conditionName: 'Diabetic Nephropathy - Stage 2 CKD',
        icdCode: 'N18.2',
        diagnosisDate: new Date('2022-09-10'),
        conditionStatus: ConditionStatus.CHRONIC,
        treatmentStatus: TreatmentStatus.MONITORING,
      },
      {
        disclosureType: DisclosureType.CONDITION,
        conditionName: 'Hypertension',
        icdCode: 'I10',
        diagnosisDate: new Date('2012-03-20'),
        conditionStatus: ConditionStatus.CHRONIC,
        treatmentStatus: TreatmentStatus.TREATED,
      },
      {
        disclosureType: DisclosureType.MEDICATION,
        drugName: 'Insulin Glargine',
        dosage: '24 units',
        frequency: 'once daily at bedtime',
        indication: 'Type 2 Diabetes',
      },
      {
        disclosureType: DisclosureType.MEDICATION,
        drugName: 'Metformin',
        dosage: '500mg',
        frequency: 'twice daily',
        indication: 'Type 2 Diabetes',
      },
      {
        disclosureType: DisclosureType.MEDICATION,
        drugName: 'Losartan',
        dosage: '50mg',
        frequency: 'once daily',
        indication: 'Hypertension, Renal protection',
      },
    ],
    documents: [
      {
        documentType: DocumentType.SPECIALIST_REPORT,
        fileName: 'nephrology_report.pdf',
        extractedText: 'Nephrology Consultation Report\nDate: 10-Jan-2024\nPatient: Lakshmi Iyer\n\nHistory: 48 year old female with Type 2 DM for 14 years, HTN for 12 years. Referred for evaluation of declining renal function.\n\nCurrent Status:\n- eGFR: 68 mL/min (CKD Stage 2)\n- Urine ACR: 180 mg/g (Moderately increased albuminuria)\n- Serum Creatinine: 1.2 mg/dL\n- HbA1c: 7.8%\n- Blood Pressure: 138/88 mmHg\n\nAssessment: Diabetic nephropathy with moderately increased albuminuria. CKD Stage 2.\n\nRecommendations:\n1. Optimize glycemic control (target HbA1c < 7%)\n2. Continue ACE inhibitor/ARB for renal protection\n3. Strict BP control (target < 130/80)\n4. Monitor renal function every 3 months\n5. Avoid nephrotoxic medications',
      },
    ],
    testResults: [
      { testCode: 'EGFR', testName: 'eGFR', resultValue: '68', resultUnit: 'mL/min', referenceRangeText: '> 90 mL/min', abnormalFlag: AbnormalFlag.LOW, testDate: new Date('2024-01-10') },
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '1.2', resultUnit: 'mg/dL', referenceRangeText: '0.6-1.1 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-10') },
      { testCode: 'ACR', testName: 'Urine Albumin-Creatinine Ratio', resultValue: '180', resultUnit: 'mg/g', referenceRangeText: '< 30 mg/g', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-10') },
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '7.8', resultUnit: '%', referenceRangeText: '< 6.5%', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 6 created: Complex - Diabetes with CKD');

  // ============================================
  // CASE 7: Edge Case - Override Scenario
  // ============================================
  const case7 = await createCase({
    caseReference: 'UW-2024-007',
    proposalId: 'PROP-007',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 5000000, // 50 Lakhs
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.62, // Low confidence - borderline case
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-007',
      firstName: 'Amit',
      lastName: 'Desai',
      dateOfBirth: new Date('1987-09-18'),
      gender: Gender.MALE,
      occupation: 'Fitness Instructor',
      annualIncome: 1800000,
      heightCm: 180,
      weightKg: 88,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      hazardousActivities: ['Mountain climbing', 'Paragliding'],
      city: 'Goa',
      state: 'Goa',
    },
    disclosures: [
      {
        disclosureType: DisclosureType.CONDITION,
        conditionName: 'Prediabetes',
        icdCode: 'R73.03',
        diagnosisDate: new Date('2023-06-15'),
        conditionStatus: ConditionStatus.ACTIVE,
        treatmentStatus: TreatmentStatus.MONITORING,
        notes: 'Managing with lifestyle modifications',
      },
      {
        disclosureType: DisclosureType.FAMILY_HISTORY,
        familyRelationship: FamilyRelationship.MOTHER,
        familyCondition: 'Type 2 Diabetes',
        ageAtDiagnosis: 52,
        familyMemberAlive: true,
      },
      {
        disclosureType: DisclosureType.FAMILY_HISTORY,
        familyRelationship: FamilyRelationship.FATHER,
        familyCondition: 'Hypertension',
        ageAtDiagnosis: 48,
        familyMemberAlive: true,
      },
    ],
    documents: [
      {
        documentType: DocumentType.MEDICAL_REPORT,
        fileName: 'medical_exam.pdf',
        extractedText: 'Medical Examination Report\nDate: 25-Jan-2024\nPatient: Amit Desai\n\nGeneral Examination:\n- Well-built, athletic individual\n- BMI: 27.2 (Overweight by standard criteria, but high muscle mass noted)\n- Blood Pressure: 122/78 mmHg\n- Resting Heart Rate: 58 bpm (athletic bradycardia)\n\nLab Results:\n- Fasting Glucose: 112 mg/dL (Impaired fasting glucose)\n- HbA1c: 5.9% (Prediabetes range)\n- Lipid Profile: All parameters within normal limits\n- Liver Function: Normal\n- Renal Function: Normal\n\nOccupational Note: Patient is a professional fitness instructor. High BMI appears to be due to muscle mass rather than adiposity. Engages in hazardous recreational activities (mountain climbing, paragliding).\n\nAssessment: Prediabetes in an otherwise fit individual. Recommend lifestyle monitoring.',
      },
    ],
    testResults: [
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '112', resultUnit: 'mg/dL', referenceRangeText: '70-100 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-25') },
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '5.9', resultUnit: '%', referenceRangeText: '< 5.7%', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-25') },
      { testCode: 'CHOL', testName: 'Total Cholesterol', resultValue: '178', resultUnit: 'mg/dL', referenceRangeText: '< 200 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-25') },
      { testCode: 'LDL', testName: 'LDL Cholesterol', resultValue: '95', resultUnit: 'mg/dL', referenceRangeText: '< 100 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-25') },
    ],
  });
  console.log('Case 7 created: Edge case - Override scenario');

  // ============================================
  // CASE 8: Complex - Multiple Cardiac Risk Factors
  // ============================================
  const case8 = await createCase({
    caseReference: 'UW-2024-008',
    proposalId: 'PROP-008',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 15000000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.91,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-008',
      firstName: 'Rajesh',
      lastName: 'Verma',
      dateOfBirth: new Date('1968-04-12'),
      gender: Gender.MALE,
      occupation: 'Business Executive',
      annualIncome: 8500000,
      heightCm: 172,
      weightKg: 92,
      smokingStatus: SmokingStatus.FORMER,
      smokingQuitDate: new Date('2022-01-01'),
      smokingDurationYears: 20,
      alcoholStatus: AlcoholStatus.REGULAR,
      alcoholQuantity: '3-4 drinks/week',
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypertension', icdCode: 'I10', diagnosisDate: new Date('2015-03-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hyperlipidemia', icdCode: 'E78', diagnosisDate: new Date('2016-06-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Type 2 Diabetes Mellitus', icdCode: 'E11', diagnosisDate: new Date('2018-09-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Telmisartan', dosage: '40mg', frequency: 'once daily', indication: 'Hypertension' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Rosuvastatin', dosage: '10mg', frequency: 'once daily', indication: 'Hyperlipidemia' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Metformin', dosage: '500mg', frequency: 'twice daily', indication: 'Diabetes' },
      { disclosureType: DisclosureType.FAMILY_HISTORY, familyRelationship: FamilyRelationship.FATHER, familyCondition: 'Coronary Artery Disease', ageAtDiagnosis: 52, ageAtDeath: 62, familyMemberAlive: false },
      { disclosureType: DisclosureType.FAMILY_HISTORY, familyRelationship: FamilyRelationship.SIBLING, familyCondition: 'Type 2 Diabetes', ageAtDiagnosis: 45, familyMemberAlive: true },
    ],
    documents: [{ documentType: DocumentType.MEDICAL_REPORT, fileName: 'cardiac_workup.pdf', extractedText: 'Cardiac Risk Assessment\nPatient: Rajesh Verma, 56 years\n\nRisk Factors: HTN, DM, Dyslipidemia, Former smoker, Family history CAD\nFramingham Risk Score: 18% (High)\n\nECG: Normal sinus rhythm, no ST changes\nEcho: LVEF 58%, no wall motion abnormalities\nTMT: Negative for inducible ischemia\n\nConclusion: Multiple cardiac risk factors, currently stable. Aggressive risk factor modification recommended.' }],
    testResults: [
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '7.4', resultUnit: '%', referenceRangeText: '< 6.5%', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-10') },
      { testCode: 'LDL', testName: 'LDL Cholesterol', resultValue: '128', resultUnit: 'mg/dL', referenceRangeText: '< 100 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-10') },
      { testCode: 'LVEF', testName: 'LVEF', resultValue: '58', resultUnit: '%', referenceRangeText: '> 55%', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 8 created: Complex - Multiple cardiac risk factors');

  // ============================================
  // CASE 9: Moderate - Well-controlled Asthma
  // ============================================
  const case9 = await createCase({
    caseReference: 'UW-2024-009',
    proposalId: 'PROP-009',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 3000000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.87,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-009',
      firstName: 'Neha',
      lastName: 'Kapoor',
      dateOfBirth: new Date('1990-08-25'),
      gender: Gender.FEMALE,
      occupation: 'Marketing Manager',
      annualIncome: 2200000,
      heightCm: 165,
      weightKg: 58,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Bangalore',
      state: 'Karnataka',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Bronchial Asthma', icdCode: 'J45', diagnosisDate: new Date('2005-06-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Budesonide/Formoterol Inhaler', dosage: '200/6mcg', frequency: 'twice daily', indication: 'Asthma maintenance' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'as needed', indication: 'Asthma rescue' },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'pulmonology_report.pdf', extractedText: 'Pulmonology Consultation\nPatient: Neha Kapoor\n\nDiagnosis: Mild persistent asthma, well-controlled\nLast exacerbation: 18 months ago\nNo hospitalizations in past 5 years\n\nPFT Results:\nFEV1: 92% predicted\nFEV1/FVC: 78%\nPost-bronchodilator improvement: 8%\n\nAssessment: Well-controlled asthma on maintenance therapy. Low risk for severe exacerbations.' }],
    testResults: [
      { testCode: 'FEV1', testName: 'FEV1', resultValue: '92', resultUnit: '% predicted', referenceRangeText: '> 80%', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-12') },
    ],
  });
  console.log('Case 9 created: Moderate - Well-controlled asthma');

  // ============================================
  // CASE 10: Complex - Cancer Survivor
  // ============================================
  const case10 = await createCase({
    caseReference: 'UW-2024-010',
    proposalId: 'PROP-010',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 5000000,
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.95,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-010',
      firstName: 'Meera',
      lastName: 'Joshi',
      dateOfBirth: new Date('1975-11-08'),
      gender: Gender.FEMALE,
      occupation: 'School Principal',
      annualIncome: 1800000,
      heightCm: 160,
      weightKg: 65,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Pune',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Breast Cancer - Stage 1', icdCode: 'C50', diagnosisDate: new Date('2019-03-15'), conditionStatus: ConditionStatus.RESOLVED, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.SURGERY, procedureName: 'Lumpectomy with Sentinel Node Biopsy', procedureDate: new Date('2019-04-10'), hospitalName: 'Tata Memorial Hospital', outcome: 'Successful, margins clear' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Tamoxifen', dosage: '20mg', frequency: 'once daily', indication: 'Breast cancer - adjuvant therapy' },
      { disclosureType: DisclosureType.FAMILY_HISTORY, familyRelationship: FamilyRelationship.MOTHER, familyCondition: 'Breast Cancer', ageAtDiagnosis: 55, familyMemberAlive: true },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'oncology_followup.pdf', extractedText: 'Oncology Follow-up Report\nPatient: Meera Joshi\n\nOriginal Diagnosis: Invasive ductal carcinoma, Stage 1A, ER+/PR+/HER2-\nTreatment: Lumpectomy + Radiation + Tamoxifen\n\n5-Year Follow-up:\n- No evidence of recurrence\n- Mammogram: BIRADS 1\n- Tumor markers: Normal\n- Currently on Tamoxifen (year 5 of 5)\n\nPrognosis: Excellent. 5-year disease-free survival achieved.' }],
    testResults: [
      { testCode: 'CA125', testName: 'CA 125', resultValue: '12', resultUnit: 'U/mL', referenceRangeText: '< 35 U/mL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-08') },
      { testCode: 'CEA', testName: 'CEA', resultValue: '2.1', resultUnit: 'ng/mL', referenceRangeText: '< 3 ng/mL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-08') },
    ],
  });
  console.log('Case 10 created: Complex - Breast cancer survivor');

  // ============================================
  // CASE 11: Moderate - Hypothyroidism
  // ============================================
  const case11 = await createCase({
    caseReference: 'UW-2024-011',
    proposalId: 'PROP-011',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 4000000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.82,
    channel: Channel.BANCASSURANCE,
    applicant: {
      applicantId: 'APP-011',
      firstName: 'Ananya',
      lastName: 'Rao',
      dateOfBirth: new Date('1985-02-14'),
      gender: Gender.FEMALE,
      occupation: 'HR Director',
      annualIncome: 3200000,
      heightCm: 158,
      weightKg: 62,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Hyderabad',
      state: 'Telangana',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypothyroidism', icdCode: 'E03', diagnosisDate: new Date('2017-05-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Levothyroxine', dosage: '75mcg', frequency: 'once daily', indication: 'Hypothyroidism' },
    ],
    documents: [{ documentType: DocumentType.LAB_RESULT, fileName: 'thyroid_panel.pdf', extractedText: 'Thyroid Function Test\nPatient: Ananya Rao\n\nTSH: 2.8 mIU/L (Normal: 0.4-4.0)\nFree T4: 1.2 ng/dL (Normal: 0.8-1.8)\nFree T3: 2.9 pg/mL (Normal: 2.3-4.2)\n\nConclusion: Euthyroid on replacement therapy' }],
    testResults: [
      { testCode: 'TSH', testName: 'TSH', resultValue: '2.8', resultUnit: 'mIU/L', referenceRangeText: '0.4-4.0 mIU/L', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-15') },
      { testCode: 'FT4', testName: 'Free T4', resultValue: '1.2', resultUnit: 'ng/dL', referenceRangeText: '0.8-1.8 ng/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-15') },
    ],
  });
  console.log('Case 11 created: Moderate - Hypothyroidism');

  // ============================================
  // CASE 12: Complex - Chronic Hepatitis B
  // ============================================
  const case12 = await createCase({
    caseReference: 'UW-2024-012',
    proposalId: 'PROP-012',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 6000000,
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.88,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-012',
      firstName: 'Sanjay',
      lastName: 'Nair',
      dateOfBirth: new Date('1978-07-30'),
      gender: Gender.MALE,
      occupation: 'Chartered Accountant',
      annualIncome: 4500000,
      heightCm: 175,
      weightKg: 78,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Kochi',
      state: 'Kerala',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Chronic Hepatitis B', icdCode: 'B18.1', diagnosisDate: new Date('2012-08-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Tenofovir', dosage: '300mg', frequency: 'once daily', indication: 'Hepatitis B' },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'hepatology_report.pdf', extractedText: 'Hepatology Follow-up\nPatient: Sanjay Nair\n\nDiagnosis: Chronic Hepatitis B, on antiviral therapy\nDuration of treatment: 12 years\n\nCurrent Status:\n- HBV DNA: Undetectable\n- HBsAg: Positive (chronic carrier)\n- HBeAg: Negative\n- Anti-HBe: Positive\n\nLiver Function:\n- ALT: 28 U/L (Normal)\n- AST: 25 U/L (Normal)\n- Albumin: 4.2 g/dL (Normal)\n\nFibroscan: 5.8 kPa (F0-F1, no significant fibrosis)\n\nAssessment: Well-controlled chronic HBV. No evidence of cirrhosis.' }],
    testResults: [
      { testCode: 'ALT', testName: 'ALT', resultValue: '28', resultUnit: 'U/L', referenceRangeText: '< 40 U/L', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
      { testCode: 'AST', testName: 'AST', resultValue: '25', resultUnit: 'U/L', referenceRangeText: '< 40 U/L', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
      { testCode: 'HBVDNA', testName: 'HBV DNA', resultValue: 'Undetectable', resultUnit: '', referenceRangeText: '< 20 IU/mL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 12 created: Complex - Chronic Hepatitis B');

  // ============================================
  // CASE 13: Complex - Depression History
  // ============================================
  const case13 = await createCase({
    caseReference: 'UW-2024-013',
    proposalId: 'PROP-013',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 3500000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.79,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-013',
      firstName: 'Arjun',
      lastName: 'Mehta',
      dateOfBirth: new Date('1988-12-05'),
      gender: Gender.MALE,
      occupation: 'Software Architect',
      annualIncome: 4200000,
      heightCm: 180,
      weightKg: 75,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Bangalore',
      state: 'Karnataka',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Major Depressive Disorder', icdCode: 'F32', diagnosisDate: new Date('2020-03-15'), conditionStatus: ConditionStatus.RESOLVED, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Escitalopram', dosage: '10mg', frequency: 'once daily', indication: 'Depression - maintenance', notes: 'Tapering off' },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'psychiatry_report.pdf', extractedText: 'Psychiatric Evaluation\nPatient: Arjun Mehta\n\nHistory: Single episode of MDD in 2020, triggered by work stress\nNo history of hospitalization\nNo history of self-harm or suicidal ideation\n\nTreatment: CBT + Escitalopram\nDuration: 3 years, currently tapering\n\nCurrent Assessment:\n- PHQ-9 Score: 3 (minimal depression)\n- GAD-7 Score: 2 (minimal anxiety)\n- Fully functional at work\n- Good social support\n\nPlan: Complete taper over next 3 months. Prognosis good.' }],
    testResults: [],
  });
  console.log('Case 13 created: Complex - Depression history');

  // ============================================
  // CASE 14: Routine - Elevated BMI only
  // ============================================
  const case14 = await createCase({
    caseReference: 'UW-2024-014',
    proposalId: 'PROP-014',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 2000000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.85,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-014',
      firstName: 'Kiran',
      lastName: 'Gupta',
      dateOfBirth: new Date('1993-06-18'),
      gender: Gender.MALE,
      occupation: 'Data Scientist',
      annualIncome: 2500000,
      heightCm: 170,
      weightKg: 88,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Delhi',
      state: 'Delhi',
    },
    disclosures: [],
    documents: [{ documentType: DocumentType.INSURANCE_FORM, fileName: 'proposal_form.pdf', extractedText: 'Proposal Form\nApplicant: Kiran Gupta, 31 years\nNo significant medical history\nBMI: 30.4 (Obese Class I)\nBP: 126/82 mmHg\nAll lab parameters normal' }],
    testResults: [
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '95', resultUnit: 'mg/dL', referenceRangeText: '70-100 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-18') },
      { testCode: 'CHOL', testName: 'Total Cholesterol', resultValue: '192', resultUnit: 'mg/dL', referenceRangeText: '< 200 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-18') },
    ],
  });
  console.log('Case 14 created: Routine - Elevated BMI only');

  // ============================================
  // CASE 15: Complex - Stroke History
  // ============================================
  const case15 = await createCase({
    caseReference: 'UW-2024-015',
    proposalId: 'PROP-015',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 4000000,
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.93,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-015',
      firstName: 'Ramesh',
      lastName: 'Krishnan',
      dateOfBirth: new Date('1965-09-22'),
      gender: Gender.MALE,
      occupation: 'Retired Professor',
      annualIncome: 1200000,
      heightCm: 168,
      weightKg: 70,
      smokingStatus: SmokingStatus.FORMER,
      smokingQuitDate: new Date('2021-06-01'),
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Chennai',
      state: 'Tamil Nadu',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Ischemic Stroke', icdCode: 'I63', diagnosisDate: new Date('2021-05-10'), conditionStatus: ConditionStatus.RESOLVED, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Atrial Fibrillation', icdCode: 'I48', diagnosisDate: new Date('2021-05-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Apixaban', dosage: '5mg', frequency: 'twice daily', indication: 'Anticoagulation for AF' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Atorvastatin', dosage: '40mg', frequency: 'once daily', indication: 'Secondary prevention' },
    ],
    documents: [{ documentType: DocumentType.DISCHARGE_SUMMARY, fileName: 'stroke_discharge.pdf', extractedText: 'Discharge Summary\nPatient: Ramesh Krishnan\n\nDiagnosis: Acute ischemic stroke (cardioembolic) with newly diagnosed AF\nMRS at discharge: 1 (no significant disability)\n\n3-Year Follow-up:\n- No recurrent stroke or TIA\n- INR well-controlled on warfarin (later switched to Apixaban)\n- MRI Brain: Old infarct, no new lesions\n- Echo: LVEF 55%, LA dilated\n- No significant residual neurological deficit' }],
    testResults: [
      { testCode: 'LVEF', testName: 'LVEF', resultValue: '55', resultUnit: '%', referenceRangeText: '> 55%', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-05') },
    ],
  });
  console.log('Case 15 created: Complex - Stroke history with AF');

  // ============================================
  // CASE 16: Moderate - PCOS
  // ============================================
  const case16 = await createCase({
    caseReference: 'UW-2024-016',
    proposalId: 'PROP-016',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 2500000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.76,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-016',
      firstName: 'Divya',
      lastName: 'Singh',
      dateOfBirth: new Date('1994-04-10'),
      gender: Gender.FEMALE,
      occupation: 'Investment Banker',
      annualIncome: 3800000,
      heightCm: 162,
      weightKg: 72,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Polycystic Ovary Syndrome', icdCode: 'E28.2', diagnosisDate: new Date('2018-08-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Metformin', dosage: '500mg', frequency: 'twice daily', indication: 'PCOS with insulin resistance' },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'gynec_report.pdf', extractedText: 'Gynecology Consultation\nPatient: Divya Singh\n\nDiagnosis: PCOS with insulin resistance\nBMI: 27.4\n\nHormonal Profile:\n- LH/FSH ratio: 2.8\n- Testosterone: Mildly elevated\n- DHEAS: Normal\n- Fasting Insulin: 18 mIU/L (elevated)\n\nUltrasound: Bilateral polycystic ovaries\n\nManagement: Lifestyle modification + Metformin\nNo diabetes currently' }],
    testResults: [
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '98', resultUnit: 'mg/dL', referenceRangeText: '70-100 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-12') },
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '5.6', resultUnit: '%', referenceRangeText: '< 5.7%', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-12') },
    ],
  });
  console.log('Case 16 created: Moderate - PCOS');

  // ============================================
  // CASE 17: Complex - Kidney Transplant
  // ============================================
  const case17 = await createCase({
    caseReference: 'UW-2024-017',
    proposalId: 'PROP-017',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 3000000,
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.96,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-017',
      firstName: 'Mohan',
      lastName: 'Pillai',
      dateOfBirth: new Date('1972-01-25'),
      gender: Gender.MALE,
      occupation: 'Government Officer',
      annualIncome: 1600000,
      heightCm: 170,
      weightKg: 68,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Trivandrum',
      state: 'Kerala',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'End Stage Renal Disease', icdCode: 'N18.6', diagnosisDate: new Date('2015-06-10'), conditionStatus: ConditionStatus.RESOLVED, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.SURGERY, procedureName: 'Living Donor Kidney Transplant', procedureDate: new Date('2017-03-15'), hospitalName: 'Amrita Hospital', outcome: 'Successful' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Tacrolimus', dosage: '2mg', frequency: 'twice daily', indication: 'Immunosuppression' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Mycophenolate', dosage: '500mg', frequency: 'twice daily', indication: 'Immunosuppression' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Prednisolone', dosage: '5mg', frequency: 'once daily', indication: 'Immunosuppression' },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'nephrology_followup.pdf', extractedText: 'Transplant Nephrology Follow-up\nPatient: Mohan Pillai\n\n7 Years Post Living Donor Kidney Transplant\n\nGraft Function:\n- Creatinine: 1.3 mg/dL (stable)\n- eGFR: 62 mL/min\n- Proteinuria: Trace\n\nImmunosuppression: Tacrolimus + MMF + low dose steroids\nTacrolimus trough: 5.8 ng/mL (target 5-8)\n\nNo episodes of rejection\nNo significant infections in past year\n\nAssessment: Excellent graft function at 7 years' }],
    testResults: [
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '1.3', resultUnit: 'mg/dL', referenceRangeText: '0.7-1.3 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-08') },
      { testCode: 'EGFR', testName: 'eGFR', resultValue: '62', resultUnit: 'mL/min', referenceRangeText: '> 90 mL/min', abnormalFlag: AbnormalFlag.LOW, testDate: new Date('2024-01-08') },
    ],
  });
  console.log('Case 17 created: Complex - Kidney transplant');

  // ============================================
  // CASE 18: Moderate - Sleep Apnea
  // ============================================
  const case18 = await createCase({
    caseReference: 'UW-2024-018',
    proposalId: 'PROP-018',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 5000000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.81,
    channel: Channel.BANCASSURANCE,
    applicant: {
      applicantId: 'APP-018',
      firstName: 'Vinod',
      lastName: 'Agarwal',
      dateOfBirth: new Date('1980-10-15'),
      gender: Gender.MALE,
      occupation: 'Factory Owner',
      annualIncome: 6000000,
      heightCm: 175,
      weightKg: 95,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.REGULAR,
      alcoholQuantity: '2 drinks/day',
      city: 'Ahmedabad',
      state: 'Gujarat',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Obstructive Sleep Apnea', icdCode: 'G47.33', diagnosisDate: new Date('2022-04-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypertension', icdCode: 'I10', diagnosisDate: new Date('2022-04-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Amlodipine', dosage: '5mg', frequency: 'once daily', indication: 'Hypertension' },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'sleep_study.pdf', extractedText: 'Sleep Study Report\nPatient: Vinod Agarwal\n\nPolysomnography Results:\n- AHI: 28/hour (Moderate OSA)\n- Lowest SpO2: 82%\n- Sleep efficiency: 78%\n\nCPAP Titration: Optimal pressure 10 cm H2O\n\n6-Month Follow-up on CPAP:\n- Compliant (average 6.2 hrs/night)\n- Residual AHI: 3.2/hour\n- BP improved\n- Epworth Sleepiness Score: 6 (previously 15)\n\nAssessment: Moderate OSA, well-controlled on CPAP' }],
    testResults: [],
  });
  console.log('Case 18 created: Moderate - Sleep apnea');

  // ============================================
  // CASE 19: Complex - Rheumatoid Arthritis on Biologics
  // ============================================
  const case19 = await createCase({
    caseReference: 'UW-2024-019',
    proposalId: 'PROP-019',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 4500000,
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.86,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-019',
      firstName: 'Sunita',
      lastName: 'Deshmukh',
      dateOfBirth: new Date('1970-05-28'),
      gender: Gender.FEMALE,
      occupation: 'Lawyer',
      annualIncome: 5500000,
      heightCm: 155,
      weightKg: 55,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Nagpur',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Rheumatoid Arthritis', icdCode: 'M06.9', diagnosisDate: new Date('2012-09-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Methotrexate', dosage: '15mg', frequency: 'weekly', indication: 'Rheumatoid Arthritis' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Adalimumab', dosage: '40mg', frequency: 'every 2 weeks', indication: 'Rheumatoid Arthritis - biologic' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Folic Acid', dosage: '5mg', frequency: 'weekly (day after MTX)', indication: 'Methotrexate supplement' },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'rheumatology_report.pdf', extractedText: 'Rheumatology Assessment\nPatient: Sunita Deshmukh\n\nDiagnosis: Seropositive Rheumatoid Arthritis (RF+, Anti-CCP+)\nDisease duration: 12 years\n\nCurrent Therapy: MTX + Adalimumab (started 2018)\n\nDisease Activity:\n- DAS28-CRP: 2.4 (Remission)\n- No active synovitis on exam\n- X-ray hands: Stable erosions, no progression in 3 years\n\nScreening:\n- Hepatitis B/C: Negative\n- TB screening: Negative\n- Chest X-ray: Normal\n\nAssessment: RA in clinical remission on combination therapy' }],
    testResults: [
      { testCode: 'CRP', testName: 'C-Reactive Protein', resultValue: '3', resultUnit: 'mg/L', referenceRangeText: '< 10 mg/L', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
      { testCode: 'ESR', testName: 'ESR', resultValue: '18', resultUnit: 'mm/hr', referenceRangeText: '< 20 mm/hr', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 19 created: Complex - RA on biologics');

  // ============================================
  // CASE 20: Moderate - Anxiety Disorder
  // ============================================
  const case20 = await createCase({
    caseReference: 'UW-2024-020',
    proposalId: 'PROP-020',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 3000000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.74,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-020',
      firstName: 'Pooja',
      lastName: 'Bhatt',
      dateOfBirth: new Date('1991-03-22'),
      gender: Gender.FEMALE,
      occupation: 'Journalist',
      annualIncome: 1800000,
      heightCm: 163,
      weightKg: 56,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Generalized Anxiety Disorder', icdCode: 'F41.1', diagnosisDate: new Date('2021-06-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Sertraline', dosage: '50mg', frequency: 'once daily', indication: 'Anxiety' },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'psychiatry_eval.pdf', extractedText: 'Psychiatric Evaluation\nPatient: Pooja Bhatt\n\nDiagnosis: Generalized Anxiety Disorder\nNo history of panic attacks, OCD, or PTSD\nNo history of self-harm or suicidal ideation\n\nTreatment: Sertraline + CBT\n\nCurrent Status:\n- GAD-7: 5 (mild anxiety)\n- PHQ-9: 2 (minimal depression)\n- Functioning well at work\n- Good sleep, appetite\n\nPlan: Continue current management' }],
    testResults: [],
  });
  console.log('Case 20 created: Moderate - Anxiety disorder');

  // ============================================
  // CASE 21: Complex - HIV on ART
  // ============================================
  const case21 = await createCase({
    caseReference: 'UW-2024-021',
    proposalId: 'PROP-021',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 2500000,
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.92,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-021',
      firstName: 'Vivek',
      lastName: 'Saxena',
      dateOfBirth: new Date('1982-08-14'),
      gender: Gender.MALE,
      occupation: 'Hotel Manager',
      annualIncome: 2000000,
      heightCm: 172,
      weightKg: 70,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Goa',
      state: 'Goa',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'HIV Infection', icdCode: 'B20', diagnosisDate: new Date('2015-04-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Tenofovir/Emtricitabine/Dolutegravir', dosage: 'Fixed dose combination', frequency: 'once daily', indication: 'HIV ART' },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'hiv_followup.pdf', extractedText: 'HIV Treatment Center Follow-up\nPatient: Vivek Saxena\n\nDiagnosis: HIV-1 infection, on ART since 2015\n\nCurrent Regimen: TDF/FTC/DTG (single tablet regimen)\n\nViral Status:\n- HIV RNA: Undetectable (<20 copies/mL) x 8 years\n- CD4 count: 850 cells/uL (Normal)\n- CD4 nadir: 380 cells/uL\n\nNo opportunistic infections ever\nNo AIDS-defining illness\n\nComorbidity Screening:\n- HBsAg: Negative\n- Anti-HCV: Negative\n- Lipid profile: Normal\n- Renal function: Normal\n\nAssessment: Virologically suppressed HIV on stable ART. Excellent prognosis.' }],
    testResults: [
      { testCode: 'CD4', testName: 'CD4 Count', resultValue: '850', resultUnit: 'cells/uL', referenceRangeText: '500-1500 cells/uL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 21 created: Complex - HIV on ART');

  // ============================================
  // CASE 22: Moderate - Epilepsy well-controlled
  // ============================================
  const case22 = await createCase({
    caseReference: 'UW-2024-022',
    proposalId: 'PROP-022',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 3500000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.83,
    channel: Channel.BANCASSURANCE,
    applicant: {
      applicantId: 'APP-022',
      firstName: 'Aditya',
      lastName: 'Kulkarni',
      dateOfBirth: new Date('1986-12-01'),
      gender: Gender.MALE,
      occupation: 'Graphic Designer',
      annualIncome: 1600000,
      heightCm: 175,
      weightKg: 72,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Pune',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Epilepsy - Focal', icdCode: 'G40', diagnosisDate: new Date('2008-06-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Levetiracetam', dosage: '500mg', frequency: 'twice daily', indication: 'Epilepsy' },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'neurology_report.pdf', extractedText: 'Neurology Follow-up\nPatient: Aditya Kulkarni\n\nDiagnosis: Focal epilepsy (left temporal lobe)\nOnset: 2008 (age 22)\n\nSeizure Freedom: 6 years (last seizure 2018)\nCurrent medication: Levetiracetam 500mg BD\n\nMRI Brain: Left mesial temporal sclerosis\nEEG: No epileptiform activity\n\nNo driving restriction (seizure-free > 2 years)\nNo occupational restrictions\n\nAssessment: Well-controlled focal epilepsy on monotherapy' }],
    testResults: [],
  });
  console.log('Case 22 created: Moderate - Epilepsy');

  // ============================================
  // CASE 23: Complex - Multiple Sclerosis
  // ============================================
  const case23 = await createCase({
    caseReference: 'UW-2024-023',
    proposalId: 'PROP-023',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 4000000,
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.90,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-023',
      firstName: 'Rashmi',
      lastName: 'Venkatesh',
      dateOfBirth: new Date('1983-07-19'),
      gender: Gender.FEMALE,
      occupation: 'University Lecturer',
      annualIncome: 1400000,
      heightCm: 160,
      weightKg: 58,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Mysore',
      state: 'Karnataka',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Multiple Sclerosis - Relapsing Remitting', icdCode: 'G35', diagnosisDate: new Date('2016-11-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Ocrelizumab', dosage: '600mg', frequency: 'every 6 months', indication: 'Multiple Sclerosis DMT' },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'ms_followup.pdf', extractedText: 'MS Center Follow-up\nPatient: Rashmi Venkatesh\n\nDiagnosis: Relapsing-Remitting Multiple Sclerosis\nDisease duration: 8 years\nLast relapse: 2019\n\nCurrent DMT: Ocrelizumab (since 2020)\nNo relapses since starting ocrelizumab\n\nEDSS Score: 1.5 (minimal disability)\nMRI Brain: Stable lesion load, no new/enhancing lesions\nMRI Spine: 1 small cervical lesion, stable\n\nFunctional Status:\n- Full-time work\n- Independent in all ADLs\n- No cognitive impairment\n\nAssessment: RRMS in remission on highly effective therapy' }],
    testResults: [],
  });
  console.log('Case 23 created: Complex - Multiple Sclerosis');

  // ============================================
  // CASE 24: Routine - Mild dyslipidemia
  // ============================================
  const case24 = await createCase({
    caseReference: 'UW-2024-024',
    proposalId: 'PROP-024',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 7500000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.88,
    channel: Channel.BANCASSURANCE,
    applicant: {
      applicantId: 'APP-024',
      firstName: 'Manish',
      lastName: 'Choudhury',
      dateOfBirth: new Date('1978-02-28'),
      gender: Gender.MALE,
      occupation: 'Surgeon',
      annualIncome: 9500000,
      heightCm: 178,
      weightKg: 80,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Kolkata',
      state: 'West Bengal',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hyperlipidemia', icdCode: 'E78', diagnosisDate: new Date('2022-06-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Rosuvastatin', dosage: '10mg', frequency: 'once daily', indication: 'Hyperlipidemia' },
    ],
    documents: [{ documentType: DocumentType.LAB_RESULT, fileName: 'lipid_panel.pdf', extractedText: 'Lipid Profile\nPatient: Dr. Manish Choudhury\n\nPre-treatment (Jun 2022):\n- Total Cholesterol: 248 mg/dL\n- LDL: 168 mg/dL\n- HDL: 48 mg/dL\n- Triglycerides: 160 mg/dL\n\nOn Rosuvastatin (Jan 2024):\n- Total Cholesterol: 178 mg/dL\n- LDL: 98 mg/dL\n- HDL: 52 mg/dL\n- Triglycerides: 140 mg/dL\n\nNo other cardiac risk factors' }],
    testResults: [
      { testCode: 'CHOL', testName: 'Total Cholesterol', resultValue: '178', resultUnit: 'mg/dL', referenceRangeText: '< 200 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-15') },
      { testCode: 'LDL', testName: 'LDL Cholesterol', resultValue: '98', resultUnit: 'mg/dL', referenceRangeText: '< 100 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-15') },
    ],
  });
  console.log('Case 24 created: Routine - Mild dyslipidemia');

  // ============================================
  // CASE 25: Complex - Crohn's Disease
  // ============================================
  const case25 = await createCase({
    caseReference: 'UW-2024-025',
    proposalId: 'PROP-025',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 3000000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.84,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-025',
      firstName: 'Neeraj',
      lastName: 'Malhotra',
      dateOfBirth: new Date('1989-09-05'),
      gender: Gender.MALE,
      occupation: 'Chef',
      annualIncome: 1200000,
      heightCm: 168,
      weightKg: 62,
      smokingStatus: SmokingStatus.FORMER,
      smokingQuitDate: new Date('2019-01-01'),
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Delhi',
      state: 'Delhi',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Crohn\'s Disease', icdCode: 'K50', diagnosisDate: new Date('2014-08-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.SURGERY, procedureName: 'Ileocecal Resection', procedureDate: new Date('2017-03-10'), hospitalName: 'AIIMS Delhi', outcome: 'Successful' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Infliximab', dosage: '5mg/kg', frequency: 'every 8 weeks', indication: 'Crohn\'s Disease' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Azathioprine', dosage: '100mg', frequency: 'once daily', indication: 'Crohn\'s Disease' },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'gi_report.pdf', extractedText: 'Gastroenterology Follow-up\nPatient: Neeraj Malhotra\n\nDiagnosis: Crohn\'s disease, ileocolonic\nDisease duration: 10 years\nSurgery: Ileocecal resection (2017)\n\nCurrent Therapy: Infliximab + Azathioprine\n\nDisease Activity:\n- Harvey-Bradshaw Index: 2 (Remission)\n- Fecal calprotectin: 85 ug/g (mildly elevated)\n- Last colonoscopy (2023): Endoscopic remission\n\nNutritional status: BMI 22, no deficiencies\n\nAssessment: Crohn\'s in clinical and endoscopic remission' }],
    testResults: [
      { testCode: 'CRP', testName: 'C-Reactive Protein', resultValue: '5', resultUnit: 'mg/L', referenceRangeText: '< 10 mg/L', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-12') },
      { testCode: 'HB', testName: 'Hemoglobin', resultValue: '13.8', resultUnit: 'g/dL', referenceRangeText: '13-17 g/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-12') },
    ],
  });
  console.log('Case 25 created: Complex - Crohn\'s disease');

  // ============================================
  // CASE 26: Moderate - Gout
  // ============================================
  const case26 = await createCase({
    caseReference: 'UW-2024-026',
    proposalId: 'PROP-026',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 6000000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.79,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-026',
      firstName: 'Prakash',
      lastName: 'Sinha',
      dateOfBirth: new Date('1971-04-18'),
      gender: Gender.MALE,
      occupation: 'Real Estate Developer',
      annualIncome: 12000000,
      heightCm: 170,
      weightKg: 88,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.REGULAR,
      alcoholQuantity: '2-3 drinks/day',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Gout', icdCode: 'M10', diagnosisDate: new Date('2018-05-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Febuxostat', dosage: '40mg', frequency: 'once daily', indication: 'Gout - uric acid lowering' },
    ],
    documents: [{ documentType: DocumentType.MEDICAL_REPORT, fileName: 'rheum_gout.pdf', extractedText: 'Rheumatology Consultation - Gout\nPatient: Prakash Sinha\n\nDiagnosis: Chronic tophaceous gout\nFlares in past year: 1 (previously 4-5/year)\n\nUric Acid History:\n- Pre-treatment: 10.2 mg/dL\n- Current: 5.8 mg/dL (at target)\n\nNo tophi on exam\nNo joint damage on X-ray\nRenal function normal\n\nRisk factors: Obesity, alcohol use\nRecommendation: Continue ULT, lifestyle modification' }],
    testResults: [
      { testCode: 'URIC', testName: 'Uric Acid', resultValue: '5.8', resultUnit: 'mg/dL', referenceRangeText: '< 6.0 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '1.0', resultUnit: 'mg/dL', referenceRangeText: '0.7-1.3 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 26 created: Moderate - Gout');

  // ============================================
  // CASE 27: Complex - Liver Cirrhosis (compensated)
  // ============================================
  const case27 = await createCase({
    caseReference: 'UW-2024-027',
    proposalId: 'PROP-027',
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: 2000000,
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.94,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-027',
      firstName: 'Harish',
      lastName: 'Bhatia',
      dateOfBirth: new Date('1966-11-22'),
      gender: Gender.MALE,
      occupation: 'Retired Businessman',
      annualIncome: 800000,
      heightCm: 172,
      weightKg: 68,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER, // Quit drinking due to liver condition
      city: 'Chandigarh',
      state: 'Punjab',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Alcoholic Liver Cirrhosis', icdCode: 'K70.3', diagnosisDate: new Date('2018-09-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Propranolol', dosage: '20mg', frequency: 'twice daily', indication: 'Portal hypertension prophylaxis' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Rifaximin', dosage: '550mg', frequency: 'twice daily', indication: 'Hepatic encephalopathy prophylaxis' },
    ],
    documents: [{ documentType: DocumentType.SPECIALIST_REPORT, fileName: 'hepatology_cirrhosis.pdf', extractedText: 'Hepatology Follow-up\nPatient: Harish Bhatia\n\nDiagnosis: Compensated alcoholic liver cirrhosis\nAbstinent from alcohol since 2018\n\nChild-Pugh Score: A5\nMELD Score: 8\n\nLiver Function:\n- Bilirubin: 1.4 mg/dL\n- Albumin: 3.8 g/dL\n- INR: 1.1\n\nUltrasound: Nodular liver, no ascites\nUpper GI Endoscopy: Small varices, no red signs\n\nNo history of:\n- Ascites\n- Variceal bleeding\n- Hepatic encephalopathy\n- HCC\n\nAssessment: Stable compensated cirrhosis. Good prognosis with continued abstinence.' }],
    testResults: [
      { testCode: 'ALB', testName: 'Albumin', resultValue: '3.8', resultUnit: 'g/dL', referenceRangeText: '3.5-5.0 g/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-08') },
      { testCode: 'INR', testName: 'INR', resultValue: '1.1', resultUnit: '', referenceRangeText: '0.9-1.1', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-08') },
      { testCode: 'BILI', testName: 'Total Bilirubin', resultValue: '1.4', resultUnit: 'mg/dL', referenceRangeText: '0.1-1.2 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-08') },
    ],
  });
  console.log('Case 27 created: Complex - Compensated cirrhosis');

  // ============================================
  // HEALTH INSURANCE CASES (28-65)
  // ============================================

  // ============================================
  // CASE 28: HEALTH_INDIVIDUAL - Routine - Healthy young female
  // ============================================
  const case28 = await createCase({
    caseReference: 'UW-2024-028',
    proposalId: 'PROP-028',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 500000, // 5 Lakhs annual coverage
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.94,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-028',
      firstName: 'Sneha',
      lastName: 'Reddy',
      dateOfBirth: new Date('1996-03-12'),
      gender: Gender.FEMALE,
      occupation: 'Marketing Manager',
      annualIncome: 1200000,
      heightCm: 162,
      weightKg: 55,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Hyderabad',
      state: 'Telangana',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'health_proposal.pdf',
      extractedText: 'Health Insurance Proposal\nApplicant: Sneha Reddy, 28 years\nNo pre-existing conditions\nNo hospitalization history\nBMI: 21.0 (Normal)\nNon-smoker, Non-alcoholic\nNo family history of chronic diseases\nRequesting: Individual Health Cover 5L',
    }],
    testResults: [],
  });
  console.log('Case 28 created: Health Individual - Routine healthy applicant');

  // ============================================
  // CASE 29: HEALTH_INDIVIDUAL - Moderate - Pre-existing Type 2 Diabetes
  // ============================================
  const case29 = await createCase({
    caseReference: 'UW-2024-029',
    proposalId: 'PROP-029',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 1000000, // 10 Lakhs
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.86,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-029',
      firstName: 'Suresh',
      lastName: 'Menon',
      dateOfBirth: new Date('1975-07-20'),
      gender: Gender.MALE,
      occupation: 'School Principal',
      annualIncome: 1800000,
      heightCm: 172,
      weightKg: 82,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Kochi',
      state: 'Kerala',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Type 2 Diabetes Mellitus', icdCode: 'E11', diagnosisDate: new Date('2018-03-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Metformin', dosage: '1000mg', frequency: 'twice daily', indication: 'Type 2 Diabetes' },
    ],
    documents: [{
      documentType: DocumentType.LAB_RESULT,
      fileName: 'diabetes_labs.pdf',
      extractedText: 'Diabetes Management Report\nPatient: Suresh Menon\n\nHbA1c: 6.8% (Target < 7%)\nFasting Glucose: 118 mg/dL\nPost-prandial Glucose: 145 mg/dL\n\nNo retinopathy on eye exam\nNormal kidney function (eGFR > 90)\nNo peripheral neuropathy\n\nDiabetes well-controlled on oral medication only\nDuration: 6 years',
    }],
    testResults: [
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '6.8', resultUnit: '%', referenceRangeText: '< 6.5%', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-10') },
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '118', resultUnit: 'mg/dL', referenceRangeText: '70-100 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 29 created: Health Individual - Pre-existing diabetes (waiting period)');

  // ============================================
  // CASE 30: HEALTH_INDIVIDUAL - Moderate - Hypertension
  // ============================================
  const case30 = await createCase({
    caseReference: 'UW-2024-030',
    proposalId: 'PROP-030',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 750000, // 7.5 Lakhs
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.82,
    channel: Channel.BANCASSURANCE,
    applicant: {
      applicantId: 'APP-030',
      firstName: 'Lakshmi',
      lastName: 'Iyer',
      dateOfBirth: new Date('1970-11-08'),
      gender: Gender.FEMALE,
      occupation: 'Bank Manager',
      annualIncome: 2500000,
      heightCm: 156,
      weightKg: 68,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Chennai',
      state: 'Tamil Nadu',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Essential Hypertension', icdCode: 'I10', diagnosisDate: new Date('2015-06-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Amlodipine', dosage: '5mg', frequency: 'once daily', indication: 'Hypertension' },
    ],
    documents: [{
      documentType: DocumentType.MEDICAL_REPORT,
      fileName: 'bp_report.pdf',
      extractedText: 'Cardiology Review - Hypertension\nPatient: Lakshmi Iyer\n\nBlood Pressure (on medication): 128/80 mmHg\nHypertension duration: 9 years\n\nECG: Normal sinus rhythm\nEcho: Normal LV function, no LVH\neGFR: 85 mL/min (normal)\nUrine albumin: Negative\n\nNo target organ damage\nWell-controlled on single agent',
    }],
    testResults: [
      { testCode: 'EGFR', testName: 'eGFR', resultValue: '85', resultUnit: 'mL/min', referenceRangeText: '> 60 mL/min', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-12') },
    ],
  });
  console.log('Case 30 created: Health Individual - Hypertension');

  // ============================================
  // CASE 31: HEALTH_INDIVIDUAL - Complex - Prior Cardiac Event (Angioplasty)
  // ============================================
  const case31 = await createCase({
    caseReference: 'UW-2024-031',
    proposalId: 'PROP-031',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 1500000, // 15 Lakhs
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.91,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-031',
      firstName: 'Rajendra',
      lastName: 'Prasad',
      dateOfBirth: new Date('1962-04-25'),
      gender: Gender.MALE,
      occupation: 'Retired Bank Officer',
      annualIncome: 900000,
      heightCm: 168,
      weightKg: 72,
      smokingStatus: SmokingStatus.FORMER,
      smokingQuitDate: new Date('2019-05-01'),
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Lucknow',
      state: 'Uttar Pradesh',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Coronary Artery Disease', icdCode: 'I25', diagnosisDate: new Date('2019-04-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.SURGERY, procedureName: 'Percutaneous Coronary Intervention (Angioplasty)', procedureDate: new Date('2019-04-15'), hospitalName: 'Medanta Lucknow', outcome: 'Successful, 2 DES stents' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Aspirin', dosage: '75mg', frequency: 'once daily', indication: 'CAD secondary prevention' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Clopidogrel', dosage: '75mg', frequency: 'once daily', indication: 'Post-stent antiplatelet' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Atorvastatin', dosage: '40mg', frequency: 'once daily', indication: 'CAD secondary prevention' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Metoprolol', dosage: '25mg', frequency: 'twice daily', indication: 'CAD / BP control' },
    ],
    documents: [{
      documentType: DocumentType.DISCHARGE_SUMMARY,
      fileName: 'angioplasty_discharge.pdf',
      extractedText: 'Discharge Summary - Cardiac Catheterization\nPatient: Rajendra Prasad\n\nProcedure: PTCA + Stenting to LAD and RCA\nIndication: Acute coronary syndrome (NSTEMI)\n\n5-Year Follow-up:\n- No recurrent events\n- No chest pain\n- Exercise tolerance: Good (walks 3-4 km daily)\n\nEcho (2024): LVEF 55%, no RWMA\nStress Test: Negative for ischemia\nLipid Profile: LDL 68 mg/dL (at target)\n\nDiagnosis: Stable CAD, post-PCI, well-controlled',
    }],
    testResults: [
      { testCode: 'LVEF', testName: 'LVEF', resultValue: '55', resultUnit: '%', referenceRangeText: '> 55%', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-05') },
      { testCode: 'LDL', testName: 'LDL Cholesterol', resultValue: '68', resultUnit: 'mg/dL', referenceRangeText: '< 70 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-05') },
    ],
  });
  console.log('Case 31 created: Health Individual - Complex cardiac (post-angioplasty)');

  // ============================================
  // CASE 32: HEALTH_INDIVIDUAL - Routine - Maternity Rider Request
  // ============================================
  const case32 = await createCase({
    caseReference: 'UW-2024-032',
    proposalId: 'PROP-032',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 500000, // 5 Lakhs base + maternity
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.89,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-032',
      firstName: 'Meera',
      lastName: 'Kapoor',
      dateOfBirth: new Date('1993-08-15'),
      gender: Gender.FEMALE,
      maritalStatus: MaritalStatus.MARRIED,
      occupation: 'Software Developer',
      annualIncome: 1600000,
      heightCm: 160,
      weightKg: 58,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Pune',
      state: 'Maharashtra',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'health_maternity_proposal.pdf',
      extractedText: 'Health Insurance Proposal with Maternity Rider\nApplicant: Meera Kapoor, 31 years, Married\nNo pre-existing conditions\nNo prior pregnancies\nBMI: 22.7 (Normal)\nRequesting: 5L Health Cover + Maternity Benefit\n9-month waiting period for maternity benefits applicable',
    }],
    testResults: [],
  });
  console.log('Case 32 created: Health Individual - Routine with maternity rider');

  // ============================================
  // CASE 33: HEALTH_INDIVIDUAL - Moderate - Asthma
  // ============================================
  const case33 = await createCase({
    caseReference: 'UW-2024-033',
    proposalId: 'PROP-033',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 300000, // 3 Lakhs
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.78,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-033',
      firstName: 'Aryan',
      lastName: 'Joshi',
      dateOfBirth: new Date('1998-01-22'),
      gender: Gender.MALE,
      occupation: 'Graphic Designer',
      annualIncome: 700000,
      heightCm: 175,
      weightKg: 68,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Jaipur',
      state: 'Rajasthan',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Bronchial Asthma', icdCode: 'J45', diagnosisDate: new Date('2010-06-01'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Budesonide/Formoterol Inhaler', dosage: '200/6mcg', frequency: 'twice daily', indication: 'Asthma maintenance' },
    ],
    documents: [{
      documentType: DocumentType.SPECIALIST_REPORT,
      fileName: 'pulm_asthma.pdf',
      extractedText: 'Pulmonology Review - Asthma\nPatient: Aryan Joshi\n\nDiagnosis: Mild persistent bronchial asthma\nDuration: Since childhood\n\nCurrent Status:\n- Well-controlled on ICS/LABA\n- No exacerbations in past 2 years\n- No ER visits or hospitalizations\n\nPFT: FEV1 92% predicted, FEV1/FVC 0.78\nPeak Flow: 85% of expected\n\nTriggers: Dust, cold weather\nNo steroid dependency',
    }],
    testResults: [
      { testCode: 'FEV1', testName: 'FEV1', resultValue: '92', resultUnit: '% predicted', referenceRangeText: '> 80%', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-08') },
    ],
  });
  console.log('Case 33 created: Health Individual - Asthma');

  // ============================================
  // CASE 34: HEALTH_INDIVIDUAL - Complex - Cancer Survivor (Breast)
  // ============================================
  const case34 = await createCase({
    caseReference: 'UW-2024-034',
    proposalId: 'PROP-034',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 1000000, // 10 Lakhs
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.92,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-034',
      firstName: 'Sunita',
      lastName: 'Verma',
      dateOfBirth: new Date('1972-12-05'),
      gender: Gender.FEMALE,
      occupation: 'College Professor',
      annualIncome: 1500000,
      heightCm: 158,
      weightKg: 60,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Nagpur',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Breast Cancer', icdCode: 'C50', diagnosisDate: new Date('2018-02-15'), conditionStatus: ConditionStatus.RESOLVED, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.SURGERY, procedureName: 'Modified Radical Mastectomy', procedureDate: new Date('2018-03-10'), hospitalName: 'Tata Memorial Hospital', outcome: 'Successful, clear margins' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Tamoxifen', dosage: '20mg', frequency: 'once daily', indication: 'Hormone therapy - completed 5 years', notes: 'Completed Dec 2023' },
    ],
    documents: [{
      documentType: DocumentType.SPECIALIST_REPORT,
      fileName: 'oncology_followup.pdf',
      extractedText: 'Oncology Follow-up Report\nPatient: Sunita Verma\n\nDiagnosis: Breast cancer, Stage IIA (T2N0M0), ER+/PR+/HER2-\nSurgery: MRM (March 2018)\nChemotherapy: AC-T regimen (completed June 2018)\nHormone therapy: Tamoxifen 5 years (completed Dec 2023)\n\n6-Year Follow-up:\n- No evidence of recurrence\n- Annual mammogram/ultrasound: Normal\n- Tumor markers: Normal\n- ECOG PS: 0 (fully functional)\n\nPrognosis: Favorable. 5-year disease-free survival achieved.',
    }],
    testResults: [
      { testCode: 'CA125', testName: 'CA 15-3', resultValue: '18', resultUnit: 'U/mL', referenceRangeText: '< 30 U/mL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-15') },
    ],
  });
  console.log('Case 34 created: Health Individual - Cancer survivor (breast)');

  // ============================================
  // CASE 35: HEALTH_INDIVIDUAL - Routine - Elderly (Senior Citizen Plan)
  // ============================================
  const case35 = await createCase({
    caseReference: 'UW-2024-035',
    proposalId: 'PROP-035',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 500000, // 5 Lakhs senior citizen plan
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.75,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-035',
      firstName: 'Kamala',
      lastName: 'Devi',
      dateOfBirth: new Date('1955-09-18'),
      gender: Gender.FEMALE,
      occupation: 'Homemaker',
      annualIncome: 0,
      heightCm: 152,
      weightKg: 58,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Varanasi',
      state: 'Uttar Pradesh',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.MEDICAL_REPORT,
      fileName: 'senior_health_checkup.pdf',
      extractedText: 'Senior Citizen Health Checkup\nPatient: Kamala Devi, 69 years\n\nVitals: BP 132/78, HR 72/min\nBMI: 25.1 (slightly overweight)\n\nAll systems:\n- CVS: S1S2 normal, no murmurs\n- RS: Clear\n- Neuro: Grossly normal\n\nLab Results:\n- FBS: 98 mg/dL (normal)\n- Creatinine: 0.9 mg/dL (normal)\n- Lipids: Borderline (TC 212)\n\nNo significant past medical history\nNo surgeries or hospitalizations\nCurrently on no medications',
    }],
    testResults: [
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '98', resultUnit: 'mg/dL', referenceRangeText: '70-100 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '0.9', resultUnit: 'mg/dL', referenceRangeText: '0.6-1.1 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 35 created: Health Individual - Senior citizen routine');

  // ============================================
  // CASE 36: HEALTH_INDIVIDUAL - Complex - Kidney Disease (CKD Stage 3)
  // ============================================
  const case36 = await createCase({
    caseReference: 'UW-2024-036',
    proposalId: 'PROP-036',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 1000000, // 10 Lakhs
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.88,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-036',
      firstName: 'Venkat',
      lastName: 'Rao',
      dateOfBirth: new Date('1968-06-30'),
      gender: Gender.MALE,
      occupation: 'Businessman',
      annualIncome: 3500000,
      heightCm: 170,
      weightKg: 78,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.FORMER,
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Chronic Kidney Disease Stage 3a', icdCode: 'N18.3', diagnosisDate: new Date('2020-08-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Type 2 Diabetes Mellitus', icdCode: 'E11', diagnosisDate: new Date('2008-03-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Metformin', dosage: '500mg', frequency: 'twice daily', indication: 'Diabetes (dose reduced for CKD)' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Empagliflozin', dosage: '10mg', frequency: 'once daily', indication: 'Diabetes + renal protection' },
    ],
    documents: [{
      documentType: DocumentType.SPECIALIST_REPORT,
      fileName: 'nephrology_report.pdf',
      extractedText: 'Nephrology Consultation\nPatient: Venkat Rao\n\nDiagnosis: CKD Stage 3a (Diabetic nephropathy)\neGFR: 52 mL/min/1.73m2\nUrine ACR: 150 mg/g (moderately increased)\n\nProgression: Stable over 3 years\nNo dialysis anticipated in near future\n\nDiabetes: HbA1c 7.2% (controlled)\nBP: 128/78 on ACEI\n\nNo anemia (Hb 12.8 g/dL)\nNo electrolyte abnormalities\n\nPlan: Continue SGLT2i for renal protection\nMonitoring every 3 months',
    }],
    testResults: [
      { testCode: 'EGFR', testName: 'eGFR', resultValue: '52', resultUnit: 'mL/min', referenceRangeText: '> 60 mL/min', abnormalFlag: AbnormalFlag.LOW, testDate: new Date('2024-01-12') },
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '7.2', resultUnit: '%', referenceRangeText: '< 7%', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-12') },
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '1.4', resultUnit: 'mg/dL', referenceRangeText: '0.7-1.3 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-12') },
    ],
  });
  console.log('Case 36 created: Health Individual - CKD Stage 3');

  // ============================================
  // CASE 37: HEALTH_INDIVIDUAL - Moderate - Thyroid + PCOD
  // ============================================
  const case37 = await createCase({
    caseReference: 'UW-2024-037',
    proposalId: 'PROP-037',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 500000, // 5 Lakhs
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.80,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-037',
      firstName: 'Pooja',
      lastName: 'Agarwal',
      dateOfBirth: new Date('1990-04-12'),
      gender: Gender.FEMALE,
      occupation: 'HR Manager',
      annualIncome: 1400000,
      heightCm: 160,
      weightKg: 72,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Ahmedabad',
      state: 'Gujarat',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypothyroidism', icdCode: 'E03', diagnosisDate: new Date('2016-09-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Polycystic Ovarian Syndrome', icdCode: 'E28.2', diagnosisDate: new Date('2015-03-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Levothyroxine', dosage: '50mcg', frequency: 'once daily', indication: 'Hypothyroidism' },
    ],
    documents: [{
      documentType: DocumentType.LAB_RESULT,
      fileName: 'thyroid_pcod_labs.pdf',
      extractedText: 'Endocrine Panel\nPatient: Pooja Agarwal\n\nThyroid Function:\n- TSH: 3.2 mIU/L (Normal on medication)\n- Free T4: 1.1 ng/dL (Normal)\n\nPCOD Evaluation:\n- Ultrasound: Bilateral polycystic ovaries\n- LH/FSH ratio: 2.5 (elevated)\n- Testosterone: Upper normal\n\nMetabolic:\n- FBS: 95 mg/dL (normal)\n- HOMA-IR: 2.8 (borderline insulin resistance)\n\nBMI: 28.1 (overweight)\nNo diabetes currently',
    }],
    testResults: [
      { testCode: 'TSH', testName: 'TSH', resultValue: '3.2', resultUnit: 'mIU/L', referenceRangeText: '0.4-4.0 mIU/L', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-08') },
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '95', resultUnit: 'mg/dL', referenceRangeText: '70-100 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-08') },
    ],
  });
  console.log('Case 37 created: Health Individual - Thyroid + PCOD');

  // ============================================
  // CASE 38: HEALTH_INDIVIDUAL - Routine - Young Male with Family History
  // ============================================
  const case38 = await createCase({
    caseReference: 'UW-2024-038',
    proposalId: 'PROP-038',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 750000, // 7.5 Lakhs
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.85,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-038',
      firstName: 'Rohit',
      lastName: 'Saxena',
      dateOfBirth: new Date('1995-11-28'),
      gender: Gender.MALE,
      occupation: 'Startup Founder',
      annualIncome: 2500000,
      heightCm: 178,
      weightKg: 74,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Bangalore',
      state: 'Karnataka',
    },
    disclosures: [
      { disclosureType: DisclosureType.FAMILY_HISTORY, conditionName: 'Type 2 Diabetes', relationship: FamilyRelationship.FATHER, ageAtDiagnosis: 48 },
      { disclosureType: DisclosureType.FAMILY_HISTORY, conditionName: 'Coronary Artery Disease', relationship: FamilyRelationship.FATHER, ageAtDiagnosis: 55 },
    ],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'health_proposal.pdf',
      extractedText: 'Health Insurance Proposal\nApplicant: Rohit Saxena, 29 years\nNo personal medical conditions\nFamily History:\n- Father: T2DM (age 48), CAD with stenting (age 55)\n- Mother: Healthy\n\nCurrent Health:\n- BMI: 23.4 (Normal)\n- BP: 118/76\n- All routine labs normal\n- Non-smoker',
    }],
    testResults: [
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '88', resultUnit: 'mg/dL', referenceRangeText: '70-100 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
      { testCode: 'CHOL', testName: 'Total Cholesterol', resultValue: '185', resultUnit: 'mg/dL', referenceRangeText: '< 200 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 38 created: Health Individual - Family history only');

  // ============================================
  // CASE 39: HEALTH_GROUP - Routine - Corporate Group (Standard)
  // ============================================
  const case39 = await createCase({
    caseReference: 'UW-2024-039',
    proposalId: 'PROP-039',
    productCode: 'HEALTH_GROUP',
    productName: 'Group Health Insurance',
    sumAssured: 500000, // 5 Lakhs per member
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.92,
    channel: Channel.CORPORATE,
    applicant: {
      applicantId: 'APP-039',
      firstName: 'TechSoft',
      lastName: 'Solutions Pvt Ltd',
      dateOfBirth: new Date('1980-01-01'), // Company incorporation proxy
      gender: Gender.MALE, // Default for corporate
      occupation: 'IT Services Company',
      annualIncome: 50000000, // Company revenue
      heightCm: 170, // Default
      weightKg: 70, // Default
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Bangalore',
      state: 'Karnataka',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'group_proposal.pdf',
      extractedText: 'Group Health Insurance Proposal\nCompany: TechSoft Solutions Pvt Ltd\nIndustry: IT Services\nEmployee Count: 250\nAverage Age: 32 years\n\nProposed Coverage: 5L per employee\nDependents: Spouse + 2 children\nMaternity: Included\n\nGroup Demographics:\n- 70% male, 30% female\n- 85% under age 40\n- White-collar workforce\n- No hazardous occupations',
    }],
    testResults: [],
  });
  console.log('Case 39 created: Health Group - Corporate standard');

  // ============================================
  // CASE 40: HEALTH_GROUP - Moderate - Manufacturing Unit
  // ============================================
  const case40 = await createCase({
    caseReference: 'UW-2024-040',
    proposalId: 'PROP-040',
    productCode: 'HEALTH_GROUP',
    productName: 'Group Health Insurance',
    sumAssured: 300000, // 3 Lakhs per member
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.78,
    channel: Channel.CORPORATE,
    applicant: {
      applicantId: 'APP-040',
      firstName: 'Bharat',
      lastName: 'Steel Industries',
      dateOfBirth: new Date('1975-01-01'),
      gender: Gender.MALE,
      occupation: 'Steel Manufacturing',
      annualIncome: 150000000,
      heightCm: 170,
      weightKg: 70,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Jamshedpur',
      state: 'Jharkhand',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'group_manufacturing.pdf',
      extractedText: 'Group Health Insurance Proposal\nCompany: Bharat Steel Industries\nIndustry: Steel Manufacturing\nEmployee Count: 850\nAverage Age: 38 years\n\nProposed Coverage: 3L per employee\nDependents: Spouse + 2 children\n\nOccupational Risk Factors:\n- Blue-collar workers: 70%\n- Exposure to heat, dust\n- Higher accident risk\n- Respiratory conditions more common\n\nPrior Claims: 12% claim ratio last year\nCommon Claims: Respiratory, musculoskeletal',
    }],
    testResults: [],
  });
  console.log('Case 40 created: Health Group - Manufacturing (higher risk)');

  // ============================================
  // CASE 41: HEALTH_GROUP - Complex - High Claims History
  // ============================================
  const case41 = await createCase({
    caseReference: 'UW-2024-041',
    proposalId: 'PROP-041',
    productCode: 'HEALTH_GROUP',
    productName: 'Group Health Insurance',
    sumAssured: 1000000, // 10 Lakhs per member
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.85,
    channel: Channel.CORPORATE,
    applicant: {
      applicantId: 'APP-041',
      firstName: 'MegaCorp',
      lastName: 'Financial Services',
      dateOfBirth: new Date('1990-01-01'),
      gender: Gender.MALE,
      occupation: 'Financial Services',
      annualIncome: 500000000,
      heightCm: 170,
      weightKg: 70,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'group_high_claims.pdf',
      extractedText: 'Group Health Insurance Proposal - Renewal\nCompany: MegaCorp Financial Services\nEmployee Count: 1200\nAverage Age: 42 years\n\nPrior Policy Claims History:\n- Year 1: 65% claim ratio\n- Year 2: 78% claim ratio\n- Year 3: 85% claim ratio (current year)\n\nHigh Claim Categories:\n- Cardiac procedures: 22%\n- Cancer treatment: 15%\n- Joint replacements: 12%\n\nDemographics:\n- 40% employees above age 45\n- High stress work environment\n- Sedentary lifestyle prevalent\n\nRequesting: 10L coverage (up from 7L)',
    }],
    testResults: [],
  });
  console.log('Case 41 created: Health Group - High claims history');

  // ============================================
  // CASE 42: CRITICAL_ILLNESS - Routine - Young Professional
  // ============================================
  const case42 = await createCase({
    caseReference: 'UW-2024-042',
    proposalId: 'PROP-042',
    productCode: 'CRITICAL_ILLNESS',
    productName: 'Critical Illness Cover',
    sumAssured: 2500000, // 25 Lakhs CI cover
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.91,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-042',
      firstName: 'Aditya',
      lastName: 'Kumar',
      dateOfBirth: new Date('1991-05-20'),
      gender: Gender.MALE,
      occupation: 'Management Consultant',
      annualIncome: 3500000,
      heightCm: 180,
      weightKg: 78,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Gurgaon',
      state: 'Haryana',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'ci_proposal.pdf',
      extractedText: 'Critical Illness Cover Proposal\nApplicant: Aditya Kumar, 33 years\nOccupation: Management Consultant\n\nNo pre-existing conditions\nNo family history of CI conditions\nNon-smoker\nBMI: 24.1 (Normal)\nBP: 122/78\n\nRequesting: 25L Critical Illness Cover\nCovering: Cancer, Heart Attack, Stroke, Kidney Failure, Major Organ Transplant, etc.',
    }],
    testResults: [
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '92', resultUnit: 'mg/dL', referenceRangeText: '70-100 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-12') },
      { testCode: 'CHOL', testName: 'Total Cholesterol', resultValue: '188', resultUnit: 'mg/dL', referenceRangeText: '< 200 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-12') },
    ],
  });
  console.log('Case 42 created: Critical Illness - Routine young professional');

  // ============================================
  // CASE 43: CRITICAL_ILLNESS - Moderate - Family History of Cancer
  // ============================================
  const case43 = await createCase({
    caseReference: 'UW-2024-043',
    proposalId: 'PROP-043',
    productCode: 'CRITICAL_ILLNESS',
    productName: 'Critical Illness Cover',
    sumAssured: 1500000, // 15 Lakhs CI cover
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.82,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-043',
      firstName: 'Neha',
      lastName: 'Gupta',
      dateOfBirth: new Date('1985-08-15'),
      gender: Gender.FEMALE,
      occupation: 'Architect',
      annualIncome: 2200000,
      heightCm: 165,
      weightKg: 60,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Delhi',
      state: 'Delhi',
    },
    disclosures: [
      { disclosureType: DisclosureType.FAMILY_HISTORY, conditionName: 'Breast Cancer', relationship: FamilyRelationship.MOTHER, ageAtDiagnosis: 52 },
      { disclosureType: DisclosureType.FAMILY_HISTORY, conditionName: 'Ovarian Cancer', relationship: FamilyRelationship.MATERNAL_AUNT },
    ],
    documents: [{
      documentType: DocumentType.MEDICAL_REPORT,
      fileName: 'ci_screening.pdf',
      extractedText: 'Critical Illness Screening Report\nApplicant: Neha Gupta, 39 years\n\nFamily History:\n- Mother: Breast cancer at age 52 (BRCA status unknown)\n- Maternal aunt: Ovarian cancer\n\nPersonal Health:\n- No current health issues\n- Regular breast screening (mammogram + USG): Normal\n- CA-125: Normal\n- No BRCA testing done\n\nRecommendation: Consider BRCA genetic testing\nCurrent Risk Assessment: Moderately elevated familial risk',
    }],
    testResults: [
      { testCode: 'CA125', testName: 'CA-125', resultValue: '22', resultUnit: 'U/mL', referenceRangeText: '< 35 U/mL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 43 created: Critical Illness - Family history of cancer');

  // ============================================
  // CASE 44: CRITICAL_ILLNESS - Complex - Pre-existing Cardiac Risk
  // ============================================
  const case44 = await createCase({
    caseReference: 'UW-2024-044',
    proposalId: 'PROP-044',
    productCode: 'CRITICAL_ILLNESS',
    productName: 'Critical Illness Cover',
    sumAssured: 2000000, // 20 Lakhs CI cover
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.88,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-044',
      firstName: 'Ashok',
      lastName: 'Bansal',
      dateOfBirth: new Date('1970-03-25'),
      gender: Gender.MALE,
      occupation: 'Jeweler',
      annualIncome: 8000000,
      heightCm: 168,
      weightKg: 85,
      smokingStatus: SmokingStatus.FORMER,
      smokingQuitDate: new Date('2020-01-01'),
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Surat',
      state: 'Gujarat',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Essential Hypertension', icdCode: 'I10', diagnosisDate: new Date('2012-05-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Type 2 Diabetes Mellitus', icdCode: 'E11', diagnosisDate: new Date('2015-08-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Telmisartan', dosage: '40mg', frequency: 'once daily', indication: 'Hypertension' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Metformin', dosage: '1000mg', frequency: 'twice daily', indication: 'Diabetes' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Rosuvastatin', dosage: '10mg', frequency: 'once daily', indication: 'Primary prevention' },
    ],
    documents: [{
      documentType: DocumentType.SPECIALIST_REPORT,
      fileName: 'cardiac_risk_assessment.pdf',
      extractedText: 'Cardiovascular Risk Assessment\nPatient: Ashok Bansal, 54 years\n\nRisk Factors:\n- Hypertension (12 years, controlled)\n- Type 2 DM (9 years, controlled)\n- Former smoker (quit 4 years ago)\n- Obesity (BMI 30.1)\n- Male gender\n\nCurrent Status:\n- BP: 132/84 (on medication)\n- HbA1c: 7.1%\n- LDL: 85 mg/dL (on statin)\n\nCardiac Evaluation:\n- ECG: Normal\n- Echo: Normal LV function, no LVH\n- TMT: Negative\n- Carotid IMT: Mildly increased\n\n10-year CVD Risk (ASCVD): 18% (high)',
    }],
    testResults: [
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '7.1', resultUnit: '%', referenceRangeText: '< 7%', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-08') },
      { testCode: 'LDL', testName: 'LDL Cholesterol', resultValue: '85', resultUnit: 'mg/dL', referenceRangeText: '< 100 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-08') },
    ],
  });
  console.log('Case 44 created: Critical Illness - Complex cardiac risk');

  // ============================================
  // CASE 45: HEALTH_INDIVIDUAL - Moderate - Prior Surgery (Spine)
  // ============================================
  const case45 = await createCase({
    caseReference: 'UW-2024-045',
    proposalId: 'PROP-045',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 750000, // 7.5 Lakhs
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.81,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-045',
      firstName: 'Deepak',
      lastName: 'Sharma',
      dateOfBirth: new Date('1980-12-10'),
      gender: Gender.MALE,
      occupation: 'IT Project Manager',
      annualIncome: 3200000,
      heightCm: 175,
      weightKg: 82,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Noida',
      state: 'Uttar Pradesh',
    },
    disclosures: [
      { disclosureType: DisclosureType.SURGERY, procedureName: 'Lumbar Discectomy L4-L5', procedureDate: new Date('2021-06-15'), hospitalName: 'Max Hospital Noida', outcome: 'Successful, symptom-free' },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Lumbar Disc Herniation', icdCode: 'M51.1', diagnosisDate: new Date('2021-03-10'), conditionStatus: ConditionStatus.RESOLVED, treatmentStatus: TreatmentStatus.MONITORING },
    ],
    documents: [{
      documentType: DocumentType.DISCHARGE_SUMMARY,
      fileName: 'spine_surgery.pdf',
      extractedText: 'Discharge Summary - Spine Surgery\nPatient: Deepak Sharma\n\nProcedure: Microdiscectomy L4-L5\nIndication: Lumbar disc herniation with radiculopathy\n\n3-Year Follow-up:\n- No recurrence of disc herniation\n- Full neurological recovery\n- No residual pain or weakness\n- MRI (2023): Post-surgical changes, no new disc issues\n\nCurrent Activity: Normal, including regular exercise\nLifts weights, plays badminton\n\nPrognosis: Excellent',
    }],
    testResults: [],
  });
  console.log('Case 45 created: Health Individual - Prior spine surgery');

  // ============================================
  // CASE 46: HEALTH_INDIVIDUAL - Complex - Autoimmune (Rheumatoid Arthritis)
  // ============================================
  const case46 = await createCase({
    caseReference: 'UW-2024-046',
    proposalId: 'PROP-046',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 1000000, // 10 Lakhs
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.86,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-046',
      firstName: 'Kavitha',
      lastName: 'Nair',
      dateOfBirth: new Date('1978-07-22'),
      gender: Gender.FEMALE,
      occupation: 'Lawyer',
      annualIncome: 4500000,
      heightCm: 160,
      weightKg: 58,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Kochi',
      state: 'Kerala',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Rheumatoid Arthritis', icdCode: 'M05', diagnosisDate: new Date('2016-04-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Methotrexate', dosage: '15mg', frequency: 'once weekly', indication: 'Rheumatoid arthritis' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Hydroxychloroquine', dosage: '200mg', frequency: 'twice daily', indication: 'Rheumatoid arthritis' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Folic Acid', dosage: '5mg', frequency: 'once weekly', indication: 'Methotrexate supplementation' },
    ],
    documents: [{
      documentType: DocumentType.SPECIALIST_REPORT,
      fileName: 'rheum_ra_report.pdf',
      extractedText: 'Rheumatology Follow-up - RA\nPatient: Kavitha Nair\n\nDiagnosis: Seropositive Rheumatoid Arthritis\nDuration: 8 years\n\nDisease Activity:\n- DAS28-CRP: 2.4 (Low disease activity)\n- No active synovitis\n- No erosions on X-ray\n\nOrgan Involvement: None\nNo extra-articular manifestations\n\nMedications: MTX + HCQ (DMARD combination)\nNo biologics required\n\nFunctional Status: Fully independent\nNo work limitations\n\nMonitoring: LFT, CBC every 3 months - all normal',
    }],
    testResults: [
      { testCode: 'CRP', testName: 'C-Reactive Protein', resultValue: '4', resultUnit: 'mg/L', referenceRangeText: '< 10 mg/L', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
      { testCode: 'ESR', testName: 'ESR', resultValue: '18', resultUnit: 'mm/hr', referenceRangeText: '< 20 mm/hr', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 46 created: Health Individual - Rheumatoid arthritis');

  // ============================================
  // CASE 47: HEALTH_INDIVIDUAL - Routine - Migraine History
  // ============================================
  const case47 = await createCase({
    caseReference: 'UW-2024-047',
    proposalId: 'PROP-047',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 500000, // 5 Lakhs
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.83,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-047',
      firstName: 'Swati',
      lastName: 'Desai',
      dateOfBirth: new Date('1992-02-28'),
      gender: Gender.FEMALE,
      occupation: 'UX Designer',
      annualIncome: 1800000,
      heightCm: 163,
      weightKg: 56,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Pune',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Migraine without Aura', icdCode: 'G43.0', diagnosisDate: new Date('2015-09-01'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Sumatriptan', dosage: '50mg', frequency: 'as needed', indication: 'Acute migraine' },
    ],
    documents: [{
      documentType: DocumentType.MEDICAL_REPORT,
      fileName: 'neurology_migraine.pdf',
      extractedText: 'Neurology Consultation - Migraine\nPatient: Swati Desai\n\nDiagnosis: Episodic migraine without aura\nFrequency: 2-3 episodes/month\nSeverity: Moderate (responsive to triptans)\n\nNo neurological deficits\nMRI Brain: Normal\n\nTriggers: Stress, sleep deprivation, menstrual\nNo medication overuse\nNo ER visits or hospitalizations\n\nManagement: Lifestyle + acute treatment\nNo prophylactic medication needed',
    }],
    testResults: [],
  });
  console.log('Case 47 created: Health Individual - Migraine');

  // ============================================
  // CASE 48: HEALTH_INDIVIDUAL - Complex - Multiple Comorbidities
  // ============================================
  const case48 = await createCase({
    caseReference: 'UW-2024-048',
    proposalId: 'PROP-048',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 1500000, // 15 Lakhs
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.93,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-048',
      firstName: 'Mohan',
      lastName: 'Lal',
      dateOfBirth: new Date('1960-08-15'),
      gender: Gender.MALE,
      occupation: 'Retired Government Officer',
      annualIncome: 1000000,
      heightCm: 165,
      weightKg: 88,
      smokingStatus: SmokingStatus.FORMER,
      smokingQuitDate: new Date('2010-01-01'),
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Bhopal',
      state: 'Madhya Pradesh',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Type 2 Diabetes Mellitus', icdCode: 'E11', diagnosisDate: new Date('2005-03-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Essential Hypertension', icdCode: 'I10', diagnosisDate: new Date('2008-06-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Benign Prostatic Hyperplasia', icdCode: 'N40', diagnosisDate: new Date('2020-09-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Glimepiride', dosage: '2mg', frequency: 'once daily', indication: 'Diabetes' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Metformin', dosage: '1000mg', frequency: 'twice daily', indication: 'Diabetes' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Losartan', dosage: '50mg', frequency: 'once daily', indication: 'Hypertension' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Tamsulosin', dosage: '0.4mg', frequency: 'once daily', indication: 'BPH' },
    ],
    documents: [{
      documentType: DocumentType.MEDICAL_REPORT,
      fileName: 'comprehensive_health.pdf',
      extractedText: 'Comprehensive Health Assessment\nPatient: Mohan Lal, 64 years\n\nMultiple Comorbidities:\n\n1. Diabetes (19 years):\n- HbA1c: 7.5%\n- No retinopathy\n- No nephropathy (eGFR 72)\n- No neuropathy\n\n2. Hypertension (16 years):\n- BP: 138/86 (borderline control)\n- No LVH\n- Mild diastolic dysfunction\n\n3. BPH (4 years):\n- PSA: 2.1 (normal)\n- Good symptomatic control\n\nCardiac: No CAD\nOverall: Multiple controlled conditions, reasonably stable',
    }],
    testResults: [
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '7.5', resultUnit: '%', referenceRangeText: '< 7%', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-10') },
      { testCode: 'EGFR', testName: 'eGFR', resultValue: '72', resultUnit: 'mL/min', referenceRangeText: '> 60 mL/min', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
      { testCode: 'PSA', testName: 'PSA', resultValue: '2.1', resultUnit: 'ng/mL', referenceRangeText: '< 4 ng/mL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 48 created: Health Individual - Multiple comorbidities');

  // ============================================
  // CASE 49: CRITICAL_ILLNESS - Moderate - Prior TIA
  // ============================================
  const case49 = await createCase({
    caseReference: 'UW-2024-049',
    proposalId: 'PROP-049',
    productCode: 'CRITICAL_ILLNESS',
    productName: 'Critical Illness Cover',
    sumAssured: 1000000, // 10 Lakhs CI cover
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.84,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-049',
      firstName: 'Vijay',
      lastName: 'Patil',
      dateOfBirth: new Date('1972-11-05'),
      gender: Gender.MALE,
      occupation: 'Civil Contractor',
      annualIncome: 5000000,
      heightCm: 172,
      weightKg: 80,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Nashik',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Transient Ischemic Attack', icdCode: 'G45', diagnosisDate: new Date('2022-07-15'), conditionStatus: ConditionStatus.RESOLVED, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Carotid Artery Stenosis', icdCode: 'I65.2', diagnosisDate: new Date('2022-07-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Aspirin', dosage: '75mg', frequency: 'once daily', indication: 'Secondary stroke prevention' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Atorvastatin', dosage: '40mg', frequency: 'once daily', indication: 'Secondary prevention' },
    ],
    documents: [{
      documentType: DocumentType.SPECIALIST_REPORT,
      fileName: 'neuro_tia.pdf',
      extractedText: 'Neurology Follow-up - Post TIA\nPatient: Vijay Patil\n\nEvent: TIA in July 2022\nSymptoms: Brief left arm weakness (resolved in 30 min)\n\nInvestigations:\n- MRI Brain: No infarct\n- Carotid Doppler: 40% stenosis right ICA\n- Echo: Normal, no thrombus\n- Holter: No AF\n\n18-month Follow-up:\n- No recurrent events\n- On antiplatelet + statin\n- BP well controlled\n- Carotid stenosis stable (not progressed)\n\nRisk: Moderate for future stroke',
    }],
    testResults: [
      { testCode: 'LDL', testName: 'LDL Cholesterol', resultValue: '78', resultUnit: 'mg/dL', referenceRangeText: '< 70 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-05') },
    ],
  });
  console.log('Case 49 created: Critical Illness - Prior TIA');

  // ============================================
  // CASE 50: HEALTH_INDIVIDUAL - Routine - First-time Buyer (Floater)
  // ============================================
  const case50 = await createCase({
    caseReference: 'UW-2024-050',
    proposalId: 'PROP-050',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 1000000, // 10 Lakhs family floater
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.90,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-050',
      firstName: 'Amit',
      lastName: 'Tiwari',
      dateOfBirth: new Date('1988-06-20'),
      gender: Gender.MALE,
      maritalStatus: MaritalStatus.MARRIED,
      occupation: 'Product Manager',
      annualIncome: 2800000,
      heightCm: 176,
      weightKg: 75,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Bangalore',
      state: 'Karnataka',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'floater_proposal.pdf',
      extractedText: 'Family Floater Health Insurance Proposal\nPrimary: Amit Tiwari, 36 years, Male\nSpouse: Priyanka Tiwari, 34 years, Female\nChild: Aryan Tiwari, 5 years, Male\n\nAll members healthy, no pre-existing conditions\nNo prior health insurance\nFirst-time buyers\n\nRequesting: 10L Family Floater\nMaternity benefit not required (family complete)',
    }],
    testResults: [],
  });
  console.log('Case 50 created: Health Individual - Family floater routine');

  // ============================================
  // CASE 51: HEALTH_INDIVIDUAL - Moderate - Epilepsy (Controlled)
  // ============================================
  const case51 = await createCase({
    caseReference: 'UW-2024-051',
    proposalId: 'PROP-051',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 500000, // 5 Lakhs
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.79,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-051',
      firstName: 'Ravi',
      lastName: 'Shankar',
      dateOfBirth: new Date('1990-03-15'),
      gender: Gender.MALE,
      occupation: 'Accountant',
      annualIncome: 900000,
      heightCm: 170,
      weightKg: 68,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Indore',
      state: 'Madhya Pradesh',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Epilepsy - Generalized', icdCode: 'G40.3', diagnosisDate: new Date('2012-08-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Levetiracetam', dosage: '500mg', frequency: 'twice daily', indication: 'Epilepsy' },
    ],
    documents: [{
      documentType: DocumentType.SPECIALIST_REPORT,
      fileName: 'neuro_epilepsy.pdf',
      extractedText: 'Neurology Review - Epilepsy\nPatient: Ravi Shankar\n\nDiagnosis: Idiopathic generalized epilepsy\nOnset: Age 22\nSeizure type: Generalized tonic-clonic\n\nControl Status:\n- Seizure-free for 4 years on monotherapy\n- Last seizure: 2020\n- No breakthrough seizures\n- No status epilepticus ever\n\nEEG: Normal background, no epileptiform activity\nMRI Brain: Normal\n\nDriving: Licensed (seizure-free > 2 years)\nOccupation: Office work (no restrictions)\n\nPrognosis: Good with continued medication',
    }],
    testResults: [],
  });
  console.log('Case 51 created: Health Individual - Epilepsy controlled');

  // ============================================
  // CASE 52: HEALTH_GROUP - Routine - Startup Company
  // ============================================
  const case52 = await createCase({
    caseReference: 'UW-2024-052',
    proposalId: 'PROP-052',
    productCode: 'HEALTH_GROUP',
    productName: 'Group Health Insurance',
    sumAssured: 500000, // 5 Lakhs per member
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.88,
    channel: Channel.CORPORATE,
    applicant: {
      applicantId: 'APP-052',
      firstName: 'NexGen',
      lastName: 'AI Labs Pvt Ltd',
      dateOfBirth: new Date('2020-01-01'),
      gender: Gender.MALE,
      occupation: 'AI/ML Startup',
      annualIncome: 20000000,
      heightCm: 170,
      weightKg: 70,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Bangalore',
      state: 'Karnataka',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'startup_group.pdf',
      extractedText: 'Group Health Insurance Proposal\nCompany: NexGen AI Labs Pvt Ltd\nIndustry: AI/ML Technology\nEmployee Count: 45\nAverage Age: 28 years\n\nProposed Coverage: 5L per employee\nDependents: Spouse + 2 children\nMaternity: Included\n\nDemographics:\n- 80% male, 20% female\n- 95% under age 35\n- All desk-based work\n- No hazardous activities\n\nFirst-time group insurance buyer',
    }],
    testResults: [],
  });
  console.log('Case 52 created: Health Group - Startup');

  // ============================================
  // CASE 53: CRITICAL_ILLNESS - Routine - Middle-aged Female
  // ============================================
  const case53 = await createCase({
    caseReference: 'UW-2024-053',
    proposalId: 'PROP-053',
    productCode: 'CRITICAL_ILLNESS',
    productName: 'Critical Illness Cover',
    sumAssured: 1500000, // 15 Lakhs CI cover
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.87,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-053',
      firstName: 'Rekha',
      lastName: 'Mishra',
      dateOfBirth: new Date('1978-05-10'),
      gender: Gender.FEMALE,
      occupation: 'School Teacher',
      annualIncome: 700000,
      heightCm: 158,
      weightKg: 62,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Patna',
      state: 'Bihar',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'ci_female.pdf',
      extractedText: 'Critical Illness Cover Proposal\nApplicant: Rekha Mishra, 46 years, Female\nOccupation: School Teacher\n\nNo pre-existing conditions\nNo family history of critical illness\nNon-smoker, Non-alcoholic\nBMI: 24.8 (Normal)\nBP: 120/80\n\nRegular health checkups - all normal\nLast mammogram (2023): Normal\nPap smear: Normal\n\nRequesting: 15L Critical Illness Cover',
    }],
    testResults: [
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '95', resultUnit: 'mg/dL', referenceRangeText: '70-100 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-08') },
    ],
  });
  console.log('Case 53 created: Critical Illness - Routine middle-aged female');

  // ============================================
  // CASE 54: HEALTH_INDIVIDUAL - Complex - HIV Positive (Well Controlled)
  // ============================================
  const case54 = await createCase({
    caseReference: 'UW-2024-054',
    proposalId: 'PROP-054',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 500000, // 5 Lakhs
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.90,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-054',
      firstName: 'Santosh',
      lastName: 'Kumar',
      dateOfBirth: new Date('1982-09-25'),
      gender: Gender.MALE,
      occupation: 'NGO Worker',
      annualIncome: 600000,
      heightCm: 168,
      weightKg: 65,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'HIV Infection', icdCode: 'B20', diagnosisDate: new Date('2015-04-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'TLE (Tenofovir/Lamivudine/Efavirenz)', dosage: 'Fixed dose', frequency: 'once daily', indication: 'HIV ART' },
    ],
    documents: [{
      documentType: DocumentType.SPECIALIST_REPORT,
      fileName: 'hiv_report.pdf',
      extractedText: 'HIV/AIDS Management Report\nPatient: Santosh Kumar\n\nDiagnosis: HIV-1 infection\nOn ART since: 2015 (9 years)\n\nCurrent Status:\n- Viral Load: Undetectable (<20 copies/mL)\n- CD4 Count: 650 cells/mm3 (Normal range)\n- No opportunistic infections ever\n- No AIDS-defining illness\n\nART Regimen: TLE (First-line)\nAdherence: Excellent (>95%)\n\nComorbidities: None\nGeneral Health: Good, fully functional\n\nLife expectancy: Near-normal with continued ART',
    }],
    testResults: [
      { testCode: 'CD4', testName: 'CD4 Count', resultValue: '650', resultUnit: 'cells/mm3', referenceRangeText: '500-1500 cells/mm3', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 54 created: Health Individual - HIV well controlled');

  // ============================================
  // CASE 55: HEALTH_INDIVIDUAL - Moderate - Pregnancy (Existing)
  // ============================================
  const case55 = await createCase({
    caseReference: 'UW-2024-055',
    proposalId: 'PROP-055',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 750000, // 7.5 Lakhs
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.76,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-055',
      firstName: 'Anita',
      lastName: 'Chopra',
      dateOfBirth: new Date('1991-12-08'),
      gender: Gender.FEMALE,
      maritalStatus: MaritalStatus.MARRIED,
      occupation: 'Interior Designer',
      annualIncome: 1500000,
      heightCm: 162,
      weightKg: 65,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Delhi',
      state: 'Delhi',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Pregnancy', icdCode: 'Z33', diagnosisDate: new Date('2023-11-01'), conditionStatus: ConditionStatus.ACTIVE, treatmentStatus: TreatmentStatus.MONITORING },
    ],
    documents: [{
      documentType: DocumentType.MEDICAL_REPORT,
      fileName: 'antenatal_report.pdf',
      extractedText: 'Antenatal Report\nPatient: Anita Chopra\n\nG1P0 at 16 weeks gestation\nEDD: June 2024\n\nAntenatal Profile:\n- Blood group: B+\n- Hb: 11.8 g/dL\n- All screening tests normal\n- NT scan: Normal\n- Anomaly scan: Awaited\n\nNo high-risk features:\n- Age < 35\n- No GDM\n- No PIH\n- No previous losses\n\nPlan: Standard antenatal care\nDelivery: Anticipated normal',
    }],
    testResults: [
      { testCode: 'HB', testName: 'Hemoglobin', resultValue: '11.8', resultUnit: 'g/dL', referenceRangeText: '11-14 g/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-05') },
    ],
  });
  console.log('Case 55 created: Health Individual - Current pregnancy');

  // ============================================
  // CASE 56: HEALTH_GROUP - Moderate - Healthcare Workers
  // ============================================
  const case56 = await createCase({
    caseReference: 'UW-2024-056',
    proposalId: 'PROP-056',
    productCode: 'HEALTH_GROUP',
    productName: 'Group Health Insurance',
    sumAssured: 750000, // 7.5 Lakhs per member
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.80,
    channel: Channel.CORPORATE,
    applicant: {
      applicantId: 'APP-056',
      firstName: 'City',
      lastName: 'Multi-Specialty Hospital',
      dateOfBirth: new Date('1995-01-01'),
      gender: Gender.MALE,
      occupation: 'Healthcare',
      annualIncome: 200000000,
      heightCm: 170,
      weightKg: 70,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Chennai',
      state: 'Tamil Nadu',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'hospital_group.pdf',
      extractedText: 'Group Health Insurance Proposal\nOrganization: City Multi-Specialty Hospital\nIndustry: Healthcare\nEmployee Count: 420\nAverage Age: 35 years\n\nProposed Coverage: 7.5L per employee\nDependents: Spouse + 2 children\n\nOccupational Categories:\n- Doctors: 80\n- Nurses: 150\n- Paramedical: 100\n- Admin: 90\n\nRisk Factors:\n- Exposure to infectious diseases\n- Needle stick injuries\n- Long working hours\n- Night shifts\n\nPrior Claims: 9% (slightly above average)',
    }],
    testResults: [],
  });
  console.log('Case 56 created: Health Group - Healthcare workers');

  // ============================================
  // CASE 57: CRITICAL_ILLNESS - Complex - Prior Cancer (Prostate, Early Stage)
  // ============================================
  const case57 = await createCase({
    caseReference: 'UW-2024-057',
    proposalId: 'PROP-057',
    productCode: 'CRITICAL_ILLNESS',
    productName: 'Critical Illness Cover',
    sumAssured: 1000000, // 10 Lakhs CI cover
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.91,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-057',
      firstName: 'Gopal',
      lastName: 'Krishnamurthy',
      dateOfBirth: new Date('1958-04-18'),
      gender: Gender.MALE,
      occupation: 'Retired Engineer',
      annualIncome: 800000,
      heightCm: 170,
      weightKg: 72,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Coimbatore',
      state: 'Tamil Nadu',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Prostate Cancer', icdCode: 'C61', diagnosisDate: new Date('2019-08-10'), conditionStatus: ConditionStatus.RESOLVED, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.SURGERY, procedureName: 'Radical Prostatectomy', procedureDate: new Date('2019-09-15'), hospitalName: 'PSG Hospitals', outcome: 'Successful, clear margins' },
    ],
    documents: [{
      documentType: DocumentType.SPECIALIST_REPORT,
      fileName: 'urology_prostate.pdf',
      extractedText: 'Urology/Oncology Follow-up\nPatient: Gopal Krishnamurthy\n\nDiagnosis: Prostate adenocarcinoma, Gleason 3+3=6, Stage T1c\nTreatment: Radical prostatectomy (Sept 2019)\nPathology: Confined to prostate, negative margins\n\n5-Year Follow-up:\n- PSA: Undetectable (<0.1 ng/mL)\n- No biochemical recurrence\n- No radiation or hormonal therapy needed\n\nSide Effects:\n- Mild stress incontinence (resolved)\n- Erectile dysfunction (on PDE5i)\n\nPrognosis: Excellent. Low-risk disease, cured.',
    }],
    testResults: [
      { testCode: 'PSA', testName: 'PSA', resultValue: '<0.1', resultUnit: 'ng/mL', referenceRangeText: '< 4 ng/mL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 57 created: Critical Illness - Prostate cancer survivor');

  // ============================================
  // CASE 58: HEALTH_INDIVIDUAL - Routine - Portability from Another Insurer
  // ============================================
  const case58 = await createCase({
    caseReference: 'UW-2024-058',
    proposalId: 'PROP-058',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 1500000, // 15 Lakhs (upgrade from 10L)
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.85,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-058',
      firstName: 'Shalini',
      lastName: 'Mathur',
      dateOfBirth: new Date('1980-07-22'),
      gender: Gender.FEMALE,
      occupation: 'Corporate Trainer',
      annualIncome: 2000000,
      heightCm: 160,
      weightKg: 60,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Gurgaon',
      state: 'Haryana',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'portability_proposal.pdf',
      extractedText: 'Health Insurance Portability Proposal\nApplicant: Shalini Mathur, 44 years\n\nPrevious Policy:\n- Insurer: XYZ Insurance\n- Sum Insured: 10 Lakhs\n- Policy tenure: 8 years (continuous)\n- No claims in past 4 years\n- Last claim: 2020 (appendectomy, Rs 85,000)\n\nPortability Request:\n- New coverage: 15 Lakhs\n- Seeking better network hospitals\n- No new pre-existing conditions\n\nWaiting periods already served with previous insurer',
    }],
    testResults: [],
  });
  console.log('Case 58 created: Health Individual - Portability');

  // ============================================
  // CASE 59: HEALTH_INDIVIDUAL - Moderate - Sleep Apnea
  // ============================================
  const case59 = await createCase({
    caseReference: 'UW-2024-059',
    proposalId: 'PROP-059',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 750000, // 7.5 Lakhs
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.77,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-059',
      firstName: 'Ajay',
      lastName: 'Bhardwaj',
      dateOfBirth: new Date('1976-02-14'),
      gender: Gender.MALE,
      occupation: 'Sales Director',
      annualIncome: 4000000,
      heightCm: 175,
      weightKg: 98,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Obstructive Sleep Apnea', icdCode: 'G47.33', diagnosisDate: new Date('2022-03-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
    ],
    documents: [{
      documentType: DocumentType.SPECIALIST_REPORT,
      fileName: 'sleep_study.pdf',
      extractedText: 'Sleep Medicine Consultation\nPatient: Ajay Bhardwaj\n\nDiagnosis: Moderate Obstructive Sleep Apnea\nAHI: 22 events/hour (moderate)\n\nSymptoms: Snoring, daytime sleepiness\nEpworth Score: 14 (pre-treatment)\n\nTreatment: CPAP therapy\nCompliance: Good (>5 hours/night)\nPost-CPAP AHI: 3 events/hour\n\nAssociated Factors:\n- BMI: 32 (Obese Class I)\n- No hypertension (yet)\n- No cardiac arrhythmias\n\nWeight loss recommended\nEchocardiogram: Normal',
    }],
    testResults: [],
  });
  console.log('Case 59 created: Health Individual - Sleep apnea');

  // ============================================
  // CASE 60: HEALTH_INDIVIDUAL - Complex - Lupus (SLE)
  // ============================================
  const case60 = await createCase({
    caseReference: 'UW-2024-060',
    proposalId: 'PROP-060',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 1000000, // 10 Lakhs
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.89,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-060',
      firstName: 'Prerna',
      lastName: 'Singh',
      dateOfBirth: new Date('1988-10-05'),
      gender: Gender.FEMALE,
      occupation: 'Journalist',
      annualIncome: 1200000,
      heightCm: 160,
      weightKg: 52,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Delhi',
      state: 'Delhi',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Systemic Lupus Erythematosus', icdCode: 'M32', diagnosisDate: new Date('2017-06-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Hydroxychloroquine', dosage: '200mg', frequency: 'twice daily', indication: 'SLE maintenance' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Azathioprine', dosage: '50mg', frequency: 'once daily', indication: 'SLE immunosuppression' },
    ],
    documents: [{
      documentType: DocumentType.SPECIALIST_REPORT,
      fileName: 'rheum_sle.pdf',
      extractedText: 'Rheumatology Follow-up - SLE\nPatient: Prerna Singh\n\nDiagnosis: Systemic Lupus Erythematosus\nDuration: 7 years\nSLEDAI Score: 2 (Low disease activity)\n\nOrgan Involvement:\n- Skin: Photosensitivity, oral ulcers (controlled)\n- Joints: Arthralgia (no deformity)\n- Kidney: No nephritis (normal creatinine, no proteinuria)\n- Hematologic: Mild anemia (Hb 10.5), stable\n- CNS: Not involved\n\nComplements: C3/C4 normal\nAnti-dsDNA: Low positive\n\nNo major flares in 3 years\nNo steroid requirement currently\n\nPrognosis: Stable, mild-moderate disease',
    }],
    testResults: [
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '0.8', resultUnit: 'mg/dL', referenceRangeText: '0.6-1.1 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
      { testCode: 'HB', testName: 'Hemoglobin', resultValue: '10.5', resultUnit: 'g/dL', referenceRangeText: '12-15 g/dL', abnormalFlag: AbnormalFlag.LOW, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 60 created: Health Individual - SLE');

  // ============================================
  // CASE 61: CRITICAL_ILLNESS - Moderate - Smoker with Risk Factors
  // ============================================
  const case61 = await createCase({
    caseReference: 'UW-2024-061',
    proposalId: 'PROP-061',
    productCode: 'CRITICAL_ILLNESS',
    productName: 'Critical Illness Cover',
    sumAssured: 2000000, // 20 Lakhs CI cover
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.81,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-061',
      firstName: 'Manoj',
      lastName: 'Tripathi',
      dateOfBirth: new Date('1975-12-20'),
      gender: Gender.MALE,
      occupation: 'Restaurant Owner',
      annualIncome: 3500000,
      heightCm: 172,
      weightKg: 85,
      smokingStatus: SmokingStatus.CURRENT,
      smokingQuantity: '15 cigarettes/day',
      smokingDurationYears: 25,
      alcoholStatus: AlcoholStatus.REGULAR,
      alcoholQuantity: '3-4 drinks/week',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.MEDICAL_REPORT,
      fileName: 'smoker_checkup.pdf',
      extractedText: 'Executive Health Checkup\nPatient: Manoj Tripathi, 49 years\n\nRisk Factors:\n- Smoker: 15 cigarettes/day for 25 years (37.5 pack-years)\n- Regular alcohol use\n- BMI: 28.7 (Overweight)\n- Sedentary lifestyle\n\nCurrent Health:\n- BP: 134/88 (borderline)\n- FBS: 108 mg/dL (prediabetes range)\n- Lipids: LDL 142, TG 180\n- Chest X-ray: Clear\n- Spirometry: Mild obstructive pattern (FEV1 78%)\n\nNo diagnosed conditions yet\nAdvised: Smoking cessation, lifestyle modification',
    }],
    testResults: [
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '108', resultUnit: 'mg/dL', referenceRangeText: '70-100 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-12') },
      { testCode: 'LDL', testName: 'LDL Cholesterol', resultValue: '142', resultUnit: 'mg/dL', referenceRangeText: '< 100 mg/dL', abnormalFlag: AbnormalFlag.HIGH, testDate: new Date('2024-01-12') },
    ],
  });
  console.log('Case 61 created: Critical Illness - Smoker with risk factors');

  // ============================================
  // CASE 62: HEALTH_INDIVIDUAL - Routine - Renewal with No Claims
  // ============================================
  const case62 = await createCase({
    caseReference: 'UW-2024-062',
    proposalId: 'PROP-062',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 1000000, // 10 Lakhs
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.95,
    channel: Channel.ONLINE,
    applicant: {
      applicantId: 'APP-062',
      firstName: 'Vikrant',
      lastName: 'Mehta',
      dateOfBirth: new Date('1985-04-08'),
      gender: Gender.MALE,
      occupation: 'Civil Servant',
      annualIncome: 1500000,
      heightCm: 178,
      weightKg: 76,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Chandigarh',
      state: 'Chandigarh',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'renewal_noclaim.pdf',
      extractedText: 'Health Insurance Renewal\nApplicant: Vikrant Mehta, 39 years\n\nExisting Policy:\n- Sum Insured: 10 Lakhs\n- Tenure: 5 years (since 2019)\n- Claims: NIL (No claims bonus accumulated)\n\nHealth Status:\n- No new conditions since last renewal\n- No hospitalizations\n- Annual checkup: Normal\n\nRequesting: Renewal at same coverage\nNo changes to dependents',
    }],
    testResults: [],
  });
  console.log('Case 62 created: Health Individual - Renewal no claims');

  // ============================================
  // CASE 63: HEALTH_INDIVIDUAL - Complex - Organ Transplant Recipient (Kidney)
  // ============================================
  const case63 = await createCase({
    caseReference: 'UW-2024-063',
    proposalId: 'PROP-063',
    productCode: 'HEALTH_INDIVIDUAL',
    productName: 'Individual Health Insurance',
    sumAssured: 1500000, // 15 Lakhs
    status: CaseStatus.AWAITING_DECISION,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.94,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-063',
      firstName: 'Ramesh',
      lastName: 'Agarwal',
      dateOfBirth: new Date('1965-03-15'),
      gender: Gender.MALE,
      occupation: 'Businessman',
      annualIncome: 5000000,
      heightCm: 170,
      weightKg: 70,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Kolkata',
      state: 'West Bengal',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Chronic Kidney Disease - Status Post Transplant', icdCode: 'N18', diagnosisDate: new Date('2010-06-15'), conditionStatus: ConditionStatus.RESOLVED, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.SURGERY, procedureName: 'Renal Transplant (Living Donor)', procedureDate: new Date('2015-08-20'), hospitalName: 'Apollo Hospital Kolkata', outcome: 'Successful' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Tacrolimus', dosage: '3mg', frequency: 'twice daily', indication: 'Immunosuppression' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Mycophenolate', dosage: '500mg', frequency: 'twice daily', indication: 'Immunosuppression' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Prednisolone', dosage: '5mg', frequency: 'once daily', indication: 'Immunosuppression' },
    ],
    documents: [{
      documentType: DocumentType.SPECIALIST_REPORT,
      fileName: 'transplant_followup.pdf',
      extractedText: 'Nephrology/Transplant Follow-up\nPatient: Ramesh Agarwal\n\nKidney Transplant: Living related donor (wife), Aug 2015\nTime since transplant: 8.5 years\n\nGraft Function:\n- Creatinine: 1.3 mg/dL (stable)\n- eGFR: 58 mL/min (CKD Stage 3a - expected post-transplant)\n- Proteinuria: Trace\n\nComplications: None\n- No rejection episodes\n- No infections\n- No malignancy\n\nImmunosuppression: Triple therapy (stable doses)\nTacrolimus trough: 5.2 ng/mL (target range)\n\nOverall: Excellent graft survival, stable function',
    }],
    testResults: [
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '1.3', resultUnit: 'mg/dL', referenceRangeText: '0.7-1.3 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-10') },
      { testCode: 'EGFR', testName: 'eGFR', resultValue: '58', resultUnit: 'mL/min', referenceRangeText: '> 60 mL/min', abnormalFlag: AbnormalFlag.LOW, testDate: new Date('2024-01-10') },
    ],
  });
  console.log('Case 63 created: Health Individual - Kidney transplant recipient');

  // ============================================
  // CASE 64: HEALTH_GROUP - Routine - Educational Institution
  // ============================================
  const case64 = await createCase({
    caseReference: 'UW-2024-064',
    proposalId: 'PROP-064',
    productCode: 'HEALTH_GROUP',
    productName: 'Group Health Insurance',
    sumAssured: 300000, // 3 Lakhs per member
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.90,
    channel: Channel.CORPORATE,
    applicant: {
      applicantId: 'APP-064',
      firstName: 'Delhi',
      lastName: 'Public School Trust',
      dateOfBirth: new Date('1970-01-01'),
      gender: Gender.MALE,
      occupation: 'Education',
      annualIncome: 100000000,
      heightCm: 170,
      weightKg: 70,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Delhi',
      state: 'Delhi',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.INSURANCE_FORM,
      fileName: 'school_group.pdf',
      extractedText: 'Group Health Insurance Proposal\nOrganization: Delhi Public School Trust\nType: Educational Institution\nEmployee Count: 320\nAverage Age: 38 years\n\nProposed Coverage: 3L per employee\nDependents: Spouse + 2 children\n\nEmployee Categories:\n- Teachers: 180\n- Administrative: 80\n- Support staff: 60\n\nDemographics:\n- 65% female (teachers)\n- Low-risk occupation\n- Regular working hours\n\nPrior Claims: 6% (below average)',
    }],
    testResults: [],
  });
  console.log('Case 64 created: Health Group - Educational institution');

  // ============================================
  // CASE 65: CRITICAL_ILLNESS - Routine - High Sum Assured
  // ============================================
  const case65 = await createCase({
    caseReference: 'UW-2024-065',
    proposalId: 'PROP-065',
    productCode: 'CRITICAL_ILLNESS',
    productName: 'Critical Illness Cover',
    sumAssured: 10000000, // 1 Crore CI cover
    status: CaseStatus.IN_PROGRESS,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.82,
    channel: Channel.AGENT,
    applicant: {
      applicantId: 'APP-065',
      firstName: 'Vikas',
      lastName: 'Oberoi',
      dateOfBirth: new Date('1980-08-12'),
      gender: Gender.MALE,
      occupation: 'CEO - Tech Company',
      annualIncome: 25000000,
      heightCm: 180,
      weightKg: 82,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    disclosures: [],
    documents: [{
      documentType: DocumentType.MEDICAL_REPORT,
      fileName: 'executive_checkup.pdf',
      extractedText: 'Executive Health Checkup - Premium\nPatient: Vikas Oberoi, 44 years\n\nComplete Health Assessment:\n- All vitals normal\n- BP: 124/78\n- BMI: 25.3 (slightly overweight)\n\nCardiac:\n- ECG: Normal\n- 2D Echo: Normal\n- TMT: Negative\n- CT Coronary Calcium Score: 0\n\nCancer Screening:\n- PSA: 0.8 (normal)\n- Chest CT: Clear\n- Colonoscopy: Normal\n\nMetabolic:\n- FBS: 94, HbA1c: 5.4%\n- Lipids: All optimal\n- Liver/Kidney: Normal\n\nConclusion: Excellent health status',
    }],
    testResults: [
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '94', resultUnit: 'mg/dL', referenceRangeText: '70-100 mg/dL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-15') },
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '5.4', resultUnit: '%', referenceRangeText: '< 5.7%', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-15') },
      { testCode: 'PSA', testName: 'PSA', resultValue: '0.8', resultUnit: 'ng/mL', referenceRangeText: '< 4 ng/mL', abnormalFlag: AbnormalFlag.NORMAL, testDate: new Date('2024-01-15') },
    ],
  });
  console.log('Case 65 created: Critical Illness - High SA executive');

  console.log('\n=== Seed completed successfully ===');
  console.log('Total cases created: 65 (27 Term Life + 38 Health Insurance)');

  await dataSource.destroy();
}

async function createCase(data: any): Promise<Case> {
  const dataSource2 = await new DataSource({
    type: 'sqlite',
    database: 'uw_decision_support.db',
    entities: [Case, Applicant, MedicalDisclosure, Document, TestResult, TestRecommendation, Decision, Communication, AuditLog, Override, RiskFactor],
    synchronize: true,
  }).initialize();

  const caseRepo = dataSource2.getRepository(Case);
  const applicantRepo = dataSource2.getRepository(Applicant);
  const disclosureRepo = dataSource2.getRepository(MedicalDisclosure);
  const documentRepo = dataSource2.getRepository(Document);
  const testResultRepo = dataSource2.getRepository(TestResult);

  // Create applicant
  const applicantData = {
    ...data.applicant,
    addressLine1: '123 Demo Street',
    postalCode: '400001',
    phonePrimary: '+91-9876543210',
    email: `${data.applicant.firstName.toLowerCase()}.${data.applicant.lastName.toLowerCase()}@example.com`,
  };

  // Calculate BMI if not provided
  if (!applicantData.bmi && applicantData.heightCm && applicantData.weightKg) {
    const heightM = applicantData.heightCm / 100;
    applicantData.bmi = applicantData.weightKg / (heightM * heightM);
  }

  const applicant = await applicantRepo.save(applicantData);

  // Create case
  const caseData = {
    caseReference: data.caseReference,
    proposalId: data.proposalId,
    proposalDate: new Date(),
    productCode: data.productCode,
    productName: data.productName,
    sumAssured: data.sumAssured,
    sumAssuredCurrency: 'INR',
    status: data.status,
    complexityTier: data.complexityTier,
    complexityConfidence: data.complexityConfidence,
    channel: data.channel,
    applicant: applicant,
    slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  };
  const caseEntity = await caseRepo.save(caseData);

  // Create disclosures
  for (const discData of data.disclosures || []) {
    await disclosureRepo.save({
      ...discData,
      case: caseEntity,
    });
  }

  // Create documents
  for (const docData of data.documents || []) {
    await documentRepo.save({
      documentType: docData.documentType,
      receivedDate: new Date(),
      sourceSystem: 'demo_seed',
      fileName: docData.fileName,
      fileType: 'application/pdf',
      extractionStatus: ExtractionStatus.EXTRACTED,
      extractionMethod: ExtractionMethod.PDF_NATIVE,
      extractionConfidence: 0.95,
      extractedText: docData.extractedText,
      case: caseEntity,
    });
  }

  // Create test results
  for (const testData of data.testResults || []) {
    await testResultRepo.save({
      ...testData,
      source: ResultSource.LAB_FEED,
      fastingStatus: testData.testCode === 'FBS' ? FastingStatus.FASTING : FastingStatus.UNKNOWN,
      performingLab: 'Demo Lab Services',
      case: caseEntity,
    });
  }

  await dataSource2.destroy();

  return caseEntity;
}

async function runAllSeeds() {
  await seed();
  // Also run learning seed to create override/ML test data (cases 100-128)
  const { seedLearning } = await import('./seed-learning');
  await seedLearning();
}

// Only auto-run when executed directly (not when imported)
if (require.main === module) {
  runAllSeeds().catch(console.error);
}

export { seed, runAllSeeds };
