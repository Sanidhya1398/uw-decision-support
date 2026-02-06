import { useQuery } from '@tanstack/react-query'
import { overridesApi } from '../../services/api'
import clsx from 'clsx'
import {
  Brain,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Lightbulb,
  BarChart3,
} from 'lucide-react'

interface LearningInsightsPanelProps {
  caseId: string
}

export default function LearningInsightsPanel({ caseId }: LearningInsightsPanelProps) {
  const { data: insights, isLoading, error } = useQuery({
    queryKey: ['learning-insights', caseId],
    queryFn: () => overridesApi.getLearningInsights(caseId),
  })

  if (isLoading) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Analyzing similar cases...</span>
        </div>
      </div>
    )
  }

  if (error || !insights) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <AlertCircle className="w-5 h-5" />
          <span>Unable to load learning insights</span>
        </div>
      </div>
    )
  }

  const confidenceAdjustment = insights.confidenceAdjustment || 0
  const isNegativeAdjustment = confidenceAdjustment < 0

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            ML Learning Insights
          </h3>
          <span className="text-sm bg-white px-2 py-1 rounded-full text-gray-600 border">
            {insights.similarCasesCount || 0} similar cases analyzed
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Confidence Adjustment */}
        <div className={clsx(
          'p-3 rounded-lg border',
          isNegativeAdjustment
            ? 'bg-amber-50 border-amber-200'
            : 'bg-green-50 border-green-200'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isNegativeAdjustment ? (
                <TrendingDown className="w-5 h-5 text-amber-600" />
              ) : (
                <TrendingUp className="w-5 h-5 text-green-600" />
              )}
              <span className="font-medium text-gray-900">ML Confidence Adjustment</span>
            </div>
            <span className={clsx(
              'text-lg font-bold',
              isNegativeAdjustment ? 'text-amber-600' : 'text-green-600'
            )}>
              {confidenceAdjustment > 0 ? '+' : ''}{(confidenceAdjustment * 100).toFixed(1)}%
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {isNegativeAdjustment
              ? 'System is less confident based on override patterns. Manual review recommended.'
              : 'System predictions align well with underwriter decisions.'}
          </p>
        </div>

        {/* Override Patterns */}
        {insights.commonOverrides && insights.commonOverrides.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Override Patterns in Similar Cases
            </h4>
            <div className="space-y-2">
              {insights.commonOverrides.map((pattern: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 capitalize">
                        {pattern.type?.replace(/_/g, ' ') || 'Unknown'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {Math.round((pattern.frequency || 0) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all',
                          (pattern.frequency || 0) >= 0.5 ? 'bg-amber-500' :
                          (pattern.frequency || 0) >= 0.3 ? 'bg-yellow-500' : 'bg-blue-500'
                        )}
                        style={{ width: `${Math.min(100, (pattern.frequency || 0) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Actions */}
        {insights.suggestedActions && insights.suggestedActions.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Suggested Actions Based on Learning
            </h4>
            <ul className="space-y-2">
              {insights.suggestedActions.map((action: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Info Footer */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Brain className="w-3 h-3" />
            Insights are based on patterns from similar cases where underwriters made overrides.
            The system learns from your decisions to improve future recommendations.
          </p>
        </div>
      </div>
    </div>
  )
}
