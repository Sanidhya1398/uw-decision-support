import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Case } from './case.entity';

export enum RiskCategory {
  MEDICAL = 'medical',
  LIFESTYLE = 'lifestyle',
  FINANCIAL = 'financial',
  OCCUPATIONAL = 'occupational',
  FAMILY_HISTORY = 'family_history',
}

export enum RiskSeverity {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ImpactDirection {
  INCREASES_RISK = 'increases_risk',
  DECREASES_RISK = 'decreases_risk',
  NEUTRAL = 'neutral',
}

export enum FactorSource {
  DISCLOSURE = 'disclosure',
  DOCUMENT_EXTRACTION = 'document_extraction',
  TEST_RESULT = 'test_result',
  RULE_INFERENCE = 'rule_inference',
  MANUAL_ENTRY = 'manual_entry',
  RULES_ENGINE = 'rules_engine',
  ML_MODEL = 'ml_model',
  NLP_EXTRACTION = 'nlp_extraction',
}

@Entity('risk_factors')
export class RiskFactor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
  })
  category: RiskCategory;

  @Column()
  factorName: string;

  @Column()
  factorDescription: string;

  @Column({
    type: 'varchar',
  })
  severity: RiskSeverity;

  @Column({
    type: 'varchar',
  })
  impactDirection: ImpactDirection;

  @Column({
    type: 'varchar',
  })
  source: FactorSource;

  @Column({ nullable: true })
  sourceEntityId: string; // ID of disclosure, document, or test result

  @Column({ nullable: true })
  sourceEntityType: string;

  // Supporting evidence
  @Column('simple-json', { nullable: true })
  supportingEvidence: {
    description: string;
    value?: string;
    reference?: string;
  }[];

  // Quantitative values if applicable
  @Column({ nullable: true })
  measuredValue: string;

  @Column({ nullable: true })
  normalRange: string;

  @Column({ nullable: true })
  deviation: string;

  // Rule that identified this factor
  @Column({ nullable: true })
  identifyingRuleId: string;

  @Column({ nullable: true })
  identifyingRuleName: string;

  // Weight for complexity calculation
  @Column('decimal', { precision: 5, scale: 4, nullable: true })
  complexityWeight: number;

  // Confidence
  @Column('decimal', { precision: 3, scale: 2, default: 1.0 })
  confidence: number;

  // Underwriter verification
  @Column({ default: false })
  verified: boolean;

  @Column({ nullable: true })
  verifiedBy: string;

  @Column({ nullable: true })
  verifiedAt: Date;

  // Underwriter override
  @Column({ default: false })
  severityOverridden: boolean;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  originalSeverity: RiskSeverity;

  @Column({ nullable: true })
  overrideReason: string;

  // Mitigating factors
  @Column('simple-json', { nullable: true })
  mitigatingFactors: { description: string; impact: string }[];

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Case, (caseEntity) => caseEntity.riskFactors)
  case: Case;
}
