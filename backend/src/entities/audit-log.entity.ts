import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Case } from './case.entity';

export enum AuditAction {
  // Case actions
  CASE_CREATED = 'case_created',
  CASE_ASSIGNED = 'case_assigned',
  CASE_REASSIGNED = 'case_reassigned',
  CASE_STATUS_CHANGED = 'case_status_changed',
  CASE_PRIORITY_CHANGED = 'case_priority_changed',

  // Risk actions
  RISK_ASSESSED = 'risk_assessed',
  RISK_FACTOR_ADDED = 'risk_factor_added',
  RISK_FACTOR_MODIFIED = 'risk_factor_modified',
  COMPLEXITY_CLASSIFIED = 'complexity_classified',
  COMPLEXITY_OVERRIDDEN = 'complexity_overridden',

  // Document actions
  DOCUMENT_RECEIVED = 'document_received',
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_EXTRACTED = 'document_extracted',
  DOCUMENT_PROCESSED = 'document_processed',
  EXTRACTION_VERIFIED = 'extraction_verified',
  EXTRACTION_CORRECTED = 'extraction_corrected',

  // Test actions
  TESTS_RECOMMENDED = 'tests_recommended',
  TEST_ADDED = 'test_added',
  TEST_REMOVED = 'test_removed',
  TEST_SUBSTITUTED = 'test_substituted',
  TESTS_ORDERED = 'tests_ordered',
  TEST_RESULT_RECEIVED = 'test_result_received',
  IMPACT_ADVISORY_DISPLAYED = 'impact_advisory_displayed',
  IMPACT_ADVISORY_ACKNOWLEDGED = 'impact_advisory_acknowledged',

  // Decision actions
  DECISION_DRAFT_CREATED = 'decision_draft_created',
  DECISION_MADE = 'decision_made',
  DECISION_REVIEWED = 'decision_reviewed',
  DECISION_APPROVED = 'decision_approved',
  DECISION_REJECTED = 'decision_rejected',
  DECISION_OVERRIDDEN = 'decision_overridden',

  // Communication actions
  COMMUNICATION_GENERATED = 'communication_generated',
  COMMUNICATION_EDITED = 'communication_edited',
  COMMUNICATION_APPROVED = 'communication_approved',
  COMMUNICATION_SENT = 'communication_sent',

  // Notes and escalation
  NOTE_ADDED = 'note_added',
  ESCALATION_REQUESTED = 'escalation_requested',
  ESCALATION_RESOLVED = 'escalation_resolved',

  // Product guidance actions
  PRODUCT_GUIDANCE_DISPLAYED = 'product_guidance_displayed',

  // System actions
  ML_PREDICTION_MADE = 'ml_prediction_made',
  RULE_TRIGGERED = 'rule_triggered',
  SLA_WARNING = 'sla_warning',
  SLA_BREACHED = 'sla_breached',
}

export enum AuditCategory {
  CASE_MANAGEMENT = 'case_management',
  RISK_ASSESSMENT = 'risk_assessment',
  DOCUMENT_PROCESSING = 'document_processing',
  TEST_MANAGEMENT = 'test_management',
  DECISION_MAKING = 'decision_making',
  COMMUNICATION = 'communication',
  SYSTEM = 'system',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
  })
  action: AuditAction;

  @Column({
    type: 'varchar',
  })
  category: AuditCategory;

  @Column()
  description: string;

  // Actor information
  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  userName: string;

  @Column({ nullable: true })
  userRole: string;

  @Column({ default: false })
  isSystemAction: boolean;

  // Before/after state
  @Column('simple-json', { nullable: true })
  previousState: Record<string, unknown>;

  @Column('simple-json', { nullable: true })
  newState: Record<string, unknown>;

  // Additional context
  @Column('simple-json', { nullable: true })
  metadata: Record<string, unknown>;

  // Related entities
  @Column({ nullable: true })
  relatedEntityType: string;

  @Column({ nullable: true })
  relatedEntityId: string;

  // Timestamp
  @CreateDateColumn()
  timestamp: Date;

  // IP and session info (for security audit)
  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  sessionId: string;

  @ManyToOne(() => Case, (caseEntity) => caseEntity.auditLogs)
  case: Case;
}
