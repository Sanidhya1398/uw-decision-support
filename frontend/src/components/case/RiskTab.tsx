import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { riskApi, overridesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useState } from 'react'
import clsx from 'clsx'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  RefreshCw,
  Edit,
  Lightbulb,
  FileWarning,
  FlaskConical,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import OverrideReasoningModal from '../common/OverrideReasoningModal'

interface CoverageGap {
  riskArea: string
  riskFactorId: string
  riskFactorName: string
  missingEvidence: string
  importance: string
  evidenceType: 'lab_result' | 'document'
}

interface RiskTabProps {
  caseId: string
  caseData: any
}

const severityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-red-100 text-red-800 border-red-200',
  critical: 'bg-red-200 text-red-900 border-red-300',
}

const categoryIcons: Record<string, any> = {
  medical: AlertTriangle,
  lifestyle: TrendingUp,
  financial: TrendingUp,
  family_history: Shield,
  occupational: Shield,
}

export default function RiskTab({ caseId, caseData }: RiskTabProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [showInsights, setShowInsights] = useState(false)

  const { data: riskData, isLoading } = useQuery({
    queryKey: ['risk', caseId],
    queryFn: () => riskApi.getRiskAssessment(caseId),
  })

  const { data: insightsData } = useQuery({
    queryKey: ['learning-insights', caseId],
    queryFn: () => overridesApi.getLearningInsights(caseId),
    enabled: showInsights,
  })

  const { data: coverageGapsData } = useQuery({
    queryKey: ['coverage-gaps', caseId],
    queryFn: () => riskApi.getCoverageGaps(caseId),
  })

  const [showGapsExpanded, setShowGapsExpanded] = useState(true)

  const assessMutation = useMutation({
    mutationFn: () => riskApi.assessRisk(caseId, user!.id, user!.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
    },
  })

  const handleOverrideSubmit = async (data: {
    underwriterChoice: string
    reasoning: string
    reasoningTags: string[]
  }) => {
    await riskApi.overrideComplexity(
      caseId,
      data.underwriterChoice,
      data.reasoning,
      user!.id,
      user!.name
    )
    queryClient.invalidateQueries({ queryKey: ['risk', caseId] })
    queryClient.invalidateQueries({ queryKey: ['case', caseId] })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading risk assessment...</div>
      </div>
    )
  }

  const complexity = riskData?.complexity || caseData
  const riskFactors = riskData?.riskFactors || caseData.riskFactors || []
  const summary = riskData?.summary || {}

  return (
    <div className="space-y-6">
      {/* Complexity Classification */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Complexity Classification
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInsights(!showInsights)}
              className="btn-secondary text-sm"
            >
              <Lightbulb className="w-4 h-4 mr-1" />
              {showInsights ? 'Hide' : 'Show'} Insights
            </button>
            <button
              onClick={() => assessMutation.mutate()}
              disabled={assessMutation.isPending}
              className="btn-secondary text-sm"
            >
              <RefreshCw className={clsx('w-4 h-4 mr-1', assessMutation.isPending && 'animate-spin')} />
              Re-assess
            </button>
            <button
              onClick={() => setShowOverrideModal(true)}
              className="btn-secondary text-sm"
            >
              <Edit className="w-4 h-4 mr-1" />
              Override
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Complexity Badge */}
          {(() => {
            // Normalize tier casing: 'ROUTINE' -> 'Routine'
            const normalizedTier = complexity.complexityTier
              ? complexity.complexityTier.charAt(0).toUpperCase() + complexity.complexityTier.slice(1).toLowerCase()
              : null;
            return (
              <div className={clsx(
                'px-6 py-4 rounded-lg text-center',
                normalizedTier === 'Routine' && 'bg-green-100',
                normalizedTier === 'Moderate' && 'bg-yellow-100',
                normalizedTier === 'Complex' && 'bg-red-100'
              )}>
                <p className="text-2xl font-bold">
                  {normalizedTier || 'Not Assessed'}
                </p>
                {complexity.complexityConfidence && (
                  <p className="text-sm text-gray-600">
                    {(complexity.complexityConfidence * 100).toFixed(0)}% confidence
                  </p>
                )}
              </div>
            );
          })()}

          {/* Confidence Meter */}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700 mb-2">Confidence Level</p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={clsx(
                  'h-3 rounded-full transition-all',
                  (complexity.complexityConfidence || 0) >= 0.8 ? 'bg-green-500' :
                  (complexity.complexityConfidence || 0) >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${(complexity.complexityConfidence || 0) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Contributing Factors */}
        {complexity.complexityFactors && complexity.complexityFactors.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Contributing Factors</p>
            <div className="space-y-2">
              {complexity.complexityFactors.map((factor: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{factor.factor}</span>
                  <span className={clsx(
                    'font-medium',
                    factor.direction === 'increases_complexity' ? 'text-red-600' : 'text-green-600'
                  )}>
                    {factor.direction === 'increases_complexity' ? '+' : '-'}
                    {(factor.weight * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Risk Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Factors', value: summary.totalFactors || riskFactors.length, color: 'text-gray-900' },
          { label: 'Critical', value: summary.criticalCount || 0, color: 'text-red-700' },
          { label: 'High', value: summary.highCount || 0, color: 'text-red-600' },
          { label: 'Moderate', value: summary.moderateCount || 0, color: 'text-yellow-600' },
          { label: 'Low', value: summary.lowCount || 0, color: 'text-green-600' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4 text-center">
            <p className={clsx('text-2xl font-bold', stat.color)}>{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Risk Coverage Gaps Panel */}
      {coverageGapsData && coverageGapsData.gaps.length > 0 && (
        <div className="card p-6 border-l-4 border-l-amber-500">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowGapsExpanded(!showGapsExpanded)}
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-amber-500" />
              Risk Coverage Gaps
              <span className="ml-2 px-2 py-0.5 text-sm bg-amber-100 text-amber-800 rounded-full">
                {coverageGapsData.summary.totalGaps} gaps
              </span>
            </h3>
            <button className="text-gray-500 hover:text-gray-700">
              {showGapsExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-2 mb-4">
            Expected medical evidence is missing for some identified risk factors.
            This is advisory only - review and order tests as clinically appropriate.
          </p>

          {showGapsExpanded && (
            <>
              {/* Gap Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">
                    {coverageGapsData.summary.labGaps}
                  </p>
                  <p className="text-xs text-amber-600 flex items-center justify-center gap-1">
                    <FlaskConical className="w-3 h-3" />
                    Lab Results Missing
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">
                    {coverageGapsData.summary.documentGaps}
                  </p>
                  <p className="text-xs text-amber-600 flex items-center justify-center gap-1">
                    <FileText className="w-3 h-3" />
                    Documents Missing
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">
                    {coverageGapsData.summary.riskAreasAffected}
                  </p>
                  <p className="text-xs text-amber-600">Risk Areas Affected</p>
                </div>
              </div>

              {/* Gap Details */}
              <div className="space-y-3">
                {coverageGapsData.gaps.map((gap: CoverageGap, index: number) => (
                  <div
                    key={`${gap.riskFactorId}-${index}`}
                    className="bg-white border border-amber-200 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={clsx(
                        'p-2 rounded-full flex-shrink-0',
                        gap.evidenceType === 'lab_result'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-purple-100 text-purple-600'
                      )}>
                        {gap.evidenceType === 'lab_result' ? (
                          <FlaskConical className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {gap.riskArea}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {gap.evidenceType === 'lab_result' ? 'Lab Test' : 'Document'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-amber-700">
                          Missing: {gap.missingEvidence}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {gap.importance}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Risk Factors List */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Identified Risk Factors
        </h3>

        {riskFactors.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 mx-auto text-gray-300" />
            <p className="mt-2 text-gray-500">No risk factors identified yet</p>
            <button
              onClick={() => assessMutation.mutate()}
              disabled={assessMutation.isPending}
              className="mt-4 btn-primary"
            >
              Run Risk Assessment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {riskFactors.map((factor: any) => {
              const CategoryIcon = categoryIcons[factor.category] || Shield

              return (
                <div
                  key={factor.id}
                  className={clsx(
                    'border rounded-lg p-4',
                    severityColors[factor.severity]
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <CategoryIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{factor.factorName}</p>
                        <p className="text-sm opacity-80">{factor.factorDescription}</p>
                        {factor.supportingEvidence && factor.supportingEvidence.length > 0 && (
                          <div className="mt-2 text-xs">
                            <span className="font-medium">Evidence:</span>
                            {factor.supportingEvidence.map((ev: any, i: number) => (
                              <span key={i} className="ml-1">
                                {ev.description}{ev.value && `: ${ev.value}`}
                                {i < factor.supportingEvidence.length - 1 && ','}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium uppercase">
                        {factor.severity}
                      </span>
                      {factor.verified && (
                        <CheckCircle className="w-4 h-4 ml-1 inline text-green-600" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Learning Insights Panel */}
      {showInsights && insightsData && (
        <div className="card p-6 border-l-4 border-l-purple-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-purple-500" />
            Learning Insights
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-purple-700">
                {insightsData.similarCasesCount}
              </p>
              <p className="text-sm text-purple-600">Similar Cases Found</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-purple-700">
                {insightsData.confidenceAdjustment > 0 ? '+' : ''}
                {(insightsData.confidenceAdjustment * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-purple-600">Confidence Adjustment</p>
            </div>
          </div>

          {insightsData.commonOverrides?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Common Overrides in Similar Cases</p>
              <div className="space-y-2">
                {insightsData.commonOverrides.map((override: any, index: number) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm">{override.type}</span>
                    <span className="text-sm font-medium text-purple-600">
                      {(override.frequency * 100).toFixed(0)}% frequency
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insightsData.suggestedActions?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Suggested Actions</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {insightsData.suggestedActions.map((action: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-purple-500">-</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Override Modal */}
      <OverrideReasoningModal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        overrideType="complexity_tier"
        systemRecommendation={complexity.complexityTier
          ? complexity.complexityTier.charAt(0).toUpperCase() + complexity.complexityTier.slice(1).toLowerCase()
          : 'Not Assessed'}
        systemConfidence={complexity.complexityConfidence}
        currentValue={complexity.complexityTier
          ? complexity.complexityTier.charAt(0).toUpperCase() + complexity.complexityTier.slice(1).toLowerCase()
          : complexity.complexityTier}
        options={[
          { value: 'Routine', label: 'Routine' },
          { value: 'Moderate', label: 'Moderate' },
          { value: 'Complex', label: 'Complex' },
        ]}
        title="Override Complexity Classification"
        description="Change the system's complexity assessment. Your reasoning will be captured for learning purposes."
        onSubmit={handleOverrideSubmit}
      />
    </div>
  )
}
