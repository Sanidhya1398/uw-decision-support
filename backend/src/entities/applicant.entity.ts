import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
} from 'typeorm';
import { Case } from './case.entity';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
}

export enum SmokingStatus {
  NEVER = 'never',
  FORMER = 'former',
  CURRENT = 'current',
}

export enum AlcoholStatus {
  NEVER = 'never',
  SOCIAL = 'social',
  REGULAR = 'regular',
  HEAVY = 'heavy',
  FORMER = 'former',
}

@Entity('applicants')
export class Applicant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  applicantId: string;

  // Personal Details
  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  dateOfBirth: Date;

  @Column({
    type: 'varchar',
  })
  gender: Gender;

  @Column({ default: 'IN' })
  nationality: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  maritalStatus: MaritalStatus;

  @Column()
  occupation: string;

  @Column({ nullable: true })
  occupationCode: string;

  @Column('decimal', { precision: 15, scale: 2 })
  annualIncome: number;

  @Column({ default: 'INR' })
  incomeCurrency: string;

  // Contact Information
  @Column()
  addressLine1: string;

  @Column({ nullable: true })
  addressLine2: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  postalCode: string;

  @Column({ default: 'IN' })
  country: string;

  @Column()
  phonePrimary: string;

  @Column({ nullable: true })
  phoneSecondary: string;

  @Column()
  email: string;

  // Physical Characteristics
  @Column('decimal', { precision: 5, scale: 2 })
  heightCm: number;

  @Column('decimal', { precision: 5, scale: 2 })
  weightKg: number;

  @Column('decimal', { precision: 4, scale: 2, nullable: true })
  bmi: number;

  // Lifestyle Factors
  @Column({
    type: 'varchar',
    default: SmokingStatus.NEVER,
  })
  smokingStatus: SmokingStatus;

  @Column({ nullable: true })
  smokingQuantity: string;

  @Column({ nullable: true })
  smokingDurationYears: number;

  @Column({ nullable: true })
  smokingQuitDate: Date;

  @Column({
    type: 'varchar',
    default: AlcoholStatus.NEVER,
  })
  alcoholStatus: AlcoholStatus;

  @Column({ nullable: true })
  alcoholQuantity: string;

  @Column('simple-array', { nullable: true })
  hazardousActivities: string[];

  @Column({ nullable: true })
  hazardousActivitiesDetails: string;

  // Relation
  @OneToOne(() => Case, (caseEntity) => caseEntity.applicant)
  case: Case;

  // Computed property for age
  get age(): number {
    const today = new Date();
    const birth = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  // Computed property for full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
