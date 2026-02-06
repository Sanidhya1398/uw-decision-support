import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Case } from './case.entity';

export enum CommunicationType {
  REQUIREMENTS_LETTER = 'requirements_letter',
  STANDARD_ACCEPTANCE = 'standard_acceptance',
  MODIFIED_ACCEPTANCE = 'modified_acceptance',
  POSTPONEMENT_NOTICE = 'postponement_notice',
  DECLINE_NOTICE = 'decline_notice',
  INFORMATION_REQUEST = 'information_request',
  TEST_ORDER = 'test_order',
}

export enum CommunicationStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  SENT = 'sent',
  REJECTED = 'rejected',
}

export enum RecipientType {
  APPLICANT = 'applicant',
  AGENT = 'agent',
  PHYSICIAN = 'physician',
  LAB = 'lab',
}

@Entity('communications')
export class Communication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
  })
  communicationType: CommunicationType;

  @Column({
    type: 'varchar',
    default: CommunicationStatus.DRAFT,
  })
  status: CommunicationStatus;

  @Column({
    type: 'varchar',
  })
  recipientType: RecipientType;

  @Column()
  recipientName: string;

  @Column({ nullable: true })
  recipientEmail: string;

  @Column({ nullable: true })
  recipientAddress: string;

  @Column()
  subject: string;

  // Content structure
  @Column('text')
  bodyContent: string;

  // Structured content with locked sections
  @Column('simple-json')
  contentSections: {
    id: string;
    type: 'header' | 'salutation' | 'body' | 'compliance' | 'closing' | 'signature';
    content: string;
    isLocked: boolean;
    isEditable: boolean;
  }[];

  // Reason codes that drove the content
  @Column('simple-array', { nullable: true })
  reasonCodes: string[];

  // Phrase block set used for reason-driven assembly
  @Column({ nullable: true })
  phraseBlockSetId: string;

  @Column({ nullable: true })
  phraseBlockSetVersion: string;

  // Variables substituted
  @Column('simple-json', { nullable: true })
  substitutedVariables: { variable: string; value: string }[];

  // Compliance
  @Column('simple-json', { nullable: true })
  requiredDisclosures: { code: string; description: string; present: boolean }[];

  @Column({ default: false })
  complianceValidated: boolean;

  @Column({ nullable: true })
  complianceValidationDate: Date;

  // Edit history
  @Column('simple-json', { nullable: true })
  editHistory: {
    editedBy: string;
    editedAt: string;
    sectionId: string;
    previousContent: string;
    newContent: string;
  }[];

  // Workflow
  @Column()
  generatedBy: string;

  @Column()
  generatedAt: Date;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  sentMethod: string; // 'email', 'print', 'portal'

  // Attachments
  @Column('simple-array', { nullable: true })
  attachmentIds: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Case, (caseEntity) => caseEntity.communications)
  case: Case;
}
