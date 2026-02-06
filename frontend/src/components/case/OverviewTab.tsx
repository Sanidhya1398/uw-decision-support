import { format } from 'date-fns'
import clsx from 'clsx'
import {
  User,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Heart,
  Pill,
  Users,
  Activity,
} from 'lucide-react'
import SimilarCasesPanel from '../common/SimilarCasesPanel'
import LearningInsightsPanel from '../common/LearningInsightsPanel'

interface OverviewTabProps {
  caseData: any
  caseId: string
}

export default function OverviewTab({ caseData, caseId }: OverviewTabProps) {
  const applicant = caseData.applicant || {}
  const disclosures = caseData.medicalDisclosures || []

  const conditions = disclosures.filter((d: any) => d.disclosureType === 'condition')
  const medications = disclosures.filter((d: any) => d.disclosureType === 'medication')
  const familyHistory = disclosures.filter((d: any) => d.disclosureType === 'family_history')

  // Calculate BMI
  const bmi = applicant.bmi || (applicant.heightCm && applicant.weightKg
    ? (applicant.weightKg / ((applicant.heightCm / 100) ** 2)).toFixed(1)
    : null)

  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-yellow-600' }
    if (bmi < 25) return { label: 'Normal', color: 'text-green-600' }
    if (bmi < 30) return { label: 'Overweight', color: 'text-yellow-600' }
    return { label: 'Obese', color: 'text-red-600' }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Personal Information */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2 text-gray-400" />
          Personal Information
        </h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Full Name</dt>
            <dd className="text-sm font-medium text-gray-900">
              {applicant.firstName} {applicant.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Date of Birth</dt>
            <dd className="text-sm font-medium text-gray-900">
              {applicant.dateOfBirth && format(new Date(applicant.dateOfBirth), 'dd MMM yyyy')}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Gender</dt>
            <dd className="text-sm font-medium text-gray-900 capitalize">
              {applicant.gender}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Occupation</dt>
            <dd className="text-sm font-medium text-gray-900">
              {applicant.occupation}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Annual Income</dt>
            <dd className="text-sm font-medium text-gray-900">
              ₹{Number(applicant.annualIncome).toLocaleString('en-IN')}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Marital Status</dt>
            <dd className="text-sm font-medium text-gray-900 capitalize">
              {applicant.maritalStatus || 'Not specified'}
            </dd>
          </div>
        </dl>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              {applicant.addressLine1}, {applicant.city}, {applicant.state} - {applicant.postalCode}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
            <Phone className="w-4 h-4 flex-shrink-0" />
            <span>{applicant.phonePrimary}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span>{applicant.email}</span>
          </div>
        </div>
      </div>

      {/* Physical & Lifestyle */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-gray-400" />
          Physical & Lifestyle
        </h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Height</dt>
            <dd className="text-sm font-medium text-gray-900">
              {applicant.heightCm} cm
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Weight</dt>
            <dd className="text-sm font-medium text-gray-900">
              {applicant.weightKg} kg
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">BMI</dt>
            <dd className="text-sm font-medium">
              {bmi && (
                <>
                  <span className="text-gray-900">{bmi}</span>
                  <span className={clsx('ml-1', getBmiCategory(Number(bmi)).color)}>
                    ({getBmiCategory(Number(bmi)).label})
                  </span>
                </>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Smoking Status</dt>
            <dd className={clsx(
              'text-sm font-medium capitalize',
              applicant.smokingStatus === 'current' ? 'text-red-600' : 'text-gray-900'
            )}>
              {applicant.smokingStatus}
              {applicant.smokingQuantity && ` (${applicant.smokingQuantity})`}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Alcohol</dt>
            <dd className={clsx(
              'text-sm font-medium capitalize',
              applicant.alcoholStatus === 'heavy' ? 'text-red-600' : 'text-gray-900'
            )}>
              {applicant.alcoholStatus}
              {applicant.alcoholQuantity && ` (${applicant.alcoholQuantity})`}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Hazardous Activities</dt>
            <dd className="text-sm font-medium text-gray-900">
              {applicant.hazardousActivities?.length > 0
                ? applicant.hazardousActivities.join(', ')
                : 'None'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Medical Conditions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Heart className="w-5 h-5 mr-2 text-gray-400" />
          Medical Conditions
        </h3>
        {conditions.length === 0 ? (
          <p className="text-sm text-gray-500">No conditions disclosed</p>
        ) : (
          <ul className="space-y-3">
            {conditions.map((condition: any, index: number) => (
              <li key={index} className="border-l-2 border-gray-200 pl-3">
                <p className="text-sm font-medium text-gray-900">
                  {condition.conditionName}
                </p>
                <p className="text-xs text-gray-500">
                  {condition.conditionStatus && (
                    <span className="capitalize">{condition.conditionStatus}</span>
                  )}
                  {condition.diagnosisDate && (
                    <span> · Diagnosed {format(new Date(condition.diagnosisDate), 'MMM yyyy')}</span>
                  )}
                </p>
                {condition.treatmentStatus && (
                  <p className="text-xs text-gray-500 capitalize">
                    Treatment: {condition.treatmentStatus}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Medications */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Pill className="w-5 h-5 mr-2 text-gray-400" />
          Current Medications
        </h3>
        {medications.length === 0 ? (
          <p className="text-sm text-gray-500">No medications disclosed</p>
        ) : (
          <ul className="space-y-3">
            {medications.map((med: any, index: number) => (
              <li key={index} className="border-l-2 border-gray-200 pl-3">
                <p className="text-sm font-medium text-gray-900">
                  {med.drugName}
                </p>
                <p className="text-xs text-gray-500">
                  {med.dosage && <span>{med.dosage}</span>}
                  {med.frequency && <span> · {med.frequency}</span>}
                </p>
                {med.indication && (
                  <p className="text-xs text-gray-500">
                    For: {med.indication}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Family History */}
      <div className="card p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-gray-400" />
          Family History
        </h3>
        {familyHistory.length === 0 ? (
          <p className="text-sm text-gray-500">No significant family history disclosed</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {familyHistory.map((fh: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {fh.familyRelationship}
                </p>
                <p className="text-sm text-gray-700">{fh.familyCondition}</p>
                <p className="text-xs text-gray-500">
                  {fh.ageAtDiagnosis && <span>Age at diagnosis: {fh.ageAtDiagnosis}</span>}
                  {fh.familyMemberAlive !== undefined && (
                    <span> · {fh.familyMemberAlive ? 'Alive' : 'Deceased'}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Policy Details */}
      <div className="card p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Briefcase className="w-5 h-5 mr-2 text-gray-400" />
          Policy Details
        </h3>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Product</dt>
            <dd className="text-sm font-medium text-gray-900">{caseData.productName}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Sum Assured</dt>
            <dd className="text-sm font-medium text-gray-900">
              ₹{Number(caseData.sumAssured).toLocaleString('en-IN')}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Policy Term</dt>
            <dd className="text-sm font-medium text-gray-900">
              {caseData.policyTermYears ? `${caseData.policyTermYears} years` : 'Not specified'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Channel</dt>
            <dd className="text-sm font-medium text-gray-900 capitalize">{caseData.channel}</dd>
          </div>
        </dl>
      </div>

      {/* ML Learning Insights */}
      <div className="lg:col-span-2">
        <LearningInsightsPanel caseId={caseId} />
      </div>

      {/* Similar Cases */}
      <div className="lg:col-span-2">
        <SimilarCasesPanel caseId={caseId} limit={5} />
      </div>
    </div>
  )
}
