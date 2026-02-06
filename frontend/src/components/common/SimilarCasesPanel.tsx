import { useQuery } from '@tanstack/react-query'
import { overridesApi } from '../../services/api'
import clsx from 'clsx'
import {
  GitCompare,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface SimilarCasesPanelProps {
  caseId: string
  limit?: number
  expanded?: boolean
}

export default function SimilarCasesPanel({
  caseId,
  limit = 5,
  expanded = false,
}: SimilarCasesPanelProps) {
  const { data: similarCases, isLoading } = useQuery({
    queryKey: ['similar-cases', caseId, limit],
    queryFn: () => overridesApi.getSimilarCases(caseId, limit),
  })

  if (isLoading) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Finding similar cases...</span>
        </div>
      </div>
    )
  }

  if (!similarCases || similarCases.length === 0) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <GitCompare className="w-5 h-5" />
          <span>No similar cases found</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-gray-600" />
            Similar Cases
          </h3>
          <span className="text-sm text-gray-500">{similarCases.length} found</span>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {similarCases.map((similar: any) => (
          <div
            key={similar.caseId}
            className={clsx(
              'p-4 hover:bg-gray-50 transition-colors',
              expanded ? '' : 'cursor-pointer'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {similar.caseReference}
                </span>
                <Link
                  to={`/cases/${similar.caseId}`}
                  className="text-primary-600 hover:text-primary-700"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
              <div className="flex items-center gap-2">
                {/* Similarity Score */}
                <div className="flex items-center gap-1">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full',
                        similar.similarity >= 80 ? 'bg-green-500' :
                        similar.similarity >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
                      )}
                      style={{ width: `${Math.min(100, similar.similarity)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {similar.similarity}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              {/* Outcome */}
              <span className={clsx(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                similar.outcome === 'completed' ? 'bg-green-100 text-green-700' :
                similar.outcome === 'decision_made' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              )}>
                {similar.outcome || 'Unknown'}
              </span>

              {/* Decision */}
              {similar.decision && (
                <span className="text-gray-500">
                  Decision: <span className="font-medium">{similar.decision.replace(/_/g, ' ')}</span>
                </span>
              )}
            </div>

            {/* Overrides Applied */}
            {similar.overridesApplied && similar.overridesApplied.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">Overrides Applied:</p>
                <div className="flex flex-wrap gap-2">
                  {similar.overridesApplied.map((override: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded"
                    >
                      <span className="font-medium">{override.type.replace(/_/g, ' ')}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>{override.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* View More Link */}
      {!expanded && similarCases.length >= limit && (
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 mx-auto">
            View All Similar Cases
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
