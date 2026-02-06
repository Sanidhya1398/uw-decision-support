import { DataSource } from 'typeorm';
import { Case, CaseStatus, ComplexityTier, Channel } from '../entities/case.entity';
import { Applicant, Gender, SmokingStatus, AlcoholStatus } from '../entities/applicant.entity';
import { MedicalDisclosure, DisclosureType, ConditionStatus, TreatmentStatus, FamilyRelationship } from '../entities/medical-disclosure.entity';
import { Document, DocumentType, ExtractionStatus, ExtractionMethod } from '../entities/document.entity';
import { TestResult, AbnormalFlag, FastingStatus, ResultSource } from '../entities/test-result.entity';
import { TestRecommendation } from '../entities/test-recommendation.entity';
import { Decision, DecisionType, DecisionStatus } from '../entities/decision.entity';
import { Communication } from '../entities/communication.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { Override, OverrideType, OverrideDirection } from '../entities/override.entity';
import { RiskFactor, RiskCategory, RiskSeverity, ImpactDirection, FactorSource } from '../entities/risk-factor.entity';

/**
 * LEARNING & OVERRIDE TEST SEED
 *
 * This seed adds COMPLETED cases with decisions and overrides
 * to test the similar cases and learning features.
 *
 * Run: npx ts-node src/database/seed-learning.ts
 *
 * CASES (UW-2024-100 to UW-2024-128):
 *
 * DIABETES CLUSTER (to test similar cases):
 * - UW-2024-100: Diabetic, 47yr, ₹70L - COMPLETED, Complexity overridden MODERATE→ROUTINE
 * - UW-2024-101: Diabetic, 50yr, ₹80L - COMPLETED, Same override pattern
 * - UW-2024-102: Diabetic, 52yr, ₹75L - PENDING (will show similar cases 100, 101)
 *
 * CARDIAC CLUSTER (to test similar cases):
 * - UW-2024-103: Cardiac history, 58yr, ₹1Cr - COMPLETED, Test panel overridden
 * - UW-2024-104: Cardiac history, 55yr, ₹90L - COMPLETED, Same override pattern
 * - UW-2024-105: Cardiac history, 60yr, ₹1.1Cr - PENDING (will show 103, 104)
 *
 * HYPERTENSION CLUSTER:
 * - UW-2024-106: HTN, 48yr, ₹60L - COMPLETED, Risk severity overridden
 * - UW-2024-107: HTN, 45yr, ₹65L - COMPLETED, Same pattern
 * - UW-2024-108: HTN, 50yr, ₹55L - PENDING (will show 106, 107)
 *
 * MULTI-OVERRIDE INTERACTION (tests 3 overrides on single case):
 * - UW-2024-109: DM+HTN comorbidity, 52yr, ₹1.2Cr - COMPLETED, 3 overrides (complexity+risk+tests)
 * - UW-2024-110: DM+HTN comorbidity, 49yr, ₹1Cr - COMPLETED, Same triple override
 * - UW-2024-111: DM+HTN comorbidity, 54yr, ₹1.1Cr - PENDING
 *
 * HIGH ML CONFIDENCE OVERRIDDEN (tests ML at 0.92+ confidence being overridden):
 * - UW-2024-112: Fatty liver, 42yr, ₹50L - COMPLETED, ML 0.92 COMPLEX→MODERATE + decision override
 * - UW-2024-113: Fatty liver, 44yr, ₹55L - COMPLETED, Same pattern
 * - UW-2024-114: Fatty liver, 40yr, ₹48L - PENDING
 *
 * DECISION TYPE OVERRIDE (tests decision pathway override vs ML):
 * - UW-2024-115: Thyroid+anxiety, 35yr, ₹40L - COMPLETED, DEFERRAL→STANDARD + complexity override
 * - UW-2024-116: Thyroid+anxiety, 38yr, ₹45L - COMPLETED, Same pattern
 * - UW-2024-117: Thyroid+anxiety, 33yr, ₹38L - PENDING
 *
 * CONTRADICTING OVERRIDE PATTERNS (tests conflicting UW judgments):
 * - UW-2024-118: CKD Stage 2, 55yr, ₹80L - COMPLETED, UW-001 UPGRADES complexity
 * - UW-2024-119: CKD Stage 2, 53yr, ₹75L - COMPLETED, UW-003 DOWNGRADES complexity (conflict!)
 * - UW-2024-120: CKD Stage 2, 56yr, ₹78L - PENDING (conflicting signals)
 *
 * MIXED DIRECTION OVERRIDES (tests opposing override directions on same case):
 * - UW-2024-121: Obesity+sleep apnea, 45yr, ₹60L - COMPLETED, complexity↓ + tests↑ + risk↑
 * - UW-2024-122: Obesity+sleep apnea, 43yr, ₹65L - COMPLETED, Same mixed pattern
 * - UW-2024-123: Obesity+sleep apnea, 47yr, ₹58L - PENDING
 *
 * VALIDATION STATUS IMPACT ON ML (tests validated vs unvalidated override training):
 * - UW-2024-124: Asthma+COPD, 60yr, ₹90L - COMPLETED, Validated by MD, in training
 * - UW-2024-125: Asthma+COPD, 58yr, ₹85L - COMPLETED, NOT validated, flagged for review
 * - UW-2024-126: Asthma+COPD, 62yr, ₹88L - PENDING
 *
 * EDGE CASES (tests extreme ML-override interactions):
 * - UW-2024-127: Cancer remission, 45yr, ₹50L - COMPLETED, ML 0.94 COMPLEX overridden, DECLINE→STANDARD
 * - UW-2024-128: Elderly no conditions, 68yr, ₹2Cr - COMPLETED, ML ROUTINE→MODERATE (upgrade override)
 */

const dataSource = new DataSource({
  type: 'sqlite',
  database: 'uw_decision_support.db',
  entities: [Case, Applicant, MedicalDisclosure, Document, TestResult, TestRecommendation, Decision, Communication, AuditLog, Override, RiskFactor],
  synchronize: true,
});

async function seedLearning() {
  await dataSource.initialize();
  console.log('Database connected for learning seed');

  const caseRepo = dataSource.getRepository(Case);
  const applicantRepo = dataSource.getRepository(Applicant);
  const disclosureRepo = dataSource.getRepository(MedicalDisclosure);
  const documentRepo = dataSource.getRepository(Document);
  const testResultRepo = dataSource.getRepository(TestResult);
  const decisionRepo = dataSource.getRepository(Decision);
  const overrideRepo = dataSource.getRepository(Override);
  const riskFactorRepo = dataSource.getRepository(RiskFactor);

  console.log('\n=== Adding Learning Test Cases ===\n');

  // Clean up any partial data from previous runs
  const learningCaseRefs = [
    'UW-2024-100', 'UW-2024-101', 'UW-2024-102', 'UW-2024-103', 'UW-2024-104', 'UW-2024-105',
    'UW-2024-106', 'UW-2024-107', 'UW-2024-108',
    // New complex override-ML interaction cases
    'UW-2024-109', 'UW-2024-110', 'UW-2024-111', 'UW-2024-112', 'UW-2024-113', 'UW-2024-114',
    'UW-2024-115', 'UW-2024-116', 'UW-2024-117', 'UW-2024-118', 'UW-2024-119', 'UW-2024-120',
    'UW-2024-121', 'UW-2024-122', 'UW-2024-123', 'UW-2024-124', 'UW-2024-125', 'UW-2024-126',
    'UW-2024-127', 'UW-2024-128',
  ];
  for (const ref of learningCaseRefs) {
    const existingCase = await caseRepo.findOne({ where: { caseReference: ref }, relations: ['applicant'] });
    if (existingCase) {
      await riskFactorRepo.delete({ case: { id: existingCase.id } });
      await overrideRepo.delete({ case: { id: existingCase.id } });
      await decisionRepo.delete({ case: { id: existingCase.id } });
      await testResultRepo.delete({ case: { id: existingCase.id } });
      await documentRepo.delete({ case: { id: existingCase.id } });
      await disclosureRepo.delete({ case: { id: existingCase.id } });
      await caseRepo.delete({ id: existingCase.id });
      if (existingCase.applicant) {
        await applicantRepo.delete({ id: existingCase.applicant.id });
      }
      console.log(`  Cleaned up existing ${ref}`);
    }
  }
  console.log('');

  // ============================================
  // DIABETES CLUSTER - CASE 100 (COMPLETED with override)
  // ============================================
  const case100 = await createLearningCase({
    caseReference: 'UW-2024-100',
    proposalId: 'PROP-100',
    sumAssured: 7000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.ROUTINE, // Overridden from MODERATE
    complexityConfidence: 0.72,
    applicant: {
      firstName: 'Deepak',
      lastName: 'Sharma',
      dateOfBirth: new Date('1977-03-15'),
      gender: Gender.MALE,
      occupation: 'IT Manager',
      annualIncome: 3200000,
      heightCm: 172,
      weightKg: 75,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Bangalore',
      state: 'Karnataka',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Type 2 Diabetes Mellitus', icdCode: 'E11', diagnosisDate: new Date('2020-01-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Metformin', dosage: '500mg', frequency: 'twice daily', indication: 'Diabetes' },
    ],
    testResults: [
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '6.4', resultUnit: '%', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '118', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.HIGH },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  // Add decision
  await decisionRepo.save({
    decisionType: DecisionType.STANDARD_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: 'Well-controlled diabetes with excellent HbA1c. Standard terms appropriate.',
    madeBy: 'UW-001',
    madeByName: 'Anjali Verma',
    madeByRole: 'Senior Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-002',
    reviewedByName: 'Senior UW Rajan',
    reviewedAt: new Date(),
    case: case100,
  });

  // Add complexity override
  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'MODERATE',
    systemRecommendationDetails: { originalTier: 'moderate', confidence: 0.72, reason: 'Diabetes disclosure' },
    systemConfidence: 0.72,
    underwriterChoice: 'ROUTINE',
    underwriterChoiceDetails: { newTier: 'routine' },
    reasoning: 'Diabetes is well-controlled with HbA1c 6.4% (within normal range). No complications. Standard case.',
    reasoningTags: ['well_controlled_diabetes', 'normal_hba1c', 'no_complications'],
    caseContextSnapshot: { age: 47, sumAssured: 7000000, conditions: ['Type 2 Diabetes Mellitus'], hba1c: '6.4%' },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case100,
  });

  // Add risk factor
  await riskFactorRepo.save({
    factorName: 'Diabetes Mellitus',
    factorDescription: 'Type 2 Diabetes - Well controlled',
    category: RiskCategory.MEDICAL,
    severity: RiskSeverity.LOW, // Overridden from MODERATE
    originalSeverity: RiskSeverity.MODERATE,
    severityOverridden: true,
    overrideReason: 'Excellent glycemic control',
    impactDirection: ImpactDirection.INCREASES_RISK,
    source: FactorSource.DISCLOSURE,
    identifyingRuleId: 'DM_001',
    confidence: 0.9,
    verified: true,
    case: case100,
  });

  console.log('✓ Case 100: Diabetic COMPLETED with complexity override MODERATE→ROUTINE');

  // ============================================
  // DIABETES CLUSTER - CASE 101 (COMPLETED with same pattern)
  // ============================================
  const case101 = await createLearningCase({
    caseReference: 'UW-2024-101',
    proposalId: 'PROP-101',
    sumAssured: 8000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.68,
    applicant: {
      firstName: 'Kavitha',
      lastName: 'Nair',
      dateOfBirth: new Date('1974-07-22'),
      gender: Gender.FEMALE,
      occupation: 'Doctor',
      annualIncome: 4500000,
      heightCm: 160,
      weightKg: 62,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Chennai',
      state: 'Tamil Nadu',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Type 2 Diabetes Mellitus', icdCode: 'E11', diagnosisDate: new Date('2019-05-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Metformin', dosage: '1000mg', frequency: 'twice daily', indication: 'Diabetes' },
    ],
    testResults: [
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '6.2', resultUnit: '%', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '112', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '0.8', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.STANDARD_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: 'Diabetes very well controlled. Healthcare professional with good compliance.',
    madeBy: 'UW-003',
    madeByName: 'Pradeep Kumar',
    madeByRole: 'Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-002',
    reviewedByName: 'Senior UW Rajan',
    reviewedAt: new Date(),
    case: case101,
  });

  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'MODERATE',
    systemRecommendationDetails: { originalTier: 'moderate', confidence: 0.68 },
    systemConfidence: 0.68,
    underwriterChoice: 'ROUTINE',
    underwriterChoiceDetails: { newTier: 'routine' },
    reasoning: 'Well-controlled diabetes with HbA1c 6.2%. Doctor with excellent self-management. Treat as routine.',
    reasoningTags: ['well_controlled_diabetes', 'normal_hba1c', 'healthcare_professional'],
    caseContextSnapshot: { age: 50, sumAssured: 8000000, conditions: ['Type 2 Diabetes Mellitus'], hba1c: '6.2%' },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case101,
  });

  console.log('✓ Case 101: Diabetic COMPLETED with same override pattern');

  // ============================================
  // DIABETES CLUSTER - CASE 102 (PENDING - test similar cases)
  // ============================================
  const case102 = await createLearningCase({
    caseReference: 'UW-2024-102',
    proposalId: 'PROP-102',
    sumAssured: 7500000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.70,
    applicant: {
      firstName: 'Suresh',
      lastName: 'Iyer',
      dateOfBirth: new Date('1972-11-08'),
      gender: Gender.MALE,
      occupation: 'Accountant',
      annualIncome: 2800000,
      heightCm: 168,
      weightKg: 70,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Type 2 Diabetes Mellitus', icdCode: 'E11', diagnosisDate: new Date('2021-03-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Metformin', dosage: '500mg', frequency: 'twice daily', indication: 'Diabetes' },
    ],
    testResults: [
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '6.5', resultUnit: '%', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '120', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.HIGH },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  console.log('✓ Case 102: Diabetic PENDING - will show Cases 100, 101 as similar');

  // ============================================
  // CARDIAC CLUSTER - CASE 103 (COMPLETED with test override)
  // ============================================
  const case103 = await createLearningCase({
    caseReference: 'UW-2024-103',
    proposalId: 'PROP-103',
    sumAssured: 10000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.88,
    applicant: {
      firstName: 'Ramakrishna',
      lastName: 'Rao',
      dateOfBirth: new Date('1966-04-18'),
      gender: Gender.MALE,
      occupation: 'Retired Bank Manager',
      annualIncome: 1800000,
      heightCm: 170,
      weightKg: 72,
      smokingStatus: SmokingStatus.FORMER,
      smokingQuitDate: new Date('2018-01-01'),
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Hyderabad',
      state: 'Telangana',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Coronary Artery Disease', icdCode: 'I25', diagnosisDate: new Date('2020-06-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.SURGERY, procedureName: 'CABG', procedureDate: new Date('2020-07-15'), hospitalName: 'Apollo Hospitals', outcome: 'Successful - Triple vessel bypass' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Aspirin', dosage: '75mg', frequency: 'daily', indication: 'Post-CABG' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Atorvastatin', dosage: '40mg', frequency: 'daily', indication: 'Dyslipidemia' },
    ],
    testResults: [
      { testCode: 'LVEF', testName: 'LVEF', resultValue: '55', resultUnit: '%', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'LDL', testName: 'LDL', resultValue: '72', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.MODIFIED_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: '3+ years post-CABG with excellent recovery. Normal LVEF. Accept with cardiac exclusion for 2 years.',
    madeBy: 'UW-001',
    madeByName: 'Anjali Verma',
    madeByRole: 'Senior Underwriter',
    madeAt: new Date(),
    reviewedBy: 'MD-001',
    reviewedByName: 'Dr. Medical Director',
    reviewedAt: new Date(),
    case: case103,
  });

  // Override: Removed TMT from test panel
  await overrideRepo.save({
    overrideType: OverrideType.TEST_RECOMMENDATION,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'ECG, ECHO, TMT, Lipid Panel',
    systemRecommendationDetails: { tests: ['ECG', 'ECHO', 'TMT', 'LIPID'], reason: 'Cardiac history' },
    systemConfidence: 0.85,
    underwriterChoice: 'ECG, ECHO, Lipid Panel (TMT removed)',
    underwriterChoiceDetails: { tests: ['ECG', 'ECHO', 'LIPID'], removed: ['TMT'] },
    reasoning: 'TMT contraindicated post-CABG. Recent ECHO shows good function. Remove TMT from panel.',
    reasoningTags: ['post_cabg', 'tmt_contraindicated', 'recent_echo_available'],
    caseContextSnapshot: { age: 58, sumAssured: 10000000, conditions: ['CAD', 'CABG'], yearsPostSurgery: 3.5 },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'MD-001',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case103,
  });

  console.log('✓ Case 103: Cardiac COMPLETED with test panel override (TMT removed)');

  // ============================================
  // CARDIAC CLUSTER - CASE 104 (COMPLETED with same pattern)
  // ============================================
  const case104 = await createLearningCase({
    caseReference: 'UW-2024-104',
    proposalId: 'PROP-104',
    sumAssured: 9000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.85,
    applicant: {
      firstName: 'Vijay',
      lastName: 'Menon',
      dateOfBirth: new Date('1969-08-25'),
      gender: Gender.MALE,
      occupation: 'Business Owner',
      annualIncome: 5500000,
      heightCm: 175,
      weightKg: 78,
      smokingStatus: SmokingStatus.FORMER,
      smokingQuitDate: new Date('2019-06-01'),
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Kochi',
      state: 'Kerala',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Coronary Artery Disease', icdCode: 'I25', diagnosisDate: new Date('2019-11-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.SURGERY, procedureName: 'PCI with Stent', procedureDate: new Date('2019-11-25'), hospitalName: 'Lakeshore Hospital', outcome: 'Successful - 2 DES placed' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Clopidogrel', dosage: '75mg', frequency: 'daily', indication: 'Post-PCI' },
    ],
    testResults: [
      { testCode: 'LVEF', testName: 'LVEF', resultValue: '58', resultUnit: '%', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.MODIFIED_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: '4+ years post-PCI, stable. Accept with loading.',
    madeBy: 'UW-003',
    madeByName: 'Pradeep Kumar',
    madeByRole: 'Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-002',
    reviewedByName: 'Senior UW Rajan',
    reviewedAt: new Date(),
    case: case104,
  });

  await overrideRepo.save({
    overrideType: OverrideType.TEST_RECOMMENDATION,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'ECG, ECHO, TMT, Lipid Panel, CT Angio',
    systemRecommendationDetails: { tests: ['ECG', 'ECHO', 'TMT', 'LIPID', 'CT_ANGIO'] },
    systemConfidence: 0.82,
    underwriterChoice: 'ECG, ECHO, Lipid Panel',
    underwriterChoiceDetails: { tests: ['ECG', 'ECHO', 'LIPID'], removed: ['TMT', 'CT_ANGIO'] },
    reasoning: 'Recent angiogram available. TMT not needed as stent patency confirmed. CT Angio redundant.',
    reasoningTags: ['post_pci', 'recent_angio_available', 'redundant_tests'],
    caseContextSnapshot: { age: 55, sumAssured: 9000000, conditions: ['CAD', 'PCI'], yearsPostSurgery: 4.2 },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case104,
  });

  console.log('✓ Case 104: Cardiac COMPLETED with same test panel override pattern');

  // ============================================
  // CARDIAC CLUSTER - CASE 105 (PENDING - test similar cases)
  // ============================================
  const case105 = await createLearningCase({
    caseReference: 'UW-2024-105',
    proposalId: 'PROP-105',
    sumAssured: 11000000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.90,
    applicant: {
      firstName: 'Subramaniam',
      lastName: 'Pillai',
      dateOfBirth: new Date('1964-02-10'),
      gender: Gender.MALE,
      occupation: 'Retired Professor',
      annualIncome: 1500000,
      heightCm: 168,
      weightKg: 70,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Trivandrum',
      state: 'Kerala',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Coronary Artery Disease', icdCode: 'I25', diagnosisDate: new Date('2021-03-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.SURGERY, procedureName: 'CABG', procedureDate: new Date('2021-04-01'), hospitalName: 'SCTIMST', outcome: 'Successful' },
    ],
    testResults: [
      { testCode: 'LVEF', testName: 'LVEF', resultValue: '52', resultUnit: '%', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  console.log('✓ Case 105: Cardiac PENDING - will show Cases 103, 104 as similar');

  // ============================================
  // HYPERTENSION CLUSTER - CASE 106 (COMPLETED with risk override)
  // ============================================
  const case106 = await createLearningCase({
    caseReference: 'UW-2024-106',
    proposalId: 'PROP-106',
    sumAssured: 6000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.75,
    applicant: {
      firstName: 'Anand',
      lastName: 'Krishnamurthy',
      dateOfBirth: new Date('1976-09-12'),
      gender: Gender.MALE,
      occupation: 'Software Architect',
      annualIncome: 4200000,
      heightCm: 175,
      weightKg: 80,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Pune',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypertension', icdCode: 'I10', diagnosisDate: new Date('2020-06-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Telmisartan', dosage: '40mg', frequency: 'daily', indication: 'Hypertension' },
    ],
    testResults: [
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '0.9', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'EGFR', testName: 'eGFR', resultValue: '95', resultUnit: 'mL/min', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.STANDARD_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: 'Well-controlled hypertension on single agent. No end-organ damage.',
    madeBy: 'UW-001',
    madeByName: 'Anjali Verma',
    madeByRole: 'Senior Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-002',
    reviewedByName: 'Senior UW Rajan',
    reviewedAt: new Date(),
    case: case106,
  });

  // Override risk severity
  await overrideRepo.save({
    overrideType: OverrideType.RISK_SEVERITY,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'Hypertension: MODERATE',
    systemRecommendationDetails: { factorName: 'Hypertension', originalSeverity: 'moderate' },
    systemConfidence: 0.78,
    underwriterChoice: 'Hypertension: LOW',
    underwriterChoiceDetails: { newSeverity: 'low' },
    reasoning: 'BP well controlled on single agent (120/78). Normal renal function. No cardiac involvement. Low risk.',
    reasoningTags: ['well_controlled_bp', 'single_agent', 'no_end_organ_damage'],
    caseContextSnapshot: { age: 48, sumAssured: 6000000, conditions: ['Hypertension'], bp: '120/78' },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case106,
  });

  console.log('✓ Case 106: Hypertension COMPLETED with risk severity override MODERATE→LOW');

  // ============================================
  // HYPERTENSION CLUSTER - CASE 107 (COMPLETED with same pattern)
  // ============================================
  const case107 = await createLearningCase({
    caseReference: 'UW-2024-107',
    proposalId: 'PROP-107',
    sumAssured: 6500000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.72,
    applicant: {
      firstName: 'Rekha',
      lastName: 'Bose',
      dateOfBirth: new Date('1979-05-28'),
      gender: Gender.FEMALE,
      occupation: 'HR Director',
      annualIncome: 3800000,
      heightCm: 162,
      weightKg: 65,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Kolkata',
      state: 'West Bengal',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypertension', icdCode: 'I10', diagnosisDate: new Date('2021-02-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Amlodipine', dosage: '5mg', frequency: 'daily', indication: 'Hypertension' },
    ],
    testResults: [
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '0.7', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.STANDARD_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: 'Controlled hypertension, young age, no complications.',
    madeBy: 'UW-003',
    madeByName: 'Pradeep Kumar',
    madeByRole: 'Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-001',
    reviewedByName: 'Anjali Verma',
    reviewedAt: new Date(),
    case: case107,
  });

  await overrideRepo.save({
    overrideType: OverrideType.RISK_SEVERITY,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'Hypertension: MODERATE',
    systemRecommendationDetails: { factorName: 'Hypertension', originalSeverity: 'moderate' },
    systemConfidence: 0.72,
    underwriterChoice: 'Hypertension: LOW',
    underwriterChoiceDetails: { newSeverity: 'low' },
    reasoning: 'Young female, well-controlled BP on low dose single agent. Excellent prognosis.',
    reasoningTags: ['well_controlled_bp', 'young_age', 'low_dose'],
    caseContextSnapshot: { age: 45, sumAssured: 6500000, conditions: ['Hypertension'] },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-001',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case107,
  });

  console.log('✓ Case 107: Hypertension COMPLETED with same risk override pattern');

  // ============================================
  // HYPERTENSION CLUSTER - CASE 108 (PENDING - test similar cases)
  // ============================================
  const case108 = await createLearningCase({
    caseReference: 'UW-2024-108',
    proposalId: 'PROP-108',
    sumAssured: 5500000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.74,
    applicant: {
      firstName: 'Mahesh',
      lastName: 'Gupta',
      dateOfBirth: new Date('1974-12-05'),
      gender: Gender.MALE,
      occupation: 'Marketing Director',
      annualIncome: 3500000,
      heightCm: 172,
      weightKg: 78,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Delhi',
      state: 'Delhi',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypertension', icdCode: 'I10', diagnosisDate: new Date('2022-04-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Losartan', dosage: '50mg', frequency: 'daily', indication: 'Hypertension' },
    ],
    testResults: [
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '1.0', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  console.log('✓ Case 108: Hypertension PENDING - will show Cases 106, 107 as similar');

  // ============================================
  // CLUSTER 4: MULTI-OVERRIDE INTERACTION
  // Tests: 3 overrides on a single case (complexity + risk + tests)
  // ML must learn from multiple simultaneous override signals
  // ============================================

  // CASE 109: DM + HTN comorbidity - COMPLETED with 3 overrides
  const case109 = await createLearningCase({
    caseReference: 'UW-2024-109',
    proposalId: 'PROP-109',
    sumAssured: 12000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.MODERATE, // Overridden from COMPLEX
    complexityConfidence: 0.82,
    applicant: {
      firstName: 'Raghav',
      lastName: 'Sundaram',
      dateOfBirth: new Date('1972-06-20'),
      gender: Gender.MALE,
      occupation: 'CFO',
      annualIncome: 8500000,
      heightCm: 176,
      weightKg: 82,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Type 2 Diabetes Mellitus', icdCode: 'E11', diagnosisDate: new Date('2018-03-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypertension', icdCode: 'I10', diagnosisDate: new Date('2019-07-05'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Metformin', dosage: '1000mg', frequency: 'twice daily', indication: 'Diabetes' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Telmisartan', dosage: '40mg', frequency: 'daily', indication: 'Hypertension' },
    ],
    testResults: [
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '6.3', resultUnit: '%', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '115', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '0.9', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'LIPID', testName: 'Lipid Panel', resultValue: 'LDL 95', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'ECG', testName: 'ECG', resultValue: 'Normal sinus rhythm', resultUnit: '', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.STANDARD_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: 'Both DM and HTN well-controlled on minimal medication. No end-organ damage. All tests normal.',
    madeBy: 'UW-001',
    madeByName: 'Anjali Verma',
    madeByRole: 'Senior Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-002',
    reviewedByName: 'Senior UW Rajan',
    reviewedAt: new Date(),
    case: case109,
  });

  // Override 1: Complexity COMPLEX→MODERATE
  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'COMPLEX',
    systemRecommendationDetails: { originalTier: 'complex', confidence: 0.82, reason: 'DM + HTN comorbidity triggers complex' },
    systemConfidence: 0.82,
    underwriterChoice: 'MODERATE',
    underwriterChoiceDetails: { newTier: 'moderate' },
    reasoning: 'Both conditions well-controlled on minimal medication. HbA1c 6.3%, BP 126/80. No complications. Comorbidity alone should not force complex tier.',
    reasoningTags: ['well_controlled_comorbidity', 'minimal_medication', 'no_complications'],
    caseContextSnapshot: { age: 52, sumAssured: 12000000, conditions: ['Type 2 Diabetes Mellitus', 'Hypertension'], hba1c: '6.3%', bp: '126/80' },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case109,
  });

  // Override 2: Risk severity for DM HIGH→MODERATE
  await overrideRepo.save({
    overrideType: OverrideType.RISK_SEVERITY,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'Diabetes: HIGH (comorbid with HTN)',
    systemRecommendationDetails: { factorName: 'Diabetes Mellitus', originalSeverity: 'high', reason: 'Comorbid with hypertension' },
    systemConfidence: 0.78,
    underwriterChoice: 'Diabetes: MODERATE',
    underwriterChoiceDetails: { newSeverity: 'moderate' },
    reasoning: 'System elevated DM risk to HIGH due to HTN comorbidity, but both are independently well-controlled. No synergistic damage evident.',
    reasoningTags: ['independent_control', 'no_synergistic_damage', 'good_compliance'],
    caseContextSnapshot: { age: 52, sumAssured: 12000000, conditions: ['Type 2 Diabetes Mellitus', 'Hypertension'], hba1c: '6.3%' },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case109,
  });

  // Override 3: Test panel - removed CT Angio
  await overrideRepo.save({
    overrideType: OverrideType.TEST_RECOMMENDATION,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'HBA1C, FBS, Lipid, ECG, ECHO, CT Angio, RFT',
    systemRecommendationDetails: { tests: ['HBA1C', 'FBS', 'LIPID', 'ECG', 'ECHO', 'CT_ANGIO', 'RFT'], reason: 'DM+HTN comorbidity cardiac workup' },
    systemConfidence: 0.80,
    underwriterChoice: 'HBA1C, FBS, Lipid, ECG, RFT (ECHO, CT Angio removed)',
    underwriterChoiceDetails: { tests: ['HBA1C', 'FBS', 'LIPID', 'ECG', 'RFT'], removed: ['ECHO', 'CT_ANGIO'] },
    reasoning: 'ECG is normal sinus rhythm. No cardiac symptoms. CT Angio and ECHO are excessive for well-controlled DM+HTN without cardiac complaints.',
    reasoningTags: ['normal_ecg', 'no_cardiac_symptoms', 'excessive_testing'],
    caseContextSnapshot: { age: 52, sumAssured: 12000000, conditions: ['Type 2 Diabetes Mellitus', 'Hypertension'], ecg: 'Normal' },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case109,
  });

  await riskFactorRepo.save([
    {
      factorName: 'Diabetes Mellitus',
      factorDescription: 'Type 2 Diabetes - Well controlled, comorbid with HTN',
      category: RiskCategory.MEDICAL,
      severity: RiskSeverity.MODERATE,
      originalSeverity: RiskSeverity.HIGH,
      severityOverridden: true,
      overrideReason: 'Independent control, no synergistic damage',
      impactDirection: ImpactDirection.INCREASES_RISK,
      source: FactorSource.DISCLOSURE,
      identifyingRuleId: 'DM_001',
      confidence: 0.9,
      verified: true,
      case: case109,
    },
    {
      factorName: 'Hypertension',
      factorDescription: 'Essential Hypertension - Well controlled on single agent',
      category: RiskCategory.MEDICAL,
      severity: RiskSeverity.LOW,
      impactDirection: ImpactDirection.INCREASES_RISK,
      source: FactorSource.DISCLOSURE,
      identifyingRuleId: 'HTN_001',
      confidence: 0.85,
      verified: true,
      case: case109,
    },
  ]);

  console.log('✓ Case 109: DM+HTN COMPLETED with 3 overrides (complexity+risk+tests)');

  // CASE 110: DM + HTN comorbidity - COMPLETED with same triple override
  const case110 = await createLearningCase({
    caseReference: 'UW-2024-110',
    proposalId: 'PROP-110',
    sumAssured: 10000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.79,
    applicant: {
      firstName: 'Lakshmi',
      lastName: 'Venkatesh',
      dateOfBirth: new Date('1975-09-14'),
      gender: Gender.FEMALE,
      occupation: 'Pharmacist',
      annualIncome: 3200000,
      heightCm: 158,
      weightKg: 64,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Coimbatore',
      state: 'Tamil Nadu',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Type 2 Diabetes Mellitus', icdCode: 'E11', diagnosisDate: new Date('2019-11-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypertension', icdCode: 'I10', diagnosisDate: new Date('2020-02-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Glimepiride', dosage: '2mg', frequency: 'daily', indication: 'Diabetes' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Amlodipine', dosage: '5mg', frequency: 'daily', indication: 'Hypertension' },
    ],
    testResults: [
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '6.5', resultUnit: '%', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '0.7', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'ECG', testName: 'ECG', resultValue: 'Normal', resultUnit: '', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.STANDARD_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: 'Pharmacist with excellent self-management. Both conditions controlled. Standard terms.',
    madeBy: 'UW-003',
    madeByName: 'Pradeep Kumar',
    madeByRole: 'Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-001',
    reviewedByName: 'Anjali Verma',
    reviewedAt: new Date(),
    case: case110,
  });

  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'COMPLEX',
    systemRecommendationDetails: { originalTier: 'complex', confidence: 0.79 },
    systemConfidence: 0.79,
    underwriterChoice: 'MODERATE',
    underwriterChoiceDetails: { newTier: 'moderate' },
    reasoning: 'Healthcare professional (pharmacist) with excellent compliance. Both conditions at target. Comorbidity well-managed.',
    reasoningTags: ['well_controlled_comorbidity', 'healthcare_professional', 'target_values'],
    caseContextSnapshot: { age: 49, sumAssured: 10000000, conditions: ['Type 2 Diabetes Mellitus', 'Hypertension'], hba1c: '6.5%' },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-001',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case110,
  });

  await overrideRepo.save({
    overrideType: OverrideType.RISK_SEVERITY,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'Diabetes: HIGH (comorbid with HTN)',
    systemRecommendationDetails: { factorName: 'Diabetes Mellitus', originalSeverity: 'high' },
    systemConfidence: 0.75,
    underwriterChoice: 'Diabetes: MODERATE',
    underwriterChoiceDetails: { newSeverity: 'moderate' },
    reasoning: 'Pharmacist understands medication management. HbA1c at target. No complication indicators.',
    reasoningTags: ['healthcare_professional', 'good_compliance', 'no_complications'],
    caseContextSnapshot: { age: 49, sumAssured: 10000000, conditions: ['Type 2 Diabetes Mellitus', 'Hypertension'] },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-001',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case110,
  });

  await overrideRepo.save({
    overrideType: OverrideType.TEST_RECOMMENDATION,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'HBA1C, FBS, Lipid, ECG, ECHO, RFT',
    systemRecommendationDetails: { tests: ['HBA1C', 'FBS', 'LIPID', 'ECG', 'ECHO', 'RFT'] },
    systemConfidence: 0.77,
    underwriterChoice: 'HBA1C, FBS, ECG, RFT (ECHO, Lipid removed)',
    underwriterChoiceDetails: { tests: ['HBA1C', 'FBS', 'ECG', 'RFT'], removed: ['ECHO', 'LIPID'] },
    reasoning: 'Normal ECG, no cardiac symptoms. Recent lipid panel from personal physician already available and normal.',
    reasoningTags: ['normal_ecg', 'recent_results_available', 'no_cardiac_symptoms'],
    caseContextSnapshot: { age: 49, sumAssured: 10000000, conditions: ['Type 2 Diabetes Mellitus', 'Hypertension'] },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-001',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case110,
  });

  console.log('✓ Case 110: DM+HTN COMPLETED with same triple override pattern');

  // CASE 111: DM + HTN - PENDING
  const case111 = await createLearningCase({
    caseReference: 'UW-2024-111',
    proposalId: 'PROP-111',
    sumAssured: 11000000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.81,
    applicant: {
      firstName: 'Mohan',
      lastName: 'Reddy',
      dateOfBirth: new Date('1970-04-18'),
      gender: Gender.MALE,
      occupation: 'Civil Engineer',
      annualIncome: 4200000,
      heightCm: 174,
      weightKg: 79,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Hyderabad',
      state: 'Telangana',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Type 2 Diabetes Mellitus', icdCode: 'E11', diagnosisDate: new Date('2020-01-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypertension', icdCode: 'I10', diagnosisDate: new Date('2020-06-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Metformin', dosage: '500mg', frequency: 'twice daily', indication: 'Diabetes' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Losartan', dosage: '50mg', frequency: 'daily', indication: 'Hypertension' },
    ],
    testResults: [
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '6.6', resultUnit: '%', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '1.0', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  console.log('✓ Case 111: DM+HTN PENDING - will show Cases 109, 110 as similar (triple override pattern)');

  // ============================================
  // CLUSTER 5: HIGH ML CONFIDENCE OVERRIDDEN
  // Tests: ML at 0.92+ confidence being overridden by senior staff
  // ML must learn to adjust confidence thresholds
  // ============================================

  // CASE 112: Fatty liver - ML 0.92 COMPLEX overridden to MODERATE + decision override
  const case112 = await createLearningCase({
    caseReference: 'UW-2024-112',
    proposalId: 'PROP-112',
    sumAssured: 5000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.MODERATE, // Overridden from COMPLEX at 0.92 confidence
    complexityConfidence: 0.92,
    applicant: {
      firstName: 'Arvind',
      lastName: 'Patel',
      dateOfBirth: new Date('1982-08-12'),
      gender: Gender.MALE,
      occupation: 'Restaurant Owner',
      annualIncome: 2800000,
      heightCm: 170,
      weightKg: 88,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Ahmedabad',
      state: 'Gujarat',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Non-Alcoholic Fatty Liver Disease', icdCode: 'K76.0', diagnosisDate: new Date('2022-05-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Dyslipidemia', icdCode: 'E78', diagnosisDate: new Date('2022-05-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Atorvastatin', dosage: '20mg', frequency: 'daily', indication: 'Dyslipidemia' },
    ],
    testResults: [
      { testCode: 'LFT', testName: 'Liver Function Test', resultValue: 'ALT 42, AST 38', resultUnit: 'U/L', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'LIPID', testName: 'Lipid Panel', resultValue: 'LDL 110, TG 165', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'USG', testName: 'Ultrasound Abdomen', resultValue: 'Grade 1 fatty liver', resultUnit: '', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'FIB4', testName: 'FIB-4 Score', resultValue: '0.82', resultUnit: '', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.STANDARD_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    systemRecommendedType: 'modified_acceptance',
    isOverride: true,
    overrideReason: 'Grade 1 NAFLD with low fibrosis risk does not warrant modification',
    rationale: 'Grade 1 fatty liver only. FIB-4 score 0.82 (low fibrosis risk). Mild LFT elevation. No steatohepatitis. Standard acceptance appropriate.',
    madeBy: 'UW-001',
    madeByName: 'Anjali Verma',
    madeByRole: 'Senior Underwriter',
    madeAt: new Date(),
    reviewedBy: 'MD-001',
    reviewedByName: 'Dr. Medical Director',
    reviewedAt: new Date(),
    case: case112,
  });

  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'COMPLEX',
    systemRecommendationDetails: { originalTier: 'complex', confidence: 0.92, reason: 'Liver disease + abnormal LFT + abnormal imaging' },
    systemConfidence: 0.92,
    underwriterChoice: 'MODERATE',
    underwriterChoiceDetails: { newTier: 'moderate' },
    reasoning: 'ML over-weighted liver disease. Grade 1 NAFLD is mild. FIB-4 < 1.3 rules out significant fibrosis. System conflated NAFLD with hepatic disease.',
    reasoningTags: ['ml_overweighted', 'nafld_grade1_mild', 'low_fibrosis_score', 'condition_nuance'],
    caseContextSnapshot: { age: 42, sumAssured: 5000000, conditions: ['NAFLD', 'Dyslipidemia'], fib4: '0.82', liverGrade: 'Grade 1' },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'MD-001',
    validatedAt: new Date(),
    validationNotes: 'Agree. NAFLD Grade 1 with normal FIB-4 is not a complex case.',
    includedInTraining: true,
    case: case112,
  });

  await overrideRepo.save({
    overrideType: OverrideType.DECISION_OPTION,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'MODIFIED_ACCEPTANCE (liver exclusion)',
    systemRecommendationDetails: { decisionType: 'modified_acceptance', modifications: ['liver_exclusion'] },
    systemConfidence: 0.88,
    underwriterChoice: 'STANDARD_ACCEPTANCE',
    underwriterChoiceDetails: { decisionType: 'standard_acceptance' },
    reasoning: 'Grade 1 NAFLD with normal FIB-4 does not warrant liver exclusion. Risk of progression is low.',
    reasoningTags: ['low_progression_risk', 'grade1_only', 'normal_fibrosis_marker'],
    caseContextSnapshot: { age: 42, sumAssured: 5000000, conditions: ['NAFLD', 'Dyslipidemia'], fib4: '0.82' },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'MD-001',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case112,
  });

  console.log('✓ Case 112: Fatty liver COMPLETED - ML 0.92 confidence overridden + decision override');

  // CASE 113: Fatty liver - same high-confidence override pattern
  const case113 = await createLearningCase({
    caseReference: 'UW-2024-113',
    proposalId: 'PROP-113',
    sumAssured: 5500000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.90,
    applicant: {
      firstName: 'Pooja',
      lastName: 'Agarwal',
      dateOfBirth: new Date('1980-11-25'),
      gender: Gender.FEMALE,
      occupation: 'Bank Manager',
      annualIncome: 3500000,
      heightCm: 160,
      weightKg: 78,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Jaipur',
      state: 'Rajasthan',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Non-Alcoholic Fatty Liver Disease', icdCode: 'K76.0', diagnosisDate: new Date('2023-01-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.MONITORING },
    ],
    testResults: [
      { testCode: 'LFT', testName: 'Liver Function Test', resultValue: 'ALT 38, AST 35', resultUnit: 'U/L', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'USG', testName: 'Ultrasound Abdomen', resultValue: 'Grade 1 fatty liver', resultUnit: '', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'FIB4', testName: 'FIB-4 Score', resultValue: '0.75', resultUnit: '', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.STANDARD_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    systemRecommendedType: 'modified_acceptance',
    isOverride: true,
    overrideReason: 'Mild NAFLD with very low fibrosis risk',
    rationale: 'Mild NAFLD, FIB-4 0.75, borderline LFT. Standard acceptance.',
    madeBy: 'UW-003',
    madeByName: 'Pradeep Kumar',
    madeByRole: 'Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-001',
    reviewedByName: 'Anjali Verma',
    reviewedAt: new Date(),
    case: case113,
  });

  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'COMPLEX',
    systemRecommendationDetails: { originalTier: 'complex', confidence: 0.90 },
    systemConfidence: 0.90,
    underwriterChoice: 'MODERATE',
    underwriterChoiceDetails: { newTier: 'moderate' },
    reasoning: 'Grade 1 NAFLD without steatohepatitis. Very low FIB-4. ML consistently overweights NAFLD.',
    reasoningTags: ['ml_overweighted', 'nafld_grade1_mild', 'low_fibrosis_score'],
    caseContextSnapshot: { age: 44, sumAssured: 5500000, conditions: ['NAFLD'], fib4: '0.75' },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-001',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case113,
  });

  await overrideRepo.save({
    overrideType: OverrideType.DECISION_OPTION,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'MODIFIED_ACCEPTANCE (liver exclusion)',
    systemRecommendationDetails: { decisionType: 'modified_acceptance' },
    systemConfidence: 0.85,
    underwriterChoice: 'STANDARD_ACCEPTANCE',
    underwriterChoiceDetails: { decisionType: 'standard_acceptance' },
    reasoning: 'Same as Case 112 precedent. Grade 1 NAFLD with normal fibrosis markers.',
    reasoningTags: ['low_progression_risk', 'precedent_available', 'grade1_only'],
    caseContextSnapshot: { age: 44, sumAssured: 5500000, conditions: ['NAFLD'], fib4: '0.75' },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-001',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case113,
  });

  console.log('✓ Case 113: Fatty liver COMPLETED - same high-confidence ML override pattern');

  // CASE 114: Fatty liver - PENDING
  const case114 = await createLearningCase({
    caseReference: 'UW-2024-114',
    proposalId: 'PROP-114',
    sumAssured: 4800000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.91,
    applicant: {
      firstName: 'Dinesh',
      lastName: 'Joshi',
      dateOfBirth: new Date('1984-03-30'),
      gender: Gender.MALE,
      occupation: 'Shopkeeper',
      annualIncome: 1800000,
      heightCm: 165,
      weightKg: 85,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Lucknow',
      state: 'Uttar Pradesh',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Non-Alcoholic Fatty Liver Disease', icdCode: 'K76.0', diagnosisDate: new Date('2023-06-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.MONITORING },
    ],
    testResults: [
      { testCode: 'LFT', testName: 'Liver Function Test', resultValue: 'ALT 40, AST 36', resultUnit: 'U/L', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'FIB4', testName: 'FIB-4 Score', resultValue: '0.78', resultUnit: '', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  console.log('✓ Case 114: Fatty liver PENDING - will show Cases 112, 113 (ML should learn NAFLD overweight)');

  // ============================================
  // CLUSTER 6: DECISION TYPE OVERRIDE WITH ML
  // Tests: System recommends DEFERRAL, UW overrides to STANDARD_ACCEPTANCE
  // ML must learn that certain conditions don't require deferral
  // ============================================

  // CASE 115: Thyroid + anxiety - DEFERRAL overridden to STANDARD
  const case115 = await createLearningCase({
    caseReference: 'UW-2024-115',
    proposalId: 'PROP-115',
    sumAssured: 4000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.ROUTINE, // Overridden from MODERATE
    complexityConfidence: 0.65,
    applicant: {
      firstName: 'Sneha',
      lastName: 'Deshmukh',
      dateOfBirth: new Date('1989-12-05'),
      gender: Gender.FEMALE,
      occupation: 'Teacher',
      annualIncome: 1200000,
      heightCm: 155,
      weightKg: 55,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Nagpur',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypothyroidism', icdCode: 'E03', diagnosisDate: new Date('2020-08-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Generalized Anxiety Disorder', icdCode: 'F41.1', diagnosisDate: new Date('2021-03-15'), conditionStatus: ConditionStatus.RESOLVED, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Levothyroxine', dosage: '50mcg', frequency: 'daily', indication: 'Hypothyroidism' },
    ],
    testResults: [
      { testCode: 'TSH', testName: 'Thyroid Stimulating Hormone', resultValue: '3.2', resultUnit: 'mIU/L', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'T4', testName: 'Free T4', resultValue: '1.1', resultUnit: 'ng/dL', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.STANDARD_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    systemRecommendedType: 'deferral',
    isOverride: true,
    overrideReason: 'Anxiety is resolved, thyroid is controlled. No basis for deferral.',
    rationale: 'Hypothyroidism well-controlled on low-dose levothyroxine. GAD resolved - no active psychiatric condition. Standard acceptance.',
    madeBy: 'UW-001',
    madeByName: 'Anjali Verma',
    madeByRole: 'Senior Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-002',
    reviewedByName: 'Senior UW Rajan',
    reviewedAt: new Date(),
    case: case115,
  });

  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'MODERATE',
    systemRecommendationDetails: { originalTier: 'moderate', confidence: 0.65, reason: 'Psychiatric + endocrine conditions' },
    systemConfidence: 0.65,
    underwriterChoice: 'ROUTINE',
    underwriterChoiceDetails: { newTier: 'routine' },
    reasoning: 'System flagged psychiatric condition but GAD is resolved. Hypothyroidism on stable low dose. This is a routine case.',
    reasoningTags: ['resolved_psychiatric', 'stable_thyroid', 'condition_resolved'],
    caseContextSnapshot: { age: 35, sumAssured: 4000000, conditions: ['Hypothyroidism', 'GAD (Resolved)'], tsh: '3.2' },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case115,
  });

  await overrideRepo.save({
    overrideType: OverrideType.DECISION_OPTION,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'DEFERRAL (psychiatric stability assessment)',
    systemRecommendationDetails: { decisionType: 'deferral', requestedInfo: ['psychiatric_assessment', 'stability_period'] },
    systemConfidence: 0.70,
    underwriterChoice: 'STANDARD_ACCEPTANCE',
    underwriterChoiceDetails: { decisionType: 'standard_acceptance' },
    reasoning: 'GAD is resolved for 2+ years. No medication for anxiety. Deferral for psychiatric assessment is unnecessary and delays the customer.',
    reasoningTags: ['resolved_2_years', 'no_psychiatric_medication', 'customer_impact'],
    caseContextSnapshot: { age: 35, sumAssured: 4000000, conditions: ['Hypothyroidism', 'GAD (Resolved)'] },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case115,
  });

  console.log('✓ Case 115: Thyroid+GAD COMPLETED - DEFERRAL→STANDARD + complexity override');

  // CASE 116: Thyroid + anxiety - same pattern
  const case116 = await createLearningCase({
    caseReference: 'UW-2024-116',
    proposalId: 'PROP-116',
    sumAssured: 4500000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.ROUTINE,
    complexityConfidence: 0.63,
    applicant: {
      firstName: 'Priya',
      lastName: 'Chatterjee',
      dateOfBirth: new Date('1986-07-18'),
      gender: Gender.FEMALE,
      occupation: 'Nurse',
      annualIncome: 1500000,
      heightCm: 162,
      weightKg: 58,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Kolkata',
      state: 'West Bengal',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypothyroidism', icdCode: 'E03', diagnosisDate: new Date('2019-04-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Panic Disorder', icdCode: 'F41.0', diagnosisDate: new Date('2020-09-10'), conditionStatus: ConditionStatus.RESOLVED, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Levothyroxine', dosage: '75mcg', frequency: 'daily', indication: 'Hypothyroidism' },
    ],
    testResults: [
      { testCode: 'TSH', testName: 'TSH', resultValue: '2.8', resultUnit: 'mIU/L', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.STANDARD_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    systemRecommendedType: 'deferral',
    isOverride: true,
    overrideReason: 'Panic disorder resolved 3+ years. No ongoing psychiatric treatment.',
    rationale: 'Nurse with resolved panic disorder. Hypothyroidism stable. Standard terms.',
    madeBy: 'UW-003',
    madeByName: 'Pradeep Kumar',
    madeByRole: 'Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-001',
    reviewedByName: 'Anjali Verma',
    reviewedAt: new Date(),
    case: case116,
  });

  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'MODERATE',
    systemRecommendationDetails: { originalTier: 'moderate', confidence: 0.63 },
    systemConfidence: 0.63,
    underwriterChoice: 'ROUTINE',
    underwriterChoiceDetails: { newTier: 'routine' },
    reasoning: 'Resolved psychiatric condition should not contribute to complexity. Stable thyroid.',
    reasoningTags: ['resolved_psychiatric', 'stable_thyroid', 'condition_resolved'],
    caseContextSnapshot: { age: 38, sumAssured: 4500000, conditions: ['Hypothyroidism', 'Panic Disorder (Resolved)'] },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-001',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case116,
  });

  await overrideRepo.save({
    overrideType: OverrideType.DECISION_OPTION,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'DEFERRAL (psychiatric stability)',
    systemRecommendationDetails: { decisionType: 'deferral' },
    systemConfidence: 0.68,
    underwriterChoice: 'STANDARD_ACCEPTANCE',
    underwriterChoiceDetails: { decisionType: 'standard_acceptance' },
    reasoning: 'Panic disorder resolved 3+ years. Healthcare professional. No basis for deferral.',
    reasoningTags: ['resolved_3_years', 'healthcare_professional', 'no_active_treatment'],
    caseContextSnapshot: { age: 38, sumAssured: 4500000, conditions: ['Hypothyroidism', 'Panic Disorder (Resolved)'] },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-001',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case116,
  });

  console.log('✓ Case 116: Thyroid+Panic COMPLETED - same decision override pattern');

  // CASE 117: Thyroid + anxiety - PENDING
  const case117 = await createLearningCase({
    caseReference: 'UW-2024-117',
    proposalId: 'PROP-117',
    sumAssured: 3800000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.64,
    applicant: {
      firstName: 'Meera',
      lastName: 'Singh',
      dateOfBirth: new Date('1991-10-22'),
      gender: Gender.FEMALE,
      occupation: 'Accountant',
      annualIncome: 1100000,
      heightCm: 157,
      weightKg: 52,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Indore',
      state: 'Madhya Pradesh',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypothyroidism', icdCode: 'E03', diagnosisDate: new Date('2021-06-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Generalized Anxiety Disorder', icdCode: 'F41.1', diagnosisDate: new Date('2022-01-15'), conditionStatus: ConditionStatus.RESOLVED, treatmentStatus: TreatmentStatus.MONITORING },
    ],
    testResults: [
      { testCode: 'TSH', testName: 'TSH', resultValue: '3.5', resultUnit: 'mIU/L', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  console.log('✓ Case 117: Thyroid+GAD PENDING - will show Cases 115, 116 (deferral override pattern)');

  // ============================================
  // CLUSTER 7: CONTRADICTING OVERRIDE PATTERNS
  // Tests: Different underwriters override the same type of case
  // in OPPOSITE directions - ML must handle conflicting signals
  // ============================================

  // CASE 118: CKD Stage 2 - UW-001 UPGRADES complexity (more conservative)
  const case118 = await createLearningCase({
    caseReference: 'UW-2024-118',
    proposalId: 'PROP-118',
    sumAssured: 8000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.COMPLEX, // UPGRADED from MODERATE
    complexityConfidence: 0.72,
    applicant: {
      firstName: 'Gopal',
      lastName: 'Mishra',
      dateOfBirth: new Date('1969-05-14'),
      gender: Gender.MALE,
      occupation: 'Government Officer',
      annualIncome: 2200000,
      heightCm: 170,
      weightKg: 74,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Bhopal',
      state: 'Madhya Pradesh',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Chronic Kidney Disease Stage 2', icdCode: 'N18.2', diagnosisDate: new Date('2022-08-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypertension', icdCode: 'I10', diagnosisDate: new Date('2018-03-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Ramipril', dosage: '5mg', frequency: 'daily', indication: 'HTN + renal protection' },
    ],
    testResults: [
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '1.4', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'EGFR', testName: 'eGFR', resultValue: '68', resultUnit: 'mL/min', abnormalFlag: AbnormalFlag.LOW },
      { testCode: 'UACR', testName: 'Urine Albumin-Creatinine Ratio', resultValue: '45', resultUnit: 'mg/g', abnormalFlag: AbnormalFlag.HIGH },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.MODIFIED_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: 'CKD Stage 2 with microalbuminuria warrants careful assessment. Accept with renal exclusion and loading.',
    modifications: [
      { type: 'exclusion' as any, description: 'Renal exclusion', details: 'Exclude renal disease claims for 3 years', duration: '3 years' },
      { type: 'premium_loading' as any, description: 'Premium loading 25%', details: 'Additional 25% premium for renal risk', duration: 'Permanent' },
    ],
    madeBy: 'UW-001',
    madeByName: 'Anjali Verma',
    madeByRole: 'Senior Underwriter',
    madeAt: new Date(),
    reviewedBy: 'MD-001',
    reviewedByName: 'Dr. Medical Director',
    reviewedAt: new Date(),
    case: case118,
  });

  // UPGRADE override (more conservative than ML)
  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.UPGRADE,
    systemRecommendation: 'MODERATE',
    systemRecommendationDetails: { originalTier: 'moderate', confidence: 0.72, reason: 'CKD Stage 2 classified as moderate' },
    systemConfidence: 0.72,
    underwriterChoice: 'COMPLEX',
    underwriterChoiceDetails: { newTier: 'complex' },
    reasoning: 'CKD Stage 2 with microalbuminuria indicates progression risk. HTN comorbidity adds renal stress. System underweighted CKD progression risk.',
    reasoningTags: ['ckd_progression_risk', 'microalbuminuria', 'renal_comorbidity', 'ml_underweighted'],
    caseContextSnapshot: { age: 55, sumAssured: 8000000, conditions: ['CKD Stage 2', 'Hypertension'], egfr: '68', uacr: '45' },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'MD-001',
    validatedAt: new Date(),
    validationNotes: 'Correct. CKD with proteinuria needs complex handling.',
    includedInTraining: true,
    case: case118,
  });

  console.log('✓ Case 118: CKD Stage 2 COMPLETED - complexity UPGRADED MODERATE→COMPLEX (UW-001)');

  // CASE 119: Similar CKD Stage 2 - UW-003 DOWNGRADES complexity (CONTRADICTS Case 118!)
  const case119 = await createLearningCase({
    caseReference: 'UW-2024-119',
    proposalId: 'PROP-119',
    sumAssured: 7500000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.MODERATE, // DOWNGRADED from COMPLEX
    complexityConfidence: 0.76,
    applicant: {
      firstName: 'Sanjay',
      lastName: 'Kulkarni',
      dateOfBirth: new Date('1971-09-28'),
      gender: Gender.MALE,
      occupation: 'Engineer',
      annualIncome: 3800000,
      heightCm: 172,
      weightKg: 72,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Pune',
      state: 'Maharashtra',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Chronic Kidney Disease Stage 2', icdCode: 'N18.2', diagnosisDate: new Date('2023-02-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypertension', icdCode: 'I10', diagnosisDate: new Date('2019-06-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Telmisartan', dosage: '40mg', frequency: 'daily', indication: 'Hypertension' },
    ],
    testResults: [
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '1.3', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'EGFR', testName: 'eGFR', resultValue: '72', resultUnit: 'mL/min', abnormalFlag: AbnormalFlag.LOW },
      { testCode: 'UACR', testName: 'Urine Albumin-Creatinine Ratio', resultValue: '28', resultUnit: 'mg/g', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.STANDARD_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: 'CKD Stage 2 with normal albumin ratio. Stable eGFR. HTN controlled. Standard terms sufficient.',
    madeBy: 'UW-003',
    madeByName: 'Pradeep Kumar',
    madeByRole: 'Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-002',
    reviewedByName: 'Senior UW Rajan',
    reviewedAt: new Date(),
    case: case119,
  });

  // DOWNGRADE override (less conservative than ML - CONTRADICTS Case 118)
  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'COMPLEX',
    systemRecommendationDetails: { originalTier: 'complex', confidence: 0.76, reason: 'CKD + HTN comorbidity' },
    systemConfidence: 0.76,
    underwriterChoice: 'MODERATE',
    underwriterChoiceDetails: { newTier: 'moderate' },
    reasoning: 'eGFR 72 is borderline Stage 2. Normal UACR means no proteinuria. CKD Stage 2 without proteinuria is not truly complex.',
    reasoningTags: ['borderline_ckd', 'no_proteinuria', 'stable_function', 'ml_overweighted'],
    caseContextSnapshot: { age: 53, sumAssured: 7500000, conditions: ['CKD Stage 2', 'Hypertension'], egfr: '72', uacr: '28' },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    validationNotes: 'Acceptable. Normal UACR differentiates from proteinuric CKD.',
    includedInTraining: true,
    case: case119,
  });

  console.log('✓ Case 119: CKD Stage 2 COMPLETED - complexity DOWNGRADED COMPLEX→MODERATE (UW-003, CONTRADICTS 118!)');

  // CASE 120: CKD Stage 2 - PENDING (conflicting override signals)
  const case120 = await createLearningCase({
    caseReference: 'UW-2024-120',
    proposalId: 'PROP-120',
    sumAssured: 7800000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.74,
    applicant: {
      firstName: 'Venkat',
      lastName: 'Naidu',
      dateOfBirth: new Date('1968-12-03'),
      gender: Gender.MALE,
      occupation: 'Farmer',
      annualIncome: 1500000,
      heightCm: 168,
      weightKg: 70,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Chronic Kidney Disease Stage 2', icdCode: 'N18.2', diagnosisDate: new Date('2023-05-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Hypertension', icdCode: 'I10', diagnosisDate: new Date('2020-01-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
    ],
    testResults: [
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '1.35', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'EGFR', testName: 'eGFR', resultValue: '70', resultUnit: 'mL/min', abnormalFlag: AbnormalFlag.LOW },
      { testCode: 'UACR', testName: 'UACR', resultValue: '35', resultUnit: 'mg/g', abnormalFlag: AbnormalFlag.HIGH },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  console.log('✓ Case 120: CKD Stage 2 PENDING - conflicting similar cases (118 upgraded, 119 downgraded)');

  // ============================================
  // CLUSTER 8: MIXED DIRECTION OVERRIDES
  // Tests: Same case has DOWNGRADE on complexity, UPGRADE on tests,
  // UPGRADE on risk - opposing signals for ML to reconcile
  // ============================================

  // CASE 121: Obesity + Sleep Apnea - mixed direction overrides
  const case121 = await createLearningCase({
    caseReference: 'UW-2024-121',
    proposalId: 'PROP-121',
    sumAssured: 6000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.MODERATE, // Downgraded from COMPLEX
    complexityConfidence: 0.78,
    applicant: {
      firstName: 'Rajesh',
      lastName: 'Tiwari',
      dateOfBirth: new Date('1979-03-25'),
      gender: Gender.MALE,
      occupation: 'Truck Driver',
      annualIncome: 900000,
      heightCm: 170,
      weightKg: 110,
      smokingStatus: SmokingStatus.CURRENT,
      smokingQuantity: '10 per day',
      smokingDurationYears: 15,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Varanasi',
      state: 'Uttar Pradesh',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Obesity', icdCode: 'E66', diagnosisDate: new Date('2021-01-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Obstructive Sleep Apnea', icdCode: 'G47.33', diagnosisDate: new Date('2022-06-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
    ],
    testResults: [
      { testCode: 'BMI', testName: 'BMI', resultValue: '38.1', resultUnit: 'kg/m²', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'PSG', testName: 'Polysomnography', resultValue: 'AHI 22 (moderate OSA)', resultUnit: '', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'ECG', testName: 'ECG', resultValue: 'Normal sinus rhythm', resultUnit: '', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.MODIFIED_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: 'Moderate OSA on CPAP. Obesity with smoking. Accept with loading and occupational assessment.',
    modifications: [
      { type: 'premium_loading' as any, description: 'Premium loading 50%', details: 'Obesity + smoking + OSA combined loading', duration: 'Reviewable at 2 years' },
    ],
    madeBy: 'UW-001',
    madeByName: 'Anjali Verma',
    madeByRole: 'Senior Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-002',
    reviewedByName: 'Senior UW Rajan',
    reviewedAt: new Date(),
    case: case121,
  });

  // Override 1: Complexity DOWNGRADE COMPLEX→MODERATE
  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'COMPLEX',
    systemRecommendationDetails: { originalTier: 'complex', confidence: 0.78 },
    systemConfidence: 0.78,
    underwriterChoice: 'MODERATE',
    underwriterChoiceDetails: { newTier: 'moderate' },
    reasoning: 'OSA is moderate (AHI 22) and treated with CPAP. Obesity alone with managed OSA is moderate, not complex.',
    reasoningTags: ['managed_osa', 'cpap_compliant', 'moderate_ahi'],
    caseContextSnapshot: { age: 45, sumAssured: 6000000, conditions: ['Obesity', 'OSA'], bmi: 38.1, ahi: 22 },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case121,
  });

  // Override 2: Test panel UPGRADE - ADDED sleep study follow-up
  await overrideRepo.save({
    overrideType: OverrideType.TEST_RECOMMENDATION,
    direction: OverrideDirection.UPGRADE,
    systemRecommendation: 'ECG, Lipid Panel, FBS, LFT',
    systemRecommendationDetails: { tests: ['ECG', 'LIPID', 'FBS', 'LFT'] },
    systemConfidence: 0.72,
    underwriterChoice: 'ECG, Lipid Panel, FBS, LFT, Polysomnography, Pulmonary Function Test',
    underwriterChoiceDetails: { tests: ['ECG', 'LIPID', 'FBS', 'LFT', 'PSG', 'PFT'], added: ['PSG', 'PFT'] },
    reasoning: 'System missed sleep study. OSA with smoking needs pulmonary function test. Occupational driving makes OSA assessment critical.',
    reasoningTags: ['osa_assessment_needed', 'occupational_driving', 'smoking_pulmonary', 'missing_tests'],
    caseContextSnapshot: { age: 45, sumAssured: 6000000, conditions: ['Obesity', 'OSA'], occupation: 'Truck Driver' },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case121,
  });

  // Override 3: Risk severity UPGRADE for obesity LOW→MODERATE
  await overrideRepo.save({
    overrideType: OverrideType.RISK_SEVERITY,
    direction: OverrideDirection.UPGRADE,
    systemRecommendation: 'Obesity: LOW',
    systemRecommendationDetails: { factorName: 'Obesity', originalSeverity: 'low' },
    systemConfidence: 0.65,
    underwriterChoice: 'Obesity: MODERATE',
    underwriterChoiceDetails: { newSeverity: 'moderate' },
    reasoning: 'BMI 38 with active smoking and OSA. System scored obesity risk too low. Combined lifestyle risk is significant.',
    reasoningTags: ['high_bmi', 'smoking_synergy', 'osa_synergy', 'combined_lifestyle_risk'],
    caseContextSnapshot: { age: 45, sumAssured: 6000000, conditions: ['Obesity', 'OSA'], bmi: 38.1, smoking: true },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case121,
  });

  console.log('✓ Case 121: Obesity+OSA COMPLETED - mixed overrides (complexity↓, tests↑, risk↑)');

  // CASE 122: Obesity + Sleep Apnea - same mixed pattern
  const case122 = await createLearningCase({
    caseReference: 'UW-2024-122',
    proposalId: 'PROP-122',
    sumAssured: 6500000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.76,
    applicant: {
      firstName: 'Ashok',
      lastName: 'Yadav',
      dateOfBirth: new Date('1981-07-10'),
      gender: Gender.MALE,
      occupation: 'Bus Driver',
      annualIncome: 800000,
      heightCm: 172,
      weightKg: 105,
      smokingStatus: SmokingStatus.CURRENT,
      smokingQuantity: '8 per day',
      smokingDurationYears: 12,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Patna',
      state: 'Bihar',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Obesity', icdCode: 'E66', diagnosisDate: new Date('2020-09-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Obstructive Sleep Apnea', icdCode: 'G47.33', diagnosisDate: new Date('2023-03-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
    ],
    testResults: [
      { testCode: 'BMI', testName: 'BMI', resultValue: '35.5', resultUnit: 'kg/m²', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'PSG', testName: 'Polysomnography', resultValue: 'AHI 18 (moderate OSA)', resultUnit: '', abnormalFlag: AbnormalFlag.HIGH },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.MODIFIED_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: 'Moderate OSA, professional driver. Accept with loading and mandatory CPAP compliance report.',
    modifications: [
      { type: 'premium_loading' as any, description: 'Premium loading 45%', details: 'Obesity + smoking + OSA', duration: 'Reviewable at 2 years' },
    ],
    madeBy: 'UW-003',
    madeByName: 'Pradeep Kumar',
    madeByRole: 'Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-001',
    reviewedByName: 'Anjali Verma',
    reviewedAt: new Date(),
    case: case122,
  });

  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'COMPLEX',
    systemRecommendationDetails: { originalTier: 'complex', confidence: 0.76 },
    systemConfidence: 0.76,
    underwriterChoice: 'MODERATE',
    underwriterChoiceDetails: { newTier: 'moderate' },
    reasoning: 'Managed OSA on CPAP. AHI 18 is moderate range. Not complex with treatment.',
    reasoningTags: ['managed_osa', 'cpap_compliant', 'moderate_ahi'],
    caseContextSnapshot: { age: 43, sumAssured: 6500000, conditions: ['Obesity', 'OSA'], bmi: 35.5, ahi: 18 },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-001',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case122,
  });

  await overrideRepo.save({
    overrideType: OverrideType.TEST_RECOMMENDATION,
    direction: OverrideDirection.UPGRADE,
    systemRecommendation: 'ECG, Lipid Panel, FBS',
    systemRecommendationDetails: { tests: ['ECG', 'LIPID', 'FBS'] },
    systemConfidence: 0.70,
    underwriterChoice: 'ECG, Lipid Panel, FBS, Polysomnography, PFT',
    underwriterChoiceDetails: { tests: ['ECG', 'LIPID', 'FBS', 'PSG', 'PFT'], added: ['PSG', 'PFT'] },
    reasoning: 'Professional driver with OSA - mandatory sleep study. Smoker needs PFT.',
    reasoningTags: ['occupational_driving', 'osa_assessment_needed', 'smoking_pulmonary'],
    caseContextSnapshot: { age: 43, sumAssured: 6500000, conditions: ['Obesity', 'OSA'], occupation: 'Bus Driver' },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-001',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case122,
  });

  await overrideRepo.save({
    overrideType: OverrideType.RISK_SEVERITY,
    direction: OverrideDirection.UPGRADE,
    systemRecommendation: 'Obesity: LOW',
    systemRecommendationDetails: { factorName: 'Obesity', originalSeverity: 'low' },
    systemConfidence: 0.62,
    underwriterChoice: 'Obesity: MODERATE',
    underwriterChoiceDetails: { newSeverity: 'moderate' },
    reasoning: 'BMI 35.5, smoker, professional driver with OSA. Combined risk underscored by system.',
    reasoningTags: ['high_bmi', 'smoking_synergy', 'occupational_risk', 'combined_lifestyle_risk'],
    caseContextSnapshot: { age: 43, sumAssured: 6500000, conditions: ['Obesity', 'OSA'], bmi: 35.5 },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: true,
    validatedBy: 'UW-001',
    validatedAt: new Date(),
    includedInTraining: true,
    case: case122,
  });

  console.log('✓ Case 122: Obesity+OSA COMPLETED - same mixed direction override pattern');

  // CASE 123: Obesity + Sleep Apnea - PENDING
  const case123 = await createLearningCase({
    caseReference: 'UW-2024-123',
    proposalId: 'PROP-123',
    sumAssured: 5800000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.77,
    applicant: {
      firstName: 'Manoj',
      lastName: 'Chauhan',
      dateOfBirth: new Date('1977-11-05'),
      gender: Gender.MALE,
      occupation: 'Cab Driver',
      annualIncome: 700000,
      heightCm: 168,
      weightKg: 102,
      smokingStatus: SmokingStatus.CURRENT,
      smokingQuantity: '12 per day',
      smokingDurationYears: 18,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Delhi',
      state: 'Delhi',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Obesity', icdCode: 'E66', diagnosisDate: new Date('2021-04-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.MONITORING },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Obstructive Sleep Apnea', icdCode: 'G47.33', diagnosisDate: new Date('2023-08-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
    ],
    testResults: [
      { testCode: 'BMI', testName: 'BMI', resultValue: '36.1', resultUnit: 'kg/m²', abnormalFlag: AbnormalFlag.HIGH },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  console.log('✓ Case 123: Obesity+OSA PENDING - will show Cases 121, 122 (mixed direction overrides)');

  // ============================================
  // CLUSTER 9: VALIDATION STATUS IMPACT ON ML
  // Tests: Same override type, one validated (high ML weight),
  // one NOT validated (low/no ML weight). ML training must differentiate.
  // ============================================

  // CASE 124: Asthma + COPD - VALIDATED override, included in training
  const case124 = await createLearningCase({
    caseReference: 'UW-2024-124',
    proposalId: 'PROP-124',
    sumAssured: 9000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.MODERATE, // Overridden from COMPLEX
    complexityConfidence: 0.80,
    applicant: {
      firstName: 'Narayan',
      lastName: 'Hegde',
      dateOfBirth: new Date('1964-06-15'),
      gender: Gender.MALE,
      occupation: 'Retired Teacher',
      annualIncome: 1200000,
      heightCm: 168,
      weightKg: 65,
      smokingStatus: SmokingStatus.FORMER,
      smokingQuitDate: new Date('2015-01-01'),
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Mangalore',
      state: 'Karnataka',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Bronchial Asthma', icdCode: 'J45', diagnosisDate: new Date('2005-03-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'COPD - Mild', icdCode: 'J44', diagnosisDate: new Date('2020-08-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Budesonide/Formoterol Inhaler', dosage: '200/6mcg', frequency: 'twice daily', indication: 'Asthma + COPD' },
    ],
    testResults: [
      { testCode: 'PFT', testName: 'Pulmonary Function Test', resultValue: 'FEV1 72%, FEV1/FVC 0.68', resultUnit: '', abnormalFlag: AbnormalFlag.LOW },
      { testCode: 'SPO2', testName: 'Oxygen Saturation', resultValue: '96', resultUnit: '%', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.MODIFIED_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    systemRecommendedType: 'modified_acceptance',
    isOverride: false,
    rationale: 'Mild COPD overlap with asthma. Quit smoking 9 years ago. Stable on inhaler. Accept with respiratory exclusion waiver after 2 years.',
    modifications: [
      { type: 'exclusion' as any, description: 'Respiratory exclusion', details: 'Respiratory claims excluded for 2 years', duration: '2 years' },
      { type: 'premium_loading' as any, description: 'Premium loading 15%', details: 'Mild COPD loading', duration: 'Permanent' },
    ],
    madeBy: 'UW-001',
    madeByName: 'Anjali Verma',
    madeByRole: 'Senior Underwriter',
    madeAt: new Date(),
    reviewedBy: 'MD-001',
    reviewedByName: 'Dr. Medical Director',
    reviewedAt: new Date(),
    case: case124,
  });

  // VALIDATED override - high training weight
  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'COMPLEX',
    systemRecommendationDetails: { originalTier: 'complex', confidence: 0.80, reason: 'Asthma + COPD dual respiratory' },
    systemConfidence: 0.80,
    underwriterChoice: 'MODERATE',
    underwriterChoiceDetails: { newTier: 'moderate' },
    reasoning: 'Mild COPD with FEV1 72% is not severe. Quit smoking 9 years ago. Asthma-COPD overlap syndrome, not severe COPD. System over-scores dual respiratory.',
    reasoningTags: ['mild_copd', 'former_smoker_long_quit', 'overlap_syndrome', 'stable_pft'],
    caseContextSnapshot: { age: 60, sumAssured: 9000000, conditions: ['Asthma', 'COPD'], fev1: '72%', smokingQuit: '9 years' },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'MD-001',
    validatedByName: 'Dr. Medical Director',
    validatedAt: new Date(),
    validationNotes: 'Confirmed. ACOS with mild obstruction is moderate complexity. Good override.',
    includedInTraining: true,
    case: case124,
  });

  console.log('✓ Case 124: Asthma+COPD COMPLETED - VALIDATED override, included in ML training');

  // CASE 125: Similar Asthma + COPD - NOT validated, flagged for review
  const case125 = await createLearningCase({
    caseReference: 'UW-2024-125',
    proposalId: 'PROP-125',
    sumAssured: 8500000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.MODERATE,
    complexityConfidence: 0.82,
    applicant: {
      firstName: 'Harish',
      lastName: 'Shetty',
      dateOfBirth: new Date('1966-10-28'),
      gender: Gender.MALE,
      occupation: 'Retired Postman',
      annualIncome: 900000,
      heightCm: 165,
      weightKg: 62,
      smokingStatus: SmokingStatus.FORMER,
      smokingQuitDate: new Date('2020-06-01'),
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'Udupi',
      state: 'Karnataka',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Bronchial Asthma', icdCode: 'J45', diagnosisDate: new Date('2010-05-20'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'COPD - Moderate', icdCode: 'J44', diagnosisDate: new Date('2021-11-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Tiotropium', dosage: '18mcg', frequency: 'daily', indication: 'COPD' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'as needed', indication: 'Asthma rescue' },
    ],
    testResults: [
      { testCode: 'PFT', testName: 'Pulmonary Function Test', resultValue: 'FEV1 58%, FEV1/FVC 0.62', resultUnit: '', abnormalFlag: AbnormalFlag.LOW },
      { testCode: 'SPO2', testName: 'Oxygen Saturation', resultValue: '94', resultUnit: '%', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.MODIFIED_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: 'Moderate COPD. Accept with respiratory exclusion and loading.',
    modifications: [
      { type: 'exclusion' as any, description: 'Respiratory exclusion', details: 'Respiratory claims excluded permanently', duration: 'Permanent' },
      { type: 'premium_loading' as any, description: 'Premium loading 35%', details: 'Moderate COPD loading', duration: 'Permanent' },
    ],
    madeBy: 'UW-003',
    madeByName: 'Pradeep Kumar',
    madeByRole: 'Underwriter',
    madeAt: new Date(),
    case: case125,
  });

  // NOT VALIDATED override - flagged for review, NOT in training
  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'COMPLEX',
    systemRecommendationDetails: { originalTier: 'complex', confidence: 0.82 },
    systemConfidence: 0.82,
    underwriterChoice: 'MODERATE',
    underwriterChoiceDetails: { newTier: 'moderate' },
    reasoning: 'COPD is moderate grade but stable. Quit smoking recently. Can manage as moderate.',
    reasoningTags: ['moderate_copd', 'recent_smoker_quit', 'stable_condition'],
    caseContextSnapshot: { age: 58, sumAssured: 8500000, conditions: ['Asthma', 'COPD'], fev1: '58%', smokingQuit: '4 years' },
    underwriterId: 'UW-003',
    underwriterName: 'Pradeep Kumar',
    underwriterRole: 'Underwriter',
    underwriterExperienceYears: 5,
    validated: false, // NOT VALIDATED
    flaggedForReview: true, // FLAGGED
    reviewNotes: 'FEV1 58% is moderate-severe. Recent smoking cessation (4 years). May warrant complex tier. Needs senior review.',
    includedInTraining: false, // NOT in training data
    case: case125,
  });

  console.log('✓ Case 125: Asthma+COPD COMPLETED - NOT VALIDATED override, flagged, excluded from ML training');

  // CASE 126: Asthma + COPD - PENDING
  const case126 = await createLearningCase({
    caseReference: 'UW-2024-126',
    proposalId: 'PROP-126',
    sumAssured: 8800000,
    status: CaseStatus.PENDING_REVIEW,
    complexityTier: ComplexityTier.COMPLEX,
    complexityConfidence: 0.81,
    applicant: {
      firstName: 'Ramesh',
      lastName: 'Kamath',
      dateOfBirth: new Date('1962-08-12'),
      gender: Gender.MALE,
      occupation: 'Retired Clerk',
      annualIncome: 1000000,
      heightCm: 170,
      weightKg: 68,
      smokingStatus: SmokingStatus.FORMER,
      smokingQuitDate: new Date('2017-03-01'),
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Mysore',
      state: 'Karnataka',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Bronchial Asthma', icdCode: 'J45', diagnosisDate: new Date('2008-01-15'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.CONDITION, conditionName: 'COPD - Mild', icdCode: 'J44', diagnosisDate: new Date('2022-02-10'), conditionStatus: ConditionStatus.CHRONIC, treatmentStatus: TreatmentStatus.TREATED },
    ],
    testResults: [
      { testCode: 'PFT', testName: 'PFT', resultValue: 'FEV1 68%, FEV1/FVC 0.65', resultUnit: '', abnormalFlag: AbnormalFlag.LOW },
      { testCode: 'SPO2', testName: 'SpO2', resultValue: '95', resultUnit: '%', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  console.log('✓ Case 126: Asthma+COPD PENDING - will show 124 (validated) and 125 (unvalidated) differently');

  // ============================================
  // CLUSTER 10: EDGE CASES
  // Tests extreme ML-override interactions
  // ============================================

  // CASE 127: Cancer survivor - ML 0.94 COMPLEX + DECLINE both overridden
  const case127 = await createLearningCase({
    caseReference: 'UW-2024-127',
    proposalId: 'PROP-127',
    sumAssured: 5000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.MODERATE, // Overridden from COMPLEX at 0.94
    complexityConfidence: 0.94,
    applicant: {
      firstName: 'Sunita',
      lastName: 'Devi',
      dateOfBirth: new Date('1979-04-10'),
      gender: Gender.FEMALE,
      occupation: 'School Principal',
      annualIncome: 2200000,
      heightCm: 158,
      weightKg: 60,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.NEVER,
      city: 'Dehradun',
      state: 'Uttarakhand',
    },
    disclosures: [
      { disclosureType: DisclosureType.CONDITION, conditionName: 'Breast Cancer - Stage I', icdCode: 'C50', diagnosisDate: new Date('2019-02-20'), conditionStatus: ConditionStatus.RESOLVED, treatmentStatus: TreatmentStatus.TREATED },
      { disclosureType: DisclosureType.SURGERY, procedureName: 'Lumpectomy + Sentinel Node Biopsy', procedureDate: new Date('2019-03-15'), hospitalName: 'Max Hospital', outcome: 'Successful, margins clear, nodes negative' },
      { disclosureType: DisclosureType.MEDICATION, drugName: 'Tamoxifen', dosage: '20mg', frequency: 'daily', indication: 'Breast cancer adjuvant (completed 5-year course)' },
      { disclosureType: DisclosureType.FAMILY_HISTORY, familyCondition: 'Breast Cancer', familyRelationship: FamilyRelationship.MOTHER, ageAtDiagnosis: 62 },
    ],
    testResults: [
      { testCode: 'MAMMO', testName: 'Mammography', resultValue: 'BIRADS 1 - Normal', resultUnit: '', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'CA125', testName: 'Tumor Marker CA 15-3', resultValue: '12', resultUnit: 'U/mL', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'CBC', testName: 'Complete Blood Count', resultValue: 'All values normal', resultUnit: '', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.STANDARD_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    systemRecommendedType: 'decline',
    isOverride: true,
    overrideReason: '5+ year cancer-free survival with Stage I, node-negative disease qualifies for standard acceptance per latest evidence',
    rationale: 'Stage I breast cancer, node-negative, clear margins. 5+ years disease-free. Completed adjuvant therapy. Normal tumor markers and mammography. Standard terms per cancer survivor protocol.',
    madeBy: 'UW-001',
    madeByName: 'Anjali Verma',
    madeByRole: 'Senior Underwriter',
    madeAt: new Date(),
    reviewedBy: 'MD-001',
    reviewedByName: 'Dr. Medical Director',
    reviewedAt: new Date(),
    reviewNotes: 'Approved. Stage I, node-negative breast cancer with 5-year disease-free survival has excellent prognosis.',
    case: case127,
  });

  // Override 1: Complexity COMPLEX→MODERATE despite ML 0.94 confidence
  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'COMPLEX',
    systemRecommendationDetails: { originalTier: 'complex', confidence: 0.94, reason: 'Cancer history + family history' },
    systemConfidence: 0.94,
    underwriterChoice: 'MODERATE',
    underwriterChoiceDetails: { newTier: 'moderate' },
    reasoning: 'ML assigns maximum complexity due to "cancer" keyword. But Stage I, node-negative, 5yr disease-free is a very different risk profile than active cancer. ML lacks cancer staging nuance.',
    reasoningTags: ['cancer_staging_nuance', 'disease_free_5yr', 'ml_keyword_bias', 'stage_1_favorable'],
    caseContextSnapshot: { age: 45, sumAssured: 5000000, conditions: ['Breast Cancer Stage I (Resolved)'], diseaseFreeYears: 5, stage: 'I', nodeStatus: 'negative' },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'MD-001',
    validatedAt: new Date(),
    validationNotes: 'ML has no cancer staging awareness. This is a critical gap for override learning.',
    includedInTraining: true,
    case: case127,
  });

  // Override 2: Decision DECLINE→STANDARD_ACCEPTANCE
  await overrideRepo.save({
    overrideType: OverrideType.DECISION_OPTION,
    direction: OverrideDirection.DOWNGRADE,
    systemRecommendation: 'DECLINE (cancer history)',
    systemRecommendationDetails: { decisionType: 'decline', reason: 'Cancer diagnosis in medical history' },
    systemConfidence: 0.90,
    underwriterChoice: 'STANDARD_ACCEPTANCE',
    underwriterChoiceDetails: { decisionType: 'standard_acceptance' },
    reasoning: 'Cancer survivor protocol: Stage I, node-negative, 5yr disease-free, completed therapy, normal surveillance. Decline is inappropriate.',
    reasoningTags: ['cancer_survivor_protocol', 'stage_1_node_negative', 'disease_free_5yr', 'completed_therapy'],
    caseContextSnapshot: { age: 45, sumAssured: 5000000, conditions: ['Breast Cancer Stage I (Resolved)'], diseaseFreeYears: 5 },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'MD-001',
    validatedAt: new Date(),
    validationNotes: 'Correct. Industry standard now accepts early-stage cancer survivors at 5 years.',
    includedInTraining: true,
    case: case127,
  });

  await riskFactorRepo.save({
    factorName: 'Cancer History - Breast',
    factorDescription: 'Stage I Breast Cancer - 5yr disease-free',
    category: RiskCategory.MEDICAL,
    severity: RiskSeverity.LOW,
    originalSeverity: RiskSeverity.CRITICAL,
    severityOverridden: true,
    overrideReason: 'Stage I, node-negative, 5yr disease-free survival',
    impactDirection: ImpactDirection.INCREASES_RISK,
    source: FactorSource.DISCLOSURE,
    identifyingRuleId: 'CA_001',
    confidence: 0.95,
    verified: true,
    case: case127,
  });

  console.log('✓ Case 127: Cancer survivor COMPLETED - ML 0.94 COMPLEX→MODERATE + DECLINE→STANDARD (extreme override)');

  // CASE 128: Elderly, no conditions, high sum - UPGRADE override (reverse pattern)
  const case128 = await createLearningCase({
    caseReference: 'UW-2024-128',
    proposalId: 'PROP-128',
    sumAssured: 20000000,
    status: CaseStatus.COMPLETED,
    complexityTier: ComplexityTier.MODERATE, // UPGRADED from ROUTINE
    complexityConfidence: 0.85,
    applicant: {
      firstName: 'Jagdish',
      lastName: 'Prasad',
      dateOfBirth: new Date('1956-01-30'),
      gender: Gender.MALE,
      occupation: 'Retired Chairman',
      annualIncome: 12000000,
      heightCm: 175,
      weightKg: 80,
      smokingStatus: SmokingStatus.NEVER,
      alcoholStatus: AlcoholStatus.SOCIAL,
      city: 'New Delhi',
      state: 'Delhi',
    },
    disclosures: [
      { disclosureType: DisclosureType.FAMILY_HISTORY, familyCondition: 'Myocardial Infarction', familyRelationship: FamilyRelationship.FATHER, ageAtDiagnosis: 55, ageAtDeath: 62 },
      { disclosureType: DisclosureType.FAMILY_HISTORY, familyCondition: 'Type 2 Diabetes', familyRelationship: FamilyRelationship.MOTHER, ageAtDiagnosis: 50 },
    ],
    testResults: [
      { testCode: 'ECG', testName: 'ECG', resultValue: 'Normal sinus rhythm', resultUnit: '', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'LIPID', testName: 'Lipid Panel', resultValue: 'LDL 125, TG 145', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.HIGH },
      { testCode: 'FBS', testName: 'Fasting Blood Sugar', resultValue: '108', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'HBA1C', testName: 'HbA1c', resultValue: '5.8', resultUnit: '%', abnormalFlag: AbnormalFlag.NORMAL },
      { testCode: 'CREAT', testName: 'Creatinine', resultValue: '1.1', resultUnit: 'mg/dL', abnormalFlag: AbnormalFlag.NORMAL },
    ],
  }, caseRepo, applicantRepo, disclosureRepo, documentRepo, testResultRepo);

  await decisionRepo.save({
    decisionType: DecisionType.MODIFIED_ACCEPTANCE,
    status: DecisionStatus.APPROVED,
    rationale: 'Age 68 with ₹2Cr sum assured. No current conditions but significant family history. Borderline lipids. Accept with age-related loading.',
    modifications: [
      { type: 'premium_loading' as any, description: 'Premium loading 30%', details: 'Age 68 + high sum assured + family history loading', duration: 'Permanent' },
    ],
    madeBy: 'UW-001',
    madeByName: 'Anjali Verma',
    madeByRole: 'Senior Underwriter',
    madeAt: new Date(),
    reviewedBy: 'UW-002',
    reviewedByName: 'Senior UW Rajan',
    reviewedAt: new Date(),
    case: case128,
  });

  // UPGRADE override (more conservative than ML - rare pattern)
  await overrideRepo.save({
    overrideType: OverrideType.COMPLEXITY_TIER,
    direction: OverrideDirection.UPGRADE,
    systemRecommendation: 'ROUTINE',
    systemRecommendationDetails: { originalTier: 'routine', confidence: 0.85, reason: 'No current conditions' },
    systemConfidence: 0.85,
    underwriterChoice: 'MODERATE',
    underwriterChoiceDetails: { newTier: 'moderate' },
    reasoning: 'Age 68 with ₹2Cr sum assured is NOT routine regardless of current health. Strong family cardiac history. Borderline lipids at this age. ML ignores age-sum interaction and family history weight.',
    reasoningTags: ['age_sum_interaction', 'family_cardiac_history', 'borderline_lipids', 'ml_age_gap', 'high_exposure'],
    caseContextSnapshot: { age: 68, sumAssured: 20000000, conditions: [], familyHistory: ['MI (father, age 55)', 'DM (mother, age 50)'], ldl: '125' },
    underwriterId: 'UW-001',
    underwriterName: 'Anjali Verma',
    underwriterRole: 'Senior Underwriter',
    underwriterExperienceYears: 8,
    validated: true,
    validatedBy: 'UW-002',
    validatedAt: new Date(),
    validationNotes: 'Correct. High-value elderly cases always need deeper review regardless of apparent health.',
    includedInTraining: true,
    case: case128,
  });

  await riskFactorRepo.save([
    {
      factorName: 'Advanced Age',
      factorDescription: 'Age 68 with high sum assured',
      category: RiskCategory.MEDICAL,
      severity: RiskSeverity.MODERATE,
      impactDirection: ImpactDirection.INCREASES_RISK,
      source: FactorSource.MANUAL_ENTRY,
      confidence: 0.9,
      verified: true,
      case: case128,
    },
    {
      factorName: 'Family Cardiac History',
      factorDescription: 'Father MI at 55, died at 62',
      category: RiskCategory.FAMILY_HISTORY,
      severity: RiskSeverity.MODERATE,
      impactDirection: ImpactDirection.INCREASES_RISK,
      source: FactorSource.DISCLOSURE,
      identifyingRuleId: 'FH_001',
      confidence: 0.85,
      verified: true,
      case: case128,
    },
  ]);

  console.log('✓ Case 128: Elderly no conditions COMPLETED - UPGRADE ROUTINE→MODERATE (reverse override pattern)');

  // ============================================
  // Summary
  // ============================================
  console.log('\n=== Learning Seed Complete ===');
  console.log('\nALL CASES (UW-2024-100 to UW-2024-128):');
  console.log('┌─────────────────┬──────────────────────────┬────────────────┬──────────────────────────────────────────┐');
  console.log('│ Case Reference  │ Condition                │ Status         │ Override / Purpose                       │');
  console.log('├─────────────────┼──────────────────────────┼────────────────┼──────────────────────────────────────────┤');
  console.log('│ UW-2024-100     │ Diabetes                 │ COMPLETED      │ Complexity: MODERATE→ROUTINE             │');
  console.log('│ UW-2024-101     │ Diabetes                 │ COMPLETED      │ Complexity: MODERATE→ROUTINE             │');
  console.log('│ UW-2024-102     │ Diabetes                 │ PENDING        │ (Similar cases test)                     │');
  console.log('├─────────────────┼──────────────────────────┼────────────────┼──────────────────────────────────────────┤');
  console.log('│ UW-2024-103     │ Cardiac (CABG)           │ COMPLETED      │ Test Panel: TMT removed                  │');
  console.log('│ UW-2024-104     │ Cardiac (PCI)            │ COMPLETED      │ Test Panel: TMT+CT Angio removed         │');
  console.log('│ UW-2024-105     │ Cardiac (CABG)           │ PENDING        │ (Similar cases test)                     │');
  console.log('├─────────────────┼──────────────────────────┼────────────────┼──────────────────────────────────────────┤');
  console.log('│ UW-2024-106     │ Hypertension             │ COMPLETED      │ Risk: MODERATE→LOW                       │');
  console.log('│ UW-2024-107     │ Hypertension             │ COMPLETED      │ Risk: MODERATE→LOW                       │');
  console.log('│ UW-2024-108     │ Hypertension             │ PENDING        │ (Similar cases test)                     │');
  console.log('├─────────────────┼──────────────────────────┼────────────────┼──────────────────────────────────────────┤');
  console.log('│ UW-2024-109     │ DM + HTN comorbidity     │ COMPLETED      │ 3 overrides: complexity+risk+tests       │');
  console.log('│ UW-2024-110     │ DM + HTN comorbidity     │ COMPLETED      │ 3 overrides: same triple pattern         │');
  console.log('│ UW-2024-111     │ DM + HTN comorbidity     │ PENDING        │ (Multi-override similar test)             │');
  console.log('├─────────────────┼──────────────────────────┼────────────────┼──────────────────────────────────────────┤');
  console.log('│ UW-2024-112     │ Fatty Liver (NAFLD)      │ COMPLETED      │ ML 0.92→MODERATE + MODIFIED→STANDARD     │');
  console.log('│ UW-2024-113     │ Fatty Liver (NAFLD)      │ COMPLETED      │ ML 0.90→MODERATE + decision override     │');
  console.log('│ UW-2024-114     │ Fatty Liver (NAFLD)      │ PENDING        │ (High ML confidence override test)       │');
  console.log('├─────────────────┼──────────────────────────┼────────────────┼──────────────────────────────────────────┤');
  console.log('│ UW-2024-115     │ Thyroid + Anxiety         │ COMPLETED      │ DEFERRAL→STANDARD + complexity↓          │');
  console.log('│ UW-2024-116     │ Thyroid + Panic           │ COMPLETED      │ DEFERRAL→STANDARD + complexity↓          │');
  console.log('│ UW-2024-117     │ Thyroid + Anxiety         │ PENDING        │ (Decision override test)                 │');
  console.log('├─────────────────┼──────────────────────────┼────────────────┼──────────────────────────────────────────┤');
  console.log('│ UW-2024-118     │ CKD Stage 2 + HTN        │ COMPLETED      │ Complexity UPGRADE MODERATE→COMPLEX       │');
  console.log('│ UW-2024-119     │ CKD Stage 2 + HTN        │ COMPLETED      │ Complexity DOWNGRADE COMPLEX→MODERATE     │');
  console.log('│ UW-2024-120     │ CKD Stage 2 + HTN        │ PENDING        │ (Contradicting overrides test!)           │');
  console.log('├─────────────────┼──────────────────────────┼────────────────┼──────────────────────────────────────────┤');
  console.log('│ UW-2024-121     │ Obesity + Sleep Apnea    │ COMPLETED      │ Complexity↓ + Tests↑ + Risk↑ (mixed)     │');
  console.log('│ UW-2024-122     │ Obesity + Sleep Apnea    │ COMPLETED      │ Same mixed direction pattern              │');
  console.log('│ UW-2024-123     │ Obesity + Sleep Apnea    │ PENDING        │ (Mixed direction override test)           │');
  console.log('├─────────────────┼──────────────────────────┼────────────────┼──────────────────────────────────────────┤');
  console.log('│ UW-2024-124     │ Asthma + COPD            │ COMPLETED      │ VALIDATED by MD, in ML training           │');
  console.log('│ UW-2024-125     │ Asthma + COPD            │ COMPLETED      │ NOT validated, flagged, excluded from ML  │');
  console.log('│ UW-2024-126     │ Asthma + COPD            │ PENDING        │ (Validation status impact test)           │');
  console.log('├─────────────────┼──────────────────────────┼────────────────┼──────────────────────────────────────────┤');
  console.log('│ UW-2024-127     │ Cancer survivor (breast) │ COMPLETED      │ ML 0.94 COMPLEX→MODERATE + DECLINE→STD   │');
  console.log('│ UW-2024-128     │ Elderly, no conditions   │ COMPLETED      │ UPGRADE ROUTINE→MODERATE (reverse)       │');
  console.log('└─────────────────┴──────────────────────────┴────────────────┴──────────────────────────────────────────┘');
  console.log('\nOVERRIDE-ML INTERACTION TEST SCENARIOS:');
  console.log('');
  console.log('1. MULTI-OVERRIDE:    Cases 109-111 → ML must handle 3 simultaneous override signals');
  console.log('2. HIGH CONFIDENCE:   Cases 112-114 → ML at 0.90+ confidence overridden (NAFLD nuance)');
  console.log('3. DECISION OVERRIDE: Cases 115-117 → Decision pathway overrides (DEFERRAL→STANDARD)');
  console.log('4. CONTRADICTING:     Cases 118-120 → Same condition, opposite overrides (CKD: up vs down)');
  console.log('5. MIXED DIRECTION:   Cases 121-123 → Complexity↓ but Tests↑ and Risk↑ on same case');
  console.log('6. VALIDATION:        Cases 124-126 → Validated (train) vs unvalidated (skip) overrides');
  console.log('7. EDGE CASES:        Case 127 → Cancer DECLINE→STANDARD; Case 128 → Elderly UPGRADE');
  console.log('');
  console.log('SIMILAR CASES TO TEST:');
  console.log('- Case 111 → Shows 109, 110 (triple override pattern)');
  console.log('- Case 114 → Shows 112, 113 (ML should learn NAFLD is overweighted)');
  console.log('- Case 117 → Shows 115, 116 (resolved psychiatric = no deferral)');
  console.log('- Case 120 → Shows 118 AND 119 (CONFLICTING signals - critical test!)');
  console.log('- Case 123 → Shows 121, 122 (mixed direction overrides)');
  console.log('- Case 126 → Shows 124 (validated) and 125 (flagged) differently');
  console.log('');
  console.log('API ENDPOINTS TO TEST:');
  console.log('- GET /api/overrides/similar-cases/{caseId}');
  console.log('- GET /api/overrides/learning-insights/{caseId}');
  console.log('- GET /api/overrides/patterns');
  console.log('- GET /api/overrides/stats');

  await dataSource.destroy();
}

async function createLearningCase(data: any, caseRepo: any, applicantRepo: any, disclosureRepo: any, documentRepo: any, testResultRepo: any): Promise<Case> {
  // Create applicant with unique ID
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const applicantData = {
    ...data.applicant,
    applicantId: `APP-L-${uniqueId}`,
    addressLine1: '123 Learning Test Street',
    postalCode: '400001',
    phonePrimary: '+91-9876543210',
    email: `${data.applicant.firstName.toLowerCase()}.${data.applicant.lastName.toLowerCase()}@test.com`,
  };

  if (!applicantData.bmi && applicantData.heightCm && applicantData.weightKg) {
    const heightM = applicantData.heightCm / 100;
    applicantData.bmi = applicantData.weightKg / (heightM * heightM);
  }

  // Calculate age
  const today = new Date();
  const birth = new Date(applicantData.dateOfBirth);
  applicantData.age = today.getFullYear() - birth.getFullYear();

  const applicant = await applicantRepo.save(applicantData);

  // Create case
  const caseData = {
    caseReference: data.caseReference,
    proposalId: data.proposalId,
    proposalDate: new Date(),
    productCode: 'TERM-LIFE-01',
    productName: 'Term Life Insurance',
    sumAssured: data.sumAssured,
    sumAssuredCurrency: 'INR',
    status: data.status,
    complexityTier: data.complexityTier,
    complexityConfidence: data.complexityConfidence,
    channel: Channel.AGENT,
    applicant: applicant,
    slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
  const caseEntity = await caseRepo.save(caseData);

  // Create disclosures
  for (const discData of data.disclosures || []) {
    await disclosureRepo.save({ ...discData, case: caseEntity });
  }

  // Create document
  await documentRepo.save({
    documentType: DocumentType.MEDICAL_REPORT,
    receivedDate: new Date(),
    sourceSystem: 'learning_seed',
    fileName: 'medical_report.pdf',
    fileType: 'application/pdf',
    extractionStatus: ExtractionStatus.EXTRACTED,
    extractionMethod: ExtractionMethod.PDF_NATIVE,
    extractionConfidence: 0.95,
    extractedText: `Medical Report for ${data.applicant.firstName} ${data.applicant.lastName}`,
    case: caseEntity,
  });

  // Create test results
  for (const testData of data.testResults || []) {
    await testResultRepo.save({
      ...testData,
      testDate: new Date(),
      source: ResultSource.LAB_FEED,
      fastingStatus: FastingStatus.UNKNOWN,
      performingLab: 'Learning Test Lab',
      case: caseEntity,
    });
  }

  return caseEntity;
}

export { seedLearning };

// Only auto-run when executed directly (not when imported)
if (require.main === module) {
  seedLearning().catch(console.error);
}
