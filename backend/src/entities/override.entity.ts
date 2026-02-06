import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Case } from './case.entity';

export enum OverrideType {
  COMPLEXITY_TIER = 'complexity_tier',
  TEST_RECOMMENDATION = 'test_recommendation',
  DECISION_OPTION = 'decision_option',
  RISK_SEVERITY = 'risk_severity',
}

export enum OverrideDirection {
  UPGRADE = 'upgrade', // More conservative (e.g., Routine -> Moderate)
  DOWNGRADE = 'downgrade', // Less conservative (e.g., Complex -> Moderate)
  SUBSTITUTE = 'substitute', // Different option
  ADD = 'add', // Added something not recommended
  REMOVE = 'remove', // Removed something recommended
}

@Entity('overrides')
export class Override {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
  })
  overrideType: OverrideType;

  @Column({
    type: 'varchar',
  })
  direction: OverrideDirection;

  // What was recommended by the system
  @Column()
  systemRecommendation: string;

  @Column('simple-json', { nullable: true })
  systemRecommendationDetails: Record<string, unknown>;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  systemConfidence: number;

  // What the underwriter chose
  @Column()
  underwriterChoice: string;

  @Column('simple-json', { nullable: true })
  underwriterChoiceDetails: Record<string, unknown>;

  // Reasoning (mandatory for material overrides)
  @Column('text')
  reasoning: string;

  @Column('simple-array', { nullable: true })
  reasoningTags: string[]; // Pre-defined categories

  // Context at time of override
  @Column('simple-json')
  caseContextSnapshot: {
    applicantAge: number;
    sumAssured: number;
    conditions: string[];
    medications: string[];
    riskFactors: string[];
    testResults: string[];
  };

  // Underwriter info
  @Column()
  underwriterId: string;

  @Column()
  underwriterName: string;

  @Column()
  underwriterRole: string;

  @Column()
  underwriterExperienceYears: number;

  // Validation status
  @Column({ default: false })
  validated: boolean;

  @Column({ nullable: true })
  validatedBy: string;

  @Column({ nullable: true })
  validatedAt: Date;

  @Column({ nullable: true })
  validationNotes: string;

  // For learning pipeline
  @Column({ default: false })
  includedInTraining: boolean;

  @Column({ nullable: true })
  trainingBatchId: string;

  @Column({ default: false })
  flaggedForReview: boolean;

  @Column({ nullable: true })
  reviewNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Case, (caseEntity) => caseEntity.overrides)
  case: Case;
}
