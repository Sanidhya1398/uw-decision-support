import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Case } from './case.entity';

export enum TestRequirementType {
  MANDATORY = 'mandatory',
  CONDITIONAL = 'conditional',
  SUGGESTED = 'suggested',
  ADDITIONAL = 'additional',
}

export enum TestCategory {
  GLYCEMIC = 'glycemic',
  LIPID = 'lipid',
  RENAL = 'renal',
  HEPATIC = 'hepatic',
  HEMATOLOGY = 'hematology',
  CARDIAC = 'cardiac',
  THYROID = 'thyroid',
  URINE = 'urine',
  IMAGING = 'imaging',
  OTHER = 'other',
}

export enum TestStatus {
  RECOMMENDED = 'recommended',
  APPROVED = 'approved',
  ORDERED = 'ordered',
  REMOVED = 'removed',
  SUBSTITUTED = 'substituted',
  RESULTS_RECEIVED = 'results_received',
}

export enum YieldCategory {
  HIGH = 'High',
  MODERATE = 'Moderate',
  LOW = 'Low',
}

@Entity('test_recommendations')
export class TestRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  testCode: string;

  @Column()
  testName: string;

  @Column({
    type: 'varchar',
  })
  testCategory: TestCategory;

  @Column({
    type: 'varchar',
  })
  requirementType: TestRequirementType;

  @Column({
    type: 'varchar',
    default: TestStatus.RECOMMENDED,
  })
  status: TestStatus;

  // Clinical rationale - why this test is recommended
  @Column('text')
  clinicalRationale: string;

  // Protocol reference
  @Column({ nullable: true })
  protocolReference: string;

  // Rules that triggered this recommendation
  @Column('simple-array', { nullable: true })
  triggeringRules: string[];

  // ML-predicted yield
  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  predictedYield: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  yieldCategory: YieldCategory;

  @Column('simple-json', { nullable: true })
  yieldFactors: { factor: string; weight: number }[];

  // Cost and turnaround
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  estimatedCost: number;

  @Column({ nullable: true })
  estimatedTurnaroundDays: number;

  // Underwriter actions
  @Column({ nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  removedBy: string;

  @Column({ nullable: true })
  removedAt: Date;

  @Column({ nullable: true })
  removalReason: string;

  @Column({ nullable: true })
  substitutedWith: string;

  @Column({ nullable: true })
  substitutionReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Case, (caseEntity) => caseEntity.testRecommendations)
  case: Case;
}
