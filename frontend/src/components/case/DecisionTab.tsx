import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { decisionsApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useState } from 'react'
import clsx from 'clsx'
import {
  Scale,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Info,
  ShieldAlert,
  Timer,
  TrendingUp,
} from 'lucide-react'

interface DecisionTabProps {
  caseId: string
  caseData: any
}

const decisionIcons: Record<string, any> = {
  standard_acceptance: CheckCircle,
  modified_acceptance: AlertTriangle,
  deferral: Clock,
  referral: ArrowRight,
  decline: XCircle,
}

const decisionColors: Record<string, string> = {
  standard_acceptance: 'border-green-200 bg-green-50 hover:border-green-400',
  modified_acceptance: 'border-yellow-200 bg-yellow-50 hover:border-yellow-400',
  deferral: 'border-blue-200 bg-blue-50 hover:border-blue-400',
  referral: 'border-purple-200 bg-purple-50 hover:border-purple-400',
  decline: 'border-red-200 bg-red-50 hover:border-red-400',
}

export default function DecisionTab({ caseId, caseData }: DecisionTabProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [rationale, setRationale] = useState('')

  const { data: optionsData, isLoading: loadingOptions } = useQuery({
    queryKey: ['decisions', 'options', caseId],
    queryFn: () => decisionsApi.getOptions(caseId),
  })

  const { data: decisionsData } = useQuery({
    queryKey: ['decisions', caseId],
    queryFn: () => decisionsApi.getDecisions(caseId),
  })

  const { data: guidanceData, isLoading: loadingGuidance } = useQuery({
    queryKey: ['decisions', 'guidance', caseId],
    queryFn: () => decisionsApi.getProductGuidance(caseId, user?.id, user?.name),
  })

  const decisionMutation = useMutation({
    mutationFn: (data: any) => decisionsApi.makeDecision(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decisions', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      setSelectedOption(null)
      setRationale('')
    },
  })

  if (loadingOptions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading decision options...</div>
      </div>
    )
  }

  const options = optionsData?.options || []
  const previousDecisions = decisionsData || []
  const contextSummary = optionsData?.contextSummary || {}

  const handleMakeDecision = () => {
    if (!selectedOption || !rationale.trim()) return

    decisionMutation.mutate({
      decisionType: selectedOption,
      rationale: rationale.trim(),
      userId: user!.id,
      userName: user!.name,
      userRole: user!.role,
    })
  }

  return (
    <div className="space-y-6">
      {/* Context Summary */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Decision Context</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Complexity:</span>
            <span className="ml-2 font-medium">
              {(() => {
                const tier = contextSummary.complexityTier || caseData.complexityTier;
                return tier ? tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase() : '';
              })()}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Risk Factors:</span>
            <span className="ml-2 font-medium">{contextSummary.riskFactorCount || caseData.riskFactors?.length || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Test Results:</span>
            <span className="ml-2 font-medium">{contextSummary.testResultCount || caseData.testResults?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Product-Specific Policy Modification Guidance */}
      {!loadingGuidance && guidanceData?.guidanceItems?.length > 0 && (
        <div className="card p-6 border-l-4 border-l-indigo-400">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Product-Specific Policy Modification Guidance
            </h3>
          </div>

          <div className="flex items-center gap-2 mb-4 p-3 bg-indigo-50 rounded-lg">
            <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <p className="text-xs text-indigo-700">
              {guidanceData.disclaimer || 'Guideline-based suggestions for underwriter reference only. These do not constitute pricing, decisions, or authority overrides.'}
            </p>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Product: <span className="font-medium text-gray-900">{guidanceData.productName}</span>
            <span className="text-gray-400 ml-1">({guidanceData.productCode})</span>
          </p>

          <div className="space-y-3">
            {guidanceData.guidanceItems.map((item: any) => (
              <div
                key={item.riskFactorId}
                className={clsx(
                  'border rounded-lg p-4',
                  item.severity === 'critical' && 'border-red-200 bg-red-50',
                  item.severity === 'high' && 'border-orange-200 bg-orange-50',
                  item.severity === 'moderate' && 'border-yellow-200 bg-yellow-50',
                  item.severity === 'low' && 'border-green-200 bg-green-50',
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className={clsx(
                    'w-4 h-4',
                    item.severity === 'critical' && 'text-red-600',
                    item.severity === 'high' && 'text-orange-600',
                    item.severity === 'moderate' && 'text-yellow-600',
                    item.severity === 'low' && 'text-green-600',
                  )} />
                  <span className="font-medium text-gray-900 text-sm">{item.riskFactorName}</span>
                  <span className={clsx(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    item.severity === 'critical' && 'bg-red-100 text-red-700',
                    item.severity === 'high' && 'bg-orange-100 text-orange-700',
                    item.severity === 'moderate' && 'bg-yellow-100 text-yellow-700',
                    item.severity === 'low' && 'bg-green-100 text-green-700',
                  )}>
                    {item.severity}
                  </span>
                  {!item.isProductSpecific && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      General guidance
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Suggested Loading Range</p>
                      <p className="text-sm text-gray-900">{item.suggestedLoadingRange}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Timer className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Waiting Period</p>
                      <p className="text-sm text-gray-900">{item.waitingPeriod}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Exclusion Considerations</p>
                      <p className="text-sm text-gray-900">{item.exclusionConsideration}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-400 italic mt-2">{item.advisoryNote}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Options */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Decision Options</h3>

        <div className="space-y-4">
          {options.map((option: any) => {
            const Icon = decisionIcons[option.type] || Scale

            return (
              <div
                key={option.type}
                onClick={() => setSelectedOption(option.type)}
                className={clsx(
                  'border-2 rounded-lg p-4 cursor-pointer transition-all',
                  decisionColors[option.type],
                  selectedOption === option.type && 'ring-2 ring-primary-500'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{option.name}</h4>
                      {option.recommended && (
                        <span className="badge bg-primary-100 text-primary-700 text-xs">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{option.description}</p>

                    {/* Supporting Factors */}
                    {option.supportingFactors && option.supportingFactors.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs font-medium text-green-700">Supporting: </span>
                        <span className="text-xs text-gray-600">
                          {option.supportingFactors.map((f: any) => f.factor).join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Weighing Factors */}
                    {option.weighingFactors && option.weighingFactors.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs font-medium text-red-700">Against: </span>
                        <span className="text-xs text-gray-600">
                          {option.weighingFactors.map((f: any) => f.factor).join(', ')}
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      Authority: {option.authorityRequired}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Rationale Input */}
        {selectedOption && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <label className="label">Decision Rationale (Required)</label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Provide your reasoning for this decision..."
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleMakeDecision}
                disabled={!rationale.trim() || decisionMutation.isPending}
                className="btn-primary"
              >
                {decisionMutation.isPending ? 'Submitting...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Previous Decisions */}
      {previousDecisions.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Decision History</h3>
          <div className="space-y-3">
            {previousDecisions.map((decision: any) => {
              const Icon = decisionIcons[decision.decisionType] || Scale

              return (
                <div key={decision.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {decision.decisionType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        {decision.isOverride && (
                          <span className="ml-2 text-xs text-orange-600">(Override)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        By {decision.madeByName} on {new Date(decision.madeAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{decision.rationale}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
