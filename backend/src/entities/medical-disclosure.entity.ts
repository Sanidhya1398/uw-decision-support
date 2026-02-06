import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Case } from './case.entity';

export enum DisclosureType {
  CONDITION = 'condition',
  MEDICATION = 'medication',
  FAMILY_HISTORY = 'family_history',
  SURGERY = 'surgery',
  HOSPITALIZATION = 'hospitalization',
}

export enum ConditionStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  CHRONIC = 'chronic',
  ACUTE = 'acute',
}

export enum TreatmentStatus {
  TREATED = 'treated',
  UNTREATED = 'untreated',
  MONITORING = 'monitoring',
}

export enum FamilyRelationship {
  FATHER = 'father',
  MOTHER = 'mother',
  SIBLING = 'sibling',
  GRANDPARENT = 'grandparent',
  MATERNAL_AUNT = 'maternal_aunt',
}

@Entity('medical_disclosures')
export class MedicalDisclosure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
  })
  disclosureType: DisclosureType;

  // For conditions
  @Column({ nullable: true })
  conditionName: string;

  @Column({ nullable: true })
  icdCode: string;

  @Column({ nullable: true })
  diagnosisDate: Date;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  conditionStatus: ConditionStatus;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  treatmentStatus: TreatmentStatus;

  @Column({ nullable: true })
  treatingPhysician: string;

  // For medications
  @Column({ nullable: true })
  drugName: string;

  @Column({ nullable: true })
  genericName: string;

  @Column({ nullable: true })
  dosage: string;

  @Column({ nullable: true })
  frequency: string;

  @Column({ nullable: true })
  medicationStartDate: Date;

  @Column({ nullable: true })
  indication: string;

  // For family history
  @Column({
    type: 'varchar',
    nullable: true,
  })
  familyRelationship: FamilyRelationship;

  @Column({ nullable: true })
  familyCondition: string;

  @Column({ nullable: true })
  ageAtDiagnosis: number;

  @Column({ nullable: true })
  ageAtDeath: number;

  @Column({ nullable: true })
  familyMemberAlive: boolean;

  // For surgeries/hospitalizations
  @Column({ nullable: true })
  procedureName: string;

  @Column({ nullable: true })
  procedureDate: Date;

  @Column({ nullable: true })
  hospitalName: string;

  @Column({ nullable: true })
  outcome: string;

  // Common fields
  @Column({ nullable: true })
  notes: string;

  @Column({ default: 'proposal_form' })
  source: string;

  @Column('decimal', { precision: 3, scale: 2, default: 1.0 })
  confidenceScore: number;

  // For document extraction tracking
  @Column({ nullable: true })
  sourceDocumentId: string;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  extractionConfidence: number;

  @Column({ default: false })
  verified: boolean;

  @Column({ nullable: true })
  verifiedBy: string;

  @Column({ nullable: true })
  verifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Case, (caseEntity) => caseEntity.medicalDisclosures)
  case: Case;
}
