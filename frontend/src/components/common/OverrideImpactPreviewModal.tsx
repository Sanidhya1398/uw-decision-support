import { useState } from 'react'
import clsx from 'clsx'
import {
  X,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Info,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react'

export interface RemovalImpactData {
  testId: string
  testCode: string
  testName: string
  testCategory: string
  requirementType: string
  impactLevel: 'high' | 'moderate' | 'low' | 'none'
  affectedRiskAreas: {
    riskFactorId: string
    riskFactorName: string
    coverageRuleId: string
    evidenceDescription: string
    evidenceImportance: string
    isSoleEvidence: boolean
    remainingEvidenceCount: number
    remainingEvidenceDescriptions: string[]
  }[]
  summary: {
    totalAffectedAreas: number
    soleEvidenceCount: number
    partialCoverageCount: number
  }
  recommendation: string
}

export interface OverrideImpactPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onProceed: () => void
  impactData: RemovalImpactData | null
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
}

const impactStyles = {
  high: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconColor: 'text-red-600',
    icon: ShieldAlert,
    label: 'High Impact',
    badgeBg: 'bg-red-100 text-red-700',
    btnClass: 'bg-red-600 hover:bg-red-700 text-white',
    btnText: 'Proceed Despite Impact',
  },
  moderate: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    iconColor: 'text-amber-600',
    icon: AlertTriangle,
    label: 'Moderate Impact',
    badgeBg: 'bg-amber-100 text-amber-700',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    btnText: 'Proceed with Removal',
  },
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconColor: 'text-blue-600',
    icon: Info,
    label: 'Low Impact',
    badgeBg: 'bg-blue-100 text-blue-700',
    btnClass: 'btn-primary',
    btnText: 'Proceed with Removal',
  },
  none: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    iconColor: 'text-green-600',
    icon: ShieldCheck,
    label: 'No Impact',
    badgeBg: 'bg-green-100 text-green-700',
    btnClass: 'btn-primary',
    btnText: 'Proceed with Removal',
  },
}

export default function OverrideImpactPreviewModal({
  isOpen,
  onClose,
  onProceed,
  impactData,
  isLoading,
  isError,
  onRetry,
}: OverrideImpactPreviewModalProps) {
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set())

  if (!isOpen) return null

  const toggleArea = (index: number) => {
    setExpandedAreas(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const style = impactData ? impactStyles[impactData.impactLevel] : impactStyles.none
  const Icon = style.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Override Impact Preview
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            <p className="mt-3 text-gray-600">Analyzing impact...</p>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="w-12 h-12 text-amber-400" />
            <p className="mt-2 text-gray-600">Could not load impact analysis</p>
            <div className="flex gap-3 mt-4">
              {onRetry && (
                <button onClick={onRetry} className="btn-secondary">
                  Retry
                </button>
              )}
              <button onClick={onProceed} className="btn-primary">
                Proceed Without Advisory
              </button>
            </div>
          </div>
        )}

        {/* Impact Data */}
        {impactData && !isLoading && !isError && (
          <>
            {/* Test Info */}
            <div className="mb-4">
              <p className="text-sm text-gray-500">Removing test recommendation</p>
              <p className="text-lg font-semibold text-gray-900">
                {impactData.testName}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({impactData.testCode})
                </span>
              </p>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 capitalize">
                {impactData.requirementType}
              </span>
            </div>

            {/* Impact Level Banner */}
            <div className={clsx(
              'rounded-lg p-4 mb-6 border',
              style.bg,
              style.border,
            )}>
              <div className="flex items-center gap-3">
                <Icon className={clsx('w-6 h-6', style.iconColor)} />
                <div>
                  <span className={clsx('font-semibold', style.text)}>
                    {style.label}
                  </span>
                  {impactData.summary.totalAffectedAreas > 0 && (
                    <span className={clsx('ml-2 text-sm', style.text)}>
                      ({impactData.summary.totalAffectedAreas} area{impactData.summary.totalAffectedAreas !== 1 ? 's' : ''} affected
                      {impactData.summary.soleEvidenceCount > 0 &&
                        `, ${impactData.summary.soleEvidenceCount} sole evidence`}
                      )
                    </span>
                  )}
                </div>
              </div>
              <p className={clsx('mt-2 text-sm', style.text)}>
                {impactData.recommendation}
              </p>
            </div>

            {/* Affected Risk Areas */}
            {impactData.affectedRiskAreas.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Affected Risk Areas
                </h4>
                <div className="space-y-2">
                  {impactData.affectedRiskAreas.map((area, index) => (
                    <div
                      key={`${area.riskFactorId}-${area.coverageRuleId}-${index}`}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleArea(index)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          {expandedAreas.has(index) ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="font-medium text-gray-900">
                            {area.riskFactorName}
                          </span>
                          {area.isSoleEvidence ? (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                              Sole Evidence
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                              Partial Coverage
                            </span>
                          )}
                        </div>
                      </button>
                      {expandedAreas.has(index) && (
                        <div className="px-3 pb-3 pl-9 text-sm space-y-2">
                          <div>
                            <span className="text-gray-500">Evidence: </span>
                            <span className="text-gray-700">{area.evidenceDescription}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Importance: </span>
                            <span className="text-gray-700">{area.evidenceImportance}</span>
                          </div>
                          {area.remainingEvidenceCount > 0 && (
                            <div>
                              <span className="text-gray-500">Remaining evidence: </span>
                              <ul className="mt-1 ml-4 list-disc text-gray-600">
                                {area.remainingEvidenceDescriptions.map((desc, i) => (
                                  <li key={i}>{desc}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {area.isSoleEvidence && (
                            <div className="mt-1 p-2 bg-red-50 rounded text-red-700 text-xs">
                              No alternative evidence available. Removing this test will leave a gap in risk coverage for this area.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advisory Note */}
            <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500">
                This is an advisory preview only. You may proceed with removal regardless of the impact level. Your decision and this advisory will be recorded in the audit trail.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={onProceed}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  style.btnClass,
                )}
              >
                {style.btnText}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
