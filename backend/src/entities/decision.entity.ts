import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Case } from './case.entity';

export enum DecisionType {
  STANDARD_ACCEPTANCE = 'standard_acceptance',
  MODIFIED_ACCEPTANCE = 'modified_acceptance',
  DEFERRAL = 'deferral',
  REFERRAL = 'referral',
  POSTPONEMENT = 'postponement',
  DECLINE = 'decline',
}

export enum DecisionStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUPERSEDED = 'superseded',
}

export enum ModificationType {
  EXCLUSION = 'exclusion',
  WAITING_PERIOD = 'waiting_period',
  BENEFIT_LIMIT = 'benefit_limit',
  PREMIUM_LOADING = 'premium_loading',
}

@Entity('decisions')
export class Decision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
  })
  decisionType: DecisionType;

  @Column({
    type: 'varchar',
    default: DecisionStatus.DRAFT,
  })
  status: DecisionStatus;

  // Decision details
  @Column('text')
  rationale: string;

  @Column('simple-json', { nullable: true })
  supportingFactors: { factor: string; description: string }[];

  @Column('simple-json', { nullable: true })
  weighingFactors: { factor: string; description: string }[];

  // For modified acceptance
  @Column('simple-json', { nullable: true })
  modifications: {
    type: ModificationType;
    description: string;
    details: string;
    duration?: string;
  }[];

  // For referral
  @Column({ nullable: true })
  referralTarget: string; // 'senior_underwriter', 'medical_director', 'specialist'

  @Column({ nullable: true })
  referralReason: string;

  // For postponement
  @Column({ nullable: true })
  postponementDuration: string;

  @Column({ nullable: true })
  postponementCondition: string;

  // For deferral (requesting more info)
  @Column('simple-array', { nullable: true })
  requestedInformation: string[];

  @Column('simple-array', { nullable: true })
  requestedTests: string[];

  // Guideline references
  @Column({ nullable: true })
  guidelineReference: string;

  @Column({ nullable: true })
  protocolReference: string;

  // Authority
  @Column()
  madeBy: string;

  @Column()
  madeByName: string;

  @Column()
  madeByRole: string;

  @Column()
  madeAt: Date;

  // Review (if applicable)
  @Column({ nullable: true })
  reviewedBy: string;

  @Column({ nullable: true })
  reviewedByName: string;

  @Column({ nullable: true })
  reviewedAt: Date;

  @Column({ nullable: true })
  reviewNotes: string;

  // System recommendation comparison
  @Column({ nullable: true })
  systemRecommendedType: string;

  @Column({ default: false })
  isOverride: boolean;

  @Column({ nullable: true })
  overrideReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Case, (caseEntity) => caseEntity.decisions)
  case: Case;
}
