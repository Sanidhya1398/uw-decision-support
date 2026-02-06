import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Applicant } from './applicant.entity';
import { MedicalDisclosure } from './medical-disclosure.entity';
import { Document } from './document.entity';
import { TestRecommendation } from './test-recommendation.entity';
import { TestResult } from './test-result.entity';
import { Decision } from './decision.entity';
import { Communication } from './communication.entity';
import { AuditLog } from './audit-log.entity';
import { Override } from './override.entity';
import { RiskFactor } from './risk-factor.entity';

export enum CaseStatus {
  RECEIVED = 'received',
  PENDING_REVIEW = 'pending_review',
  IN_PROGRESS = 'in_progress',
  AWAITING_INFORMATION = 'awaiting_information',
  AWAITING_TESTS = 'awaiting_tests',
  AWAITING_DECISION = 'awaiting_decision',
  DECISION_MADE = 'decision_made',
  COMMUNICATION_PENDING = 'communication_pending',
  COMPLETED = 'completed',
}

export enum ComplexityTier {
  ROUTINE = 'Routine',
  MODERATE = 'Moderate',
  COMPLEX = 'Complex',
}

export enum Channel {
  AGENT = 'agent',
  DIRECT = 'direct',
  BANCASSURANCE = 'bancassurance',
  ONLINE = 'online',
  CORPORATE = 'corporate',
}

@Entity('cases')
export class Case {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  caseReference: string;

  @Column({ unique: true })
  proposalId: string;

  @Column()
  proposalDate: Date;

  @Column()
  productCode: string;

  @Column()
  productName: string;

  @Column('decimal', { precision: 15, scale: 2 })
  sumAssured: number;

  @Column({ default: 'INR' })
  sumAssuredCurrency: string;

  @Column({ nullable: true })
  policyTermYears: number;

  @Column({ nullable: true })
  premiumFrequency: string;

  @Column('simple-array', { nullable: true })
  riderCodes: string[];

  @Column({
    type: 'varchar',
    default: CaseStatus.RECEIVED,
  })
  status: CaseStatus;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  complexityTier: ComplexityTier;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  complexityConfidence: number;

  @Column('simple-json', { nullable: true })
  complexityFactors: { factor: string; weight: number; direction: string }[];

  @Column({ nullable: true })
  assignedTo: string;

  @Column({ nullable: true })
  assignedToName: string;

  @Column({ nullable: true })
  assignedAt: Date;

  @Column({ nullable: true })
  agentId: string;

  @Column({ nullable: true })
  agentName: string;

  @Column({
    type: 'varchar',
    default: Channel.AGENT,
  })
  channel: Channel;

  @Column({ nullable: true })
  branchCode: string;

  @Column({ nullable: true })
  slaDeadline: Date;

  @Column({ default: false })
  slaBreached: boolean;

  @Column({ default: false })
  isPriority: boolean;

  @Column({ nullable: true })
  priorityReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => Applicant, (applicant) => applicant.case, { cascade: true })
  @JoinColumn()
  applicant: Applicant;

  @OneToMany(() => MedicalDisclosure, (disclosure) => disclosure.case, { cascade: true })
  medicalDisclosures: MedicalDisclosure[];

  @OneToMany(() => Document, (document) => document.case, { cascade: true })
  documents: Document[];

  @OneToMany(() => TestRecommendation, (test) => test.case, { cascade: true })
  testRecommendations: TestRecommendation[];

  @OneToMany(() => TestResult, (result) => result.case, { cascade: true })
  testResults: TestResult[];

  @OneToMany(() => Decision, (decision) => decision.case, { cascade: true })
  decisions: Decision[];

  @OneToMany(() => Communication, (comm) => comm.case, { cascade: true })
  communications: Communication[];

  @OneToMany(() => AuditLog, (log) => log.case, { cascade: true })
  auditLogs: AuditLog[];

  @OneToMany(() => Override, (override) => override.case, { cascade: true })
  overrides: Override[];

  @OneToMany(() => RiskFactor, (factor) => factor.case, { cascade: true })
  riskFactors: RiskFactor[];
}
