import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Case } from './case.entity';

export enum DocumentType {
  MEDICAL_REPORT = 'medical_report',
  LAB_RESULT = 'lab_result',
  DISCHARGE_SUMMARY = 'discharge_summary',
  PRESCRIPTION = 'prescription',
  DIAGNOSTIC_IMAGING = 'diagnostic_imaging',
  SPECIALIST_REPORT = 'specialist_report',
  ECG_REPORT = 'ecg_report',
  PATHOLOGY_REPORT = 'pathology_report',
  INSURANCE_FORM = 'insurance_form',
  ATTENDING_PHYSICIAN = 'attending_physician',
  OTHER_MEDICAL = 'other_medical',
  IDENTITY_DOCUMENT = 'identity_document',
  FINANCIAL_DOCUMENT = 'financial_document',
}

export enum ExtractionStatus {
  PENDING = 'pending',
  EXTRACTED = 'extracted',
  FAILED = 'failed',
  MANUAL = 'manual',
}

export enum ExtractionMethod {
  PDF_NATIVE = 'pdf_native',
  OCR = 'ocr',
  MANUAL = 'manual',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
  })
  documentType: DocumentType;

  @Column({ nullable: true })
  documentDate: Date;

  @Column()
  receivedDate: Date;

  @Column()
  sourceSystem: string;

  @Column({ nullable: true })
  fileName: string;

  @Column({ nullable: true })
  fileType: string;

  @Column({ nullable: true })
  filePath: string;

  @Column({ nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  pageCount: number;

  @Column({
    type: 'varchar',
    default: ExtractionStatus.PENDING,
  })
  extractionStatus: ExtractionStatus;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  extractionMethod: ExtractionMethod;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  extractionConfidence: number;

  @Column({ nullable: true })
  extractionDate: Date;

  @Column({ nullable: true })
  languageDetected: string;

  // Pre-extracted text content (received from DMS)
  @Column('text', { nullable: true })
  extractedText: string;

  // Structured extractions from NLP
  @Column('simple-json', { nullable: true })
  extractedConditions: {
    name: string;
    icdCode?: string;
    confidence: number;
    sourceSpan?: string;
  }[];

  @Column('simple-json', { nullable: true })
  extractedMedications: {
    name: string;
    dosage?: string;
    frequency?: string;
    confidence: number;
    sourceSpan?: string;
  }[];

  @Column('simple-json', { nullable: true })
  extractedLabValues: {
    testName: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    abnormal?: boolean;
    confidence: number;
    sourceSpan?: string;
  }[];

  @Column('simple-json', { nullable: true })
  extractedDates: {
    dateType: string;
    date: string;
    confidence: number;
    sourceSpan?: string;
  }[];

  @Column('simple-json', { nullable: true })
  extractedProcedures: {
    name: string;
    date?: string;
    confidence: number;
    sourceSpan?: string;
    category?: string;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Case, (caseEntity) => caseEntity.documents)
  case: Case;
}
