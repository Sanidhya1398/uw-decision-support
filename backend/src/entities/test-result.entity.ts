import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Case } from './case.entity';

export enum AbnormalFlag {
  NORMAL = 'normal',
  LOW = 'low',
  HIGH = 'high',
  CRITICAL_LOW = 'critical_low',
  CRITICAL_HIGH = 'critical_high',
}

export enum FastingStatus {
  FASTING = 'fasting',
  NON_FASTING = 'non_fasting',
  UNKNOWN = 'unknown',
}

export enum ResultSource {
  LAB_FEED = 'lab_feed',
  DOCUMENT_EXTRACTION = 'document_extraction',
  MANUAL_ENTRY = 'manual_entry',
}

@Entity('test_results')
export class TestResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  testCode: string;

  @Column()
  testName: string;

  @Column()
  resultValue: string;

  @Column({ nullable: true })
  resultUnit: string;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  numericValue: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  referenceRangeLow: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  referenceRangeHigh: number;

  @Column({ nullable: true })
  referenceRangeText: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  abnormalFlag: AbnormalFlag;

  @Column()
  testDate: Date;

  @Column({ nullable: true })
  resultDate: Date;

  @Column({ nullable: true })
  performingLab: string;

  @Column({ nullable: true })
  labAccreditation: string;

  @Column({ nullable: true })
  orderingPhysician: string;

  @Column({ nullable: true })
  specimenType: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  fastingStatus: FastingStatus;

  @Column({ nullable: true })
  comments: string;

  @Column({
    type: 'varchar',
    default: ResultSource.LAB_FEED,
  })
  source: ResultSource;

  @Column({ nullable: true })
  sourceReference: string;

  // Link to document if extracted from document
  @Column({ nullable: true })
  sourceDocumentId: string;

  // Extraction confidence if from NLP
  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  extractionConfidence: number;

  // Clinical interpretation aids
  @Column({ nullable: true })
  clinicalContext: string;

  @Column({ nullable: true })
  riskImplication: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Case, (caseEntity) => caseEntity.testResults)
  case: Case;
}
